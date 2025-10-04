// check-database.js - Check database table structure
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Check if documents table exists and get its structure
    const tableQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(tableQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ Documents table does not exist!');
      return;
    }
    
    console.log('📋 Documents table structure:');
    console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
    console.log('-'.repeat(70));
    
    result.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(25) + 
        row.data_type.padEnd(20) + 
        row.is_nullable.padEnd(10) + 
        (row.column_default || 'NULL')
      );
    });
    
    // Check specifically for r2_key column
    const r2KeyExists = result.rows.some(row => row.column_name === 'r2_key');
    console.log('\n🔑 R2_KEY column exists:', r2KeyExists ? '✅ YES' : '❌ NO');
    
    // List all tables in the database
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('\n📊 All tables in database:');
    tablesResult.rows.forEach(row => console.log('  -', row.table_name));
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();