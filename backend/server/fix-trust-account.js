const db = require('./src/utils/db');

async function fixTrustAccount() {
  try {
    // Update your trust to be verified so it works properly
    const updateResult = await db.query(`
      UPDATE trusts 
      SET verified = true, verified_at = now() 
      WHERE user_id = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821'
      RETURNING org_name, verified
    `);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Trust account verified:', updateResult.rows[0].org_name);
    }
    
    // Check the password hash for login
    const userResult = await db.query(`
      SELECT email, password_hash FROM users 
      WHERE id = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821'
    `);
    
    if (userResult.rows.length > 0) {
      console.log('📧 Login email:', userResult.rows[0].email);
      console.log('🔐 Password hash exists:', userResult.rows[0].password_hash ? 'Yes' : 'No');
      console.log('🔐 Password hash preview:', userResult.rows[0].password_hash.substring(0, 20) + '...');
    }
    
    await db.end();
    console.log('\n💡 To see your applications in the Trust Dashboard:');
    console.log('   1. Go to the login page');
    console.log('   2. Login with: msoumil30@gmail.com');
    console.log('   3. Use the password you set when registering the trust');
    console.log('   4. Navigate to Trust Dashboard');
    console.log('   5. You should see your application "SOUMIL MUKHOPADHYAY - B Tech CSE" with a match score of 35');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.end();
  }
}

fixTrustAccount();