# Smart Filtering Algorithm – ScholarBridge Trust Dashboard

## Introduction

The Smart Filtering Algorithm is the core of the ScholarBridge platform’s trust dashboard. It enables trusts to efficiently identify, rank, and approve scholarship applications that best match their unique funding criteria. This system ensures fairness, transparency, and scalability, making the scholarship process both effective and user-friendly.

---

## What is Smart Filtering?

Smart Filtering is an intelligent, automated process that evaluates every student application against a trust’s preferences. It assigns a match score (0–100) to each application, based on five weighted criteria:

- **Gender** (35 points)
- **Course** (30 points)
- **City/Location** (15 points)
- **Family Income** (15 points)
- **Academic Grades** (5 points)

This score helps trusts quickly see which students are the best fit for their funding policies.

---

## How Does It Work? (Step-by-Step)

1. **Trust Sets Preferences**
   - Each trust defines its preferred gender, eligible courses, target cities, maximum family income, and minimum academic percentage.

2. **System Fetches Applications**
   - All student applications are retrieved from the database.

3. **Score Calculation**
   - For each application, the algorithm checks how well the student matches each trust preference:
     - **Gender:** +35 if matches, else 0
     - **Course:** +30 if matches, else 0
     - **City:** +15 if matches, else 0
     - **Income:** +15 if within limit, else 0
     - **Grades:** +5 if meets/exceeds, else 0
   - If a trust leaves a preference blank (e.g., no city preference), all values are accepted for that criterion.

4. **(Optional) Smart Filtering Toggle**
   - If enabled (default), only applications with a non-zero score are shown. If disabled, all applications are shown, sorted by score.

5. **Sorting**
   - Applications are sorted by:
     1. Match Score (descending)
     2. Family Income (ascending)
     3. Application Date (ascending)

6. **Display**
   - The dashboard displays applications with color-coded match bars:
     - 🟢 80–100: Excellent
     - 🟡 60–79: Good
     - 🟠 40–59: Fair
     - 🔴 0–39: Poor

---

## Flow Diagram

```
┌────────────────────────────┐
│ 1. Trust sets preferences  │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ 2. Fetch all applications  │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ 3. For each application:   │
│   ├─ Calculate score       │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ 4. (Optional) Filter out   │
│    0-score applications    │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ 5. Sort applications by:   │
│   • Score (DESC)           │
│   • Income (ASC)           │
│   • Date (ASC)             │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ 6. Display ranked results  │
└────────────────────────────┘
```

---

## Example Scenarios

### 1. Perfect Match (100/100)
- Gender: Female (matches) → +35
- Course: B Tech CSE (matches) → +30
- City: Mumbai (matches) → +15
- Income: 3.8 LPA (within limit) → +15
- Grades: 75% (meets/exceeds) → +5
- **Total:** 100 (Excellent)

### 2. Partial Match (50/100)
- Gender: Female (matches) → +35
- Course: B.Com (not in list) → +0
- City: Mumbai (matches) → +15
- Income: 6 LPA (exceeds limit) → +0
- Grades: 55% (below minimum) → +0
- **Total:** 50 (Fair)

### 3. Poor Match (15/100)
- Gender: Male (not preferred) → +0
- Course: B.Com (not in list) → +0
- City: Mumbai (matches) → +15
- Income: 10 LPA (exceeds limit) → +0
- Grades: 50% (below minimum) → +0
- **Total:** 15 (Poor)

---

## Technical Details

- **Database Query:** Uses SQL with Common Table Expressions (CTEs) for efficient scoring and filtering.
- **Performance:** Single query for all scoring, indexed columns for speed.
- **Data Isolation:** Each trust only sees applications relevant to them (multi-trust system).
- **Security:** No trust can see another trust’s approvals or rejections.
- **Scalability:** Handles thousands of applications in real time.

---

## Why is This Important?

- **Saves Time:** Trusts instantly see the best-fit applications.
- **Fair & Transparent:** Clear, auditable criteria for every decision.
- **Customizable:** Each trust can change preferences anytime.
- **Reduces Overload:** Smart filtering hides irrelevant applications.
- **Supports Collaboration:** Multiple trusts can approve the same application until fully funded.

---

## Presentation Tips

- **Simple Analogy:**
  - “It’s like a dating app for scholarships—students and trusts are matched based on compatibility.”
- **Key Points:**
  - 5 weighted criteria, 0–100 score
  - Color-coded bars for quick visual feedback
  - Trusts only see their own data
  - Real-time, scalable, and secure

---

*This document explains everything you need to know about the Smart Filtering Algorithm in ScholarBridge. Use it for presentations, onboarding, or technical deep dives.*
