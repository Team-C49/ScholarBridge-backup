-- Create Admin Users Script
-- Run this in your PostgreSQL shell to create 4 admin users

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert 4 admin users with hashed passwords
-- Password for all admins: admin123 (bcrypt hashed)
-- You can change these passwords later through the application

INSERT INTO users (id, email, password_hash, role, email_verified, created_at, updated_at) VALUES
(
  uuid_generate_v4(),
  'soumil.admin@scholarbridge.com',
  '$2b$10$5eRhhpU3dCIz4aNMVwKtHuIoTDlhEDgf4BU/zRVRv6jiTUTN/QTtu',  -- admin123
  'superadmin',
  true,
  now(),
  now()
),
(
  uuid_generate_v4(),
  'farzan.admin@scholarbridge.com',
  '$2b$10$5eRhhpU3dCIz4aNMVwKtHuIoTDlhEDgf4BU/zRVRv6jiTUTN/QTtu',  -- admin123
  'superadmin',
  true,
  now(),
  now()
),
(
  uuid_generate_v4(),
  'mayur.admin@scholarbridge.com',
  '$2b$10$5eRhhpU3dCIz4aNMVwKtHuIoTDlhEDgf4BU/zRVRv6jiTUTN/QTtu',  -- admin123
  'superadmin',
  true,
  now(),
  now()
),
(
  uuid_generate_v4(),
  'hriday.admin@scholarbridge.com',
  '$2b$10$5eRhhpU3dCIz4aNMVwKtHuIoTDlhEDgf4BU/zRVRv6jiTUTN/QTtu',  -- admin123
  'superadmin',
  true,
  now(),
  now()
);

-- Verify the admin users were created
SELECT id, email, role, email_verified, created_at 
FROM users 
WHERE role = 'superadmin' 
ORDER BY created_at DESC;

-- Display success message
\echo 'Successfully created 4 admin users:'
\echo '1. soumil.admin@scholarbridge.com'
\echo '2. farzan.admin@scholarbridge.com'
\echo '3. mayur.admin@scholarbridge.com'  
\echo '4. hriday.admin@scholarbridge.com'
\echo ''
\echo 'Password for all admins: admin123'
\echo ''
\echo 'You can now login with any of these credentials and will be redirected to the admin dashboard.'