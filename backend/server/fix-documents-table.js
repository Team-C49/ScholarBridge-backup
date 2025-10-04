// fix-documents-table.js - Add missing columns to documents table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDocumentsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding missing columns to documents table...\n');
    
    // Add missing columns one by one
    const columnsToAdd = [
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS r2_key TEXT',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_name VARCHAR(255)',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type VARCHAR(100)',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users(id)',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
      'ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()'
    ];
    
    for (let i = 0; i < columnsToAdd.length; i++) {
      try {
        await client.query(columnsToAdd[i]);
        console.log(`✅ Column ${i + 1}/${columnsToAdd.length} added successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Column ${i + 1}/${columnsToAdd.length} already exists, skipping`);
        } else {
          console.error(`❌ Error adding column ${i + 1}:`, error.message);
        }
      }
    }
    
    // Verify the columns were added
    console.log('\n🔍 Verifying updated table structure...');
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(verifyQuery);
    console.log('\n📋 Updated Documents table structure:');
    console.log('Column Name'.padEnd(25) + 'Data Type'.padEnd(20) + 'Nullable');
    console.log('-'.repeat(60));
    
    result.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(25) + 
        row.data_type.padEnd(20) + 
        row.is_nullable
      );
    });
    
    // Check specifically for r2_key column
    const r2KeyExists = result.rows.some(row => row.column_name === 'r2_key');
    console.log('\n🔑 R2_KEY column exists:', r2KeyExists ? '✅ YES' : '❌ NO');
    
    console.log('\n🎉 Documents table update completed!');
    
  } catch (error) {
    console.error('❌ Error updating documents table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDocumentsTable();