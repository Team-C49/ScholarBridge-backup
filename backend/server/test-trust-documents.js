// Test trust document upload workflow
require('dotenv').config();
const documentService = require('./src/services/documentService');
const { v4: uuidv4 } = require('uuid');

async function testTrustDocumentUpload() {
  try {
    console.log('🧪 Testing Trust Document Upload Workflow...\n');

    // Create test file buffers
    const testCertBuffer = Buffer.from('This is a test registration certificate document', 'utf8');
    const testDeedBuffer = Buffer.from('This is a test trust deed document', 'utf8');
    
    const testRequestId = uuidv4();
    console.log('📋 Test Request ID:', testRequestId);

    // Test 1: Upload Registration Certificate
    console.log('\n📤 Test 1: Registration Certificate Upload');
    try {
      const certResult = await documentService.uploadDocument(
        testCertBuffer,                 // fileBuffer
        'test-registration-cert.pdf',   // originalName
        'application/pdf',              // contentType
        'registration_certificate',    // docType
        testRequestId,                  // ownerId
        'trust_registration',           // ownerType
        null                           // uploadedByUserId
      );
      
      console.log('✅ Registration Certificate Upload Success:');
      console.log('  - File URL:', certResult.file_url);
      console.log('  - R2 Key:', certResult.r2_key);
      console.log('  - Document ID:', certResult.id);
      console.log('  - Expected Folder: trust-documents/registration/');
      
    } catch (error) {
      console.error('❌ Registration Certificate Upload Failed:', error.message);
      throw error;
    }

    // Test 2: Upload Trust Deed
    console.log('\n📤 Test 2: Trust Deed Upload');
    try {
      const deedResult = await documentService.uploadDocument(
        testDeedBuffer,                 // fileBuffer
        'test-trust-deed.pdf',          // originalName
        'application/pdf',              // contentType
        'trust_deed',                   // docType
        testRequestId,                  // ownerId
        'trust_registration',           // ownerType
        null                           // uploadedByUserId
      );
      
      console.log('✅ Trust Deed Upload Success:');
      console.log('  - File URL:', deedResult.file_url);
      console.log('  - R2 Key:', deedResult.r2_key);
      console.log('  - Document ID:', deedResult.id);
      console.log('  - Expected Folder: trust-documents/deeds/');
      
    } catch (error) {
      console.error('❌ Trust Deed Upload Failed:', error.message);
      throw error;
    }

    console.log('\n🎉 All trust document uploads successful!');
    console.log('\n📝 Next Steps:');
    console.log('1. Check your CloudFlare R2 bucket for:');
    console.log('   - trust-documents/registration/ folder');
    console.log('   - trust-documents/deeds/ folder');
    console.log('2. If folders appear, the issue is in the trust registration API route');
    console.log('3. If folders don\'t appear, there\'s an R2 upload issue');

  } catch (error) {
    console.error('\n❌ Trust document upload test failed:', error);
    
    if (error.message.includes('Invalid document type')) {
      console.error('\n🔧 Document Type Issue:');
      console.error('The documentService doesn\'t recognize the document types.');
    }
    
    if (error.message.includes('R2')) {
      console.error('\n🔧 R2 Connection Issue:');
      console.error('There\'s a problem with CloudFlare R2 upload.');
    }
    
    if (error.message.includes('database') || error.message.includes('INSERT')) {
      console.error('\n🔧 Database Issue:');
      console.error('The documents table might have issues.');
    }
  }
}

testTrustDocumentUpload();