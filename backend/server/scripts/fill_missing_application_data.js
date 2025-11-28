// scripts/fill_missing_application_data.js
// Fills missing fields with demo values for all applications/users for PDF completeness


require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function fillStudentProfiles() {
  await client.query(`UPDATE student_profiles SET
    annual_income = COALESCE(annual_income, 700000),
    income = COALESCE(income, 700000),
    total_income = COALESCE(total_income, 700000),
    bank_account_holder_name = COALESCE(bank_account_holder_name, full_name, 'Demo User'),
    bank_account_number = COALESCE(bank_account_number, '1234567890'),
    bank_name = COALESCE(bank_name, 'Demo Bank'),
    bank_ifsc_code = COALESCE(bank_ifsc_code, 'DEMO0001234')
  `);
  await client.query(`UPDATE student_profiles SET address =
    CASE WHEN address IS NULL OR address = '' THEN '{"street": "Demo Street", "city": "Demo City", "state": "Demo State", "zip": "000000", "country": "DemoLand"}'::jsonb ELSE address END`);
}

async function fillEducationHistory() {
  await client.query(`UPDATE education_history SET
    qualification = COALESCE(qualification, 'B Tech CSE'),
    grade = COALESCE(grade, '85')
    WHERE qualification IS NULL OR grade IS NULL`);
}

async function fillFamilyMembers() {
  await client.query(`UPDATE family_members SET
    monthly_income = COALESCE(monthly_income, 50000)
    WHERE monthly_income IS NULL`);
}

async function fillCurrentExpenses() {
  await client.query(`UPDATE current_expenses SET
    expense_name = COALESCE(expense_name, 'Tuition')
    WHERE expense_name IS NULL`);
}

async function main() {
  await client.connect();
  await fillStudentProfiles();
  await fillEducationHistory();
  await fillFamilyMembers();
  await fillCurrentExpenses();
  await client.end();
  console.log('Filled missing fields with demo values.');
}

main().catch(e => {
  console.error('Error filling missing data:', e);
  process.exit(1);
});
