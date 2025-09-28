// src/services/applicationService.js
const db = require('../utils/db');
const documentService = require('./documentService');
const { v4: uuidv4 } = require('uuid');

class ApplicationService {
  /**
   * Create application with document handling
   * @param {string} userId - Student user ID
   * @param {Object} applicationData - Application data
   * @param {Array} documents - Array of document files and metadata
   * @returns {Promise<Object>} Created application with documents
   */
  async createApplicationWithDocuments(userId, applicationData, documents = []) {
    // Note: Using basic queries instead of transactions for simplicity
    // In production, consider implementing proper transaction support
    
    try {
      
      const { 
        academic_year, 
        total_amount_requested, 
        current_course_name, 
        school_college_name, 
        education_history, 
        family_members, 
        current_expenses 
      } = applicationData;

      // Get student profile for snapshot
      const profRes = await db.query(
        `SELECT full_name, phone_number, date_of_birth, gender, address, profile_picture_url, bank_details_masked FROM student_profiles WHERE user_id=$1`,
        [userId]
      );
      const prof = profRes.rows[0] || {};
      const snapshot = { profile: prof, created_at: new Date().toISOString() };

      // Create application
      const appId = uuidv4();
      const appResult = await db.query(
        `INSERT INTO applications(id, student_user_id, academic_year, current_course_name, school_college_name, total_amount_requested, application_snapshot, created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,now()) RETURNING *`,
        [appId, userId, academic_year, current_course_name || null, school_college_name || null, total_amount_requested, snapshot]
      );

      const application = appResult.rows[0];

      // Handle education history with documents
      if (Array.isArray(education_history)) {
        for (let i = 0; i < education_history.length; i++) {
          const e = education_history[i];
          const eduId = uuidv4();
          
          let marksheetDocId = null;
          
          // Find corresponding marksheet document
          const marksheetDoc = documents.find(doc => 
            doc.docType === 'marksheet' && doc.relationId === `education_${i}`
          );
          
          if (marksheetDoc && marksheetDoc.file) {
            const document = await documentService.uploadDocument(
              marksheetDoc.file.buffer,
              marksheetDoc.file.originalname,
              marksheetDoc.file.mimetype,
              'marksheet',
              eduId,
              'education_history',
              userId
            );
            marksheetDocId = document.id;
          }

          await db.query(
            `INSERT INTO education_history(id, application_id, institution_name, qualification, year_of_passing, grade, marksheet_doc_id)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [eduId, appId, e.institution_name, e.qualification, e.year_of_passing, e.grade, marksheetDocId]
          );
        }
      }

      // Handle family members with income proof documents
      if (Array.isArray(family_members)) {
        for (let i = 0; i < family_members.length; i++) {
          const f = family_members[i];
          const familyId = uuidv4();
          
          let incomeProofDocId = null;
          
          // Find corresponding income proof document
          const incomeProofDoc = documents.find(doc => 
            doc.docType === 'income_proof' && doc.relationId === `family_${i}`
          );
          
          if (incomeProofDoc && incomeProofDoc.file) {
            const document = await documentService.uploadDocument(
              incomeProofDoc.file.buffer,
              incomeProofDoc.file.originalname,
              incomeProofDoc.file.mimetype,
              'income_proof',
              familyId,
              'family_member',
              userId
            );
            incomeProofDocId = document.id;
          }

          await db.query(
            `INSERT INTO family_members(id, application_id, name, relation, age, occupation, monthly_income, income_proof_doc_id)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [familyId, appId, f.name, f.relation, f.age || null, f.occupation || null, f.monthly_income || null, incomeProofDocId]
          );
        }
      }

      // Handle current expenses with proof documents
      if (Array.isArray(current_expenses)) {
        for (let i = 0; i < current_expenses.length; i++) {
          const ex = current_expenses[i];
          const expenseId = uuidv4();
          
          let proofDocId = null;
          
          // Find corresponding expense proof document
          const expenseProofDoc = documents.find(doc => 
            doc.docType === 'expense_proof' && doc.relationId === `expense_${i}`
          );
          
          if (expenseProofDoc && expenseProofDoc.file) {
            const document = await documentService.uploadDocument(
              expenseProofDoc.file.buffer,
              expenseProofDoc.file.originalname,
              expenseProofDoc.file.mimetype,
              'expense_proof',
              expenseId,
              'current_expense',
              userId
            );
            proofDocId = document.id;
          }

          await db.query(
            `INSERT INTO current_expenses(id, application_id, expense_name, amount, proof_doc_id)
             VALUES($1,$2,$3,$4,$5)`,
            [expenseId, appId, ex.expense_name, ex.amount, proofDocId]
          );
        }
      }

      // Handle additional application documents (supporting documents, etc.)
      const applicationDocuments = documents.filter(doc => 
        doc.ownerType === 'application'
      );

      const uploadedDocs = [];
      for (const docData of applicationDocuments) {
        if (docData.file) {
          const document = await documentService.uploadDocument(
            docData.file.buffer,
            docData.file.originalname,
            docData.file.mimetype,
            docData.docType,
            appId,
            'application',
            userId
          );
          uploadedDocs.push(document);
        }
      }

      // Log the action
      await db.query(
        `INSERT INTO audit_logs(user_id, action, details) VALUES($1,'create_application',$2)`,
        [userId, JSON.stringify({ application_id: appId, documents_count: uploadedDocs.length })]
      );

      return {
        application,
        documents: uploadedDocs.map(doc => ({
          id: doc.id,
          docType: doc.doc_type,
          url: doc.file_url,
          description: doc.description
        }))
      };

    } catch (error) {
      console.error('Create application with documents error:', error);
      throw error;
    }
  }

  /**
   * Get complete application with all documents
   * @param {string} appId - Application ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Complete application data
   */
  async getApplicationWithDocuments(appId, userId) {
    try {
      // Get application
      const app = (await db.query(
        `SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`,
        [appId, userId]
      )).rows[0];
      
      if (!app) {
        throw new Error('Application not found');
      }

      // Get all related data
      const [education, family, expenses, applicationDocs, approvals] = await Promise.all([
        // Education history with documents
        db.query(`
          SELECT eh.*, d.id as doc_id, d.file_url as doc_url, d.doc_type, d.created_at as doc_uploaded_at
          FROM education_history eh 
          LEFT JOIN documents d ON d.id = eh.marksheet_doc_id 
          WHERE eh.application_id = $1
        `, [appId]),
        
        // Family members with documents
        db.query(`
          SELECT fm.*, d.id as doc_id, d.file_url as doc_url, d.doc_type, d.created_at as doc_uploaded_at
          FROM family_members fm 
          LEFT JOIN documents d ON d.id = fm.income_proof_doc_id 
          WHERE fm.application_id = $1
        `, [appId]),
        
        // Current expenses with documents
        db.query(`
          SELECT ce.*, d.id as doc_id, d.file_url as doc_url, d.doc_type, d.created_at as doc_uploaded_at
          FROM current_expenses ce 
          LEFT JOIN documents d ON d.id = ce.proof_doc_id 
          WHERE ce.application_id = $1
        `, [appId]),
        
        // Application documents
        documentService.getDocumentsByOwner(appId, 'application'),
        
        // Approvals
        db.query(`
          SELECT aa.*, u.email as trust_email 
          FROM application_approvals aa 
          LEFT JOIN users u ON u.id = aa.trust_user_id 
          WHERE aa.application_id = $1
        `, [appId])
      ]);

      return {
        application: app,
        education: education.rows.map(row => ({
          id: row.id,
          institutionName: row.institution_name,
          qualification: row.qualification,
          yearOfPassing: row.year_of_passing,
          grade: row.grade,
          document: row.doc_id ? {
            id: row.doc_id,
            url: row.doc_url,
            type: row.doc_type,
            uploadedAt: row.doc_uploaded_at
          } : null
        })),
        family: family.rows.map(row => ({
          id: row.id,
          name: row.name,
          relation: row.relation,
          age: row.age,
          occupation: row.occupation,
          monthlyIncome: row.monthly_income,
          document: row.doc_id ? {
            id: row.doc_id,
            url: row.doc_url,
            type: row.doc_type,
            uploadedAt: row.doc_uploaded_at
          } : null
        })),
        expenses: expenses.rows.map(row => ({
          id: row.id,
          expenseName: row.expense_name,
          amount: row.amount,
          document: row.doc_id ? {
            id: row.doc_id,
            url: row.doc_url,
            type: row.doc_type,
            uploadedAt: row.doc_uploaded_at
          } : null
        })),
        documents: applicationDocs.map(doc => ({
          id: doc.id,
          docType: doc.doc_type,
          url: doc.file_url,
          description: doc.description,
          uploadedAt: doc.created_at
        })),
        approvals: approvals.rows
      };

    } catch (error) {
      console.error('Get application with documents error:', error);
      throw error;
    }
  }

  /**
   * Add documents to existing application
   * @param {string} appId - Application ID
   * @param {string} userId - User ID
   * @param {Array} documents - Documents to add
   * @returns {Promise<Array>} Uploaded documents
   */
  async addDocumentsToApplication(appId, userId, documents) {
    try {
      // Verify application belongs to user
      const app = (await db.query(
        `SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`,
        [appId, userId]
      )).rows[0];
      
      if (!app) {
        throw new Error('Application not found');
      }

      const uploadedDocs = [];
      
      for (const docData of documents) {
        if (docData.file) {
          const document = await documentService.uploadDocument(
            docData.file.buffer,
            docData.file.originalname,
            docData.file.mimetype,
            docData.docType,
            appId,
            'application',
            userId
          );
          uploadedDocs.push(document);
        }
      }

      // Log the action
      await db.query(
        `INSERT INTO audit_logs(user_id, action, details) VALUES($1,'add_application_documents',$2)`,
        [userId, JSON.stringify({ application_id: appId, documents_count: uploadedDocs.length })]
      );

      return uploadedDocs.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        url: doc.file_url,
        description: doc.description
      }));

    } catch (error) {
      console.error('Add documents to application error:', error);
      throw error;
    }
  }
}

module.exports = new ApplicationService();