# ScholarBridge

> **A comprehensive scholarship management platform connecting students, trusts, and administrators**

## 📚 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Smart Filtering Algorithm](#-smart-filtering-algorithm)
- [Technical Stack](#-technical-stack)
- [Documentation](#-documentation)
- [Getting Started](#-getting-started)

---

## 🎯 Overview

ScholarBridge is a modern scholarship management platform that streamlines the scholarship application and funding process. It uses intelligent matching algorithms to connect students with appropriate funding sources while providing comprehensive management tools for trusts and administrators.

---

## ✨ Features

### For Students
- 📝 **Application Management** - Submit and track scholarship applications
- 📄 **Document Upload** - KYC documents, academic records, financial proofs
- 📊 **Real-time Status** - Track approval status from multiple trusts
- 💰 **Funding Transparency** - See all approvals and total funding received

### For Trusts
- 🎯 **Smart Filtering** - AI-powered application matching (0-100 score)
- 📊 **Dashboard Analytics** - Track applications, approvals, and funding
- 🔍 **Preference-based Search** - Filter by gender, course, city, income, grades
- 👥 **Multi-trust Approval** - Concurrent funding from multiple sources

### For Administrators
- 👤 **User Management** - Manage students, trusts, and permissions
- ✅ **Trust Verification** - Review and approve trust registrations
- 📈 **Analytics** - System-wide insights and reporting
- 🔒 **Security Controls** - Blacklisting, access management

---

## 🎯 Smart Filtering Algorithm

### Overview
An intelligent matching system that ranks scholarship applications 0-100 based on trust preferences, helping trusts identify the best-fit candidates instantly.

### Scoring System (100 Points Total)

| Criterion | Weight | Logic | Example |
|-----------|--------|-------|---------|
| **Gender** | 35 pts | Matches trust's preferred gender | Female = Female → +35 |
| **Course** | 30 pts | Student's course in trust's list | "B Tech CSE" in ["B Tech CSE", "MCA"] → +30 |
| **City** | 15 pts | Student's city in trust's regions | Mumbai in ["Mumbai", "Pune"] → +15 |
| **Income** | 15 pts | Family income ≤ trust's max limit | 3.84 LPA ≤ 5 LPA → +15 |
| **Grades** | 5 pts | Academic score ≥ trust's minimum | 75% ≥ 60% → +5 |

**Note:** NULL/empty preference = accepts all (e.g., no city preference = all cities match)

### Scoring Examples

#### Perfect Match: 100/100
- Gender: Female ✅ → 35
- Course: B Tech CSE ✅ → 30  
- City: Mumbai ✅ → 15
- Income: 3.84 LPA ✅ → 15
- Grade: 75% ✅ → 5
- **Result:** Top-ranked, shown first

#### Partial Match: 50/100
- Gender: Female ✅ → 35
- Course: B.Com ❌ → 0
- City: Mumbai ✅ → 15
- Income: 6 LPA ❌ → 0
- Grade: 55% ❌ → 0
- **Result:** Mid-ranked

#### Poor Match: 15/100
- Gender: Male ❌ → 0
- Course: B.Com ❌ → 0
- City: Mumbai ✅ → 15
- Income: 10 LPA ❌ → 0
- Grade: 50% ❌ → 0
- **Result:** Low-ranked

### Smart Filtering Toggle

**ON (Default):** Shows only matching applications
- Filters out 0-score applications
- Reduces information overload
- Best for trusts with specific mandates

**OFF:** Shows all applications
- Displays all, sorted by score
- No filtering, just ranking
- Best for exploring all options

### How It Works

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

### Multi-Trust System

Each trust sees only their own data:
- **All Applications:** Not yet reviewed by THIS trust
- **Approved:** Approved by THIS trust (shows their approved amount)
- **Rejected:** Rejected by THIS trust

Multiple trusts can approve the same application until fully funded.

### Key Benefits

✅ **Time-Saving:** Automatic ranking, no manual sorting  
✅ **Fair & Transparent:** Clear criteria, no hidden biases  
✅ **Customizable:** Each trust defines own preferences  
✅ **Scalable:** Handles thousands of applications efficiently  
✅ **Secure:** Trust-specific data isolation  

### For Presentations

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

## 🔧 Technical Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL (Neon)
- **Authentication:** JWT tokens
- **File Upload:** Multer middleware
- **Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Nodemailer

### Frontend
- **Framework:** React with Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **HTTP Client:** Axios
- **State Management:** React Context API

### Infrastructure
- **Cloud Storage:** Cloudflare R2
- **Database Hosting:** Neon (Serverless Postgres)
- **File Uploads:** Direct-to-R2 uploads

---


## 📖 Documentation

Full documentation is available in the `/docs` folder:

- [Cloudflare R2 Integration](./docs/cloudflare-r2-integration.md): Complete guide for document storage setup
- [R2 Quick Setup Guide](./docs/r2-quick-setup.md): Fast-track setup for developers
- [Document Management System](./docs/document-management-system.md): File upload and storage architecture
- [Smart Filtering Algorithm (Full Explanation)](./docs/smart-filtering-algorithm.md): **Comprehensive, step-by-step guide to the match scoring system, including logic, flow diagram, technical details, and presentation tips.**

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 14+
- Cloudflare R2 account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Team-C49/ScholarBridge-backup.git
cd ScholarBridge-backup
```

2. **Install dependencies**
```bash
# Backend
cd backend/server
npm install

# Frontend
cd ../../frontend
npm install
```

3. **Configure environment**
```bash
# Backend (.env)
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret
R2_ACCOUNT_ID=your_r2_account
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:4000/api
```

4. **Run database migrations**
```bash
cd backend/server
node scripts/migrate.js
```

5. **Start development servers**
```bash
# Backend (Terminal 1)

## 🎯 Smart Filtering Algorithm

The Smart Filtering Algorithm is the heart of the trust dashboard. It automatically ranks every student application (0–100) based on how well it matches a trust’s preferences for gender, course, city, income, and grades. This ensures that each trust sees the most relevant applications first, saving time and improving fairness.

**How it works:**
- Each trust sets their preferences (gender, courses, cities, max income, min grades)
- Every application is scored (0–100) using a weighted system: Gender (35), Course (30), City (15), Income (15), Grades (5)
- Applications are sorted by score, then by lowest income, then by earliest date
- Color-coded bars (green/yellow/orange/red) show match quality at a glance
- Smart Filtering ON (default): Only shows applications with a non-zero score
- Multi-trust: Each trust sees only their own data; multiple trusts can approve the same application until fully funded

**Want the full technical breakdown, flow diagram, and presentation tips?**

👉 [See the full Smart Filtering Algorithm documentation here.](./docs/smart-filtering-algorithm.md)