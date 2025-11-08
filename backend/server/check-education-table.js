// Check education_history table structure
require('dotenv').config();
const db = require('./src/utils/db');

async function checkEducationHistoryTable() {
  console.log('🔍 CHECKING EDUCATION HISTORY TABLE STRUCTURE');
  console.log('=' .repeat(70));

  try {
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'education_history'
      ORDER BY ordinal_position
    `;
    
    const { rows: columns } = await db.query(structureQuery);
    console.log('\n📋 EDUCATION_HISTORY TABLE COLUMNS:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Get sample data
    const sampleQuery = `
      SELECT 
        eh.*,
        sp.full_name
      FROM education_history eh
      JOIN applications a ON eh.application_id = a.id
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      LIMIT 5
    `;
    
    const { rows: samples } = await db.query(sampleQuery);
    console.log('\n📊 SAMPLE DATA:');
    samples.forEach(sample => {
      console.log(`\n   Student: ${sample.full_name}`);
      Object.keys(sample).forEach(key => {
        if (key !== 'full_name' && key !== 'id' && key !== 'application_id') {
          console.log(`      ${key}: ${sample[key]}`);
        }
      });
    });
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await db.end();
  }
}

checkEducationHistoryTable();