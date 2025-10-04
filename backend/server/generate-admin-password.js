// generate-admin-password.js
// Run this script to generate bcrypt hash for admin password

const bcrypt = require('bcrypt');

async function generateAdminPassword() {
  const password = 'admin123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Bcrypt Hash:', hash);
    console.log('\nUse this hash in your SQL script');
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateAdminPassword();