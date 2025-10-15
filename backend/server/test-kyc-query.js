const db = require('./src/utils/db');

async function testKYC() {
  try {
    // Test user ID from our applications
    const userId = 'f0e927c6-ebe8-4594-aee2-7020a3288406';
    const result = await db.query(`
      SELECT id, doc_type, file_url, description, original_name, created_at 
      FROM documents 
      WHERE owner_type=$1 AND owner_id=$2 AND doc_type=$3
    `, ['student', userId, 'kyc_document']);
    
    console.log('KYC Documents for user:', userId);
    console.log('Found:', result.rows.length, 'documents');
    result.rows.forEach(doc => console.log('- ', doc.doc_type, doc.original_name));
    process.exit(0);
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
}

testKYC();