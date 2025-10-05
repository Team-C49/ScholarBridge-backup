const db = require('./src/utils/db');

(async () => {
  try {
    console.log('Checking student_profiles table structure...');
    
    const res = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'student_profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in student_profiles:');
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
    
    // Also check for student documents
    console.log('\nChecking for documents linked to students...');
    const docRes = await db.query(`
      SELECT owner_type, doc_type, COUNT(*) as count
      FROM documents 
      WHERE owner_type LIKE '%student%'
      GROUP BY owner_type, doc_type
      ORDER BY owner_type, doc_type
    `);
    
    if (docRes.rows.length > 0) {
      console.log('Found student documents:');
      docRes.rows.forEach(row => {
        console.log(`  ${row.owner_type} - ${row.doc_type}: ${row.count} documents`);
      });
    } else {
      console.log('No student documents found.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
})();