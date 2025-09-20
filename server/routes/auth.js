// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../utils/mail');
const { encrypt, maskBank } = require('../utils/crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const OTP_TTL_MIN = 15;

// -------------------- STEP 1: register (student submits college email + password) --------------------
router.post('/register/step1', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const normEmail = email.trim().toLowerCase();
    // Optionally validate that it is a student email (e.g., endsWith '.edu' or contains college domain)
    // Create user row
    const id = uuidv4();
    const pwHash = await hashPassword(password);
    const insert = `INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'student') RETURNING id,email`;
    const { rows } = await db.query(insert, [id, normEmail, pwHash]);
    // create OTP
    const otp = Math.floor(100000 + Math.random()*900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN*60*1000);
    await db.query(`INSERT INTO otps(id,user_email,otp_code,expires_at) VALUES($1,$2,$3,$4)`, [uuidv4(), normEmail, otp, expiresAt]);
    // send OTP via email
    await sendMail({ to: normEmail, subject: `${process.env.APP_NAME} OTP`, text: `Your OTP: ${otp}. Expires in ${OTP_TTL_MIN} minutes.` });
    return res.status(201).json({ message: 'Registered step1 success. OTP sent to email.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- STEP 2: verify OTP (email + otp). Issues JWT if OK --------------------
router.post('/register/step2', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
    const normEmail = email.trim().toLowerCase();
    const q = `SELECT * FROM otps WHERE user_email=$1 AND otp_code=$2 ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await db.query(q, [normEmail, otp]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid OTP' });
    const rec = rows[0];
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
    // delete OTPs for that email (so it can't be reused)
    await db.query(`DELETE FROM otps WHERE user_email=$1`, [normEmail]);
    // issue a JWT that client will use to authorize Step 3 (completing profile)
    const userRes = await db.query(`SELECT id,email,role,is_blacklisted FROM users WHERE LOWER(email)=$1`, [normEmail]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];
    if (user.is_blacklisted) return res.status(403).json({ error: 'Account blacklisted' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ message: 'OTP verified', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------- STEP 3: complete profile (personal info, KYC, bank details) ----------------------
/**
 * Protected: client must send Authorization: Bearer <token> from Step2.
 * This endpoint inserts/updates into student_profiles table.
 */
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post('/register/step3', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number, date_of_birth, gender, address, profile_picture_url, kyc_doc_type, aadhaar_number, pan_number, bank_details } = req.body;
    // encrypt sensitive strings (aadhaar, pan, bank)
    // NOTE: we store KYC docs as documents table (upload) — here we store encrypted numbers only if provided
    let bankCipher = null;
    let bankMasked = null;
    if (bank_details && bank_details.account_number) {
      bankCipher = encrypt(JSON.stringify(bank_details));
      bankMasked = { account_masked: maskBank(bank_details.account_number), bank_name: bank_details.bank_name, ifsc: bank_details.ifsc };
    }
    // Similarly you can encrypt aadhaar/pan (but schema's student_profiles doesn't have aadhaar/pan columns; if you plan to store them, create docs table entries instead)
    const upsert = `
      INSERT INTO student_profiles(user_id, full_name, phone_number, date_of_birth, gender, address, profile_picture_url, kyc_doc_type, bank_details_cipher, bank_details_masked)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        address = EXCLUDED.address,
        profile_picture_url = EXCLUDED.profile_picture_url,
        kyc_doc_type = EXCLUDED.kyc_doc_type,
        bank_details_cipher = EXCLUDED.bank_details_cipher,
        bank_details_masked = EXCLUDED.bank_details_masked,
        updated_at = now()
      RETURNING *`;
    const vals = [userId, full_name, phone_number, date_of_birth, gender, JSON.stringify(address || {}), profile_picture_url || null, kyc_doc_type || null, bankCipher, bankMasked ? JSON.stringify(bankMasked) : null];
    const { rows } = await db.query(upsert, vals);
    // audit log
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'complete_profile', $2)`, [userId, JSON.stringify({ userId })]);
    return res.status(201).json({ profile: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- LOGIN --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normEmail = email.trim().toLowerCase();
    const { rows } = await db.query(`SELECT id,email,password_hash,role,is_blacklisted FROM users WHERE LOWER(email)=$1`, [normEmail]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (user.is_blacklisted) return res.status(403).json({ error: 'Account blacklisted' });
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    // issue JWT
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    await db.query(`UPDATE users SET updated_at=now() WHERE id=$1`, [user.id]);
    return res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------- FORGOT / RESET password (using otps table) --------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const norm = email.trim().toLowerCase();
    // generate OTP and insert in otps table
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN*60*1000);
    await db.query(`INSERT INTO otps(id,user_email,otp_code,expires_at) VALUES($1,$2,$3,$4)`, [uuidv4(), norm, otp, expiresAt]);
    await sendMail({ to: norm, subject: `${process.env.APP_NAME} - Reset OTP`, text: `Your reset OTP: ${otp}` });
    return res.json({ message: 'If the email exists, reset OTP sent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) return res.status(400).json({ error: 'email, otp and new_password required' });
    const norm = email.trim().toLowerCase();
    const q = `SELECT * FROM otps WHERE user_email=$1 AND otp_code=$2 ORDER BY created_at DESC LIMIT 1`;
    const { rows } = await db.query(q, [norm, otp]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid OTP' });
    const rec = rows[0];
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
    // delete otps
    await db.query(`DELETE FROM otps WHERE user_email=$1`, [norm]);
    const pwHash = await hashPassword(new_password);
    await db.query(`UPDATE users SET password_hash=$1, updated_at=now() WHERE LOWER(email)=$2`, [pwHash, norm]);
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
