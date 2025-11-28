// scripts/backfill_trust_payments.js
// Run this script once to backfill trust_payments for all previously approved applications

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/utils/db');
const { v4: uuidv4 } = require('uuid');

async function backfillTrustPayments() {
  try {
    // Debug: print the DATABASE_URL
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    // Find all approved application_approvals that do not have a trust_payments record
    const approvals = (await db.query(`
      SELECT aa.id as approval_id, aa.application_id, aa.trust_user_id, aa.approved_amount, aa.approved_at, t.org_name
      FROM application_approvals aa
      JOIN trusts t ON t.user_id = aa.trust_user_id
      WHERE aa.status = 'approved' AND NOT EXISTS (
        SELECT 1 FROM trust_payments tp
        WHERE tp.application_id = aa.application_id
          AND tp.trust_name = t.org_name
          AND tp.amount = aa.approved_amount
      )
    `)).rows;

    let inserted = 0;
    for (const approval of approvals) {
      const paymentId = uuidv4();
      await db.query(`
        INSERT INTO trust_payments (id, application_id, trust_user_id, trust_name, amount, payment_date, reference_number, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NOW(), NOW())
      `, [
        paymentId,
        approval.application_id,
        approval.trust_user_id,
        approval.org_name,
        approval.approved_amount,
        approval.approved_at || new Date()
      ]);
      inserted++;
    }
    console.log(`Backfill complete. Inserted ${inserted} trust_payments records.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
}

backfillTrustPayments();
