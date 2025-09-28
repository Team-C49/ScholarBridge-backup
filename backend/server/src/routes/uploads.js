// src/routes/uploads.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentService = require('../services/documentService');
const { authMiddleware } = require('../middleware/auth');
const db = require('../utils/db');

// Configure multer for memory storage with higher limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (max for any document type)
    files: 5, // Allow multiple files for batch uploads
  },
  fileFilter: (req, file, cb) => {
    // Allow all common document types - specific validation will be done by document service
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      // PDFs
      'application/pdf',
      // Word documents
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Excel files
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Text files
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Please upload supported document types.`), false);
    }
  }
});

// Apply authentication middleware to all upload routes
router.use(authMiddleware);

/**
 * Universal document upload endpoint
 * POST /api/uploads/document
 * Body: { docType, ownerId, ownerType }
 */
router.post('/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { docType, ownerId, ownerType } = req.body;

    if (!docType || !ownerId || !ownerType) {
      return res.status(400).json({ 
        error: 'docType, ownerId, and ownerType are required' 
      });
    }

    // Upload document using document service
    const document = await documentService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      docType,
      ownerId,
      ownerType,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        docType: document.doc_type,
        url: document.file_url,
        originalName: document.original_name,
        description: document.description,
        createdAt: document.created_at
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error.message 
    });
  }
});

/**
 * Batch document upload endpoint
 * POST /api/uploads/documents/batch
 * Body: { ownerId, ownerType, documents: [{ docType: string, fileIndex: number }] }
 */
router.post('/documents/batch', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { ownerId, ownerType, documents } = req.body;

    if (!ownerId || !ownerType || !documents) {
      return res.status(400).json({ 
        error: 'ownerId, ownerType, and documents mapping are required' 
      });
    }

    // Parse documents if it's a string (from form data)
    const documentsMapping = typeof documents === 'string' ? JSON.parse(documents) : documents;

    // Prepare files with metadata
    const filesWithMetadata = req.files.map((file, index) => {
      const documentMapping = documentsMapping.find(d => d.fileIndex === index);
      if (!documentMapping) {
        throw new Error(`Missing document type mapping for file ${index}: ${file.originalname}`);
      }

      return {
        buffer: file.buffer,
        originalName: file.originalname,
        contentType: file.mimetype,
        docType: documentMapping.docType
      };
    });

    // Batch upload
    const result = await documentService.batchUploadDocuments(
      filesWithMetadata,
      ownerId,
      ownerType,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Batch upload completed',
      uploaded: result.results.length,
      failed: result.errors.length,
      documents: result.results.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        url: doc.file_url,
        originalName: doc.original_name,
        description: doc.description
      })),
      errors: result.errors
    });

  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload documents',
      message: error.message 
    });
  }
});

/**
 * Upload KYC document (legacy endpoint)
 * POST /api/uploads/kyc-document
 */
router.post('/kyc-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Default to user as owner for profile documents
    const ownerId = req.body.ownerId || req.user.id;
    const ownerType = req.body.ownerType || 'student';

    const document = await documentService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'kyc_document',
      ownerId,
      ownerType,
      req.user.id
    );

    res.json({
      success: true,
      message: 'KYC document uploaded successfully',
      file: {
        id: document.id,
        key: document.r2_key,
        url: document.file_url,
        originalName: document.original_name,
        size: document.size,
        contentType: document.content_type,
      }
    });

  } catch (error) {
    console.error('KYC upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload KYC document',
      message: error.message 
    });
  }
});

/**
 * Upload profile picture (legacy endpoint)
 * POST /api/uploads/profile-picture
 */
router.post('/profile-picture', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ownerId = req.body.ownerId || req.user.id;
    const ownerType = req.body.ownerType || 'student';

    const document = await documentService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'profile_picture',
      ownerId,
      ownerType,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      file: {
        id: document.id,
        key: document.r2_key,
        url: document.file_url,
        originalName: document.original_name,
        size: document.size,
        contentType: document.content_type,
      }
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload profile picture',
      message: error.message 
    });
  }
});

/**
 * Get documents for an owner
 * GET /api/uploads/documents/:ownerId/:ownerType?docType=type
 */
router.get('/documents/:ownerId/:ownerType', async (req, res) => {
  try {
    const { ownerId, ownerType } = req.params;
    const { docType } = req.query;

    // Basic authorization - users can only access their own documents
    if (req.user.role !== 'superadmin' && req.user.id !== ownerId) {
      // Allow access to application documents for related users
      if (ownerType === 'application') {
        const { rows } = await db.query(
          'SELECT student_user_id FROM applications WHERE id = $1',
          [ownerId]
        );
        if (!rows.length || rows[0].student_user_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const documents = await documentService.getDocumentsByOwner(ownerId, ownerType, docType);

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
    console.error('Get documents error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve documents',
      message: error.message 
    });
  }
});

/**
 * Get single document details
 * GET /api/uploads/document/:id
 */
router.get('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(id);

    // Basic authorization check
    if (req.user.role !== 'superadmin' && req.user.id !== document.uploaded_by_user_id) {
      // Additional checks for document access can be added here
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      document: {
        id: document.id,
        docType: document.doc_type,
        url: document.file_url,
        description: document.description,
        ownerId: document.owner_id,
        ownerType: document.owner_type,
        uploadedAt: document.created_at,
        uploadedBy: document.uploaded_by_email
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve document',
      message: error.message 
    });
  }
});

/**
 * Generate download URL for document
 * GET /api/uploads/document/:id/download
 */
router.get('/document/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(id);

    // Authorization check
    if (req.user.role !== 'superadmin' && req.user.id !== document.uploaded_by_user_id) {
      // Additional access control logic can be added here
      return res.status(403).json({ error: 'Access denied' });
    }

    const downloadUrl = await documentService.getDownloadUrl(id, 3600);

    res.json({
      success: true,
      downloadUrl,
      expiresIn: 3600,
      document: {
        id: document.id,
        originalName: document.file_url.split('/').pop(),
        description: document.description
      }
    });

  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate download URL',
      message: error.message 
    });
  }
});

/**
 * Delete document
 * DELETE /api/uploads/document/:id
 */
router.delete('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(id);

    // Authorization check - only uploader or admin can delete
    if (req.user.role !== 'superadmin' && req.user.id !== document.uploaded_by_user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await documentService.deleteDocument(id, req.user.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      message: error.message 
    });
  }
});

/**
 * Get available document types
 * GET /api/uploads/document-types
 */
router.get('/document-types', (req, res) => {
  try {
    const documentTypes = documentService.getAllDocumentTypes();
    
    const formattedTypes = Object.entries(documentTypes).map(([key, config]) => ({
      type: key,
      description: config.description,
      allowedTypes: config.allowedTypes,
      maxSize: config.maxSize,
      maxSizeMB: Math.round(config.maxSize / (1024 * 1024))
    }));

    res.json({
      success: true,
      documentTypes: formattedTypes
    });

  } catch (error) {
    console.error('Get document types error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve document types' 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'Maximum file size is 20MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum 5 files allowed per upload'
      });
    }
  }
  
  res.status(400).json({ 
    error: 'Upload error',
    message: error.message 
  });
});

module.exports = router;