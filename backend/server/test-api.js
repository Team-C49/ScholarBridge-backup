const axios = require('axios');

async function testAPI() {
  try {
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:4000/api/health');
    console.log('Health check:', healthResponse.data);
    
    console.log('Backend is running successfully!');
    console.log('Frontend is available at: http://localhost:5174/');
    console.log('Backend is available at: http://localhost:4000/');
    
  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI();