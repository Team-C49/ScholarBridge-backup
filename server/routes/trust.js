// src/routes/trust.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { pool } = require('../utils/db'); // need pool for transactions

// Public: trust registration request
router.post('/register-request', async (req, res) => {
  try {
    const { org_name, registration_email, contact_phone, contact_email, website, year_established, address, registration_number, registration_docs } = req.body;
    if (!org_name || !registration_email || !contact_phone || !registration_number) return res.status(400).json({ error: 'Missing required fields' });
    const email = registration_email.trim().toLowerCase();
    const sql = `INSERT INTO trust_registration_requests(id, org_name, registration_email, contact_phone, contact_email, website, year_established, address, registration_number, registration_docs)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    const { rows } = await db.query(sql, [uuidv4(), org_name, email, contact_phone, contact_email || null, website || null, year_established || null, JSON.stringify(address || {}), registration_number, JSON.stringify(registration_docs || [])]);
    return res.status(201).json({ request: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Registration email already used' });
    console.error('trust register-request error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Protected trust APIs
router.use(authMiddleware, requireRole('trust'));

// List recent applications (with pagination & filters optional)
router.get('/applications', async (req, res) => {
  try {
    // Simple: return latest 100 applications (trusts can filter client-side)
    const { rows } = await db.query(`SELECT id, student_user_id, academic_year, current_course_name, school_college_name, status, total_amount_requested, total_amount_approved FROM applications ORDER BY created_at DESC LIMIT 100`);
    return res.json({ applications: rows });
  } catch (err) {
    console.error('trust list applications error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get application details (trust view)
router.get('/applications/:id', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1`, [appId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const education = (await db.query(`SELECT * FROM education_history WHERE application_id=$1`, [appId])).rows;
    const family = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
    const expenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
    const docs = (await db.query(`SELECT * FROM documents WHERE owner_type='application' AND owner_id=$1`, [appId])).rows;
    const approvals = (await db.query(`SELECT aa.*, u.email as trust_email FROM application_approvals aa LEFT JOIN users u ON u.id=aa.trust_user_id WHERE aa.application_id=$1`, [appId])).rows;
    return res.json({ application: app, education, family, expenses, docs, approvals });
  } catch (err) {
    console.error('trust get application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Approve an application — transactionally safe check against over-approval
router.post('/applications/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const trustUserId = req.user.id;
    const appId = req.params.id;
    const { approved_amount, approval_note } = req.body;
    if (approved_amount == null) return res.status(400).json({ error: 'approved_amount required' });

    await client.query('BEGIN');

    // Lock the application row
    const appRow = (await client.query(`SELECT total_amount_requested FROM applications WHERE id=$1 FOR UPDATE`, [appId])).rows[0];
    if (!appRow) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    const requested = Number(appRow.total_amount_requested);

    // Sum existing approved amounts
    const sumRes = (await client.query(`SELECT COALESCE(SUM(approved_amount),0) AS s FROM application_approvals WHERE application_id=$1 AND status='approved'`, [appId])).rows[0];
    const existingSum = Number(sumRes.s || 0);
    const remaining = requested - existingSum;
    if (approved_amount > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient remaining amount. Remaining = ${remaining}` });
    }

    // Insert approval
    const approvalId = uuidv4();
    const insSql = `INSERT INTO application_approvals(id, application_id, trust_user_id, approved_amount, status, rejection_reason, student_confirmed_receipt, approved_at)
                    VALUES($1,$2,$3,$4,'approved',NULL,false,now()) RETURNING *`;
    const insRes = await client.query(insSql, [approvalId, appId, trustUserId, approved_amount]);

    // Update applications.total_amount_approved
    const newSum = existingSum + Number(approved_amount);
    await client.query(`UPDATE applications SET total_amount_approved=$1, updated_at=now() WHERE id=$2`, [newSum, appId]);

    // optionally close app if fully funded
    if (newSum >= requested) {
      await client.query(`UPDATE applications SET status='closed' WHERE id=$1`, [appId]);
    } else {
      await client.query(`UPDATE applications SET status='partially_approved' WHERE id=$1`, [appId]);
    }

    await client.query('COMMIT');

    // audit log
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'trust_approve',$2)`, [trustUserId, JSON.stringify({ approvalId, applicationId: appId, approved_amount })]);

    return res.status(201).json({ approval: insRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('trust approve error', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Trust marks payment done for an approval (optionally provide doc id)
router.post('/approvals/:approvalId/mark-paid', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const approvalId = req.params.approvalId;
    const { paid_at, payment_proof_doc_id } = req.body;

    // confirm approval belongs to trust
    const check = await db.query(`SELECT * FROM application_approvals WHERE id=$1 AND trust_user_id=$2`, [approvalId, trustUserId]);
    if (!check.rows.length) return res.status(404).json({ error: 'Approval not found or not owned by trust' });

    await db.query(`UPDATE application_approvals SET paid_at=$1 WHERE id=$2`, [paid_at ? new Date(paid_at) : new Date(), approvalId]);
    if (payment_proof_doc_id) {
      // We don't have a payment_proof_doc_id column — store proof as document linked to application and ensure uploaded
      // Optionally add a record in audit_logs referencing proof doc id
      await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'trust_mark_paid',$2)`, [trustUserId, JSON.stringify({ approvalId, payment_proof_doc_id })]);
    } else {
      await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'trust_mark_paid',$2)`, [trustUserId, JSON.stringify({ approvalId })]);
    }

    const updated = (await db.query(`SELECT * FROM application_approvals WHERE id=$1`, [approvalId])).rows[0];
    return res.json({ updated });
  } catch (err) {
    console.error('trust mark-paid error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
