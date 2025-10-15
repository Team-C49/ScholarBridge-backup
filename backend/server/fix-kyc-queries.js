const fs = require('fs');

// Read the file
let content = fs.readFileSync('./src/routes/student.js', 'utf8');

// Replace all KYC document queries
content = content.replace(
  /WHERE owner_type='kyc' AND owner_id=\$1/g, 
  "WHERE owner_type='student' AND owner_id=$1 AND doc_type='kyc_document'"
);

content = content.replace(
  /\(d\.owner_type = 'kyc' AND d\.owner_id = \$2\)/g,
  "(d.owner_type = 'student' AND d.owner_id = $2 AND d.doc_type = 'kyc_document')"
);

// Write the file back
fs.writeFileSync('./src/routes/student.js', content);
console.log('Updated all KYC document queries');