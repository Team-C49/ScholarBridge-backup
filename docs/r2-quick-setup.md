# Quick Setup Guide: Cloudflare R2 for ScholarBridge

## 🚀 Quick Start

This is a condensed setup guide for integrating Cloudflare R2 document storage. For detailed documentation, see [cloudflare-r2-integration.md](./cloudflare-r2-integration.md).

## Prerequisites ✅

- Cloudflare account with R2 enabled
- Node.js backend with the required packages (already installed)

## Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Click "Create bucket"
3. Name: `scholarbridge-documents` (or your preferred name)
4. Leave other settings as default

## Step 2: Generate API Tokens

1. In R2 dashboard → "Manage R2 API tokens"
2. Click "Create API token"
3. Set permissions: **Object Read and Write**
4. Set bucket scope to your created bucket
5. Save the **Access Key ID** and **Secret Access Key**

## Step 3: Configure Environment Variables

Update your `.env` file:

```env
# Replace with your actual values
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id  
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=scholarbridge-documents
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://your-custom-domain.com
```

**Where to find your Account ID:**
- Cloudflare Dashboard → Right sidebar → Account ID

**R2_ENDPOINT format:**
- Replace `your_account_id` with your actual Account ID

## Step 4: Test the Integration

1. Start your backend server:
   ```bash
   cd backend/server
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd frontend  
   npm run dev
   ```

3. Navigate to the signup page Step 3
4. Try uploading a PDF or image file
5. Check for successful upload status

## API Endpoints Available 🔗

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/uploads/kyc-document` | POST | Upload KYC documents (PDF/images) |
| `/api/uploads/profile-picture` | POST | Upload profile pictures (images only) |
| `/api/uploads/presigned-url` | POST | Get presigned upload URL |
| `/api/uploads/:key` | DELETE | Delete uploaded file |
| `/api/uploads/download/:key` | GET | Get download URL |

## File Limits 📏

- **KYC Documents**: PDF, JPEG, PNG - Max 10MB
- **Profile Pictures**: JPEG, PNG - Max 5MB

## Frontend Features ✨

The updated Step3 component now includes:

- ✅ Real-time upload progress
- ✅ Success/error status indicators
- ✅ File validation
- ✅ Retry mechanism
- ✅ Visual feedback with icons

## Common Issues 🛠️

### 1. "Failed to upload file"
- Check your R2 credentials in `.env`
- Verify bucket name is correct
- Ensure bucket exists in your account

### 2. CORS errors
- Configure CORS in R2 bucket settings if using presigned URLs
- Allow your frontend domain

### 3. File size errors  
- Verify file is under size limits
- Check file type is supported

## Testing Checklist ✅

- [ ] Environment variables are set correctly
- [ ] R2 bucket exists and is accessible
- [ ] Backend server starts without errors
- [ ] Upload endpoints return success responses
- [ ] Frontend shows upload progress
- [ ] Files appear in R2 dashboard
- [ ] Error handling works for invalid files

## Next Steps

1. **Production Setup**: Configure custom domain for R2
2. **Security**: Review access policies and authentication
3. **Monitoring**: Set up logging and error tracking
4. **Backup**: Consider backup strategy for uploaded files

## Need Help?

- 📚 [Full Documentation](./cloudflare-r2-integration.md)
- 🌐 [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- 🐛 Check GitHub issues for common problems

---

*Setup complete! Your ScholarBridge app now supports document uploads via Cloudflare R2.*