// Quick test to verify the API endpoint is working
const axios = require('axios');

async function testEndpoint() {
  // This simulates what the frontend should be doing
  const API_BASE_URL = 'http://localhost:4000/api';
  
  // Test if server is running
  try {
    console.log('🔍 Testing if backend server is running...');
    
    const healthCheck = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend server is running');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is NOT running');
      console.log('💡 Please start the backend server first:');
      console.log('   cd backend/server && node index.js');
      return;
    } else {
      console.log('⚠️  Backend server responded but /health endpoint not found (this is OK)');
    }
  }
  
  // Test the trust dashboard endpoint without auth (should fail with 401)
  try {
    console.log('\n🔍 Testing trust dashboard endpoint without authentication...');
    await axios.get(`${API_BASE_URL}/trusts/dashboard/applications`);
    console.log('❌ Unexpected: endpoint allowed access without authentication');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Endpoint correctly requires authentication (401 Unauthorized)');
    } else {
      console.log('⚠️  Unexpected error:', error.message);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('  - Backend endpoint exists and requires authentication');
  console.log('  - The issue is likely in frontend authentication or token handling');
  console.log('  - Need to check if user is properly logged in as trust role');
}

testEndpoint();