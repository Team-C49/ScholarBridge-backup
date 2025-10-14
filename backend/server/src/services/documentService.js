// src/services/documentService.js
const db = require('../utils/db');
const r2Client = require('../utils/r2');
const { v4: uuidv4 } = require('uuid');

class DocumentService {
  constructor() {
    // Define document types and their configurations
    this.documentTypes = {
      // Profile documents
      'profile_picture': {
        folder: 'profile-pictures',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        description: 'Profile Picture'
      },
      'kyc_document': {
        folder: 'kyc-documents',
        allowedTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        description: 'KYC Document'
      },
      
      // Academic documents
      'marksheet': {
        folder: 'academic-documents/marksheets',
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Academic Marksheet'
      },
      'degree_certificate': {
        folder: 'academic-documents/certificates',
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Degree Certificate'
      },
      'transcript': {
        folder: 'academic-documents/transcripts',
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSize: 15 * 1024 * 1024,
        description: 'Academic Transcript'
      },
      
      // Financial documents
      'income_proof': {
        folder: 'financial-documents/income-proofs',
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Income Proof Document'
      },
      'expense_proof': {
        folder: 'financial-documents/expense-proofs',
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Expense Proof Document'
      },

      // Application-specific documents (organized by application ID)
      'application_marksheet': {
        folder: 'student-applications', // Will be extended with /{applicationId}/marksheets
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Academic Marksheet for Application'
      },
      'application_income_proof': {
        folder: 'student-applications', // Will be extended with /{applicationId}/income-proofs
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Income Proof for Application'
      },
      'application_expense_proof': {
        folder: 'student-applications', // Will be extended with /{applicationId}/expense-proofs
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Expense Proof for Application'
      },
      'bank_statement': {
        folder: 'financial-documents/bank-statements',
        allowedTypes: [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        maxSize: 20 * 1024 * 1024,
        description: 'Bank Statement'
      },
      
      // Trust/Organization documents
      'registration_certificate': {
        folder: 'trust-documents/registration',
        allowedTypes: [
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
          'application/rtf'
        ],
        maxSize: 10 * 1024 * 1024,
        description: 'Registration Certificate'
      },
      'trust_deed': {
        folder: 'trust-documents/deeds',
        allowedTypes: [
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
          'application/rtf'
        ],
        maxSize: 20 * 1024 * 1024,
        description: 'Trust Deed'
      },
      
      // General documents
      'supporting_document': {
        folder: 'supporting-documents',
        allowedTypes: [
          'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv'
        ],
        maxSize: 15 * 1024 * 1024,
        description: 'Supporting Document'
      }
    };
  }

  /**
   * Upload a document and save metadata to database
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} contentType - MIME type
   * @param {string} docType - Document type from documentTypes
   * @param {string} ownerId - ID of the document owner
   * @param {string} ownerType - Type of owner (student, trust, application, family_member, etc.)
   * @param {string} uploadedByUserId - ID of the user uploading the document
   * @returns {Promise<Object>} Document record with metadata
   */
  async uploadDocument(fileBuffer, originalName, contentType, docType, ownerId, ownerType, uploadedByUserId) {
    try {
      // Validate document type
      if (!this.documentTypes[docType]) {
        throw new Error(`Invalid document type: ${docType}`);
      }

      const config = this.documentTypes[docType];

      // Validate file
      this.validateFile({
        buffer: fileBuffer,
        originalname: originalName,
        mimetype: contentType,
        size: fileBuffer.length
      }, config);

      // Upload to R2
      const uploadResult = await r2Client.uploadFile(
        fileBuffer,
        originalName,
        contentType,
        config.folder
      );

      // Save document metadata to database
      const documentId = uuidv4();
      const insertQuery = `
        INSERT INTO documents (
          id, owner_id, owner_type, doc_type, file_url, r2_key, 
          original_name, content_type, file_size, description, 
          uploaded_by_user_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        documentId,
        ownerId,
        ownerType,
        docType,
        uploadResult.url,
        uploadResult.key,
        uploadResult.originalName,
        uploadResult.contentType,
        uploadResult.size,
        config.description,
        uploadedByUserId
      ]);

      const document = rows[0];

      return {
        ...document,
        r2_key: uploadResult.key,
        original_name: uploadResult.originalName,
        content_type: uploadResult.contentType,
        size: uploadResult.size,
        description: config.description
      };

    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  /**
   * Upload document for student application with specific folder structure
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original file name
   * @param {string} contentType - MIME type
   * @param {string} docType - Document type (application_marksheet, application_income_proof, etc.)
   * @param {string} applicationId - Application ID for folder organization
   * @param {string} uploadedByUserId - ID of the user uploading
   * @returns {Promise<Object>} Document record with metadata
   */
  async uploadApplicationDocument(fileBuffer, originalName, contentType, docType, applicationId, uploadedByUserId) {
    try {
      // Validate document type
      if (!this.documentTypes[docType]) {
        throw new Error(`Invalid document type: ${docType}`);
      }

      const config = this.documentTypes[docType];

      // Validate file
      this.validateFile({
        buffer: fileBuffer,
        originalname: originalName,
        mimetype: contentType,
        size: fileBuffer.length
      }, config);

      // Create application-specific folder structure
      let folder;
      if (docType === 'application_marksheet') {
        folder = `student-applications/${applicationId}/marksheets`;
      } else if (docType === 'application_income_proof') {
        folder = `student-applications/${applicationId}/income-proofs`;
      } else if (docType === 'application_expense_proof') {
        folder = `student-applications/${applicationId}/expense-proofs`;
      } else {
        folder = `student-applications/${applicationId}/${docType}`;
      }

      // Upload to R2 with specific folder
      const uploadResult = await r2Client.uploadFile(
        fileBuffer,
        originalName,
        contentType,
        folder
      );

      // Save document metadata to database
      const documentId = uuidv4();
      const insertQuery = `
        INSERT INTO documents (
          id, owner_id, owner_type, doc_type, file_url, r2_key, 
          original_name, content_type, file_size, description, 
          uploaded_by_user_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        documentId,
        applicationId,
        'application',
        docType,
        uploadResult.url,
        uploadResult.key,
        uploadResult.originalName,
        uploadResult.contentType,
        uploadResult.size,
        config.description,
        uploadedByUserId
      ]);

      const document = rows[0];

      return {
        ...document,
        r2_key: uploadResult.key,
        original_name: uploadResult.originalName,
        content_type: uploadResult.contentType,
        size: uploadResult.size,
        description: config.description
      };

    } catch (error) {
      console.error('Application document upload error:', error);
      throw error;
    }
  }

  /**
   * Get documents by owner
   * @param {string} ownerId - Owner ID
   * @param {string} ownerType - Owner type
   * @param {string} docType - Optional document type filter
   * @returns {Promise<Array>} Array of documents
   */
  async getDocumentsByOwner(ownerId, ownerType, docType = null) {
    try {
      let query = `
        SELECT d.*, u.email as uploaded_by_email
        FROM documents d
        LEFT JOIN users u ON d.uploaded_by_user_id = u.id
        WHERE d.owner_id = $1 AND d.owner_type = $2
      `;
      const params = [ownerId, ownerType];

      if (docType) {
        query += ` AND d.doc_type = $3`;
        params.push(docType);
      }

      query += ` ORDER BY d.created_at DESC`;

      const { rows } = await db.query(query, params);

      return rows.map(doc => ({
        ...doc,
        description: this.documentTypes[doc.doc_type]?.description || doc.doc_type
      }));

    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  /**
   * Get a single document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Document record
   */
  async getDocumentById(documentId) {
    try {
      const { rows } = await db.query(
        `SELECT d.*, u.email as uploaded_by_email
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by_user_id = u.id
         WHERE d.id = $1`,
        [documentId]
      );

      if (!rows.length) {
        throw new Error('Document not found');
      }

      const document = rows[0];
      return {
        ...document,
        description: this.documentTypes[document.doc_type]?.description || document.doc_type
      };

    } catch (error) {
      console.error('Get document by ID error:', error);
      throw error;
    }
  }

  /**
   * Delete document from both R2 and database
   * @param {string} documentId - Document ID
   * @param {string} userId - User requesting deletion (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteDocument(documentId, userId) {
    try {
      // Get document details
      const document = await this.getDocumentById(documentId);

      // Check if user has permission to delete (owner or uploaded by user)
      // You can implement more sophisticated authorization logic here
      
      // Extract R2 key from URL (assuming URL format)
      const urlParts = document.file_url.split('/');
      const r2Key = urlParts.slice(-2).join('/'); // Get folder/filename part

      // Delete from R2
      await r2Client.deleteFile(r2Key);

      // Delete from database
      await db.query(`DELETE FROM documents WHERE id = $1`, [documentId]);

      return true;

    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  }

  /**
   * Generate download URL for document
   * @param {string} documentId - Document ID
   * @param {number} expiresIn - URL expiration in seconds
   * @returns {Promise<string>} Signed download URL
   */
  async getDownloadUrl(documentId, expiresIn = 3600) {
    try {
      const document = await this.getDocumentById(documentId);
      
      // Extract R2 key from URL
      const urlParts = document.file_url.split('/');
      const r2Key = urlParts.slice(-2).join('/');

      return await r2Client.generatePresignedDownloadUrl(r2Key, expiresIn);

    } catch (error) {
      console.error('Generate download URL error:', error);
      throw error;
    }
  }

  /**
   * Validate file against document type configuration
   * @param {Object} file - File object
   * @param {Object} config - Document type configuration
   */
  validateFile(file, config) {
    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`);
    }

    if (file.size > config.maxSize) {
      throw new Error(`File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`);
    }
  }

  /**
   * Get document type configuration
   * @param {string} docType - Document type
   * @returns {Object} Configuration object
   */
  getDocumentTypeConfig(docType) {
    return this.documentTypes[docType] || null;
  }

  /**
   * Get all available document types
   * @returns {Object} All document types with configurations
   */
  getAllDocumentTypes() {
    return this.documentTypes;
  }

  /**
   * Batch upload documents (for forms with multiple documents)
   * @param {Array} files - Array of file objects with metadata
   * @param {string} ownerId - Owner ID
   * @param {string} ownerType - Owner type
   * @param {string} uploadedByUserId - Uploader user ID
   * @returns {Promise<Array>} Array of uploaded document records
   */
  async batchUploadDocuments(files, ownerId, ownerType, uploadedByUserId) {
    const results = [];
    const errors = [];

    for (const fileData of files) {
      try {
        const result = await this.uploadDocument(
          fileData.buffer,
          fileData.originalName,
          fileData.contentType,
          fileData.docType,
          ownerId,
          ownerType,
          uploadedByUserId
        );
        results.push(result);
      } catch (error) {
        errors.push({
          fileName: fileData.originalName,
          docType: fileData.docType,
          error: error.message
        });
      }
    }

    return { results, errors };
  }
}

// Export singleton instance
module.exports = new DocumentService();
