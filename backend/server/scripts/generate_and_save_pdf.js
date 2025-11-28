// scripts/generate_and_save_pdf.js
const db = require('../src/utils/db');
const pdfService = require('../src/services/pdfService');
const fs = require('fs');
require('dotenv').config();

async function run(appId) {
  if (!appId) {
    const latest = (await db.query(`SELECT id FROM applications ORDER BY created_at DESC LIMIT 1`)).rows[0];
    if (!latest) {
      console.error('No applications found');
      process.exit(1);
    }
    appId = latest.id;
    console.log('No applicationId provided — using most recent id:', appId);
  }

  const app = (await db.query(`SELECT * FROM applications WHERE id=$1`, [appId])).rows[0];
  if (!app) { console.error('Application not found'); process.exit(1); }
  const profile = (await db.query(`SELECT sp.*, u.email FROM student_profiles sp LEFT JOIN users u ON sp.user_id = u.id WHERE sp.user_id = $1`, [app.student_user_id])).rows[0];
  const educationHistory = (await db.query(`SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`, [appId])).rows;
  const familyMembers = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
  const currentExpenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
  const documents = (await db.query(`SELECT id, doc_type, file_url, description, original_name, created_at FROM documents WHERE owner_type='application' AND owner_id=$1`, [appId])).rows;
  const trustPayments = (await db.query(`SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks FROM trust_payments tp WHERE tp.application_id=$1 ORDER BY tp.payment_date DESC`, [appId])).rows;
  const kycDocuments = (await db.query(`SELECT id, doc_type, file_url, description, original_name, created_at FROM documents WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'`, [app.student_user_id])).rows;

  // Build normalized data (reuse the same mapping as route)
  app.school_college_name = app.school_college_name || app.college_school || app.college_name || app.school_name || app.institution_name || '';
  app.current_course_name = app.current_course_name || app.current_course || app.course_name || app.program_name || '';
  app.total_amount_requested = app.total_amount_requested || app.amount_requested || app.amount || app.total_amount || 0;
  let receivedAmount = 0;
  if (app.received_amount && !isNaN(parseFloat(app.received_amount)) && parseFloat(app.received_amount) > 0) {
    receivedAmount = parseFloat(app.received_amount);
  } else if (Array.isArray(trustPayments)) {
    receivedAmount = trustPayments.reduce((total, payment) => total + parseFloat(payment.amount || 0), 0);
  }
  app.received_amount = receivedAmount;

  const safeEducationHistory = (educationHistory || []).map(edu => ({
    institution: edu.institution || edu.institution_name || 'N/A',
    course: edu.course || edu.qualification || 'N/A',
    year: edu.year || edu.year_of_passing || 'N/A',
    percentage: edu.percentage || edu.grade || 'N/A'
  }));

  const safeFamilyMembers = (familyMembers || []).map(member => ({
    name: member.name || member.member_name || 'N/A',
    relation: member.relation || 'N/A',
    occupation: member.occupation || 'N/A',
    income: member.income !== undefined && member.income !== null ? member.income : (member.monthly_income !== undefined && member.monthly_income !== null ? member.monthly_income : 'N/A')
  }));

  const totalFamilyIncome = safeFamilyMembers.reduce((sum, m) => sum + (Number(m.income) || 0), 0);

  const safeCurrentExpenses = (currentExpenses || []).map(expense => ({
    expense_type: expense.expense_type || expense.expense_name || 'N/A',
    amount: expense.amount !== undefined && expense.amount !== null ? expense.amount : 'N/A',
    description: expense.description || 'N/A'
  }));

  if (profile && typeof profile.address === 'object' && profile.address !== null) {
    profile.address = [profile.address.line1 || profile.street || profile.address?.street, profile.address.line2 || '', profile.address.city || profile.address?.city, profile.address.state || profile.address?.state, profile.address.pincode || profile.address?.zip].filter(Boolean).join(', ');
  }

  const applicationData = {
    application: app,
    profile,
    educationHistory: safeEducationHistory,
    familyMembers: safeFamilyMembers,
    totalFamilyIncome,
    currentExpenses: safeCurrentExpenses,
    documents,
    kycDocuments,
    trustPayments
  };

  console.log('Generating PDF for application', appId);
  // Save HTML used to generate PDF for inspection
  try {
    const html = pdfService.generateHTMLTemplate(applicationData);
    fs.writeFileSync(`./tmp/application_${appId}.html`, html);
    console.log('Saved HTML to ./tmp/application_' + appId + '.html');
  } catch (e) {
    console.warn('Failed to save HTML:', e.message);
  }

  const pdfBuffer = await pdfService.generateApplicationPDF(applicationData);
  const outPath = `./tmp/application_${appId}.pdf`;
  fs.mkdirSync('./tmp', { recursive: true });
  fs.writeFileSync(outPath, pdfBuffer);
  console.log('Saved PDF to', outPath);
  process.exit(0);
}

const arg = process.argv[2];
run(arg).catch(err => { console.error('Error generating PDF:', err); process.exit(1); });
