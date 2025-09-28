// src/middleware/upload.js
const multer = require('multer');

// Configure multer for different upload scenarios
const createUploadMiddleware = (options = {}) => {
  const {
    maxFileSize = 20 * 1024 * 1024, // 20MB default
    maxFiles = 5,
    allowedTypes = [
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
    ]
  } = options;

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
      }
    }
  });
};

// Predefined upload middleware for different scenarios
const uploadMiddleware = {
  // Single document upload
  single: (fieldName = 'file') => createUploadMiddleware().single(fieldName),
  
  // Multiple documents upload
  array: (fieldName = 'files', maxCount = 5) => createUploadMiddleware().array(fieldName, maxCount),
  
  // Multiple named fields
  fields: (fields) => createUploadMiddleware().fields(fields),
  
  // Profile pictures only
  profilePicture: () => createUploadMiddleware({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }).single('profile_picture'),
  
  // Documents only (no images)
  documentsOnly: () => createUploadMiddleware({
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ]
  }),
  
  // Images only
  imagesOnly: () => createUploadMiddleware({
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  })
};

// Error handling middleware for multer errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: 'File too large',
          message: `Maximum file size is ${error.field ? '20MB' : '20MB'}`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: 'Too many files',
          message: 'Maximum 5 files allowed per upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: 'Unexpected file field',
          message: `Unexpected file field: ${error.field}`
        });
      default:
        return res.status(400).json({ 
          error: 'Upload error',
          message: error.message 
        });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  createUploadMiddleware,
  uploadMiddleware,
  handleUploadError
};