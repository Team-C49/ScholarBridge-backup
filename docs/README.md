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

### [Smart Filtering Algorithm](./document-management-system.md)
**Trust Dashboard Application Matching System**
- Intelligent application ranking algorithm
- Multi-criteria scoring system
- Preference-based filtering
- Real-time matching and sorting

---

## 🎯 Smart Filtering Algorithm - Trust Dashboard

### **Overview**

An intelligent matching system that ranks scholarship applications 0-100 based on trust preferences, helping trusts identify the best-fit candidates instantly.

---

## 🧮 **Scoring System (100 Points Total)**

### **5 Weighted Criteria:**

| Criterion | Weight | Logic | Example |
|-----------|--------|-------|---------|
| **Gender** | 35 pts | Matches trust's preferred gender | Female = Female → +35 |
| **Course** | 30 pts | Student's course in trust's list | "B Tech CSE" in ["B Tech CSE", "MCA"] → +30 |
| **City** | 15 pts | Student's city in trust's regions | Mumbai in ["Mumbai", "Pune"] → +15 |
| **Income** | 15 pts | Family income ≤ trust's max limit | 3.84 LPA ≤ 5 LPA → +15 |
| **Grades** | 5 pts | Academic score ≥ trust's minimum | 75% ≥ 60% → +5 |

**Note:** NULL/empty preference = accepts all (e.g., no city preference = all cities match)

---

## 📊 **Scoring Examples**

### **Perfect Match: 100/100**
- Gender: Female ✅ → 35
- Course: B Tech CSE ✅ → 30  
- City: Mumbai ✅ → 15
- Income: 3.84 LPA ✅ → 15
- Grade: 75% ✅ → 5
- **Result:** Top-ranked, shown first

### **Partial Match: 50/100**
- Gender: Female ✅ → 35
- Course: B.Com ❌ → 0
- City: Mumbai ✅ → 15
- Income: 6 LPA ❌ → 0
- Grade: 55% ❌ → 0
- **Result:** Mid-ranked

### **Poor Match: 15/100**
- Gender: Male ❌ → 0
- Course: B.Com ❌ → 0
- City: Mumbai ✅ → 15
- Income: 10 LPA ❌ → 0
- Grade: 50% ❌ → 0
- **Result:** Low-ranked

---

## 🎚️ **Smart Filtering Toggle**

### **ON (Default):** Shows only matching applications
- Filters out 0-score applications
- Reduces information overload
- Best for trusts with specific mandates

### **OFF:** Shows all applications
- Displays all, sorted by score
- No filtering, just ranking
- Best for exploring all options

---

## 🔄 **How It Works**

```
1. Trust sets preferences (gender, courses, cities, income, grades)
   ↓
2. System fetches all applications
   ↓
3. Calculate each application's score (0-100)
   ↓
4. Sort by: Score (DESC) → Income (ASC) → Date (ASC)
   ↓
5. Display ranked results with color-coded bars
```

**Color Coding:**
- 🟢 80-100: Excellent match
- 🟡 60-79: Good match  
- 🟠 40-59: Fair match
- 🔴 0-39: Poor match

---

## 🔐 **Multi-Trust System**

Each trust sees only their own data:
- **All Applications:** Not yet reviewed by THIS trust
- **Approved:** Approved by THIS trust (shows their approved amount)
- **Rejected:** Rejected by THIS trust

Multiple trusts can approve the same application until fully funded.

---

## 💡 **Key Benefits**

✅ **Time-Saving:** Automatic ranking, no manual sorting  
✅ **Fair & Transparent:** Clear criteria, no hidden biases  
✅ **Customizable:** Each trust defines own preferences  
✅ **Scalable:** Handles thousands of applications efficiently  
✅ **Secure:** Trust-specific data isolation  

---

## 🎓 **For Your Presentation**

**Simple Explanation:**  
*"Like a dating app for scholarships - we match students to trusts based on compatibility. A 100% match means the student perfectly fits what the trust is looking for."*

**Technical Explanation:**  
*"Weighted scoring algorithm using 5 criteria (35-30-15-15-5 distribution) with SQL CTEs for performance optimization and trust-specific filtering for data isolation."*

**Key Stats:**
- 5 matching criteria
- 0-100 scoring range
- Real-time calculation
- Multi-trust concurrent approvals

---

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