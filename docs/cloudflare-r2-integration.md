# Cloudflare R2 Document Storage Integration

This document provides comprehensive guidance for setting up and using Cloudflare R2 object storage for document uploads in the ScholarBridge application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Cloudflare R2 Setup](#cloudflare-r2-setup)
4. [Environment Configuration](#environment-configuration)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [File Upload Flow](#file-upload-flow)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)
10. [Troubleshooting](#troubleshooting)

## Overview

Cloudflare R2 is used to store document uploads (PDFs and images) for the ScholarBridge signup process. The integration provides:

- **Secure file uploads** for KYC documents and profile pictures
- **Cost-effective storage** with R2's competitive pricing
- **Global CDN distribution** through Cloudflare's network
- **S3-compatible API** for easy integration
- **Multiple upload methods** (direct upload and presigned URLs)

## Prerequisites

Before setting up R2 integration, ensure you have:

- A Cloudflare account with R2 enabled
- Node.js backend with Express.js
- React frontend
- Required npm packages installed

### Required Dependencies

Backend dependencies (already installed):
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
```

## Cloudflare R2 Setup

### Step 1: Enable R2 in Cloudflare

1. Log into your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Enable R2 (may require payment method setup)
4. Note your Account ID from the dashboard

### Step 2: Create R2 Bucket

1. In R2 dashboard, click "Create bucket"
2. Choose a unique bucket name (e.g., `scholarbridge-documents`)
3. Select a region close to your users
4. Configure bucket settings:
   - **Public access**: Disabled (we'll use presigned URLs)
   - **Storage class**: Standard

### Step 3: Generate API Tokens

1. Go to "Manage R2 API tokens"
2. Click "Create API token"
3. Configure permissions:
   - **Permissions**: Object Read and Write
   - **Bucket scope**: Select your bucket
   - **TTL**: Set appropriate expiration (or never expire)
4. Save the Access Key ID and Secret Access Key

### Step 4: Configure Custom Domain (Optional)

For production, set up a custom domain for public file access:

1. In your bucket settings, go to "Settings" → "Custom Domains"
2. Click "Connect Domain"
3. Enter your domain (e.g., `cdn.scholarbridge.com`)
4. Complete DNS verification
5. Enable HTTPS (automatic with Cloudflare)

## Environment Configuration

Update your `.env` file with R2 configuration:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=scholarbridge-documents
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://your-custom-domain.com
```

### Configuration Variables Explained

- **R2_ACCOUNT_ID**: Your Cloudflare account ID
- **R2_ACCESS_KEY_ID**: API token access key
- **R2_SECRET_ACCESS_KEY**: API token secret key
- **R2_BUCKET_NAME**: Name of your R2 bucket
- **R2_ENDPOINT**: R2 API endpoint URL
- **R2_PUBLIC_DOMAIN**: (Optional) Custom domain for public access

## API Endpoints

The following API endpoints are available for file operations:

### Upload Endpoints

#### 1. Upload KYC Document
```http
POST /api/uploads/kyc-document
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field
```

**Supported formats**: PDF, JPEG, PNG  
**Max size**: 10MB

#### 2. Upload Profile Picture
```http
POST /api/uploads/profile-picture
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field
```

**Supported formats**: JPEG, PNG  
**Max size**: 5MB

#### 3. Generate Presigned Upload URL
```http
POST /api/uploads/presigned-url
Content-Type: application/json
Authorization: Bearer <token>

{
  "fileName": "document.pdf",
  "contentType": "application/pdf",
  "fileType": "kyc_document" // or "profile_picture"
}
```

### Management Endpoints

#### 4. Delete File
```http
DELETE /api/uploads/:key
Authorization: Bearer <token>
```

#### 5. Get Download URL
```http
GET /api/uploads/download/:key
Authorization: Bearer <token>
```

### Response Format

All endpoints return standardized responses:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "key": "kyc-documents/uuid_filename.pdf",
    "url": "https://cdn.scholarbridge.com/kyc-documents/uuid_filename.pdf",
    "originalName": "document.pdf",
    "size": 1024000,
    "contentType": "application/pdf"
  }
}
```

## Frontend Integration

### File Upload Component

The `Step3.jsx` component handles file uploads with the following features:

- **Real-time upload status** with loading indicators
- **Error handling** with user-friendly messages
- **Upload progress** visualization
- **File validation** before upload

### Usage Example

```jsx
const handleFileChange = async (field, e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      await uploadFile(file, field);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  }
};
```

### Upload Status States

The component tracks upload status for each file:

```javascript
const [uploadStatus, setUploadStatus] = useState({
  kyc_document: { uploading: false, uploaded: false, error: null, url: null },
  profile_picture: { uploading: false, uploaded: false, error: null, url: null }
});
```

## File Upload Flow

### Direct Upload Flow

1. **User selects file** in frontend
2. **File validation** on client-side
3. **Upload to backend** via FormData
4. **Backend validation** and processing
5. **Upload to R2** using S3 SDK
6. **Return file URL** to frontend
7. **Update UI** with success status

### Presigned URL Flow (Alternative)

1. **Request presigned URL** from backend
2. **Upload directly to R2** from frontend
3. **Notify backend** of successful upload
4. **Update database** with file reference

## Security Considerations

### File Validation

- **File type restrictions**: Only PDF, JPEG, PNG allowed
- **File size limits**: 10MB for documents, 5MB for images
- **Filename sanitization**: Remove special characters
- **Content-Type validation**: Verify MIME types

### Access Control

- **Authentication required**: All endpoints require valid JWT
- **User isolation**: Files are organized by user context
- **Presigned URL expiration**: URLs expire after 1 hour
- **Private bucket**: No public read access by default

### Best Practices

1. **Use HTTPS**: Always encrypt file transfers
2. **Validate on server**: Never trust client-side validation alone
3. **Unique filenames**: Prevent conflicts with UUID prefixes
4. **Monitor usage**: Track upload patterns for abuse
5. **Backup strategy**: Consider backup policies for critical documents

## Error Handling

### Common Error Scenarios

#### 1. File Too Large
```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB"
}
```

#### 2. Invalid File Type
```json
{
  "error": "Invalid file type. Only JPEG, PNG, and PDF files are allowed."
}
```

#### 3. Upload Failed
```json
{
  "error": "Failed to upload file",
  "message": "Network error or R2 service unavailable"
}
```

#### 4. Authentication Required
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

### Frontend Error Handling

The frontend component provides visual feedback for errors:

```jsx
{uploadStatus.kyc_document.error && (
  <p className="text-xs text-red-600 mt-2">
    Error: {uploadStatus.kyc_document.error}
  </p>
)}
```

## Troubleshooting

### Common Issues

#### 1. "Failed to upload file" Error

**Possible causes:**
- Incorrect R2 credentials
- Bucket doesn't exist
- Network connectivity issues
- R2 service outage

**Solutions:**
- Verify environment variables
- Check bucket name and region
- Test with R2 dashboard
- Check Cloudflare status page

#### 2. "CORS Error" in Browser

**Cause:** R2 bucket CORS policy not configured

**Solution:** Configure CORS in R2 bucket settings:
```json
[
  {
    "AllowedOrigins": ["https://yourapp.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### 3. "File not found" When Accessing URLs

**Possible causes:**
- File was deleted
- Incorrect URL construction
- Custom domain not configured properly

**Solutions:**
- Verify file exists in R2 dashboard
- Check URL generation logic
- Validate custom domain setup

#### 4. Slow Upload Performance

**Possible causes:**
- Large file sizes
- Network latency
- Single-threaded uploads

**Solutions:**
- Implement file compression
- Use presigned URLs for direct upload
- Consider chunked uploads for large files

### Debugging Tips

1. **Enable debug logging:**
   ```javascript
   console.log('R2 Upload Debug:', {
     endpoint: process.env.R2_ENDPOINT,
     bucket: process.env.R2_BUCKET_NAME,
     key: fileKey
   });
   ```

2. **Test R2 connection:**
   ```javascript
   // Test endpoint in utils/r2.js
   async testConnection() {
     try {
       const command = new ListObjectsV2Command({
         Bucket: this.bucketName,
         MaxKeys: 1
       });
       await this.client.send(command);
       return true;
     } catch (error) {
       console.error('R2 connection test failed:', error);
       return false;
     }
   }
   ```

3. **Monitor R2 dashboard:**
   - Check storage usage
   - Review request logs
   - Monitor bandwidth consumption

### Performance Optimization

1. **Implement caching:**
   - Cache file URLs in database
   - Use CDN for frequently accessed files

2. **Optimize file sizes:**
   - Compress images before upload
   - Use appropriate file formats

3. **Batch operations:**
   - Group multiple file operations
   - Use concurrent uploads where possible

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Express.js File Upload Guide](https://expressjs.com/en/resources/middleware/multer.html)

## Support

For issues related to R2 integration, check:

1. **Cloudflare R2 Status**: https://www.cloudflarestatus.com/
2. **GitHub Issues**: Project repository issues section
3. **Documentation**: This guide and official Cloudflare docs

---

*Last updated: September 2025*