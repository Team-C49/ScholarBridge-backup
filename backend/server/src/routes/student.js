// src/routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');
const documentService = require('../services/documentService');
const pdfService = require('../services/pdfService');
const zipService = require('../services/zipService');

/**
 * View document - supports both token auth and query param auth
 * GET /api/student/documents/:documentId/view
 */
router.get('/documents/:documentId/view', async (req, res) => {
  try {
    console.log('🔍 Document View Request Debug:');
    console.log('  - Document ID:', req.params.documentId);
    console.log('  - Query token present:', !!req.query.token);
    console.log('  - Authorization header:', req.headers.authorization ? 'present' : 'absent');
    
    // Handle token from query parameter for direct URL access
    let userId;
    if (req.query.token) {
      console.log('  - Using query parameter token');
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        // Handle both userId and id field names for compatibility
        userId = decoded.userId || decoded.id;
        console.log('  - Token decoded successfully, userId:', userId);
        console.log('  - Decoded token fields:', Object.keys(decoded));
      } catch (tokenError) {
        console.log('  - Token verification failed:', tokenError.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      // Try to use Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        console.log('  - Using authorization header token');
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          // Handle both userId and id field names for compatibility
          userId = decoded.userId || decoded.id;
          console.log('  - Header token decoded successfully, userId:', userId);
          console.log('  - Decoded token fields:', Object.keys(decoded));
        } catch (tokenError) {
          console.log('  - Header token verification failed:', tokenError.message);
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    }
    
    if (!userId) {
      console.log('  - No valid authentication found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const documentId = req.params.documentId;
    
    // First, verify the document belongs to this user (either application or KYC document)
    const document = (await db.query(`
      SELECT d.*, COALESCE(a.student_user_id, d.owner_id) as student_user_id
      FROM documents d
      LEFT JOIN applications a ON d.owner_id = a.id AND d.owner_type = 'application'
      WHERE d.id = $1 AND (
        (d.owner_type = 'application' AND a.student_user_id = $2) OR 
        (d.owner_type = 'student' AND d.owner_id = $2 AND d.doc_type = 'kyc_document')
      )
    `, [documentId, userId])).rows[0];
    
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

// Apply middleware to all other routes
router.use(authMiddleware, requireRole('student'));

router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info (email) and profile info in a single query
    const { rows } = await db.query(`
      SELECT sp.*, u.email 
      FROM student_profiles sp 
      LEFT JOIN users u ON sp.user_id = u.id 
      WHERE sp.user_id = $1
    `, [userId]);
    
    const profile = rows[0] || null;
    
    // Get associated documents
    let documents = [];
    if (profile) {
      documents = await documentService.getDocumentsByOwner(userId, 'student');
    }
    
    return res.json({ 
      profile,
      documents: documents.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        url: doc.file_url,
        description: doc.description,
        uploadedAt: doc.created_at
      }))
    });
  } catch (err) {
    console.error('student/profile error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/applications', async (req, res) => {
  try {
    const userId = req.user.id;
    const { academic_year, total_amount_requested, current_course_name, school_college_name, education_history, family_members, current_expenses } = req.body;

    if (!academic_year || total_amount_requested == null) return res.status(400).json({ error: 'academic_year and total_amount_requested required' });

    const profRes = await db.query(
      `SELECT full_name, phone_number, date_of_birth, gender, address, profile_picture_url, bank_details_masked FROM student_profiles WHERE user_id=$1`,
      [userId]
    );
    const prof = profRes.rows[0] || {};
    const snapshot = { profile: prof, created_at: new Date().toISOString() };

    const appId = uuidv4();
    const ins = `INSERT INTO applications(id, student_user_id, academic_year, current_course_name, school_college_name, total_amount_requested, application_snapshot, created_at)
                 VALUES($1,$2,$3,$4,$5,$6,$7,now()) RETURNING *`;
    const { rows } = await db.query(ins, [
      appId,
      userId,
      academic_year,
      current_course_name || null,
      school_college_name || null,
      total_amount_requested,
      snapshot, // pass object -> will be stored in jsonb
    ]);

    if (Array.isArray(education_history)) {
      for (const e of education_history) {
        await db.query(
          `INSERT INTO education_history(id, application_id, institution_name, qualification, year_of_passing, grade, marksheet_doc_id)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [uuidv4(), appId, e.institution_name, e.qualification, e.year_of_passing, e.grade, e.marksheet_doc_id || null]
        );
      }
    }

    if (Array.isArray(family_members)) {
      for (const f of family_members) {
        await db.query(
          `INSERT INTO family_members(id, application_id, name, relation, age, occupation, monthly_income, income_proof_doc_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uuidv4(), appId, f.name, f.relation, f.age || null, f.occupation || null, f.monthly_income || null, f.income_proof_doc_id || null]
        );
      }
    }

    if (Array.isArray(current_expenses)) {
      for (const ex of current_expenses) {
        await db.query(
          `INSERT INTO current_expenses(id, application_id, expense_name, amount, proof_doc_id)
           VALUES($1,$2,$3,$4,$5)`,
          [uuidv4(), appId, ex.expense_name, ex.amount, ex.proof_doc_id || null]
        );
      }
    }

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'create_application',$2)`, [
      userId,
      JSON.stringify({ application_id: appId }),
    ]);
    return res.status(201).json({ application: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Application already exists for this year' });
    console.error('create application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(`
      SELECT 
        a.*,
        COALESCE(SUM(aa.approved_amount), 0) as total_amount_approved,
        (a.total_amount_requested - COALESCE(SUM(aa.approved_amount), 0)) as remaining_amount
      FROM applications a
      LEFT JOIN application_approvals aa ON a.id = aa.application_id AND aa.status = 'approved'
      WHERE a.student_user_id = $1
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `, [userId]);
    return res.json({ applications: rows });
  } catch (err) {
    console.error('list applications error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    // Get application details
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Get student profile with email
    const profile = (await db.query(`
      SELECT sp.*, u.email 
      FROM student_profiles sp 
      LEFT JOIN users u ON sp.user_id = u.id 
      WHERE sp.user_id = $1
    `, [userId])).rows[0];

    // Get related data
    const educationHistory = (await db.query(`SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`, [appId])).rows;
    const familyMembers = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
    const currentExpenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
    
    // Get documents
    const documents = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='application' AND owner_id=$1
    `, [appId])).rows;
    
    // Get trust approvals with trust details
    const trustApprovals = (await db.query(`
      SELECT 
        aa.id,
        aa.approved_amount,
        aa.status,
        aa.rejection_reason,
        aa.approved_at,
        aa.student_confirmed_receipt,
        aa.student_confirmed_at,
        t.org_name as trust_name,
        t.contact_email as trust_email,
        t.contact_phone as trust_phone
      FROM application_approvals aa
      JOIN trusts t ON aa.trust_user_id = t.user_id
      WHERE aa.application_id = $1 AND aa.status = 'approved'
      ORDER BY aa.approved_at DESC
    `, [appId])).rows;
    
    // Calculate total approved amount
    const totalApproved = trustApprovals.reduce((sum, approval) => sum + parseFloat(approval.approved_amount || 0), 0);
    
    // Get KYC documents for this student
    const kycDocuments = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'
    `, [userId])).rows;

    return res.json({ 
      application: app, 
      profile,
      educationHistory, 
      familyMembers, 
      currentExpenses, 
      documents, 
      kycDocuments,
      trustApprovals,
      totalApproved,
      remainingAmount: parseFloat(app.total_amount_requested || 0) - totalApproved
    });
  } catch (err) {
    console.error('get application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/applications/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const aprCount = (await db.query(`SELECT COUNT(*) FROM application_approvals WHERE application_id=$1`, [appId])).rows[0].count;
    if (Number(aprCount) > 0) return res.status(400).json({ error: 'Cannot delete: approvals exist' });

    await db.query(`DELETE FROM applications WHERE id=$1`, [appId]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'delete_application',$2)`, [
      userId,
      JSON.stringify({ application_id: appId }),
    ]);
    return res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error('delete application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/applications/:appId/confirm/:approvalId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { appId, approvalId } = req.params;
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const upd = await db.query(`
      UPDATE application_approvals 
      SET student_confirmed_receipt = true, student_confirmed_at = NOW() 
      WHERE id=$1 AND application_id=$2 
      RETURNING *
    `, [approvalId, appId]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Approval not found' });

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'student_confirm_receipt',$2)`, [
      userId,
      JSON.stringify({ application_id: appId, approval_id: approvalId }),
    ]);
    return res.json({ updated: upd.rows[0] });
  } catch (err) {
    console.error('confirm receipt error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const { owner_type, owner_id, doc_type, file_url } = req.body;
    if (!owner_type || !owner_id || !doc_type || !file_url) return res.status(400).json({ error: 'owner_type, owner_id, doc_type, file_url required' });

    const id = uuidv4();
    const sql = `INSERT INTO documents(id, owner_id, owner_type, doc_type, file_url, uploaded_by_user_id, created_at)
                 VALUES($1,$2,$3,$4,$5,$6,now()) RETURNING *`;
    const { rows } = await db.query(sql, [id, owner_id, owner_type, doc_type, file_url, userId]);
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'upload_document',$2)`, [
      userId,
      JSON.stringify({ docId: id, owner_type, owner_id }),
    ]);
    return res.status(201).json({ document: rows[0] });
  } catch (err) {
    console.error('student documents error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get all documents for the student
 * GET /api/student/documents
 */
router.get('/documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const { docType } = req.query;
    
    const documents = await documentService.getDocumentsByOwner(userId, 'student', docType);
    
    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        url: doc.file_url,
        description: doc.description,
        uploadedAt: doc.created_at,
        uploadedBy: doc.uploaded_by_email
      }))
    });

  } catch (error) {
    console.error('Get student documents error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve documents',
      message: error.message 
    });
  }
});

/**
 * Get documents for a specific application
 * GET /api/student/applications/:id/documents
 */
router.get('/applications/:id/documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    // Verify application belongs to student
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const documents = await documentService.getDocumentsByOwner(appId, 'application');
    
    // Also get education history documents
    const educationDocs = await db.query(`
      SELECT eh.*, d.* FROM education_history eh 
      LEFT JOIN documents d ON d.id = eh.marksheet_doc_id 
      WHERE eh.application_id = $1 AND d.id IS NOT NULL
    `, [appId]);
    
    // Get family member documents
    const familyDocs = await db.query(`
      SELECT fm.*, d.* FROM family_members fm 
      LEFT JOIN documents d ON d.id = fm.income_proof_doc_id 
      WHERE fm.application_id = $1 AND d.id IS NOT NULL
    `, [appId]);
    
    // Get expense documents
    const expenseDocs = await db.query(`
      SELECT ce.*, d.* FROM current_expenses ce 
      LEFT JOIN documents d ON d.id = ce.proof_doc_id 
      WHERE ce.application_id = $1 AND d.id IS NOT NULL
    `, [appId]);

    res.json({
      success: true,
      applicationDocuments: documents.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        url: doc.file_url,
        description: doc.description,
        uploadedAt: doc.created_at
      })),
      educationDocuments: educationDocs.rows.map(row => ({
        id: row.id,
        docType: row.doc_type,
        url: row.file_url,
        institutionName: row.institution_name,
        qualification: row.qualification,
        yearOfPassing: row.year_of_passing
      })),
      familyDocuments: familyDocs.rows.map(row => ({
        id: row.id,
        docType: row.doc_type,
        url: row.file_url,
        memberName: row.name,
        relation: row.relation
      })),
      expenseDocuments: expenseDocs.rows.map(row => ({
        id: row.id,
        docType: row.doc_type,
        url: row.file_url,
        expenseName: row.expense_name,
        amount: row.amount
      }))
    });

  } catch (error) {
    console.error('Get application documents error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve application documents',
      message: error.message 
    });
  }
});

/**
 * Download application as PDF
 * GET /api/student/applications/:id/pdf
 */
router.get('/applications/:id/pdf', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    // Get complete application data (same as the detailed view)
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Get student profile with email
    const profile = (await db.query(`
      SELECT sp.*, u.email 
      FROM student_profiles sp 
      LEFT JOIN users u ON sp.user_id = u.id 
      WHERE sp.user_id = $1
    `, [userId])).rows[0];

    // Get related data
    const educationHistory = (await db.query(`SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`, [appId])).rows;
    const familyMembers = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
    const currentExpenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
    
    // Get documents
    const documents = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='application' AND owner_id=$1
    `, [appId])).rows;
    
    // Get trust payments
    const trustPayments = (await db.query(`
      SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks
      FROM trust_payments tp 
      WHERE tp.application_id=$1
      ORDER BY tp.payment_date DESC
    `, [appId])).rows;

    // Get KYC documents for this student
    const kycDocuments = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'
    `, [userId])).rows;

    // Generate PDF
    const applicationData = {
      application: app,
      profile,
      educationHistory,
      familyMembers,
      currentExpenses,
      documents,
      kycDocuments,
      trustPayments
    };

    const pdfBuffer = await pdfService.generateApplicationPDF(applicationData);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="application_${appId}_${app.academic_year}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
});

/**
 * Download application documents as ZIP
 * GET /api/student/applications/:id/documents/zip
 */
router.get('/applications/:id/documents/zip', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    // Verify application belongs to user
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Get all documents for this application
    const documents = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='application' AND owner_id=$1
    `, [appId])).rows;
    
    // Get KYC documents for this student
    const kycDocuments = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'
    `, [userId])).rows;

    // Combine all documents
    const allDocuments = [...documents, ...kycDocuments];

    if (allDocuments.length === 0) {
      return res.status(404).json({ error: 'No documents found for this application' });
    }

    // Generate ZIP file
    const zipBuffer = await zipService.createDocumentsZip(allDocuments, appId);
    
    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="application_${appId}_documents.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    
    res.send(zipBuffer);
    
  } catch (error) {
    console.error('Download ZIP error:', error);
    res.status(500).json({ 
      error: 'Failed to generate ZIP',
      message: error.message 
    });
  }
});

/**
 * Download complete application package (PDF + Documents ZIP)
 * GET /api/student/applications/:id/download-complete
 */
router.get('/applications/:id/download-complete', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    // Verify application belongs to user
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Get complete application data
    const profile = (await db.query(`
      SELECT sp.*, u.email 
      FROM student_profiles sp 
      LEFT JOIN users u ON sp.user_id = u.id 
      WHERE sp.user_id = $1
    `, [userId])).rows[0];

    const educationHistory = (await db.query(`SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`, [appId])).rows;
    const familyMembers = (await db.query(`SELECT * FROM family_members WHERE application_id=$1`, [appId])).rows;
    const currentExpenses = (await db.query(`SELECT * FROM current_expenses WHERE application_id=$1`, [appId])).rows;
    
    const documents = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='application' AND owner_id=$1
    `, [appId])).rows;
    
    const kycDocuments = (await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'
    `, [userId])).rows;
    
    const trustPayments = (await db.query(`
      SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks
      FROM trust_payments tp 
      WHERE tp.application_id=$1
      ORDER BY tp.payment_date DESC
    `, [appId])).rows;

    // Generate PDF
    console.log('Generating complete package for app:', appId);
    const applicationData = {
      application: app,
      profile,
      educationHistory,
      familyMembers,
      currentExpenses,
      documents,
      kycDocuments,
      trustPayments
    };

    console.log('Generating PDF...');
    const pdfBuffer = await pdfService.generateApplicationPDF(applicationData);
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
    
    // Combine all documents
    const allDocuments = [...documents, ...kycDocuments];
    console.log('Total documents to include in ZIP:', allDocuments.length);
    
    // Create complete package ZIP with PDF and documents
    console.log('Creating complete package ZIP...');
    const completeZipBuffer = await zipService.createCompletePackageZip(pdfBuffer, allDocuments, appId);
    console.log('Complete ZIP created, size:', completeZipBuffer.length, 'bytes');
    
    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="complete_application_${appId}.zip"`);
    res.setHeader('Content-Length', completeZipBuffer.length);
    
    res.send(completeZipBuffer);
    
  } catch (error) {
    console.error('Download complete package error:', error);
    res.status(500).json({ 
      error: 'Failed to generate complete package',
      message: error.message 
    });
  }
});

/**
 * Update trust payment confirmation
 * PUT /api/student/trust-payments/:paymentId/confirm
 */
router.put('/trust-payments/:paymentId/confirm', async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.paymentId;
    const { confirmed } = req.body;
    
    // Verify the trust payment belongs to an application owned by this user
    const payment = (await db.query(`
      SELECT tp.*, a.student_user_id 
      FROM trust_payments tp
      LEFT JOIN applications a ON tp.application_id = a.id
      WHERE tp.id = $1
    `, [paymentId])).rows[0];
    
    if (!payment) {
      return res.status(404).json({ error: 'Trust payment not found' });
    }
    
    if (payment.student_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update the confirmation status
    await db.query(`
      UPDATE trust_payments 
      SET confirmed_by_student = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [confirmed, paymentId]);

    res.json({ 
      message: 'Trust payment confirmation updated successfully',
      paymentId: paymentId,
      confirmed: confirmed
    });
    
  } catch (error) {
    console.error('Trust payment confirmation error:', error);
    res.status(500).json({ 
      error: 'Failed to update confirmation',
      message: error.message 
    });
  }
});

module.exports = router;
