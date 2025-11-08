const jwt = require('jsonwebtoken');

// Generate a JWT token for the trust user for testing
const trustUserId = 'test-trust-id'; // You'll need to replace with actual UUID from database
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const token = jwt.sign(
  { 
    id: trustUserId, 
    role: 'trust',
    email: 'tech.trust@example.com' 
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('🔐 Test JWT Token for Trust Dashboard:');
console.log(token);
console.log('');
console.log('💡 Usage Instructions:');
console.log('1. Copy this token');
console.log('2. Open browser developer tools');
console.log('3. Go to Application > Local Storage');
console.log('4. Set key: "token", value: [paste the token above]');
console.log('5. Refresh the Trust Dashboard page');
console.log('');
console.log('🌐 Test URLs:');
console.log('- Trust Dashboard: http://localhost:5173/trust/dashboard');
console.log('- Trust Preferences: http://localhost:5173/trust/preferences');
console.log('');
console.log('🔑 Alternative: Use these login credentials:');
console.log('- Email: tech.trust@example.com');
console.log('- Password: password123');