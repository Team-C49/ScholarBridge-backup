// src/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/hash');
const { sendMail } = require('../utils/mail');
const { authMiddleware, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

router.use(authMiddleware, requireRole('superadmin'));

router.get('/trust-requests', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM trust_registration_requests WHERE status='pending' ORDER BY submitted_at DESC`);
    return res.json({ requests: rows });
  } catch (err) {
    console.error('admin trust-requests error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/trust-requests/:id/approve', async (req, res) => {
  try {
    const adminId = req.user.id;
    const reqId = req.params.id;
    const reqRowRes = await db.query(`SELECT * FROM trust_registration_requests WHERE id=$1 AND status='pending'`, [reqId]);
    if (!reqRowRes.rows.length) return res.status(404).json({ error: 'Request not found or already processed' });
    const request = reqRowRes.rows[0];

    const tempPassword = crypto.randomBytes(8).toString('base64').slice(0,12);
    const pwdHash = await hashPassword(tempPassword);
    const trustUserId = uuidv4();
    await db.query(`INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'trust')`, [trustUserId, request.registration_email.toLowerCase(), pwdHash]);

    await db.query(`INSERT INTO trusts(user_id, org_name, contact_phone, contact_email, website, year_established, address, registration_number, is_active, created_at)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,now())`, [trustUserId, request.org_name, request.contact_phone, request.contact_email, request.website, request.year_established, JSON.stringify(request.address), request.registration_number]);

    await db.query(`UPDATE trust_registration_requests SET status='approved', reviewed_by=$1, reviewed_at=now(), admin_notes=$2 WHERE id=$3`, [adminId, 'Approved', reqId]);

    await sendMail({ to: request.registration_email, subject: `${process.env.APP_NAME} - Trust account created`, text: `Your username: ${request.registration_email}\nTemporary password: ${tempPassword}\nPlease login and change your password.` });

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'approve_trust',$2)`, [adminId, JSON.stringify({ requestId: reqId, trustUserId })]);
    return res.json({ message: 'Approved and created trust user' });
  } catch (err) {
    console.error('admin approve trust error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/trust-requests/:id/reject', async (req, res) => {
  try {
    const adminId = req.user.id;
    const reqId = req.params.id;
    const { reason } = req.body;
    await db.query(`UPDATE trust_registration_requests SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3`, [reason || 'Rejected', adminId, reqId]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'reject_trust',$2)`, [adminId, JSON.stringify({ requestId: reqId, reason })]);
    return res.json({ message: 'Rejected' });
  } catch (err) {
    console.error('admin reject error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/issues', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM issues ORDER BY created_at DESC LIMIT 200`);
    return res.json({ issues: rows });
  } catch (err) {
    console.error('admin issues error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/issues/:id/resolve', async (req, res) => {
  try {
    const adminId = req.user.id;
    const issueId = req.params.id;
    const { resolution_note } = req.body;
    const r = await db.query(`UPDATE issues SET status='resolved', resolved_by_user_id=$1, updated_at=now() WHERE id=$2 RETURNING *`, [adminId, issueId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Issue not found' });
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'resolve_issue',$2)`, [adminId, JSON.stringify({ issueId, resolution_note })]);
    return res.json({ issue: r.rows[0] });
  } catch (err) {
    console.error('admin resolve issue error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/blacklist', async (req, res) => {
  try {
    const adminId = req.user.id;
    const { user_id, reason } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    await db.query(`UPDATE users SET is_blacklisted=true, updated_at=now() WHERE id=$1`, [user_id]);
    await db.query(`UPDATE trusts SET is_active=false, updated_at=now() WHERE user_id=$1`, [user_id]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'blacklist_user',$2)`, [adminId, JSON.stringify({ user_id, reason })]);
    return res.json({ message: 'User blacklisted' });
  } catch (err) {
    console.error('admin blacklist error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
