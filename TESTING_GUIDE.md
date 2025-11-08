# Trust Dashboard Testing Guide

## 🚀 Quick Start

### 1. Database Setup
The database has been set up with sample data. If you need to recreate it:

```bash
# In backend/server directory
node setup-trust-preferences.js  # Add preferences column
node create-sample-data.js        # Create sample trust and students
```

### 2. Backend Server
```bash
# Start the backend (runs on port 4000)
cd backend/server
npm start
```

### 3. Frontend Server  
```bash
# Start the frontend (runs on port 5173)
cd frontend
npm run dev
```

## 👥 Test Accounts

### Trust Account
- **Email**: `tech.trust@example.com`
- **Password**: `password123`
- **Preferences**: Females in CS/IT from Delhi/Mumbai/Bangalore, Income < 5 LPA, Grade > 75%

### Student Accounts
All students have password: `password123`

1. **Priya Sharma** (`priya.sharma@student.edu`) - 100/100 match
   - Female, Computer Science Engineering, Delhi, 3.5 LPA, 85.5%

2. **Anita Patel** (`anita.patel@student.edu`) - 100/100 match  
   - Female, Information Technology, Mumbai, 2.8 LPA, 91.2%

3. **Sneha Reddy** (`sneha.reddy@student.edu`) - 85/100 match
   - Female, Computer Science Engineering, Chennai, 3.0 LPA, 82.1%

4. **Rahul Verma** (`rahul.verma@student.edu`) - 35/100 match
   - Male, Mechanical Engineering, Bangalore, 4.2 LPA, 78.3%

5. **Arjun Singh** (`arjun.singh@student.edu`) - 20/100 match
   - Male, Medical (MBBS), Delhi, 6.0 LPA, 88.7%

## 🧮 Algorithm Testing

### Expected Results (Trust: Tech Excellence Trust)

When Smart Filtering is **ON** (default):
- Should show only 3 applications: Priya (100), Anita (100), Sneha (85)
- Filtered out: Rahul (male, wrong course), Arjun (male, wrong course, high income)

When Smart Filtering is **OFF**:
- Shows all 5 applications sorted by score: Priya (100), Anita (100), Sneha (85), Rahul (35), Arjun (20)

### Scoring Breakdown

**Priya Sharma: 100/100**
- Gender: Female ✅ (+35 points)  
- Course: Computer Science Engineering ✅ (+30 points)
- Location: Delhi ✅ (+15 points)
- Income: 3.5 LPA ✅ (+15 points)
- Grade: 85.5% ✅ (+5 points)

**Anita Patel: 100/100**
- Gender: Female ✅ (+35 points)
- Course: Information Technology ✅ (+30 points)  
- Location: Mumbai ✅ (+15 points)
- Income: 2.8 LPA ✅ (+15 points)
- Grade: 91.2% ✅ (+5 points)

**Sneha Reddy: 85/100**
- Gender: Female ✅ (+35 points)
- Course: Computer Science Engineering ✅ (+30 points)
- Location: Chennai ❌ (+0 points)
- Income: 3.0 LPA ✅ (+15 points)  
- Grade: 82.1% ✅ (+5 points)

## 🎯 Test Scenarios

### 1. Basic Dashboard Test
1. Login as trust (`tech.trust@example.com`)
2. Navigate to `/trust/dashboard`
3. Verify statistics cards show correct numbers
4. Verify smart filtering toggle works
5. Verify applications are sorted by match score

### 2. Preferences Management Test
1. Click "Preferences" button
2. Modify preferences (e.g., change gender to "Any")  
3. Save preferences
4. Return to dashboard
5. Verify applications and scores update accordingly

### 3. Application Detail Test
1. Click "View" on any application
2. Verify complete student information is displayed
3. Test approve/reject functionality
4. Verify status updates in dashboard

### 4. Smart Filtering Test
1. Toggle "Smart Filtering" ON/OFF
2. Verify different applications shown
3. Verify match score column appears/disappears appropriately

## 🔧 API Endpoints

### Trust Authentication
- `POST /api/auth/login` - Login with trust credentials
- `GET /api/trusts/me/preferences` - Get trust preferences
- `PUT /api/trusts/me/preferences` - Update trust preferences

### Trust Dashboard  
- `GET /api/trusts/dashboard/applications?view=filtered&status=all` - Get applications with algorithm
- `GET /api/trusts/application/{id}` - Get application details
- `PUT /api/trusts/application/{id}/status` - Approve/reject application

### Sample API Calls

```javascript
// Get filtered applications (with smart filtering)
GET /api/trusts/dashboard/applications?view=filtered&status=all

// Get all applications (no filtering) 
GET /api/trusts/dashboard/applications?view=all&status=all

// Update preferences
PUT /api/trusts/me/preferences
{
  "preferred_gender": "Female",
  "preferred_courses": ["Computer Science Engineering", "Information Technology"],
  "preferred_cities": ["Delhi", "Mumbai", "Bangalore"],
  "max_family_income_lpa": 5.0,
  "min_academic_percentage": 75.0
}
```

## 🐛 Troubleshooting

### Backend Issues
- **Port 4000 in use**: Change port in .env file or kill existing process
- **Database connection**: Verify DATABASE_URL in .env file
- **No applications showing**: Run `node create-sample-data.js`

### Frontend Issues  
- **CORS errors**: Ensure backend is running on port 4000
- **Auth errors**: Check JWT_SECRET matches between frontend/backend
- **No data loading**: Check browser network tab for API call errors

### Algorithm Issues
- **Wrong scores**: Verify trust preferences are saved correctly
- **No filtering**: Check smart filtering toggle state
- **Missing applications**: Verify application status is 'submitted'

## 📊 Database Queries for Debugging

```sql
-- Check trust preferences
SELECT u.email, t.org_name, t.preferences 
FROM users u 
JOIN trusts t ON u.id = t.user_id;

-- Check applications with student info
SELECT a.id, sp.full_name, sp.gender, a.current_course_name, 
       sp.address->>'city' as city, a.status, a.total_amount_requested
FROM applications a 
JOIN student_profiles sp ON a.student_user_id = sp.user_id;

-- Check family income calculation
SELECT a.id, sp.full_name, SUM(fm.monthly_income) * 12 / 100000 as income_lpa
FROM applications a 
JOIN student_profiles sp ON a.student_user_id = sp.user_id
LEFT JOIN family_members fm ON a.id = fm.application_id
GROUP BY a.id, sp.full_name;
```

## 🎓 Research Data Collection

Once the system is working, you can collect data for your research paper:

1. **Match Score vs Approval Rate**: Track correlation between algorithm scores and actual approvals
2. **Review Time**: Measure time savings from smart filtering  
3. **Trust Satisfaction**: Survey trusts on algorithm accuracy
4. **Application Quality**: Compare relevant vs total applications shown

The system automatically logs all actions for analysis. Check the `audit_logs` table for detailed activity data.

---

**Ready to test!** 🚀 The Trust Dashboard should now provide intelligent, prioritized application management exactly as specified in your roadmap.