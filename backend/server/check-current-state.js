const db = require('./src/utils/db');

async function checkCurrentState() {
  try {
    console.log('🔍 Checking current database state...');
    
    // Check if preferences column exists
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trusts' AND column_name = 'preferences'
    `);
    
    console.log('1. Preferences column exists:', columnsResult.rows.length > 0 ? 'Yes' : 'No');
    
    // Check if helper function exists
    try {
      await db.query("SELECT jsonb_array_to_text_array('[\"test\"]')");
      console.log('2. Helper function exists: Yes');
    } catch (e) {
      console.log('2. Helper function exists: No');
    }
    
    // Check current trust table structure
    const trustCols = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'trusts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n3. Current trusts table columns:');
    trustCols.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check existing endpoints
    console.log('\n4. Next steps:');
    console.log('   - Will implement Best Fit algorithm using your exact schema');
    console.log('   - Will add preferences endpoints only if needed');
    console.log('   - Will use your real data only (no test data)');
    
    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
    await db.end();
  }
}

checkCurrentState();