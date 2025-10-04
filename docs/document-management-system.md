# ScholarBridge Document Management System

## 🎯 Overview

The ScholarBridge backend now includes a comprehensive document management system that integrates Cloudflare R2 storage with PostgreSQL database tracking. This system handles all document uploads across the application including signup documents, academic records, financial proofs, and supporting documents.

## 🏗️ Architecture

### Components
1. **DocumentService** - Core service for document operations
2. **ApplicationService** - Handles application-specific document workflows  
3. **Upload Routes** - RESTful endpoints for document operations
4. **Database Integration** - Links documents to various entities via `documents` table

### Database Schema Integration
```sql
-- Documents table (already in your schema)
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id uuid NOT NULL,
    owner_type text NOT NULL,
    doc_type text NOT NULL,
    file_url text NOT NULL,
    uploaded_by_user_id uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);
```

## 📋 Document Types Supported

### Profile Documents
- `profile_picture` - Profile images (JPEG, PNG, max 5MB)
- `kyc_document` - KYC documents (PDF, images, max 10MB)

### Academic Documents  
- `marksheet` - Academic marksheets (PDF, images, max 10MB)
- `degree_certificate` - Degree certificates (PDF, images, max 10MB)
- `transcript` - Academic transcripts (PDF, max 15MB)

### Financial Documents
- `income_proof` - Income proof documents (PDF, images, max 10MB)
- `expense_proof` - Expense proof documents (PDF, images, max 10MB)
- `bank_statement` - Bank statements (PDF, max 20MB)

### Trust/Organization Documents
- `registration_certificate` - Registration certificates (PDF, images, max 10MB)
- `trust_deed` - Trust deeds (PDF, max 20MB)

### General Documents
- `supporting_document` - Supporting documents (PDF, images, max 15MB)

## 🔗 API Endpoints

### Core Upload Endpoints

#### Upload Single Document
```http
POST /api/uploads/document
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- file: [FILE]
- docType: string (e.g., "kyc_document", "marksheet")
- ownerId: string (UUID of owner)
- ownerType: string (e.g., "student", "application", "family_member")
```

#### Batch Upload Documents
```http
POST /api/uploads/documents/batch
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- files: [FILE_ARRAY]
- ownerId: string
- ownerType: string
- documents: JSON string mapping files to document types
```

#### Get Documents by Owner
```http
GET /api/uploads/documents/{ownerId}/{ownerType}?docType={type}
Authorization: Bearer {token}
```

#### Get Single Document
```http
GET /api/uploads/document/{documentId}
Authorization: Bearer {token}
```

#### Download Document
```http
GET /api/uploads/document/{documentId}/download
Authorization: Bearer {token}
```

#### Delete Document
```http
DELETE /api/uploads/document/{documentId}
Authorization: Bearer {token}
```

### Student-Specific Endpoints

#### Get Student Documents
```http
GET /api/student/documents?docType={type}
Authorization: Bearer {token}
```

#### Get Application Documents
```http
GET /api/student/applications/{applicationId}/documents
Authorization: Bearer {token}
```

### Utility Endpoints

#### Get Available Document Types
```http
GET /api/uploads/document-types
Authorization: Bearer {token}
```

## 🔄 Document Workflows

### 1. Signup Process
During signup Step 3:
1. User uploads KYC document and profile picture via frontend
2. Documents are stored in R2 with temporary ownership
3. On profile completion, documents are linked to student profile
4. Database records are updated with proper owner relationships

### 2. Application Submission
When submitting scholarship applications:
1. Academic documents (marksheets) are linked to education history
2. Income proofs are linked to family members
3. Expense proofs are linked to current expenses
4. Supporting documents are linked directly to application

### 3. Document Access Control
- Users can only access their own documents
- Admin users can access all documents
- Application documents are accessible to related students and trusts
- Download URLs are time-limited (1 hour by default)

## 💾 Database Relationships

### Document Ownership Types
- `student` - Owned by student profile (profile pictures, KYC docs)
- `application` - Owned by application (supporting documents)
- `family_member` - Owned by family member record (income proofs)
- `education_history` - Owned by education record (marksheets)
- `current_expense` - Owned by expense record (expense proofs)
- `trust` - Owned by trust organization

### Foreign Key Relationships
```sql
-- Education history links to documents
ALTER TABLE education_history 
ADD COLUMN marksheet_doc_id uuid REFERENCES documents(id);

-- Family members link to documents  
ALTER TABLE family_members 
ADD COLUMN income_proof_doc_id uuid REFERENCES documents(id);

-- Current expenses link to documents
ALTER TABLE current_expenses 
ADD COLUMN proof_doc_id uuid REFERENCES documents(id);
```

## 🔒 Security Features

### Authentication & Authorization
- JWT token required for all document operations
- Role-based access control (student, trust, superadmin)
- Document ownership validation
- Upload user tracking

### File Validation
- MIME type checking
- File size limits per document type
- Malicious file detection
- Unique filename generation (UUID-based)

### Storage Security
- Files stored in Cloudflare R2 private bucket
- Presigned URLs for secure access
- Time-limited download links
- Encrypted file metadata

## 📝 Frontend Integration

### Updated Step3 Component
The Step3 signup component now includes:
- Real-time upload progress indicators
- Success/error visual feedback  
- File validation with user-friendly messages
- Retry mechanism for failed uploads
- Document preview capabilities

### Upload Process
1. User selects file
2. File is immediately uploaded to R2 via API
3. Upload progress is shown
4. Success confirmation with document ID
5. Document ID is stored in form data
6. On form submission, documents are linked to profile

## 🚀 Usage Examples

### Basic Document Upload
```javascript
// Frontend JavaScript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('docType', 'kyc_document');
formData.append('ownerId', userId);
formData.append('ownerType', 'student');

const response = await fetch('/api/uploads/document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded document:', result.document);
```

### Batch Upload Example
```javascript
// Upload multiple application documents
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('ownerId', applicationId);
formData.append('ownerType', 'application');
formData.append('documents', JSON.stringify([
  { docType: 'marksheet', fileIndex: 0 },
  { docType: 'income_proof', fileIndex: 1 },
  { docType: 'supporting_document', fileIndex: 2 }
]));

const response = await fetch('/api/uploads/documents/batch', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## 🛠️ Configuration

### Environment Variables
```env
# Cloudflare R2 Configuration (already configured)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id  
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=scholarbridge-documents
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://your-custom-domain.com
```

### File Size Limits
You can customize file size limits by modifying the `documentTypes` configuration in `DocumentService`:

```javascript
// In src/services/documentService.js
this.documentTypes = {
  'profile_picture': {
    maxSize: 5 * 1024 * 1024, // 5MB
    // ... other config
  }
  // ... other types
}
```

## 🔍 Monitoring & Logging

### Audit Trail
All document operations are logged in the `audit_logs` table:
- Document uploads
- Document deletions
- Profile completions with document links
- Application submissions with document counts

### Error Handling
- Comprehensive error messages for troubleshooting
- Failed upload recovery mechanisms
- File validation error details
- Access control violation logging

## 📊 Performance Considerations

### Optimization Features
- Direct upload to R2 (bypasses server for large files)
- Batch upload support for multiple documents
- Presigned URL generation for frontend uploads
- Efficient database queries with proper indexing

### Recommendations
1. Use batch uploads for multiple documents
2. Implement client-side file validation
3. Show upload progress for better UX
4. Cache document type configurations
5. Consider CDN for frequently accessed documents

## 🧪 Testing

### API Testing Examples
```bash
# Test document upload
curl -X POST http://localhost:4000/api/uploads/document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-document.pdf" \
  -F "docType=kyc_document" \
  -F "ownerId=USER_UUID" \
  -F "ownerType=student"

# Test document retrieval
curl -X GET http://localhost:4000/api/uploads/documents/USER_UUID/student \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Error Codes & Troubleshooting

### Common Error Codes
- `400` - Invalid file type or missing parameters
- `401` - Authentication required
- `403` - Access denied (not document owner)
- `413` - File too large
- `500` - Server error (R2 connection, database error)

### Troubleshooting Steps
1. **Upload fails**: Check R2 credentials and bucket permissions
2. **File not found**: Verify document ID and ownership
3. **Access denied**: Check user authentication and document ownership
4. **File too large**: Verify file size against document type limits

---

## 🎉 Summary

The ScholarBridge document management system now provides:

✅ **Complete R2 Integration** - All documents stored securely in Cloudflare R2
✅ **Database Tracking** - Full document metadata and relationships in PostgreSQL  
✅ **Universal Upload System** - Handles all document types across the application
✅ **Secure Access Control** - Role-based permissions and document ownership
✅ **Comprehensive API** - RESTful endpoints for all document operations
✅ **Frontend Integration** - Updated components with real-time upload status
✅ **Error Handling** - Robust error handling and user feedback
✅ **Audit Trail** - Complete logging of document operations
✅ **Performance Optimized** - Batch uploads and efficient queries

The system is now ready for production use and can handle all document upload requirements across signup, applications, and administrative workflows.

*System implemented and tested - September 2025*