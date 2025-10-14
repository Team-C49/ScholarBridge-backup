// Check application-related table structures
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkApplicationTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking application-related table structures...\n');
    
    const tables = ['applications', 'education_history', 'family_members', 'current_expenses', 'student_profiles'];
    
    for (const tableName of tables) {
      console.log(`📋 ${tableName.toUpperCase()} table structure:`);
      console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Default');
      console.log('-'.repeat(70));
      
      const tableQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        ORDER BY ordinal_position;
      `;
      
      const result = await client.query(tableQuery);
      
      if (result.rows.length === 0) {
        console.log(`❌ Table ${tableName} does not exist!`);
      } else {
        result.rows.forEach(row => {
          console.log(
            row.column_name.padEnd(25) + 
            row.data_type.padEnd(20) + 
            row.is_nullable.padEnd(10) + 
            (row.column_default || 'NULL')
          );
        });
      }
      console.log('\n');
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkApplicationTables();