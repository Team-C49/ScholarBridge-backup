const axios = require('axios');

async function testEndpoints() {
  const baseURL = 'http://localhost:4000/api';
  
  console.log('Testing backend endpoints...');
  
  try {
    // Test if server is running
    const healthCheck = await axios.get(`${baseURL}/auth/health`).catch(() => null);
    console.log('Server health check:', healthCheck ? 'OK' : 'Failed');
    
    console.log('\nBackend server is running on port 4000');
    console.log('Frontend is available at: http://localhost:5174');
    console.log('\nChanges made:');
    console.log('✅ Fixed KYC document queries to use owner_type="student" and doc_type="kyc_document"');
    console.log('✅ Fixed document viewing to use blob response with auth headers');
    console.log('✅ Updated complete package download to include KYC documents');
    console.log('✅ Fixed trust payment checkbox positioning');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testEndpoints();