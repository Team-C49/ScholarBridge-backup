const fs = require('fs');
const path = require('path');
const db = require('./src/utils/db');

async function runMigration() {
  try {
    console.log('Running migration: 002_add_received_amount.sql');
    
    const migrationPath = path.join(__dirname, 'migrations/003_trust_payments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await db.query(statement.trim());
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();