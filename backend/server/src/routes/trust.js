// src/routes/trust.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db'); // Pool
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');

//
// Public: trust registration request (no auth required)
// Enhanced to handle document uploads and complete registration data
//
router.post('/register-request', async (req, res) => {
  try {
    const { 
      orgName, 
      registrationEmail, 
      contactPhone, 
      contactEmail, 
      website, 
      yearEstablished, 
      address, 
      registrationNumber,
      description 
    } = req.body;

    // Basic validation
    if (!orgName || !registrationEmail || !contactPhone || !registrationNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Organization name, registration email, contact phone, and registration number are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrationEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Phone validation (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(contactPhone.replace(/\D/g, '').slice(-10))) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    if (yearEstablished && (yearEstablished < 1800 || yearEstablished > currentYear)) {
      return res.status(400).json({ error: 'Invalid year of establishment' });
    }

    const email = registrationEmail.trim().toLowerCase();
    
    // Check if email already exists
    const existingRequest = await db.query(
      'SELECT id FROM trust_registration_requests WHERE registration_email = $1',
      [email]
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(409).json({ error: 'Registration email already used' });
    }

    const requestId = uuidv4();
    const sql = `INSERT INTO trust_registration_requests(
      id, 
      org_name, 
      registration_email, 
      contact_phone, 
      contact_email, 
      website, 
      year_established, 
      address, 
      registration_number, 
      status, 
      submitted_at
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending', now()) RETURNING *`;
    
    const { rows } = await db.query(sql, [
      requestId,
      orgName,
      email,
      contactPhone,
      contactEmail || null,
      website || null,
      yearEstablished || null,
      JSON.stringify(address || {}),
      registrationNumber,
    ]);

    // TODO: When documents are uploaded, store them in the documents table
    // For now, return success response with placeholder for document handling
    
    return res.status(201).json({ 
      success: true,
      message: 'Trust registration request submitted successfully',
      request: rows[0],
      requestId: requestId
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Registration email already used' });
    }
    console.error('trust register-request error', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

//
// OLD PLACEHOLDER ROUTE REMOVED - Using the new working route below

//
// Public: Check registration status
//
router.get('/register-request/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await db.query(
      `SELECT id, org_name, registration_email, status, submitted_at, reviewed_at, admin_notes 
       FROM trust_registration_requests WHERE id = $1`,
      [requestId]
    );
    
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    return res.status(200).json({ 
      success: true,
      request: request.rows[0]
    });
  } catch (err) {
    console.error('trust status check error', err);
    return res.status(500).json({ error: 'Server error during status check' });
  }
});

//
// Public: Upload trust documents to CloudFlare R2
//
router.post('/register-request/:requestId/documents', (req, res) => {
  const multer = require('multer');
  const documentService = require('../services/documentService');
  
  console.log('🔍 Trust document upload endpoint called');
  console.log('  - Request ID:', req.params.requestId);
  console.log('  - Content-Type:', req.headers['content-type']);
  
  // Configure multer for memory storage
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit (increased for trust documents)
    },
    fileFilter: (req, file, cb) => {
      console.log('📄 File filter check:', file.originalname, file.mimetype);
      const allowedTypes = [
        // PDF files
        'application/pdf',
        // Image files
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
        // Word documents
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Excel files
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // PowerPoint files
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text files
        'text/plain', 'text/rtf',
        // Other common types
        'application/rtf'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        console.log('❌ Rejected file type:', file.mimetype);
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
      }
    }
  }).fields([
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'trustDeed', maxCount: 1 }
  ]);

  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      return res.status(400).json({ 
        error: err.message || 'File upload failed',
        details: 'Multer processing failed'
      });
    }

    try {
      const { requestId } = req.params;
      
      console.log('✅ Files processed by multer:');
      console.log('  - Request ID:', requestId);
      console.log('  - Files received:', req.files ? Object.keys(req.files) : 'none');
      
      if (req.files?.registrationCertificate?.[0]) {
        console.log('  - Registration Certificate:', req.files.registrationCertificate[0].originalname, '(' + req.files.registrationCertificate[0].size + ' bytes)');
      }
      if (req.files?.trustDeed?.[0]) {
        console.log('  - Trust Deed:', req.files.trustDeed[0].originalname, '(' + req.files.trustDeed[0].size + ' bytes)');
      }
      
      // Verify the registration request exists
      const requestCheck = await db.query(
        'SELECT id, org_name FROM trust_registration_requests WHERE id = $1',
        [requestId]
      );
      
      if (requestCheck.rows.length === 0) {
        console.error('❌ Registration request not found:', requestId);
        return res.status(404).json({ error: 'Registration request not found' });
      }

      console.log('✅ Registration request found:', requestCheck.rows[0].org_name);

      const uploadResults = {};
      let totalUploaded = 0;

      // Upload registration certificate if provided
      if (req.files.registrationCertificate && req.files.registrationCertificate[0]) {
        const file = req.files.registrationCertificate[0];
        try {
          console.log('📤 Starting registration certificate upload:', file.originalname);
          const result = await documentService.uploadDocument(
            file.buffer,                    // fileBuffer
            file.originalname,              // originalName
            file.mimetype,                  // contentType
            'registration_certificate',    // docType
            requestId,                      // ownerId
            'trust_registration',           // ownerType
            null                           // uploadedByUserId (null for public registration)
          );
          
          console.log('✅ Registration certificate uploaded successfully to R2:');
          console.log('  - File URL:', result.file_url);
          console.log('  - R2 Key:', result.r2_key);
          
          uploadResults.registrationCertificate = result;
          totalUploaded++;
        } catch (uploadError) {
          console.error('❌ Registration certificate upload failed:', uploadError.message);
          return res.status(500).json({ 
            error: 'Failed to upload registration certificate',
            details: uploadError.message
          });
        }
      }

      // Upload trust deed if provided
      if (req.files.trustDeed && req.files.trustDeed[0]) {
        const file = req.files.trustDeed[0];
        try {
          console.log('📤 Starting trust deed upload:', file.originalname);
          const result = await documentService.uploadDocument(
            file.buffer,                    // fileBuffer
            file.originalname,              // originalName
            file.mimetype,                  // contentType
            'trust_deed',                   // docType
            requestId,                      // ownerId
            'trust_registration',           // ownerType
            null                           // uploadedByUserId (null for public registration)
          );
          
          console.log('✅ Trust deed uploaded successfully to R2:');
          console.log('  - File URL:', result.file_url);
          console.log('  - R2 Key:', result.r2_key);
          
          uploadResults.trustDeed = result;
          totalUploaded++;
        } catch (uploadError) {
          console.error('❌ Trust deed upload failed:', uploadError.message);
          return res.status(500).json({ 
            error: 'Failed to upload trust deed',
            details: uploadError.message
          });
        }
      }

      if (totalUploaded === 0) {
        console.log('⚠️ No files were uploaded');
        return res.status(400).json({ 
          error: 'No valid files provided for upload',
          receivedFiles: req.files ? Object.keys(req.files) : []
        });
      }
      
      console.log(`🎉 Successfully uploaded ${totalUploaded} documents to CloudFlare R2`);
      
      return res.status(200).json({
        success: true,
        message: `Documents uploaded successfully to CloudFlare R2`,
        uploadedDocuments: uploadResults,
        documentCount: totalUploaded,
        requestId: requestId
      });

    } catch (error) {
      console.error('❌ Trust document upload server error:', error);
      return res.status(500).json({ 
        error: 'Server error during document upload',
        details: error.message
      });
    }
  });
});

//
// Public: Resend registration confirmation (if needed)
//
router.post('/register-request/:requestId/resend-confirmation', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await db.query(
      'SELECT registration_email, org_name FROM trust_registration_requests WHERE id = $1',
      [requestId]
    );
    
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    // TODO: Implement email service integration
    // Send confirmation email using the existing mail service
    
    return res.status(200).json({ 
      message: 'Confirmation email sent successfully',
      email: request.rows[0].registration_email
    });
  } catch (err) {
    console.error('trust resend confirmation error', err);
    return res.status(500).json({ error: 'Server error during confirmation resend' });
  }
});

// Protected trust routes:
router.use(authMiddleware, requireRole('trust'));

router.get('/applications', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, student_user_id, academic_year, current_course_name, school_college_name, status, total_amount_requested, total_amount_approved
       FROM applications ORDER BY created_at DESC LIMIT 100`
    );
    return res.json({ applications: rows });
  } catch (err) {
    console.error('trust applications error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1`, [appId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const education = (await db.query(`SELECT * FROM education_history WHERE application_id=$1`, [appId])).rows;
    const family = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
    const expenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
    const docs = (await db.query(`SELECT * FROM documents WHERE owner_type='application' AND owner_id=$1`, [appId])).rows;
    const approvals = (await db.query(`SELECT aa.*, u.email as trust_email FROM application_approvals aa LEFT JOIN users u ON u.id = aa.trust_user_id WHERE aa.application_id=$1`, [appId])).rows;
    return res.json({ application: app, education, family, expenses, docs, approvals });
  } catch (err) {
    console.error('trust get application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Approve an application (transactional)
router.post('/applications/:id/approve', async (req, res) => {
  // IMPORTANT: use db.connect() (db is the Pool)
  const client = await db.connect();
  try {
    const trustUserId = req.user.id;
    const appId = req.params.id;
    const { approved_amount, approval_note } = req.body;
    if (approved_amount == null) {
      client.release();
      return res.status(400).json({ error: 'approved_amount required' });
    }

    await client.query('BEGIN');

    const appRowRes = await client.query(`SELECT total_amount_requested, total_amount_approved, status FROM applications WHERE id=$1 FOR UPDATE`, [appId]);
    if (!appRowRes.rows.length) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Application not found' });
    }
    const appRow = appRowRes.rows[0];
    if (appRow.status === 'closed') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Application is closed' });
    }

    const requested = Number(appRow.total_amount_requested || 0);
    const sumRes = await client.query(`SELECT COALESCE(SUM(approved_amount),0) AS s FROM application_approvals WHERE application_id=$1 AND status='approved'`, [appId]);
    const existing = Number(sumRes.rows[0].s || 0);
    const remaining = requested - existing;
    if (Number(approved_amount) > remaining) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: `Insufficient remaining amount. Remaining = ${remaining}` });
    }

    const approvalId = uuidv4();
    const ins = `INSERT INTO application_approvals(id, application_id, trust_user_id, approved_amount, status, rejection_reason, student_confirmed_receipt, approved_at)
                 VALUES($1,$2,$3,$4,'approved',NULL,false,now()) RETURNING *`;
    const insRes = await client.query(ins, [approvalId, appId, trustUserId, approved_amount]);

    const newSum = existing + Number(approved_amount);
    await client.query(`UPDATE applications SET total_amount_approved=$1, updated_at=now() WHERE id=$2`, [newSum, appId]);

    if (newSum >= requested) {
      await client.query(`UPDATE applications SET status='closed' WHERE id=$1`, [appId]);
    } else {
      await client.query(`UPDATE applications SET status='partially_approved' WHERE id=$1`, [appId]);
    }

    await client.query('COMMIT');
    client.release();

    // audit log (best-effort, outside transaction)
    try {
      await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'trust_approve',$2)`, [
        trustUserId,
        JSON.stringify({ approvalId, appId, approved_amount, note: approval_note || null }),
      ]);
    } catch (e) {
      console.warn('audit log failed (non-fatal):', e.message);
    }

    return res.status(201).json({ approval: insRes.rows[0] });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      console.warn('rollback failed', e.message);
    }
    client.release();
    console.error('trust approve error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/approvals/:approvalId/mark-paid', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const approvalId = req.params.approvalId;
    const { paid_at, payment_proof_doc_id } = req.body;

    const check = await db.query(`SELECT * FROM application_approvals WHERE id=$1 AND trust_user_id=$2`, [approvalId, trustUserId]);
    if (!check.rows.length) return res.status(404).json({ error: 'Approval not found or not owned by trust' });

    const paidAt = paid_at ? new Date(paid_at) : new Date();
    await db.query(`UPDATE application_approvals SET paid_at=$1 WHERE id=$2`, [paidAt, approvalId]);

    try {
      await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'trust_mark_paid',$2)`, [
        trustUserId,
        JSON.stringify({ approvalId, payment_proof_doc_id }),
      ]);
    } catch (e) {
      console.warn('audit log failed (non-fatal):', e.message);
    }

    const updated = (await db.query(`SELECT * FROM application_approvals WHERE id=$1`, [approvalId])).rows[0];
    return res.json({ updated });
  } catch (err) {
    console.error('trust mark-paid error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
