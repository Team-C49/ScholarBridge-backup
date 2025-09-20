// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sendMail } = require('../utils/mail');
const { authMiddleware } = require('../middleware/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_TTL_MIN = 15;

// --- STEP 1: register step1 (email + password) ---
router.post('/register/step1', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const normEmail = email.trim().toLowerCase();
    const id = uuidv4();
    const pwHash = await hashPassword(password);

    const sql = `INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'student') RETURNING id,email`;
    const { rows } = await db.query(sql, [id, normEmail, pwHash]);

    // create OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    await db.query(`INSERT INTO otps(id,user_email,otp_code,expires_at) VALUES($1,$2,$3,$4)`, [uuidv4(), normEmail, otp, expiresAt]);

    // send OTP (real email or dev log)
    await sendMail({ to: normEmail, subject: `${process.env.APP_NAME} OTP`, text: `Your OTP is ${otp}. Expires in ${OTP_TTL_MIN} minutes.` });

    return res.status(201).json({ message: 'Step1 done. OTP sent to email.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error('register step1 error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- STEP 2: verify OTP and return JWT ---
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email & otp required' });

    const norm = email.trim().toLowerCase();
    const q = `SELECT * FROM otps WHERE user_email=$1 AND otp_code=$2 ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await db.query(q, [norm, otp]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid OTP' });

    const rec = rows[0];
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });

    // remove OTPs for this email
    await db.query(`DELETE FROM otps WHERE user_email=$1`, [norm]);

    // fetch user, ensure exists
    const userRes = await db.query(`SELECT id,email,role,is_blacklisted FROM users WHERE LOWER(email)=$1`, [norm]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];
    if (user.is_blacklisted) return res.status(403).json({ error: 'Account blacklisted' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error('verify otp error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- STEP 3: complete profile (protected) ---
const { requireRole } = require('../middleware/auth');
const { encrypt, maskBank } = require('../utils/crypto');

router.post('/register/step3', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number, date_of_birth, gender, address, profile_picture_url, kyc_doc_type, bank_details } = req.body;
    // encrypt bank_details JSON if provided
    let bankCipher = null;
    let bankMasked = null;
    if (bank_details && bank_details.account_number) {
      bankCipher = encrypt(JSON.stringify(bank_details));
      bankMasked = { account_masked: maskBank(bank_details.account_number), bank_name: bank_details.bank_name, ifsc: bank_details.ifsc };
    }

    const upsert = `
      INSERT INTO student_profiles(user_id, full_name, phone_number, date_of_birth, gender, address, profile_picture_url, kyc_doc_type, bank_details_cipher, bank_details_masked)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (user_id) DO UPDATE SET
        full_name=EXCLUDED.full_name,
        phone_number=EXCLUDED.phone_number,
        date_of_birth=EXCLUDED.date_of_birth,
        gender=EXCLUDED.gender,
        address=EXCLUDED.address,
        profile_picture_url=EXCLUDED.profile_picture_url,
        kyc_doc_type=EXCLUDED.kyc_doc_type,
        bank_details_cipher=EXCLUDED.bank_details_cipher,
        bank_details_masked=EXCLUDED.bank_details_masked,
        updated_at = now()
      RETURNING *`;
    const vals = [userId, full_name, phone_number, date_of_birth, gender, JSON.stringify(address || {}), profile_picture_url || null, kyc_doc_type || null, bankCipher, bankMasked ? JSON.stringify(bankMasked) : null];
    const { rows } = await db.query(upsert, vals);

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'complete_profile',$2)`, [userId, JSON.stringify({ userId })]);

    return res.status(201).json({ profile: rows[0] });
  } catch (err) {
    console.error('step3 error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const norm = email.trim().toLowerCase();
    const { rows } = await db.query(`SELECT id,email,password_hash,role,is_blacklisted FROM users WHERE LOWER(email)=$1`, [norm]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (user.is_blacklisted) return res.status(403).json({ error: 'Account blacklisted' });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    await db.query(`UPDATE users SET updated_at=now() WHERE id=$1`, [user.id]);
    return res.json({ token, role: user.role });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- FORGOT / RESET PASSWORD (via OTPs) ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const norm = email.trim().toLowerCase();
    // create OTP always (do not reveal existence)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    await db.query(`INSERT INTO otps(id,user_email,otp_code,expires_at) VALUES($1,$2,$3,$4)`, [uuidv4(), norm, otp, expiresAt]);
    await sendMail({ to: norm, subject: `${process.env.APP_NAME} - Reset OTP`, text: `Your reset OTP: ${otp}` });
    return res.json({ message: 'If the email exists, a reset OTP has been sent.' });
  } catch (err) {
    console.error('forgot-password error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) return res.status(400).json({ error: 'email, otp, new_password required' });
    const norm = email.trim().toLowerCase();
    const q = `SELECT * FROM otps WHERE user_email=$1 AND otp_code=$2 ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await db.query(q, [norm, otp]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid OTP' });
    const rec = rows[0];
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
    await db.query(`DELETE FROM otps WHERE user_email=$1`, [norm]);
    const hash = await hashPassword(new_password);
    await db.query(`UPDATE users SET password_hash=$1, updated_at=now() WHERE LOWER(email)=$2`, [hash, norm]);
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- GET /me: return user and profile (if student/trust) ---
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const u = await db.query(`SELECT id,email,role,is_blacklisted,created_at FROM users WHERE id=$1`, [userId]);
    if (!u.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = u.rows[0];
    let extra = null;
    if (user.role === 'student') {
      const sp = await db.query(`SELECT * FROM student_profiles WHERE user_id=$1`, [userId]);
      extra = { profile: sp.rows[0] || null };
    } else if (user.role === 'trust') {
      const t = await db.query(`SELECT * FROM trusts WHERE user_id=$1`, [userId]);
      extra = { trust: t.rows[0] || null };
    }
    return res.json({ user: { id: user.id, email: user.email, role: user.role, is_blacklisted: user.is_blacklisted, created_at: user.created_at }, extra });
  } catch (err) {
    console.error('/me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
