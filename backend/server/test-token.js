const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test token generation and verification
const testUserId = 1;
const testEmail = 'test@gmail.com';

// Generate a test token
const token = jwt.sign(
  { 
    userId: testUserId, 
    email: testEmail, 
    role: 'student' 
  }, 
  process.env.JWT_SECRET, 
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

console.log('Generated token:', token);
console.log('JWT_SECRET from env:', process.env.JWT_SECRET);

// Try to verify it
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token verification successful:', decoded);
} catch (error) {
  console.log('Token verification failed:', error.message);
}

// Test URL encoding/decoding
const encodedToken = encodeURIComponent(token);
const decodedToken = decodeURIComponent(encodedToken);
console.log('Encoded token length:', encodedToken.length);
console.log('Tokens match after encoding/decoding:', token === decodedToken);