// Test R2 connection with proper environment variables
require('dotenv').config();
const zipService = require('./src/services/zipService');

async function testR2Connection() {
  try {
    console.log('Testing R2 connection...');
    console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
    console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);
    
    // Test document fetch
    const fileKey = 'kyc-documents/f411fbab-64fa-44e5-aac5-983577cc4afe_agriculture-12-01350-v2.pdf';
    console.log('Testing document fetch for key:', fileKey);
    
    const stream = await zipService.getDocumentStream(fileKey);
    console.log('Stream received successfully:', !!stream);
    
    if (stream) {
      console.log('Stream type:', typeof stream);
      console.log('Stream constructor:', stream.constructor.name);
    }
    
  } catch (error) {
    console.error('R2 Test Error:', error.message);
  }
}

testR2Connection();