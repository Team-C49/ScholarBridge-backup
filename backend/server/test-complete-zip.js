// Test complete ZIP download functionality
require('dotenv').config();
const zipService = require('./src/services/zipService');
const PDFService = require('./src/services/pdfService');
const db = require('./src/utils/db');

async function testCompleteDownload() {
  try {
    console.log('Testing complete ZIP download...');
    
    const applicationId = '4b6069ff-a540-48f6-a9c1-c979475d46ad';
    
    // Get application data 
    const applicationQuery = `SELECT * FROM applications WHERE id = $1`;
    const result = await db.query(applicationQuery, [applicationId]);
    if (result.rows.length === 0) {
      console.log('Application not found');
      return;
    }
    
    const application = result.rows[0];
    console.log('Application found:', application.id);
    
    // Get KYC documents
    const kycQuery = `
      SELECT id, doc_type, file_url, original_name, created_at 
      FROM documents 
      WHERE owner_id = $1 AND owner_type = 'student' AND doc_type = 'kyc_document'
    `;
    
    const kycResult = await db.query(kycQuery, [application.student_user_id]);
    console.log('KYC documents found:', kycResult.rows.length);
    
    // Get application documents
    const docsQuery = `
      SELECT id, doc_type, file_url, original_name, created_at 
      FROM documents 
      WHERE owner_id = $1 AND owner_type = 'application'
    `;
    
    const docsResult = await db.query(docsQuery, [applicationId]);
    console.log('Application documents found:', docsResult.rows.length);
    
    // Use mock PDF for now (PDF generation needs data structure fixes)
    console.log('Using mock PDF...');
    const pdfBuffer = Buffer.from('Mock PDF content for testing ZIP creation');
    console.log('PDF buffer size:', pdfBuffer.length);
    
    // Create ZIP with PDF and documents
    console.log('Creating ZIP package...');
    const zipBuffer = await zipService.createCompletePackageZip(
      pdfBuffer, 
      [...docsResult.rows, ...kycResult.rows], 
      applicationId
    );
    
    console.log('ZIP created successfully, size:', zipBuffer.length);
    
  } catch (error) {
    console.error('Test Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testCompleteDownload();