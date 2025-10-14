-- Create trust_payments table to track individual payments from trusts
CREATE TABLE IF NOT EXISTS trust_payments (
    id SERIAL PRIMARY KEY,
    application_id UUID REFERENCES applications(id),
    trust_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    reference_number VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample trust payment data
INSERT INTO trust_payments (application_id, trust_name, amount, payment_date, reference_number, remarks) VALUES
('4b6069ff-a540-48f6-a9c1-c979475d46ad', 'Education Foundation Trust', 5000.00, '2023-12-15', 'EFT/2023/001', 'Initial payment for academic year 2023-24'),
('4b6069ff-a540-48f6-a9c1-c979475d46ad', 'Student Welfare Society', 3000.00, '2024-01-10', 'SWS/2024/005', 'Additional support for books and materials'),
('8485d4ae-94f8-41c7-9b51-29ef924660f6', 'Merit Scholarship Trust', 4000.00, '2023-11-20', 'MST/2023/012', 'Merit-based scholarship award');

-- Update received amounts based on trust payments
UPDATE applications 
SET received_amount = (
    SELECT COALESCE(SUM(tp.amount), 0) 
    FROM trust_payments tp 
    WHERE tp.application_id = applications.id
);