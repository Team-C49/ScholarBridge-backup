// src/routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware, requireRole('student'));

// GET /student/profile
router.get('/profile', async (req,res) => {
  try {
    const userId = req.user.id;
    const q = `SELECT sp.* , u.email
               FROM student_profiles sp
               JOIN users u ON u.id = sp.user_id
               WHERE sp.user_id=$1`;
    const { rows } = await db.query(q, [userId]);
    return res.json({ profile: rows[0] || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /student/profile to update fields (similar to step3 upsert if needed)
router.put('/profile', async (req,res) => {
  // You can reuse the step3 upsert logic from auth.js or call that endpoint from frontend.
  return res.status(501).json({ error: 'Use /api/auth/register/step3 to complete profile or call this endpoint to implement updates' });
});

// Document uploads: recommended flow
// 1) Client asks server for a signed upload URL (server signs for Cloudinary/S3)
// 2) Client uploads file directly to cloud storage using signed URL
// 3) Client calls /student/documents to register the file metadata in `documents` table

router.post('/documents', async (req,res) => {
  // req.body should contain: owner_type ('user' or 'application'), owner_id, doc_type, file_url (signed URL path), file_name
  try {
    const userId = req.user.id;
    const { owner_type, owner_id, doc_type, file_url, file_name, content_type, file_size } = req.body;
    const id = uuidv4();
    const sql = `INSERT INTO documents(id, owner_id, owner_type, doc_type, file_url, uploaded_by_user_id, created_at, file_name, content_type, file_size)
                 VALUES($1,$2,$3,$4,$5,$6,now(),$7,$8,$9) RETURNING *`;
    const { rows } = await db.query(sql, [id, owner_id, owner_type, doc_type, file_url, userId, file_name || null, content_type || null, file_size || null]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'upload_document', $2)`, [userId, JSON.stringify({ docId: id, owner_type, owner_id })]);
    return res.json({ document: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
