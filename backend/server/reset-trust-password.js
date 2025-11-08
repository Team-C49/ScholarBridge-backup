const db = require('./src/utils/db');
const bcrypt = require('bcrypt');

async function resetTrustPassword() {
  try {
    console.log('🔐 Resetting password for your trust account...');
    
    // Set a simple, known password for your trust account
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update your trust account password
    const updateResult = await db.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = now()
      WHERE id = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821'
      RETURNING email, role
    `, [hashedPassword]);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Password reset successful!');
      console.log('📧 Trust Email:', updateResult.rows[0].email);
      console.log('🔑 New Password:', newPassword);
      
      console.log('\n🎯 YOUR UPDATED TRUST LOGIN CREDENTIALS:');
      console.log('📧 Email: msoumil30@gmail.com');
      console.log('🔑 Password: password123');
      
      console.log('\n📋 NOW TRY LOGGING IN:');
      console.log('1. Go to your frontend login page');
      console.log('2. Use email: msoumil30@gmail.com');
      console.log('3. Use password: password123');
      console.log('4. After successful login, go to Trust Dashboard');
      console.log('5. You should see your application with SOUMIL MUKHOPADHYAY');
      
    } else {
      console.log('❌ Trust account not found');
    }
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    await db.end();
  }
}

resetTrustPassword();