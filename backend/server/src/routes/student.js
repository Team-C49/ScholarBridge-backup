// src/routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');
const documentService = require('../services/documentService');

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
    const { rows } = await db.query(`SELECT * FROM applications WHERE student_user_id=$1 ORDER BY created_at DESC`, [userId]);
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
    
    // Get trust payments
    const trustPayments = (await db.query(`
      SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks
      FROM trust_payments tp 
      WHERE tp.application_id=$1
      ORDER BY tp.payment_date DESC
    `, [appId])).rows;

    return res.json({ 
      application: app, 
      profile,
      educationHistory, 
      familyMembers, 
      currentExpenses, 
      documents, 
      trustPayments
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

    const upd = await db.query(`UPDATE application_approvals SET student_confirmed_receipt = true WHERE id=$1 AND application_id=$2 RETURNING *`, [approvalId, appId]);
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
    
    // Verify application belongs to user
    const app = (await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId])).rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // For now, return a simple message - PDF generation will be implemented later
    res.status(501).json({ 
      error: 'PDF generation not yet implemented',
      message: 'This feature will be available soon'
    });
    
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

    // For now, return a simple message - ZIP generation will be implemented later
    res.status(501).json({ 
      error: 'ZIP generation not yet implemented',
      message: 'This feature will be available soon'
    });
    
  } catch (error) {
    console.error('Download ZIP error:', error);
    res.status(500).json({ 
      error: 'Failed to generate ZIP',
      message: error.message 
    });
  }
});

module.exports = router;
