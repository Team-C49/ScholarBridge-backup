// scripts/inspect_application_for_pdf.js
const db = require('../src/utils/db');
require('dotenv').config();

async function inspect(appId) {
  // If no appId provided, pick the most recent application
  if (!appId) {
    const latest = (await db.query(`SELECT id FROM applications ORDER BY created_at DESC LIMIT 1`)).rows[0];
    if (!latest) {
      console.error('No applications found in DB. Provide an applicationId as argument.');
      process.exit(1);
    }
    appId = latest.id;
    console.log('No applicationId provided — using most recent id:', appId);
  }

  // Get application
  const app = (await db.query(`SELECT * FROM applications WHERE id=$1`, [appId])).rows[0];
  if (!app) {
    console.error('Application not found for id', appId);
    process.exit(1);
  }

  // Get profile
  const profile = (await db.query(`SELECT sp.*, u.email FROM student_profiles sp LEFT JOIN users u ON sp.user_id = u.id WHERE sp.user_id = $1`, [app.student_user_id])).rows[0];

  // Get related data
  const educationHistory = (await db.query(`SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`, [appId])).rows;
  const familyMembers = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
  const currentExpenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
  const documents = (await db.query(`SELECT id, doc_type, file_url, description, original_name, created_at FROM documents WHERE owner_type='application' AND owner_id=$1`, [appId])).rows;
  const trustPayments = (await db.query(`SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks FROM trust_payments tp WHERE tp.application_id=$1 ORDER BY tp.payment_date DESC`, [appId])).rows;
  const kycDocuments = (await db.query(`SELECT id, doc_type, file_url, description, original_name, created_at FROM documents WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'`, [app.student_user_id])).rows;

  // Patch for PDF fields
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
    profile.address = [profile.address.line1, profile.address.line2, profile.address.city, profile.address.state, profile.address.pincode].filter(Boolean).join(', ');
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

  console.log(JSON.stringify(applicationData, null, 2));
  process.exit(0);
}

const appId = process.argv[2];
inspect(appId).catch(err => { console.error(err); process.exit(1); });
