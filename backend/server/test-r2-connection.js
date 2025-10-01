// Test R2 connection
require('dotenv').config();
const r2Client = require('./src/utils/r2');

async function testR2Connection() {
  try {
    console.log('🔍 Testing CloudFlare R2 Connection...');
    console.log('📋 Configuration:');
    console.log('  - Account ID:', process.env.R2_ACCOUNT_ID ? '✓ Set' : '❌ Missing');
    console.log('  - Access Key ID:', process.env.R2_ACCESS_KEY_ID ? '✓ Set' : '❌ Missing');
    console.log('  - Secret Access Key:', process.env.R2_SECRET_ACCESS_KEY ? '✓ Set (length: ' + (process.env.R2_SECRET_ACCESS_KEY?.length || 0) + ')' : '❌ Missing');
    console.log('  - Bucket Name:', process.env.R2_BUCKET_NAME || '❌ Missing');
    console.log('  - Endpoint:', process.env.R2_ENDPOINT || '❌ Missing');
    console.log('  - Public Domain:', process.env.R2_PUBLIC_DOMAIN || '❌ Missing');
    
    console.log('\n🧪 Testing file upload...');
    
    // Create a test file buffer
    const testBuffer = Buffer.from('This is a test file for CloudFlare R2 connection', 'utf8');
    const testFileName = `test-${Date.now()}.txt`;
    
    // Upload test file
    const result = await r2Client.uploadFile(
      testBuffer,
      testFileName,
      'text/plain',
      'test-uploads'
    );
    
    console.log('✅ Upload successful!');
    console.log('📄 File details:');
    console.log('  - Key:', result.key);
    console.log('  - URL:', result.url);
    console.log('  - Original Name:', result.originalName);
    console.log('  - Content Type:', result.contentType);
    console.log('  - Size:', result.size, 'bytes');
    
    console.log('\n🎉 CloudFlare R2 is working correctly!');
    
  } catch (error) {
    console.error('❌ CloudFlare R2 connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('Forbidden')) {
      console.error('\n🔐 Possible issues:');
      console.error('  1. Check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
      console.error('  2. Verify that your API token has R2 permissions');
      console.error('  3. Make sure the bucket exists and you have write access');
    }
    
    if (error.message.includes('NoSuchBucket')) {
      console.error('\n🪣 Bucket issue:');
      console.error('  1. Verify that the bucket "' + process.env.R2_BUCKET_NAME + '" exists');
      console.error('  2. Check that the bucket name is spelled correctly');
    }
    
    if (error.message.includes('InvalidAccessKeyId')) {
      console.error('\n🔑 Access Key issue:');
      console.error('  1. Your R2_ACCESS_KEY_ID is invalid');
      console.error('  2. Generate new API credentials from CloudFlare Dashboard');
    }
  }
}

testR2Connection();