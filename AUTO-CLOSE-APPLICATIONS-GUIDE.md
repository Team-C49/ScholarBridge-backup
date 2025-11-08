# Auto-Close Fully Funded Applications - Implementation Guide

## 🎯 Problem
Applications where `Amount Approved >= Amount Requested` should be automatically closed and removed from the "All Applications" tab for all trusts.

## ✅ Solution Implemented

### 1. **New Utility Function: `checkAndAutoCloseApplication()`**
Located in `backend/server/src/routes/trust.js`

This function:
- Checks if an application's total approved amount >= requested amount
- Automatically sets status to 'closed' and sets `closed_at` timestamp
- Updates status to 'partially_approved' if partially funded
- Returns the new status and whether it was closed

### 2. **Enhanced Approval Endpoint**
When a trust approves an application, the system now:
1. Records the approval in `application_approvals` table
2. Calls `checkAndAutoCloseApplication()` to check if fully funded
3. Auto-closes if total approved >= total requested
4. Returns the new status to the frontend

### 3. **New Maintenance Endpoint**
`GET /api/trusts/maintenance/auto-close-applications`

This endpoint:
- Scans ALL applications in the database
- Closes any that are fully funded but not marked as 'closed'
- Updates any submitted applications to 'partially_approved' if they have approvals
- Can be called manually or scheduled to run periodically

---

## 🔧 How to Fix Existing Data

### Option 1: Run SQL Script (Recommended for immediate fix)

1. Open your PostgreSQL shell (psql):
   ```bash
   psql -h [your-host] -U [your-username] -d [your-database]
   ```

2. Run the SQL script:
   ```bash
   \i fix-closed-applications.sql
   ```
   
   Or copy-paste the queries from `fix-closed-applications.sql`

### Option 2: Call Maintenance API Endpoint

1. Start your backend server
2. Login as any trust user
3. Make a GET request:
   ```bash
   curl -X GET "http://localhost:4000/api/trusts/maintenance/auto-close-applications" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. Or use browser/Postman:
   - URL: `http://localhost:4000/api/trusts/maintenance/auto-close-applications`
   - Method: GET
   - Headers: `Authorization: Bearer YOUR_TOKEN`

---

## 📋 Testing Steps

### Test 1: Verify Existing Applications Are Closed

1. **Check Current Status:**
   ```sql
   SELECT 
     a.id,
     a.status,
     a.total_amount_requested,
     COALESCE(SUM(aa.approved_amount), 0) as total_approved
   FROM applications a
   LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
   GROUP BY a.id
   ORDER BY a.created_at DESC;
   ```

2. **Run Maintenance:**
   - Call the maintenance endpoint (see Option 2 above)
   - Or run the SQL script (see Option 1 above)

3. **Verify Applications Are Closed:**
   - Soumil's application (₹40,000 requested, ₹40,000 approved) should now be status = 'closed'
   - It should NOT appear in "All Applications" for new trusts
   - It SHOULD appear in "Approved" tab for the trust that approved it

### Test 2: Test Auto-Close on New Approvals

1. **Create a Test Application:**
   - Student applies for ₹50,000

2. **Trust 1 Approves:**
   - Trust 1 approves ₹30,000
   - Status should become 'partially_approved'
   - Should still appear in "All Applications" for other trusts

3. **Trust 2 Approves:**
   - Trust 2 approves ₹20,000 (total now = ₹50,000)
   - Status should automatically become 'closed'
   - Should disappear from "All Applications" for ALL trusts
   - Should appear in "Approved" tab for Trust 1 and Trust 2

### Test 3: Test Over-Funding Scenario

1. **Student applies for ₹60,000**
2. **Trust 1 approves ₹40,000** → Status: 'partially_approved'
3. **Trust 2 approves ₹30,000** → Total = ₹70,000 > ₹60,000 → Status: 'closed'
4. **Verify:**
   - Application is closed
   - Doesn't appear in any trust's "All Applications"
   - Both trusts see it in their "Approved" tab

---

## 🔄 How the System Works Now

### Application Status Flow:
```
submitted 
    ↓ (first approval, but not fully funded)
partially_approved
    ↓ (total approved >= total requested)
closed
```

### What Each Status Means:

| Status | Description | Appears In "All Applications"? | Approve/Reject Buttons? |
|--------|-------------|-------------------------------|-------------------------|
| `submitted` | No approvals yet | ✅ Yes (for all trusts) | ✅ Yes (for all trusts) |
| `partially_approved` | Some funding, needs more | ✅ Yes (for trusts who haven't approved) | ✅ Yes (for trusts who haven't approved) |
| `closed` | Fully funded | ❌ No (hidden from all) | ❌ No |

### Trust-Specific Filtering:

**"All Applications" Tab:**
- Shows applications WHERE:
  - This trust hasn't approved/rejected yet
  - AND status != 'closed'

**"Approved" Tab:**
- Shows applications WHERE:
  - This trust has approved
  - Regardless of current status (submitted/partially_approved/closed)

**"Rejected" Tab:**
- Shows applications WHERE:
  - This trust has rejected

---

## 🐛 Troubleshooting

### Problem: Closed applications still showing in "All Applications"

**Solution:**
1. Check application status in database:
   ```sql
   SELECT id, status, total_amount_requested,
          (SELECT SUM(approved_amount) FROM application_approvals 
           WHERE application_id = applications.id AND status = 'approved') as total_approved
   FROM applications WHERE id = 'YOUR_APP_ID';
   ```

2. If status is not 'closed' but should be, run maintenance endpoint
3. Refresh frontend dashboard

### Problem: Application closed but trust can't see it in "Approved" tab

**Solution:**
1. Check if trust actually approved it:
   ```sql
   SELECT * FROM application_approvals 
   WHERE application_id = 'YOUR_APP_ID' AND trust_user_id = 'YOUR_TRUST_USER_ID';
   ```

2. If no record exists, the trust never approved it (this is correct behavior)

### Problem: Stats showing wrong numbers

**Solution:**
1. Stats are fetched from `/api/trusts/dashboard/stats` endpoint
2. Check console logs for API errors
3. Verify the endpoint is returning correct data:
   ```bash
   curl -X GET "http://localhost:4000/api/trusts/dashboard/stats" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## 📝 Database Schema Reference

### `applications` table:
- `status`: 'submitted' | 'partially_approved' | 'closed' | 'rejected'
- `total_amount_requested`: Numeric
- `closed_at`: Timestamp (set when status becomes 'closed')

### `application_approvals` table:
- `application_id`: References applications
- `trust_user_id`: Which trust made this approval
- `approved_amount`: Amount this trust approved
- `status`: 'approved' | 'rejected'
- `approved_at`: Timestamp

---

## 🎯 Summary

**Key Changes:**
1. ✅ Added `checkAndAutoCloseApplication()` utility function
2. ✅ Enhanced approval endpoint to auto-close applications
3. ✅ Added maintenance endpoint to fix existing data
4. ✅ Created SQL migration script for manual fixes
5. ✅ Ensured closed applications are hidden from "All Applications"
6. ✅ Stats calculation is trust-specific and accurate

**To Fix Your Current Issue:**
Run either:
- SQL script: `\i fix-closed-applications.sql` in psql
- OR API call: `GET /api/trusts/maintenance/auto-close-applications`

Then refresh your trust dashboard - Soumil's fully funded application should disappear from "All Applications"! 🎉
