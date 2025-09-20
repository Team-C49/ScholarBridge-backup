// src/routes/trust.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');

// public trust registration request
router.post('/register-request', async (req, res) => {
  try {
    const { org_name, registration_email, contact_phone, contact_email, website, year_established, address, registration_number, registration_docs } = req.body;
    if (!org_name || !registration_email || !contact_phone || !registration_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const email = registration_email.trim().toLowerCase();
    const sql = `INSERT INTO trust_registration_requests(id, org_name, registration_email, contact_phone, contact_email, website, year_established, address, registration_number, registration_docs)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    const { rows } = await db.query(sql, [uuidv4(), org_name, email, contact_phone, contact_email || null, website || null, year_established || null, JSON.stringify(address || {}), registration_number, JSON.stringify(registration_docs || []) ]);
    return res.status(201).json({ request: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Registration email already used' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Protected trust endpoints (once trust has been approved and has user credentials)
router.use(authMiddleware, requireRole('trust'));

// Example: trust can list recent applications (you can refine filters)
router.get('/applications', async (req, res) => {
  try {
    // Return basic app list; trusts will see all apps and click to view details
    const { rows } = await db.query(`SELECT id, student_user_id, academic_year, current_course_name, school_college_name, status, total_amount_requested, total_amount_approved FROM applications ORDER BY created_at DESC LIMIT 100`);
    return res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Approve an application (create application_approvals record)
// Important: DB triggers (you said exist) should enforce over-approval prevention
router.post('/approve', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const { application_id, approved_amount, status = 'approved', rejection_reason = null } = req.body;
    if (!application_id || approved_amount == null) return res.status(400).json({ error: 'application_id and approved_amount required' });
    const id = uuidv4();
    const sql = `INSERT INTO application_approvals(id, application_id, trust_user_id, approved_amount, status, rejection_reason, student_confirmed_receipt, approved_at)
                 VALUES($1,$2,$3,$4,$5,$6,false,now()) RETURNING *`;
    const { rows } = await db.query(sql, [id, application_id, trustUserId, approved_amount, status, rejection_reason]);
    // create audit log
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1, 'trust_approve', $2)`, [trustUserId, JSON.stringify({ approval_id: id, application_id, approved_amount })]);
    return res.status(201).json({ approval: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error or approval exceeded remaining amount' });
  }
});

// Mark payment by trust (mark paid_at)
router.post('/mark-paid', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const { approval_id, paid_at } = req.body;
    if (!approval_id) return res.status(400).json({ error: 'approval_id required' });
    const sql = `UPDATE application_approvals SET paid_at=$1 WHERE id=$2 AND trust_user_id=$3 RETURNING *`;
    const { rows } = await db.query(sql, [paid_at ? new Date(paid_at) : new Date(), approval_id, trustUserId]);
    if (!rows.length) return res.status(404).json({ error: 'Approval not found or not owned' });
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1, 'trust_mark_paid', $2)`, [trustUserId, JSON.stringify({ approval_id })]);
    return res.json({ updated: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
