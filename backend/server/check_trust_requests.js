const db = require('./src/utils/db');

(async () => {
  try {
    console.log('Checking trust_registration_requests table structure...');
    
    const res = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'trust_registration_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in trust_registration_requests:');
    console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
    console.log('-'.repeat(70));
    
    res.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(25) + 
        row.data_type.padEnd(20) + 
        row.is_nullable.padEnd(10) + 
        (row.column_default || 'NULL')
      );
    });
    
    // Check for any existing documents linked to trust requests
    console.log('\nChecking for documents linked to trust requests...');
    const docRes = await db.query(`
      SELECT owner_type, doc_type, COUNT(*) as count
      FROM documents 
      WHERE owner_type = 'trust_request'
      GROUP BY owner_type, doc_type
    `);
    
    if (docRes.rows.length > 0) {
      console.log('Found documents:');
      docRes.rows.forEach(row => {
        console.log(`  ${row.owner_type} - ${row.doc_type}: ${row.count} documents`);
      });
    } else {
      console.log('No documents found for trust requests yet.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
})();