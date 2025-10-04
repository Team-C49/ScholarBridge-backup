// src/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/hash');
const { sendMail } = require('../utils/mail');
const { authMiddleware, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

router.use(authMiddleware, requireRole('superadmin'));

// ===============================================
// ANALYTICS & DASHBOARD OVERVIEW
// ===============================================

// Get comprehensive dashboard analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    // Get basic counts (simplified without is_blacklisted for now)
    const studentsResult = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);
    const trustsResult = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'trust'`);
    const activeTrustsResult = await db.query(`
      SELECT COUNT(*) as count FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      WHERE u.role = 'trust' AND t.is_active = true
    `);
    const pendingRequestsResult = await db.query(`SELECT COUNT(*) as count FROM trust_registration_requests WHERE status = 'pending'`);
    // For now, set applications and amount to 0 since applications may not be implemented yet
    const applicationsResult = { rows: [{ count: 0 }] };
    const totalAmountResult = { rows: [{ total: 0 }] };

    // Get monthly registration trends for current and previous year
    const currentYear = new Date().getFullYear();
    const monthlyStudents = await db.query(`
      SELECT 
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as count
      FROM users 
      WHERE role = 'student' AND EXTRACT(YEAR FROM created_at) = $1
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY month
    `, [currentYear]);

    const monthlyTrusts = await db.query(`
      SELECT 
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as count
      FROM users 
      WHERE role = 'trust' AND EXTRACT(YEAR FROM created_at) = $1
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY month
    `, [currentYear]);

    // Get yearly comparison
    const yearlyComparison = await db.query(`
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        role,
        COUNT(*) as count
      FROM users 
      WHERE role IN ('student', 'trust') 
        AND EXTRACT(YEAR FROM created_at) >= $1
      GROUP BY EXTRACT(YEAR FROM created_at), role
      ORDER BY year DESC, role
    `, [currentYear - 3]);

    return res.json({
      overview: {
        totalStudents: parseInt(studentsResult.rows[0].count),
        totalTrusts: parseInt(trustsResult.rows[0].count),
        activeTrusts: parseInt(activeTrustsResult.rows[0].count),
        pendingRequests: parseInt(pendingRequestsResult.rows[0].count),
        totalApplications: parseInt(applicationsResult.rows[0].count),
        totalAmountDistributed: parseFloat(totalAmountResult.rows[0].total)
      },
      trends: {
        monthlyStudents: monthlyStudents.rows,
        monthlyTrusts: monthlyTrusts.rows,
        yearlyComparison: yearlyComparison.rows
      }
    });
  } catch (err) {
    console.error('admin analytics overview error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get trust coverage analytics
router.get('/analytics/trust-coverage', async (req, res) => {
  try {
    // For now, return empty data since applications may not be implemented yet
    // Will be updated when applications are fully implemented
    const coverageByTrust = { rows: [] };
    const monthlyDistribution = { rows: [] };
    
    // Get basic trust info for top trusts without applications
    const topTrusts = await db.query(`
      SELECT 
        t.org_name,
        t.contact_email,
        0 as total_applications,
        0 as approved_applications,
        0 as total_distributed
      FROM trusts t
      JOIN users u ON t.user_id = u.id
      WHERE t.is_active = true
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    return res.json({
      coverageByTrust: coverageByTrust.rows,
      monthlyDistribution: monthlyDistribution.rows,
      topTrusts: topTrusts.rows
    });
  } catch (err) {
    console.error('admin trust coverage analytics error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get application analytics
router.get('/analytics/applications', async (req, res) => {
  try {
    // For now, return sample data since applications may not be implemented yet
    const statusDistribution = { 
      rows: [
        { status: 'draft', count: 0, avg_amount: 0 },
        { status: 'submitted', count: 0, avg_amount: 0 },
        { status: 'under_review', count: 0, avg_amount: 0 },
        { status: 'approved', count: 0, avg_amount: 0 },
        { status: 'rejected', count: 0, avg_amount: 0 }
      ] 
    };

    const recentTrends = { rows: [] };

    return res.json({
      statusDistribution: statusDistribution.rows,
      recentTrends: recentTrends.rows
    });
  } catch (err) {
    console.error('admin application analytics error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===============================================
// TRUST REQUEST MANAGEMENT
// ===============================================

router.get('/trust-requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM trust_registration_requests`;
    let countQuery = `SELECT COUNT(*) FROM trust_registration_requests`;
    let params = [];
    
    if (status && status !== 'all') {
      query += ` WHERE status = $1`;
      countQuery += ` WHERE status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY submitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, status && status !== 'all' ? [status] : []);
    
    return res.json({ 
      requests: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].count / limit)
    });
  } catch (err) {
    console.error('admin trust-requests error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single trust request details
router.get('/trust-requests/:id', async (req, res) => {
  try {
    const reqId = req.params.id;
    const { rows } = await db.query(`SELECT * FROM trust_registration_requests WHERE id = $1`, [reqId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Trust request not found' });
    }
    
    // Get associated documents
    const documentsRes = await db.query(`
      SELECT id, doc_type, original_name, file_url, description, created_at, file_size, content_type
      FROM documents 
      WHERE owner_id = $1 AND owner_type = 'trust_registration' AND is_deleted = false
      ORDER BY created_at DESC
    `, [reqId]);
    
    const request = rows[0];
    request.documents = documentsRes.rows || [];
    
    return res.json({ request });
  } catch (err) {
    console.error('admin get trust-request error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===============================================
// USER MANAGEMENT
// ===============================================

// Get all students with enhanced details
router.get('/students', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [`u.role = 'student'`];
    let params = [];
    let paramCount = 0;
    
    if (search) {
      whereConditions.push(`(u.email ILIKE $${++paramCount} OR sp.full_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    // Commenting out blacklist filtering for now since column may not exist
    // if (status === 'active') {
    //   whereConditions.push(`u.is_blacklisted = false`);
    // } else if (status === 'blacklisted') {
    //   whereConditions.push(`u.is_blacklisted = true`);
    // }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Simplified query without applications table and is_blacklisted for now
    const query = `
      SELECT u.id, u.email, u.is_blacklisted, u.created_at, 
             sp.full_name, sp.phone_number, sp.date_of_birth, sp.gender,
             0 as total_applications,
             0 as approved_applications,
             0 as total_received
      FROM users u 
      LEFT JOIN student_profiles sp ON u.id = sp.user_id 
      ${whereClause}
      ORDER BY u.created_at DESC 
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) FROM users u 
      LEFT JOIN student_profiles sp ON u.id = sp.user_id 
      ${whereClause}
    `;
    
    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, -2));
    
    return res.json({ 
      students: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].count / limit)
    });
  } catch (err) {
    console.error('admin get students error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all trusts with enhanced details
router.get('/trusts', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [`u.role = 'trust'`];
    let params = [];
    let paramCount = 0;
    
    if (search) {
      whereConditions.push(`(u.email ILIKE $${++paramCount} OR t.org_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    if (status === 'active') {
      whereConditions.push(`t.is_active = true`);
    } else if (status === 'inactive') {
      whereConditions.push(`t.is_active = false`);
    }
    // Commenting out blacklist filtering for now
    // else if (status === 'blacklisted') {
    //   whereConditions.push(`u.is_blacklisted = true`);
    // }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Simplified query without applications table and is_blacklisted for now
    const query = `
      SELECT u.id, u.email, u.is_blacklisted, u.created_at,
             t.org_name, t.contact_phone, t.contact_email, t.website, 
             t.year_established, t.registration_number, t.is_active, t.verified,
             0 as total_applications,
             0 as approved_applications,
             0 as total_distributed
      FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      ${whereClause}
      ORDER BY t.created_at DESC 
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      ${whereClause}
    `;
    
    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, -2));
    
    return res.json({ 
      trusts: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].count / limit)
    });
  } catch (err) {
    console.error('admin get trusts error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all applications with detailed information
router.get('/applications', async (req, res) => {
  try {
    // Applications feature not yet implemented - return empty data
    return res.json({ 
      applications: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  } catch (err) {
    console.error('admin get applications error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/trust-requests/:id/approve', async (req, res) => {
  try {
    const adminId = req.user.id;
    const reqId = req.params.id;
    const reqRowRes = await db.query(`SELECT * FROM trust_registration_requests WHERE id=$1 AND status='pending'`, [reqId]);
    if (!reqRowRes.rows.length) return res.status(404).json({ error: 'Request not found or already processed' });
    const request = reqRowRes.rows[0];

    const tempPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);
    const pwdHash = await hashPassword(tempPassword);
    const trustUserId = uuidv4();

    await db.query(`INSERT INTO users(id, email, password_hash, role, created_at, updated_at) VALUES($1,$2,$3,'trust',now(),now())`, [
      trustUserId,
      request.registration_email.toLowerCase(),
      pwdHash,
    ]);

    await db.query(
      `INSERT INTO trusts(user_id, org_name, contact_phone, contact_email, website, year_established, address, registration_number, is_active, created_at, updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,now(),now())`,
      [trustUserId, request.org_name, request.contact_phone, request.contact_email || null, request.website || null, request.year_established || null, request.address || {}, request.registration_number]
    );

    await db.query(`UPDATE trust_registration_requests SET status='approved', reviewed_by=$1, reviewed_at=now(), admin_notes=$2 WHERE id=$3`, [adminId, 'Approved', reqId]);

    // Send email (best-effort)
    await sendMail({
      to: request.registration_email,
      subject: `${process.env.APP_NAME || 'ScholarBridge'} - Trust account created`,
      text: `Your username: ${request.registration_email}\nTemporary password: ${tempPassword}\nPlease login and change your password.`,
    }).catch((e) => console.warn('sendMail failed (non-fatal):', e.message));

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'approve_trust',$2)`, [
      adminId,
      JSON.stringify({ requestId: reqId, trustUserId }),
    ]);
    return res.json({ message: 'Approved and created trust user' });
  } catch (err) {
    console.error('admin approve trust error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/trust-requests/:id/reject', async (req, res) => {
  try {
    const adminId = req.user.id;
    const reqId = req.params.id;
    const { reason } = req.body;
    
    // Get request details for email
    const reqRowRes = await db.query(`SELECT * FROM trust_registration_requests WHERE id=$1`, [reqId]);
    if (!reqRowRes.rows.length) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const request = reqRowRes.rows[0];
    
    await db.query(`UPDATE trust_registration_requests SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3`, [
      reason || 'Rejected',
      adminId,
      reqId,
    ]);
    
    // Send rejection email (best-effort)
    await sendMail({
      to: request.registration_email,
      subject: `${process.env.APP_NAME || 'ScholarBridge'} - Trust Registration Rejected`,
      text: `Dear ${request.org_name},

We regret to inform you that your trust registration request has been rejected.

Reason: ${reason || 'No specific reason provided'}

If you believe this was an error or would like to reapply, please contact our support team.

Thank you for your interest in ScholarBridge.

Best regards,
ScholarBridge Team`,
    }).catch((e) => console.warn('sendMail failed (non-fatal):', e.message));
    
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'reject_trust',$2)`, [adminId, JSON.stringify({ requestId: reqId, reason })]);
    return res.json({ message: 'Rejected and notification sent' });
  } catch (err) {
    console.error('admin reject error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/issues', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM issues ORDER BY created_at DESC LIMIT 200`);
    return res.json({ issues: rows });
  } catch (err) {
    console.error('admin issues error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/issues/:id/resolve', async (req, res) => {
  try {
    const adminId = req.user.id;
    const issueId = req.params.id;
    const { resolution_note } = req.body;
    const r = await db.query(`UPDATE issues SET status='resolved', resolved_by_user_id=$1, updated_at=now() WHERE id=$2 RETURNING *`, [adminId, issueId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Issue not found' });
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'resolve_issue',$2)`, [adminId, JSON.stringify({ issueId, resolution_note })]);
    return res.json({ issue: r.rows[0] });
  } catch (err) {
    console.error('admin resolve issue error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===============================================
// USER ACTIONS & MANAGEMENT
// ===============================================

// Blacklist user
router.post('/users/:id/blacklist', async (req, res) => {
  try {
    const adminId = req.user.id;
    const userId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    
    // Check if user exists
    const { rows: userRows } = await db.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });
    
    await db.query(`UPDATE users SET is_blacklisted = true, updated_at = NOW() WHERE id = $1`, [userId]);
    
    // If it's a trust user, deactivate the trust record
    if (userRows[0].role === 'trust') {
      await db.query(`UPDATE trusts SET is_active = false, updated_at = NOW() WHERE user_id = $1`, [userId]);
    }

    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'blacklist_user',$2)`, [
      adminId, 
      JSON.stringify({ target_user_id: userId, reason })
    ]);
    
    return res.json({ message: 'User blacklisted successfully' });
  } catch (err) {
    console.error('admin blacklist user error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Unblacklist user
router.post('/users/:id/unblacklist', async (req, res) => {
  try {
    const adminId = req.user.id;
    const userId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    
    await db.query(`UPDATE users SET is_blacklisted = false, updated_at = NOW() WHERE id = $1`, [userId]);
    
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,'unblacklist_user',$2)`, [
      adminId, 
      JSON.stringify({ target_user_id: userId, reason })
    ]);
    
    return res.json({ message: 'User unblacklisted successfully' });
  } catch (err) {
    console.error('admin unblacklist user error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Activate/Deactivate trust
router.post('/trusts/:id/toggle-status', async (req, res) => {
  try {
    const adminId = req.user.id;
    const trustUserId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    
    // Get current status
    const { rows: trustRows } = await db.query(`
      SELECT t.is_active, u.email, t.org_name 
      FROM trusts t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.user_id = $1
    `, [trustUserId]);
    
    if (!trustRows.length) return res.status(404).json({ error: 'Trust not found' });
    
    const currentStatus = trustRows[0].is_active;
    const newStatus = !currentStatus;
    
    await db.query(`UPDATE trusts SET is_active = $1, updated_at = NOW() WHERE user_id = $2`, [newStatus, trustUserId]);
    
    // Send notification email
    const action = newStatus ? 'activated' : 'deactivated';
    await sendMail({
      to: trustRows[0].email,
      subject: `${process.env.APP_NAME || 'ScholarBridge'} - Trust Account ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      text: `Dear ${trustRows[0].org_name},

Your trust account has been ${action}.

Reason: ${reason}

${newStatus ? 'You can now access your dashboard and manage applications.' : 'Your access has been temporarily suspended. Please contact support if you believe this is an error.'}

Best regards,
ScholarBridge Team`,
    }).catch((e) => console.warn('sendMail failed (non-fatal):', e.message));
    
    await db.query(`INSERT INTO audit_logs(user_id, action, details) VALUES($1,$2,$3)`, [
      adminId, 
      `${action}_trust`,
      JSON.stringify({ trust_user_id: trustUserId, reason, new_status: newStatus })
    ]);
    
    return res.json({ 
      message: `Trust ${action} successfully`,
      is_active: newStatus 
    });
  } catch (err) {
    console.error('admin toggle trust status error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action = '', user_id = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    if (action) {
      whereConditions.push(`action ILIKE $${++paramCount}`);
      params.push(`%${action}%`);
    }
    
    if (user_id) {
      whereConditions.push(`user_id = $${++paramCount}`);
      params.push(user_id);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT al.*, u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC 
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(limit, offset);
    
    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params.slice(0, -2));
    
    return res.json({ 
      logs: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].count / limit)
    });
  } catch (err) {
    console.error('admin audit logs error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
