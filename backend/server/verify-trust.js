const db = require('./src/utils/db');

async function verifyTrust() {
  try {
    // Just verify the trust 
    const updateResult = await db.query(
      'UPDATE trusts SET verified = true WHERE user_id = $1 RETURNING org_name, verified', 
      ['ce9a7267-16d2-4e14-ae36-0c8ccd108821']
    );
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Trust verified:', updateResult.rows[0].org_name);
    }
    
    // Check login credentials
    const userResult = await db.query(
      'SELECT email FROM users WHERE id = $1', 
      ['ce9a7267-16d2-4e14-ae36-0c8ccd108821']
    );
    
    console.log('\n🎯 YOUR TRUST LOGIN CREDENTIALS:');
    console.log('📧 Email:', userResult.rows[0].email);
    console.log('🔑 Password: (the password you set when registering your trust)');
    
    console.log('\n📋 STEPS TO SEE YOUR APPLICATIONS:');
    console.log('1. Go to your frontend login page');
    console.log('2. Login with email:', userResult.rows[0].email);
    console.log('3. Use your trust registration password'); 
    console.log('4. After login, go to Trust Dashboard');
    console.log('5. You should see your application "SOUMIL MUKHOPADHYAY - B Tech CSE" with match score 35');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.end();
  }
}

verifyTrust();