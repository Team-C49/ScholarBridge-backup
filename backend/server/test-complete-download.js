const db = require('./src/utils/db');

async function testCompleteDownload() {
  try {
    const userId = 'f0e927c6-ebe8-4594-aee2-7020a3288406';
    const appId = '4b6069ff-a540-48f6-a9c1-c979475d46ad';
    
    console.log('Testing complete download endpoint components...');
    
    // Test application exists
    const app = await db.query(`SELECT * FROM applications WHERE id=$1 AND student_user_id=$2`, [appId, userId]);
    console.log('Application found:', app.rows.length > 0);
    
    // Test profile
    const profile = await db.query(`
      SELECT sp.*, u.email 
      FROM student_profiles sp 
      LEFT JOIN users u ON sp.user_id = u.id 
      WHERE sp.user_id = $1
    `, [userId]);
    console.log('Profile found:', profile.rows.length > 0);
    
    // Test documents
    const documents = await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='application' AND owner_id=$1
    `, [appId]);
    console.log('Application documents found:', documents.rows.length);
    
    // Test KYC documents
    const kycDocuments = await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'
    `, [userId]);
    console.log('KYC documents found:', kycDocuments.rows.length);
    
    // Test trust payments
    const trustPayments = await db.query(`
      SELECT tp.*, tp.trust_name, tp.amount, tp.payment_date, tp.reference_number, tp.remarks
      FROM trust_payments tp 
      WHERE tp.application_id=$1
      ORDER BY tp.payment_date DESC
    `, [appId]);
    console.log('Trust payments found:', trustPayments.rows.length);
    
    console.log('\nAll components ready for complete download!');
    
    process.exit(0);
  } catch (error) {
    console.log('Error in complete download test:', error.message);
    process.exit(1);
  }
}

testCompleteDownload();