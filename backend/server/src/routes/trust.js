// src/routes/trust.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db'); // Pool
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * Utility function: Check if an application should be auto-closed
 * and update its status accordingly
 * @param {string} applicationId - The application ID to check
 * @returns {Promise<object>} - { closed: boolean, status: string, totalApproved: number }
 */
async function checkAndAutoCloseApplication(applicationId) {
  try {
    // Get application's requested amount and current approved total
    const result = await db.query(`
      SELECT 
        a.id,
        a.total_amount_requested,
        a.status as current_status,
        COALESCE(SUM(aa.approved_amount), 0) as total_approved
      FROM applications a
      LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
      WHERE a.id = $1
      GROUP BY a.id, a.total_amount_requested, a.status
    `, [applicationId]);

    if (result.rows.length === 0) {
      return { closed: false, status: null, totalApproved: 0 };
    }

    const app = result.rows[0];
    const totalApproved = parseFloat(app.total_approved);
    const totalRequested = parseFloat(app.total_amount_requested);

    // If fully funded, close the application
    if (totalApproved >= totalRequested && app.current_status !== 'closed') {
      await db.query(`
        UPDATE applications 
        SET status = 'closed', 
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [applicationId]);

      console.log(`✅ Application ${applicationId} auto-closed: ₹${totalApproved} >= ₹${totalRequested}`);
      return { closed: true, status: 'closed', totalApproved };
    } 
    // If partially funded, update status
    else if (totalApproved > 0 && app.current_status === 'submitted') {
      await db.query(`
        UPDATE applications 
        SET status = 'partially_approved',
            updated_at = NOW()
        WHERE id = $1
      `, [applicationId]);

      console.log(`✅ Application ${applicationId} marked as partially approved: ₹${totalApproved} / ₹${totalRequested}`);
      return { closed: false, status: 'partially_approved', totalApproved };
    }

    return { closed: app.current_status === 'closed', status: app.current_status, totalApproved };
  } catch (error) {
    console.error('Error in checkAndAutoCloseApplication:', error);
    throw error;
  }
}

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
    
    // Check if email is blacklisted - if so, deny registration
    const blacklistCheck = await db.query(
      'SELECT id, is_blacklisted FROM users WHERE email = $1 AND is_blacklisted = true',
      [email]
    );
    
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({ 
        error: 'This email address has been blacklisted and cannot register for a trust account' 
      });
    }

    // Check if email already has a pending or approved request
    const existingRequest = await db.query(
      'SELECT id, status FROM trust_registration_requests WHERE registration_email = $1',
      [email]
    );
    
    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === 'pending') {
        return res.status(409).json({ 
          error: 'A registration request with this email is already pending review. Please wait for admin approval.' 
        });
      } else if (status === 'approved') {
        return res.status(409).json({ 
          error: 'This email has already been approved for a trust account. Please try logging in instead.' 
        });
      }
      // If status is 'rejected', allow them to reapply (will overwrite the old request)
    }

    let requestId;
    let rows;

    if (existingRequest.rows.length > 0 && existingRequest.rows[0].status === 'rejected') {
      // Update existing rejected request
      requestId = existingRequest.rows[0].id;
      const updateSql = `UPDATE trust_registration_requests SET
        org_name = $1,
        contact_phone = $2,
        contact_email = $3,
        website = $4,
        year_established = $5,
        address = $6,
        registration_number = $7,
        status = 'pending',
        submitted_at = now(),
        admin_notes = null,
        reviewed_by = null,
        reviewed_at = null
      WHERE id = $8 RETURNING *`;
      
      const result = await db.query(updateSql, [
        orgName,
        contactPhone,
        contactEmail || null,
        website || null,
        yearEstablished || null,
        JSON.stringify(address || {}),
        registrationNumber,
        requestId
      ]);
      rows = result.rows;
    } else {
      // Create new request
      requestId = uuidv4();
      const insertSql = `INSERT INTO trust_registration_requests(
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
      
      const result = await db.query(insertSql, [
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
      rows = result.rows;
    }

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

/**
 * View/Download individual document for trust
 * GET /api/trusts/documents/:documentId/view
 * NOTE: This route is placed BEFORE auth middleware to allow custom token handling from query params
 */
router.get('/documents/:documentId/view', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    console.log('🔍 Document view request:');
    console.log('  - Document ID:', documentId);
    console.log('  - Token from query:', req.query.token ? 'Present' : 'Missing');
    console.log('  - Token from header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('  - Final token:', token ? token.substring(0, 50) + '...' : 'Missing');
    
    // Verify token if provided
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('✅ Token verified for user:', decoded.email, 'Role:', decoded.role);
      } catch (err) {
        console.error('❌ Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      console.error('❌ No token provided in request');
      return res.status(401).json({ error: 'Missing auth token' });
    }
    
    const zipService = require('../services/zipService');
    
    // Get document details
    const document = (await db.query(`
      SELECT d.*, COALESCE(a.student_user_id, d.owner_id) as student_user_id
      FROM documents d
      LEFT JOIN applications a ON d.owner_id = a.id AND d.owner_type = 'application'
      WHERE d.id = $1
    `, [documentId])).rows[0];
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the document from R2
    const fileKey = zipService.extractKeyFromUrl(document.file_url);
    if (!fileKey) {
      return res.status(404).json({ error: 'File not found' });
    }

    const documentStream = await zipService.getDocumentStream(fileKey);
    
    // Set appropriate headers based on file type
    const fileName = document.original_name || `${document.doc_type}_${document.id}`;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (fileExtension === 'pdf') contentType = 'application/pdf';
    else if (['jpg', 'jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
    else if (fileExtension === 'png') contentType = 'image/png';
    else if (fileExtension === 'gif') contentType = 'image/gif';
    else if (['doc', 'docx'].includes(fileExtension)) contentType = 'application/msword';
    else if (fileExtension === 'txt') contentType = 'text/plain';
    
    // Set headers for proper viewing
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Handle stream errors
    documentStream.on('error', (streamError) => {
      console.error('Document stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream document' });
      }
    });
    
    // Pipe the document stream to response
    documentStream.pipe(res);
    
  } catch (error) {
    console.error('Document view error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve document',
      message: error.message 
    });
  }
});

// Protected trust routes:
router.use(authMiddleware, requireRole('trust'));

/**
 * Maintenance endpoint: Check and auto-close all fully funded applications
 * GET /api/trusts/maintenance/auto-close-applications
 * This can be called periodically or manually to ensure all applications are properly closed
 */
router.get('/maintenance/auto-close-applications', async (req, res) => {
  try {
    console.log('🔧 Running maintenance: Auto-closing fully funded applications...');

    // Find all applications that are fully funded but not closed
    const applicationsResult = await db.query(`
      SELECT 
        a.id,
        a.status,
        a.total_amount_requested,
        COALESCE(SUM(aa.approved_amount), 0) as total_approved
      FROM applications a
      LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
      WHERE a.status != 'closed'
      GROUP BY a.id, a.status, a.total_amount_requested
      HAVING COALESCE(SUM(aa.approved_amount), 0) >= a.total_amount_requested
    `);

    const applicationsToClose = applicationsResult.rows;
    const closedCount = applicationsToClose.length;

    // Close each application
    for (const app of applicationsToClose) {
      await checkAndAutoCloseApplication(app.id);
    }

    // Also check for partially approved applications
    const partiallyApprovedResult = await db.query(`
      SELECT 
        a.id,
        a.status,
        COALESCE(SUM(aa.approved_amount), 0) as total_approved
      FROM applications a
      LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
      WHERE a.status = 'submitted'
      GROUP BY a.id, a.status
      HAVING COALESCE(SUM(aa.approved_amount), 0) > 0
    `);

    const partiallyApproved = partiallyApprovedResult.rows;
    const partiallyApprovedCount = partiallyApproved.length;

    for (const app of partiallyApproved) {
      await checkAndAutoCloseApplication(app.id);
    }

    res.json({
      success: true,
      message: 'Maintenance completed successfully',
      closedApplications: closedCount,
      updatedToPartiallyApproved: partiallyApprovedCount
    });
  } catch (err) {
    console.error('Error in maintenance auto-close:', err);
    res.status(500).json({ error: 'Maintenance failed' });
  }
});

/**
 * Get trust preferences
 * GET /api/trusts/me/preferences
 */
router.get('/me/preferences', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trust profile not found.' });
    }
    res.json(rows[0].preferences || {});
  } catch (err) {
    console.error('Error fetching trust preferences:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update trust preferences
 * PUT /api/trusts/me/preferences
 */
router.put('/me/preferences', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const preferences = req.body;

    const query = `
      UPDATE trusts
      SET preferences = $1, updated_at = now()
      WHERE user_id = $2
      RETURNING user_id, preferences;
    `;
    const { rows } = await db.query(query, [JSON.stringify(preferences), trustUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trust profile not found.' });
    }
    res.json({ 
      message: 'Preferences updated successfully.', 
      preferences: rows[0].preferences 
    });
  } catch (err) {
    console.error('Error updating trust preferences:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get dashboard statistics for the current trust
 * GET /api/trusts/dashboard/stats
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const trustUserId = req.user.id;

    const statsQuery = `
      WITH 
      -- Applications this trust has approved
      approved_apps AS (
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(aa.approved_amount), 0) as total_approved_amount
        FROM application_approvals aa
        WHERE aa.trust_user_id = $1 AND aa.status = 'approved'
      ),
      -- Applications this trust has rejected
      rejected_apps AS (
        SELECT COUNT(*) as count
        FROM application_approvals aa
        WHERE aa.trust_user_id = $1 AND aa.status = 'rejected'
      ),
      -- Applications pending review by this trust (not acted upon yet)
      pending_apps AS (
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(a.total_amount_requested), 0) as total_requested_amount
        FROM applications a
        LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.trust_user_id = $1
        WHERE aa.id IS NULL AND a.status != 'closed'
      )
      SELECT 
        (SELECT count FROM pending_apps) as total,
        (SELECT count FROM approved_apps) as approved,
        (SELECT count FROM rejected_apps) as rejected,
        (SELECT total_requested_amount FROM pending_apps) as total_requested,
        (SELECT total_approved_amount FROM approved_apps) as total_approved
    `;

    const { rows } = await db.query(statsQuery, [trustUserId]);
    const stats = rows[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      total_requested: 0,
      total_approved: 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get dashboard applications with "Best Fit" algorithm
 * GET /api/trusts/dashboard/applications
 */
router.get('/dashboard/applications', async (req, res) => {
  try {
    const trustUserId = req.user.id;
    const { view, status } = req.query;

    let statusFilter = '';
    let approvalJoin = '';
    
    if (status === 'approved') {
      // Show only applications approved by THIS trust
      approvalJoin = `
        INNER JOIN application_approvals current_trust_approval 
        ON current_trust_approval.application_id = a.id 
        AND current_trust_approval.trust_user_id = $1 
        AND current_trust_approval.status = 'approved'
      `;
      statusFilter = "";
    } else if (status === 'rejected') {
      // Show only applications rejected by THIS trust
      approvalJoin = `
        INNER JOIN application_approvals current_trust_approval 
        ON current_trust_approval.application_id = a.id 
        AND current_trust_approval.trust_user_id = $1 
        AND current_trust_approval.status = 'rejected'
      `;
      statusFilter = "";
    } else {
      // Default: Show applications NOT yet acted upon by this trust (pending review)
      // This includes applications that may have been approved by other trusts
      approvalJoin = `
        LEFT JOIN application_approvals current_trust_approval 
        ON current_trust_approval.application_id = a.id 
        AND current_trust_approval.trust_user_id = $1
      `;
      // Only show applications where this trust hasn't approved/rejected AND not fully funded (closed)
      statusFilter = "AND current_trust_approval.id IS NULL AND a.status != 'closed'";
    }

    const query = `
      WITH
      -- Step 1: Get the preferences for the currently logged-in trust
      trust_prefs AS (
        SELECT
          preferences->>'preferred_gender' AS p_gender,
          jsonb_array_to_text_array(preferences->'preferred_courses') AS p_courses,
          jsonb_array_to_text_array(preferences->'preferred_cities') AS p_cities,
          (preferences->>'max_family_income_lpa')::numeric AS p_max_income,
          (preferences->>'min_academic_percentage')::numeric AS p_min_grade
        FROM trusts
        WHERE user_id = $1
      ),
      -- Step 2: Pre-calculate academic and financial info for each application
      application_details AS (
        SELECT
          app.id AS application_id,
          -- Calculate Simple Average Academic Score from ALL education_history grades
          COALESCE(AVG(eh.grade::numeric), 0) AS weighted_academic_score,
          -- Calculate Total Family Income in Lakhs Per Annum by summing all family members
          COALESCE(SUM(fm.monthly_income), 0) * 12 / 100000 AS total_family_income_lpa
        FROM
          applications app
        LEFT JOIN education_history eh ON app.id = eh.application_id
        LEFT JOIN family_members fm ON app.id = fm.application_id
        GROUP BY app.id
      )
      -- Step 3: Main query to filter, score, and sort applications
      SELECT
        a.id AS application_id,
        sp.full_name,
        a.current_course_name,
        sp.address->>'city' as city,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        a.total_amount_requested,
        -- Use calculated sum from application_approvals, fall back to old column if no approvals exist
        GREATEST(
          COALESCE((
            SELECT SUM(aa.approved_amount) 
            FROM application_approvals aa 
            WHERE aa.application_id = a.id AND aa.status = 'approved'
          ), 0),
          COALESCE(a.total_amount_approved, 0)
        ) as total_amount_approved,
        a.status,
        a.created_at,
        sp.gender,
        a.academic_year,
        -- Current trust's approval status for this application
        current_trust_approval.status as my_approval_status,
        current_trust_approval.approved_amount as my_approved_amount,
        current_trust_approval.approved_at as my_approved_at,
        -- THE FINAL SCORING ALGORITHM
        (
          CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
          CASE WHEN tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
          CASE WHEN tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
          CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END +
          CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END
        ) AS match_score
      FROM
        applications a
      JOIN
        student_profiles sp ON a.student_user_id = sp.user_id
      JOIN
        application_details ad ON a.id = ad.application_id
      ${approvalJoin}
      CROSS JOIN
        trust_prefs tp
      -- Filter by status and apply smart filtering if needed
      WHERE 1=1 ${statusFilter}
      ${view !== 'all' ? `
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities))
        AND (tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income)
        AND (tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade)
      ` : ''}
      -- THE FINAL SORTING HIERARCHY
      ORDER BY
        match_score DESC,
        ad.total_family_income_lpa ASC,
        a.created_at ASC;
    `;

    const { rows } = await db.query(query, [trustUserId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching dashboard applications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get single application details for trust view
 * GET /api/trusts/application/:applicationId
 */
router.get('/application/:applicationId', async (req, res) => {
  try {
    const applicationId = req.params.applicationId;

    // Get comprehensive application details
    const query = `
      SELECT 
        a.*,
        sp.full_name, sp.phone_number, sp.date_of_birth, sp.gender,
        sp.address, sp.profile_picture_url, sp.kyc_doc_type,
        u.email as student_email,
        -- Calculate total family income
        COALESCE(SUM(fm.monthly_income), 0) as total_family_income
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN family_members fm ON a.id = fm.application_id
      WHERE a.id = $1
      GROUP BY a.id, sp.full_name, sp.phone_number, sp.date_of_birth, 
               sp.gender, sp.address, sp.profile_picture_url, sp.kyc_doc_type, u.email
    `;

    const applicationResult = await db.query(query, [applicationId]);
    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applicationResult.rows[0];

    // Get education history
    const educationQuery = `
      SELECT * FROM education_history 
      WHERE application_id = $1 
      ORDER BY year_of_passing DESC
    `;
    const educationResult = await db.query(educationQuery, [applicationId]);

    // Get family members
    const familyQuery = `
      SELECT * FROM family_members 
      WHERE application_id = $1 
      ORDER BY created_at
    `;
    const familyResult = await db.query(familyQuery, [applicationId]);

    // Get current expenses
    const expensesQuery = `
      SELECT * FROM current_expenses 
      WHERE application_id = $1 
      ORDER BY created_at
    `;
    const expensesResult = await db.query(expensesQuery, [applicationId]);

    // Get documents
    const documentsQuery = `
      SELECT d.*, 'application' as source_type
      FROM documents d 
      WHERE d.owner_id = $1 AND d.owner_type = 'application'
      UNION ALL
      SELECT d.*, 'kyc' as source_type
      FROM documents d 
      WHERE d.owner_id = $2 AND d.owner_type = 'student' AND d.doc_type = 'kyc_document'
      ORDER BY created_at
    `;
    const documentsResult = await db.query(documentsQuery, [applicationId, application.student_user_id]);

    res.json({
      application,
      education_history: educationResult.rows,
      family_members: familyResult.rows,
      current_expenses: expensesResult.rows,
      documents: documentsResult.rows
    });

  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

/**
 * Approve/Reject application
 * PUT /api/trusts/application/:applicationId/status
 */
router.put('/application/:applicationId/status', async (req, res) => {
  try {
    const applicationId = req.params.applicationId;
    const trustUserId = req.user.id;
    const { status, approved_amount, remarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    }

    // Get application details
    const appResult = await db.query(
      'SELECT total_amount_requested FROM applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (status === 'approved') {
      // Validate approved amount
      if (!approved_amount || approved_amount <= 0) {
        return res.status(400).json({ error: 'Approved amount must be greater than 0' });
      }

      // Insert into application_approvals table
      const insertQuery = `
        INSERT INTO application_approvals (
          application_id, 
          trust_user_id, 
          approved_amount, 
          status,
          approved_at
        ) VALUES ($1, $2, $3, 'approved', NOW())
        RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        applicationId,
        trustUserId,
        approved_amount
      ]);

      // Check if application should be auto-closed
      const { closed, status: newStatus, totalApproved } = await checkAndAutoCloseApplication(applicationId);

      res.json({
        message: 'Application approved successfully',
        approval: rows[0],
        applicationStatus: newStatus,
        applicationClosed: closed,
        totalApproved: totalApproved
      });
    } else {
      // For rejection, just add a rejection record
      const insertQuery = `
        INSERT INTO application_approvals (
          application_id, 
          trust_user_id, 
          approved_amount, 
          status,
          rejection_reason,
          approved_at
        ) VALUES ($1, $2, 0, 'rejected', $3, NOW())
        RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        applicationId,
        trustUserId,
        remarks || 'No reason provided'
      ]);

      res.json({
        message: 'Application rejected',
        approval: rows[0]
      });
    }

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

/**
 * Download application PDF for trust
 * GET /api/trusts/application/:applicationId/pdf
 */
router.get('/application/:applicationId/pdf', async (req, res) => {
  try {
    const applicationId = req.params.applicationId;
    const zipService = require('../services/zipService');
    
    // Generate PDF for the application
    const pdfBuffer = await zipService.generateApplicationPDF(applicationId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="application-${applicationId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF for trust:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * Download complete application package (ZIP) for trust
 * GET /api/trusts/application/:applicationId/complete
 */
router.get('/application/:applicationId/complete', async (req, res) => {
  try {
    const applicationId = req.params.applicationId;
    const zipService = require('../services/zipService');
    
    // Generate complete ZIP package
    const zipBuffer = await zipService.generateCompletePackage(applicationId);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="application-${applicationId}-complete.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error generating complete package for trust:', error);
    res.status(500).json({ error: 'Failed to generate complete package' });
  }
});

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
