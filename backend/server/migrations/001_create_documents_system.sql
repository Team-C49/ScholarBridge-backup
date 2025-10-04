-- Database schema for ScholarBridge Document Management System
-- Migration: 001_create_documents_system.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main documents table for storing document metadata and CloudFlare R2 references
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,                    -- References users.id, applications.id, etc.
    owner_type VARCHAR(50) NOT NULL,           -- 'student', 'trust', 'application', 'family_member'
    doc_type VARCHAR(100) NOT NULL,            -- Document type (kyc_document, marksheet, etc.)
    file_url TEXT NOT NULL,                    -- CloudFlare R2 public URL
    r2_key TEXT,                               -- CloudFlare R2 object key for management
    original_name VARCHAR(255),                -- Original uploaded filename
    content_type VARCHAR(100),                 -- MIME type
    file_size BIGINT,                          -- File size in bytes
    description TEXT,                          -- Human-readable description
    metadata JSONB DEFAULT '{}',               -- Additional metadata (tags, categories, etc.)
    uploaded_by_user_id UUID REFERENCES users(id),  -- Who uploaded the document
    is_verified BOOLEAN DEFAULT FALSE,         -- Whether document has been verified
    verified_by_user_id UUID REFERENCES users(id),  -- Who verified the document
    verified_at TIMESTAMPTZ,                   -- When it was verified
    is_deleted BOOLEAN DEFAULT FALSE,          -- Soft delete flag
    deleted_at TIMESTAMPTZ,                    -- When it was deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTPs table for email verification
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,                       -- Track when OTP was used
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student profiles table (if not exists)
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address JSONB DEFAULT '{}',
    profile_picture_url TEXT,                  -- CloudFlare R2 URL
    kyc_doc_type VARCHAR(50),
    bank_details_cipher TEXT,                  -- Encrypted bank details
    bank_details_masked JSONB,                 -- Masked bank details for display
    is_profile_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust profiles table (if not exists)
CREATE TABLE IF NOT EXISTS trust_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trust_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    contact_person VARCHAR(255),
    phone_number VARCHAR(20),
    address JSONB DEFAULT '{}',
    website_url TEXT,
    description TEXT,
    registration_certificate_url TEXT,         -- CloudFlare R2 URL
    trust_deed_url TEXT,                       -- CloudFlare R2 URL
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table for scholarship applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    trust_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount_requested DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft',        -- draft, submitted, under_review, approved, rejected
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id UUID REFERENCES users(id),
    approval_reason TEXT,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members table for additional document owners
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,         -- father, mother, guardian, sibling
    phone_number VARCHAR(20),
    occupation VARCHAR(100),
    income DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table extensions (if needed)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student', -- student, trust, admin
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for tracking all important actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,              -- login, upload_document, verify_document, etc.
    resource_type VARCHAR(50),                 -- document, application, user
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_otps_email_code ON otps(user_email, otp_code);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_trust ON applications(trust_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trust_profiles_updated_at BEFORE UPDATE ON trust_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();