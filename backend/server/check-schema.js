const db = require('./src/utils/db');

async function checkDatabaseSchema() {
  const client = await db.connect();
  
  try {
    console.log('🔍 Checking database schema...');
    
    // Check users table structure
    const usersSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Users table structure:');
    usersSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // Check trusts table structure  
    const trustsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'trusts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏛️ Trusts table structure:');
    trustsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // Check applications table structure
    const appsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'applications'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📝 Applications table structure:');
    appsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // Check if any data exists
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const trustCount = await client.query('SELECT COUNT(*) FROM trusts');  
    const appCount = await client.query('SELECT COUNT(*) FROM applications');
    
    console.log('\n📊 Current data counts:');
    console.log(`  Users: ${userCount.rows[0].count}`);
    console.log(`  Trusts: ${trustCount.rows[0].count}`);
    console.log(`  Applications: ${appCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    client.release();
  }
}

// Run the check
checkDatabaseSchema()
  .then(() => {
    console.log('\n✅ Schema check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  });