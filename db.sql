-- ================================
-- ScholarBridge - Full DB Schema
-- Last updated: 2025-09-20 (adjust date as needed)
-- PostgreSQL (Neon)
-- ================================

-- 0) (Optional) Drop existing objects (UNCOMMENT to wipe)
-- WARNING: will delete all data
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS issues CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS application_approvals CASCADE;
-- DROP TABLE IF EXISTS current_expenses CASCADE;
-- DROP TABLE IF EXISTS education_history CASCADE;
-- DROP TABLE IF EXISTS family_members CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS applications CASCADE;
-- DROP TABLE IF EXISTS trust_registration_requests CASCADE;
-- DROP TABLE IF EXISTS trusts CASCADE;
-- DROP TABLE IF EXISTS student_profiles CASCADE;
-- DROP TABLE IF EXISTS otps CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1) Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) USERS
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('student','trust','superadmin')),
  email_verified boolean DEFAULT false,
  force_password_change boolean DEFAULT false,
  is_blacklisted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) STUDENT PROFILES
CREATE TABLE student_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_number text,
  date_of_birth date,
  gender text,
  address jsonb,                -- {street,city,state,postal,country}
  profile_picture_url text,
  kyc_doc_type text,            -- 'aadhaar', 'pan', etc.
  bank_details_cipher text,     -- encrypted blob (app-layer encryption)
  bank_details_masked jsonb,    -- masked bank info for UI
  kyc_consent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) TRUSTS (approved/active trusts)
CREATE TABLE trusts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  contact_phone text,
  contact_email text,
  website text,
  year_established integer,
  address jsonb,
  registration_number text,
  is_active boolean DEFAULT true,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) TRUST REGISTRATION REQUESTS (before admin approval)
CREATE TABLE trust_registration_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name text NOT NULL,
  registration_email text NOT NULL,
  contact_phone text,
  contact_email text,
  website text,
  year_established integer,
  address jsonb,
  registration_number text,
  registration_docs jsonb,   -- array of uploaded doc metadata
  status text NOT NULL DEFAULT 'pending', -- pending / approved / rejected
  admin_notes text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_trust_requests_email ON trust_registration_requests(registration_email);

-- 6) APPLICATIONS (one per student per academic_year)
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year integer NOT NULL,
  current_course_name text,
  school_college_name text,
  status text NOT NULL DEFAULT 'submitted', -- submitted, under_review, partially_approved, approved, rejected, closed
  total_amount_requested numeric(12,2) NOT NULL,
  total_amount_approved numeric(12,2) DEFAULT 0,
  application_snapshot jsonb NOT NULL, -- snapshot of profile/bank/etc at application time
  extra jsonb, -- free-form application details summary
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_application_student_year ON applications(student_user_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 7) DOCUMENTS (files uploaded to R2)
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL, -- e.g., application_id or user_id or trust_id
  owner_type text NOT NULL, -- 'application','user','trust','trust_registration'
  doc_type text NOT NULL, -- 'aadhaar','pan','fee_receipt','marksheet','payment_proof','cancelled_cheque'
  file_url text NOT NULL,  -- full URL (public or R2 endpoint)
  r2_key text,             -- object key in R2 (used for presign/delete)
  file_name text,
  content_type text,
  file_size bigint,
  file_hash text,          -- sha256 hex for tamper detection
  is_public boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_by_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_r2_key ON documents(r2_key) WHERE (r2_key IS NOT NULL);

-- 8) FAMILY MEMBERS (per-application)
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text,
  age integer,
  occupation text,
  monthly_income numeric(12,2),
  income_proof_doc_id uuid REFERENCES documents(id)
);

-- 9) EDUCATION HISTORY (per-application)
CREATE TABLE education_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  qualification text NOT NULL,
  year_of_passing integer,
  grade text,
  marksheet_doc_id uuid REFERENCES documents(id)
);

-- 10) CURRENT EXPENSES (per-application)
CREATE TABLE current_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  expense_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  proof_doc_id uuid REFERENCES documents(id)
);

-- 11) APPLICATION_APPROVALS (trust approves amount for an application)
CREATE TABLE application_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  trust_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- trust user id
  approved_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'approved', -- approved / rejected / pending
  rejection_reason text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  student_confirmed_receipt boolean DEFAULT false,
  student_confirmed_at timestamptz,
  paid boolean DEFAULT false,
  paid_at timestamptz,
  payment_proof_doc_id uuid REFERENCES documents(id)
);
CREATE INDEX IF NOT EXISTS idx_app_approvals_app ON application_approvals(application_id);

-- 12) PAYMENTS (ledger entries for actual transfers)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_approval_id uuid REFERENCES application_approvals(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  txn_reference text,
  payment_method text, -- 'NEFT','cheque','other'
  paid_on timestamptz,
  proof_doc_id uuid REFERENCES documents(id),
  created_at timestamptz DEFAULT now()
);

-- 13) OTPS (for registration / verification)
CREATE TABLE otps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(user_email);

-- 14) ISSUES / TICKETS (disputes etc)
CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid REFERENCES applications(id),
  trust_id uuid REFERENCES trusts(user_id),
  raised_by_user_id uuid NOT NULL REFERENCES users(id),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open / in_progress / resolved / closed
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- 15) AUDIT LOGS (immutable activity log)
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- 16) Helpful views (optional) - example: application funding summary
CREATE OR REPLACE VIEW vw_application_funding AS
SELECT a.id as application_id,
       a.student_user_id,
       a.academic_year,
       a.total_amount_requested,
       COALESCE(SUM(aa.approved_amount),0) AS total_amount_approved,
       a.total_amount_requested - COALESCE(SUM(aa.approved_amount),0) AS remaining_amount
FROM applications a
LEFT JOIN application_approvals aa ON aa.application_id = a.id AND aa.status = 'approved'
GROUP BY a.id, a.student_user_id, a.academic_year, a.total_amount_requested;

-- 17) Sample index / performance tweaks (add later as needed)
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);

-- Done


BEGIN;

-- Add columns used by the application (safe, idempotent)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS r2_key TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_name VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Optional: ensure file_name/file_hash/indexes exist (won't error if already exist)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_r2_key ON documents(r2_key);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

COMMIT;