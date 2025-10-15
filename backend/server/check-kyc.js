const db = require('./src/utils/db');

async function checkKYC() {
  try {
    const result = await db.query('SELECT * FROM documents WHERE owner_type=$1', ['kyc']);
    console.log('KYC Documents found:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('Sample KYC doc:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('No KYC documents found. Let me check all documents:');
      const allDocs = await db.query('SELECT id, owner_type, doc_type, owner_id FROM documents');
      console.log('All documents:', allDocs.rows);
    }
    process.exit(0);
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
}

checkKYC();