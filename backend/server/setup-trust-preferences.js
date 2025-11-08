const db = require('./src/utils/db');

async function addPreferencesColumn() {
  try {
    // Add preferences column to trusts table
    await db.query(`
      ALTER TABLE trusts 
      ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb
    `);
    console.log('✅ Added preferences column to trusts table');
    
    // Create the helper function for PostgreSQL
    await db.query(`
      CREATE OR REPLACE FUNCTION jsonb_array_to_text_array(p_jsonb jsonb)
      RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
        SELECT ARRAY(SELECT value FROM jsonb_array_elements_text(p_jsonb));
      $$
    `);
    console.log('✅ Created helper function for JSONB array conversion');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

addPreferencesColumn();