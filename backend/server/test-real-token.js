const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test with the actual user ID from database
const testUserId = 'f0e927c6-ebe8-4594-aee2-7020a3288406'; // soumil.m@somaiya.edu
const testEmail = 'soumil.m@somaiya.edu';

// Generate a test token for the actual user
const token = jwt.sign(
  { 
    userId: testUserId, 
    email: testEmail, 
    role: 'student' 
  }, 
  process.env.JWT_SECRET, 
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

console.log('Generated token for real user:', token);
console.log('User ID:', testUserId);

// Test document ID (KYC document)
const documentId = 'd8f3ebc9-b4ed-45a0-a710-24fc0ca56a55';
console.log('Document ID:', documentId);

console.log('\nTest URL:');
console.log(`http://localhost:4000/api/student/documents/${documentId}/view?token=${encodeURIComponent(token)}`);