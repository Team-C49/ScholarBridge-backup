# ScholarBridge Documentation

## 📁 Documentation Overview

This folder contains comprehensive documentation for the ScholarBridge application.

## 📚 Available Documentation

### [Cloudflare R2 Integration](./cloudflare-r2-integration.md)
**Comprehensive guide for document storage setup**
- Complete R2 setup instructions
- API endpoint documentation  
- Security considerations
- Error handling and troubleshooting
- Performance optimization tips

### [R2 Quick Setup Guide](./r2-quick-setup.md)
**Fast-track setup for developers**
- Essential setup steps
- Environment configuration
- Testing checklist
- Common issues and solutions

## 🚀 Getting Started

If you're setting up Cloudflare R2 for document uploads:

1. **New to R2?** Start with the [Quick Setup Guide](./r2-quick-setup.md)
2. **Need details?** Reference the [Full Integration Guide](./cloudflare-r2-integration.md)
3. **Having issues?** Check the troubleshooting sections in both guides

## 📋 Features Implemented

### Document Upload System
- ✅ **KYC Document Upload** - PDF, JPEG, PNG support (max 10MB)
- ✅ **Profile Picture Upload** - JPEG, PNG support (max 5MB)  
- ✅ **Real-time Upload Status** - Progress indicators and error handling
- ✅ **Secure Storage** - Files stored in Cloudflare R2 with access controls
- ✅ **API Integration** - RESTful endpoints for file operations

### Security Features
- ✅ **Authentication Required** - JWT token validation
- ✅ **File Type Validation** - Server-side MIME type checking
- ✅ **Size Limits** - Configurable file size restrictions
- ✅ **Unique File Names** - UUID-based naming to prevent conflicts
- ✅ **Error Handling** - Comprehensive error messages and recovery

## 🔧 Technical Stack

- **Backend**: Node.js, Express.js, Multer
- **Storage**: Cloudflare R2 (S3-compatible)
- **SDK**: AWS SDK v3 for S3 operations
- **Frontend**: React, Tailwind CSS
- **Authentication**: JWT tokens

## 📞 Support

For technical support:

1. **Check the documentation** in this folder first
2. **Review error logs** for specific error messages  
3. **Test with smaller files** to isolate upload issues
4. **Verify environment variables** are correctly configured

## 🔄 Updates

This documentation is maintained alongside code changes. Last updated: September 2025.

---

*Happy coding! 🎉*