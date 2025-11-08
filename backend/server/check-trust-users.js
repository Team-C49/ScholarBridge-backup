const db = require('./src/utils/db');

async function checkTrustUsers() {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.email, u.role, t.org_name, u.password_hash
      FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      WHERE u.role = 'trust' 
    `);
    
    console.log('🏛️ Trust users in database:');
    rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.org_name} (${user.email})`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Password hash: ${user.password_hash.substring(0, 30)}...`);
      console.log('');
    });
    
    if (rows.length === 0) {
      console.log('❌ No trust users found in database');
    } else {
      console.log('💡 To test login, you can use these credentials:');
      console.log('   Email: tech.trust@example.com');
      console.log('   Password: (check your sample data creation script)');
    }
    
    await db.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.end();
  }
}

checkTrustUsers();