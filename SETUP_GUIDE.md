# ScholarBridge Setup Guide

## 🎯 Overview
This guide will help you set up the complete ScholarBridge application with CloudFlare R2 integration and OTP email functionality.

## 📋 Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- CloudFlare account with R2 enabled
- Gmail account with App Password (for SMTP)

## 🔧 Setup Instructions

### 1. CloudFlare R2 Configuration (Required)

First, complete your CloudFlare R2 setup:

1. **Create R2 Bucket:**
   - Go to CloudFlare Dashboard → R2 Object Storage
   - Create bucket named: `scholarbridge-documents`
   - Choose appropriate location

2. **Generate API Credentials:**
   - Go to R2 Object Storage → Manage R2 API tokens
   - Create API token with Admin Read & Write permissions
   - Save the Access Key ID and Secret Access Key

3. **Get Account Details:**
   - Copy your Account ID from dashboard sidebar
   - Your endpoint will be: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

4. **Set up Custom Domain (Optional but Recommended):**
   - In bucket settings, connect a custom domain like `files.yourdomain.com`
   - This provides clean URLs for documents

5. **Configure CORS:**
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "http://localhost:5173", "https://yourdomain.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### 2. Environment Configuration

Update your `.env` file with your actual credentials:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/scholarbridge

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email Configuration
NODE_ENV=development
MAIL_FROM="ScholarBridge <no-reply@youremail.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

APP_NAME=ScholarBridge

# CloudFlare R2 Configuration (REPLACE WITH YOUR VALUES)
R2_ACCOUNT_ID=your_actual_account_id
R2_ACCESS_KEY_ID=your_actual_access_key_id
R2_SECRET_ACCESS_KEY=your_actual_secret_access_key
R2_BUCKET_NAME=scholarbridge-documents
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://files.yourdomain.com

# Encryption
ENCRYPTION_KEY_BASE64=inmKtGjZg6jF17Z3ueSirhsljQ9GFphttYiQ7hU10yA=
```

### 3. Database Setup

Run the database migration:

```bash
cd backend/server
npm run migrate
```

This will create all necessary tables:
- `documents` - For storing document metadata and R2 URLs
- `users` - User accounts
- `student_profiles` - Student profile information
- `trust_profiles` - Trust/organization profiles
- `applications` - Scholarship applications
- `otps` - OTP verification codes
- `family_members` - Family member information
- `audit_logs` - Activity tracking

### 4. Install Dependencies

```bash
# Backend
cd backend/server
npm install

# Frontend
cd frontend
npm install
```

### 5. Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings → Security → App passwords
3. Generate an app password for "Mail"
4. Use this app password in your `SMTP_PASS` environment variable

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend/server
npm run dev  # Development mode with auto-reload
# or
npm start    # Production mode
```

### Start Frontend Application
```bash
cd frontend
npm run dev
```

## 📄 Document Upload Features

### Supported File Types:
- **Images:** JPEG, PNG, WebP
- **Documents:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- **Text:** Plain text, CSV

### Document Categories:
- **Profile Documents:** Profile pictures, KYC documents
- **Academic Documents:** Marksheets, certificates, transcripts
- **Financial Documents:** Income proofs, bank statements, expense proofs
- **Trust Documents:** Registration certificates, trust deeds
- **Supporting Documents:** General supporting documents

### File Size Limits:
- Profile Pictures: 5MB
- Most Documents: 10MB
- Bank Statements & Large Documents: 20MB

## 🔍 Testing the Setup

### 1. Test Email Functionality
```bash
# In backend/server directory
node -e "
const { sendOTPEmail } = require('./src/utils/mail');
sendOTPEmail('test@example.com', '123456', 15)
  .then(() => console.log('✅ Email test successful'))
  .catch(err => console.error('❌ Email test failed:', err));
"
```

### 2. Test Database Connection
```bash
cd backend/server
npm run test-db
```

### 3. Test Document Upload
1. Start the backend server
2. Register a new user account
3. Complete Step 3 of registration with file uploads
4. Check your CloudFlare R2 bucket for uploaded files

## 🐛 Troubleshooting

### Common Issues:

1. **Email not sending:**
   - Verify Gmail app password is correct
   - Check SMTP settings
   - Ensure 2FA is enabled on Gmail

2. **File upload failing:**
   - Verify CloudFlare R2 credentials
   - Check CORS configuration
   - Ensure bucket permissions are correct

3. **Database connection issues:**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists

4. **CORS errors in browser:**
   - Add your frontend URL to CloudFlare R2 CORS policy
   - Verify backend CORS configuration

## 🔒 Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong JWT secrets** in production
3. **Enable SSL/HTTPS** for production deployment
4. **Regularly rotate** API keys and passwords
5. **Implement rate limiting** for production
6. **Validate all file uploads** on both client and server

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register/step1` - Initial registration
- `POST /api/auth/register/verify-otp` - OTP verification
- `POST /api/auth/register/step3` - Complete profile

### Document Management
- `POST /api/uploads/document` - Upload single document
- `POST /api/uploads/documents/batch` - Batch upload
- `GET /api/uploads/documents/{ownerId}/{ownerType}` - Get documents
- `GET /api/uploads/document/{id}/download` - Download document
- `DELETE /api/uploads/document/{id}` - Delete document

## 🎉 Next Steps

After setup:
1. Test the complete user registration flow
2. Verify document uploads are working
3. Check email delivery
4. Test with different file types and sizes
5. Set up production deployment

---

**Need Help?** Check the console logs for detailed error messages and ensure all environment variables are properly configured.