const db = require('./src/utils/db');

async function checkDocuments() {
  try {
    console.log('Checking documents in database...');
    
    const documentsResult = await db.query(`
      SELECT d.id, d.doc_type, d.owner_type, d.owner_id, d.original_name,
             COALESCE(a.student_user_id, d.owner_id) as student_user_id
      FROM documents d
      LEFT JOIN applications a ON d.owner_id = a.id AND d.owner_type = 'application'
      ORDER BY d.created_at
      LIMIT 10
    `);
    
    console.log('Documents found:', documentsResult.rows.length);
    documentsResult.rows.forEach(doc => {
      console.log(`- ID: ${doc.id}, Type: ${doc.doc_type}, Owner: ${doc.owner_type}, Student: ${doc.student_user_id}`);
    });
    
    // Also check if there are any users
    const usersResult = await db.query('SELECT id, email, role FROM users LIMIT 5');
    console.log('\nUsers found:', usersResult.rows.length);
    usersResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDocuments();