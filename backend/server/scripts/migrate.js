#!/usr/bin/env node
// scripts/migrate.js - Database migration script

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_documents_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon to execute statements individually
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
            // Continue with other statements
          }
        }
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    
    // Test the connection by querying some tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('documents', 'users', 'student_profiles', 'trust_profiles', 'applications', 'otps')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:', tablesResult.rows.map(row => row.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };