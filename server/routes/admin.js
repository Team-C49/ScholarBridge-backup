// src/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/hash');
const { sendMail } = require('../utils/mail');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware, requireRole('superadmin'));

// list pending requests
router.get('/trust-requests', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM trust_registration_requests WHERE status='pending' ORDER BY submitted_at DESC LIMIT 200`);
    return res.json({ requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// approve request -> create user + trust row + update request
router.post('/trust-requests/:id/approve', async (req, res) => {
  try {
    const adminId = req.user.id;
    const reqId = req.params.id;
    const rq = await db.query(`SELECT * FROM trust_registration_requests WHERE id=$1 AND status='pending'`, [reqId]);
    if (!rq.rows.length) return res.status(404).json({ error: 'Request not found' });
    const request = rq.rows[0];

    // create user (trust)
    const tempPwd = cryptoRandomPassword(); // implement helper below
    const pwdHash = await hashPassword(tempPwd);
    const trustUserId = uuidv4();
    await db.query(`INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'trust')`, [trustUserId, request.registration_email.toLowerCase(), pwdHash]);

    // create trusts row
    await db.query(`INSERT INTO trusts(user_id, org_name, contact_phone, contact_email, website, year_established, address, registration_number, is_active)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)`, [trustUserId, request.org_name, request.contact_phone, request.contact_email, request.website, request.year_established, JSON.stringify(request.address), request.registration_number]);

    // update request status
    await db.query(`UPDATE trust_registration_requests SET status='approved', reviewed_by=$1, reviewed_at=now(), admin_notes=$2 WHERE id=$3`, [adminId, 'Approved', reqId]);

    // send temp credentials
    await sendMail({ to: request.registration_email, subject: `${process.env.APP_NAME} — Trust account created`, text: `Your login: ${request.registration_email}\nTemporary password: ${tempPwd}. Please login and change password.` });

    // audit
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'approve_trust', $2)`, [adminId, JSON.stringify({ requestId: reqId, trustUserId })]);

    return res.json({ message: 'Approved and created trust user' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// helper to generate reasonably strong temporary password
function cryptoRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()_+~';
  let s = '';
  for (let i=0;i<12;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

// reject request
router.post('/trust-requests/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const adminId = req.user.id;
    const reqId = req.params.id;
    const r = await db.query(`UPDATE trust_registration_requests SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3 RETURNING *`, [reason || 'Rejected', adminId, reqId]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'reject_trust',$2)`, [adminId, JSON.stringify({ reqId, reason })]);
    return res.json({ message: 'Rejected', request: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// blacklist user (student or trust)
router.post('/blacklist', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const adminId = req.user.id;
    await db.query(`UPDATE users SET is_blacklisted=true, updated_at=now() WHERE id=$1`, [user_id]);
    await db.query(`UPDATE trusts SET is_active=false, updated_at=now() WHERE user_id=$1`, [user_id]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'blacklist_user', $2)`, [adminId, JSON.stringify({ user_id, reason })]);
    return res.json({ message: 'User blacklisted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
