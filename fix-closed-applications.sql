-- ================================================================
-- FIX: Auto-close applications that are fully funded
-- This script updates applications where total approved >= total requested
-- Run this in your PostgreSQL shell
-- ================================================================

-- Step 0: Add closed_at column if it doesn't exist
ALTER TABLE applications ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Step 1: Show applications that should be closed but aren't
SELECT 
  a.id,
  a.status as current_status,
  a.total_amount_requested,
  COALESCE(SUM(aa.approved_amount), 0) as total_approved,
  a.total_amount_requested - COALESCE(SUM(aa.approved_amount), 0) as remaining
FROM applications a
LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
GROUP BY a.id, a.status, a.total_amount_requested
HAVING COALESCE(SUM(aa.approved_amount), 0) >= a.total_amount_requested
  AND a.status != 'closed';

-- Step 2: Update these applications to 'closed' status
UPDATE applications
SET 
  status = 'closed',
  closed_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT a.id
  FROM applications a
  LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
  GROUP BY a.id, a.total_amount_requested, a.status
  HAVING COALESCE(SUM(aa.approved_amount), 0) >= a.total_amount_requested
    AND a.status != 'closed'
);

-- Step 3: Verify the changes
SELECT 
  a.id,
  a.status,
  a.total_amount_requested,
  COALESCE(SUM(aa.approved_amount), 0) as total_approved,
  a.closed_at
FROM applications a
LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
GROUP BY a.id, a.status, a.total_amount_requested, a.closed_at
ORDER BY a.created_at DESC;
