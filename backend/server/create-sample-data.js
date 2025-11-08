const db = require('./src/utils/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createSampleData() {
  const client = await db.connect();
  
  try {
    console.log('🚀 Creating sample data for Trust Dashboard testing...');
    
    // Create sample students
    const students = [
      {
        email: 'priya.sharma@student.edu',
        name: 'Priya Sharma',
        gender: 'Female',
        course: 'Computer Science Engineering',
        college: 'IIT Delhi',
        city: 'Delhi',
        income: 3.5, // 3.5 LPA
        grade: 85.5,
        amount: 150000
      },
      {
        email: 'rahul.verma@student.edu', 
        name: 'Rahul Verma',
        gender: 'Male',
        course: 'Mechanical Engineering',
        college: 'NIT Bangalore',
        city: 'Bangalore',
        income: 4.2,
        grade: 78.3,
        amount: 120000
      },
      {
        email: 'anita.patel@student.edu',
        name: 'Anita Patel',
        gender: 'Female',
        course: 'Information Technology',
        college: 'BITS Pilani',
        city: 'Mumbai',
        income: 2.8,
        grade: 91.2,
        amount: 180000
      },
      {
        email: 'arjun.singh@student.edu',
        name: 'Arjun Singh',
        gender: 'Male',
        course: 'Medical (MBBS)',
        college: 'AIIMS Delhi',
        city: 'Delhi',
        income: 6.0,
        grade: 88.7,
        amount: 250000
      },
      {
        email: 'sneha.reddy@student.edu',
        name: 'Sneha Reddy',
        gender: 'Female',
        course: 'Computer Science Engineering',
        college: 'VIT Chennai',
        city: 'Chennai',
        income: 3.0,
        grade: 82.1,
        amount: 140000
      }
    ];

    // Create sample trust
    const trustEmail = 'tech.trust@example.com';
    const trustPassword = await bcrypt.hash('password123', 10);
    
    // Check if trust already exists
    const existingTrust = await client.query('SELECT id FROM users WHERE email = $1', [trustEmail]);
    
    let trustUserId;
    if (existingTrust.rows.length === 0) {
      console.log('📋 Creating sample trust user...');
      
      const trustUser = await client.query(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES ($1, $2, $3, 'trust')
        RETURNING id
      `, [uuidv4(), trustEmail, trustPassword]);
      
      trustUserId = trustUser.rows[0].id;
      
      // Create trust profile
      await client.query(`
        INSERT INTO trusts (user_id, org_name, contact_phone, contact_email, address, registration_number, is_active, verified)
        VALUES ($1, $2, $3, $4, $5, $6, true, true)
      `, [trustUserId, 'Tech Excellence Trust', '+91-9876543210', trustEmail, JSON.stringify({city: 'Mumbai', state: 'Maharashtra'}), 'TRUST123456']);
      
      // Set trust preferences (focusing on females in tech)
      await client.query(`
        UPDATE trusts 
        SET preferences = $1
        WHERE user_id = $2
      `, [JSON.stringify({
        preferred_gender: 'Female',
        preferred_courses: ['Computer Science Engineering', 'Information Technology'],
        preferred_cities: ['Delhi', 'Mumbai', 'Bangalore'],
        max_family_income_lpa: 5.0,
        min_academic_percentage: 75.0
      }), trustUserId]);
      
      console.log('✅ Trust created with preferences for females in tech with income < 5 LPA');
    } else {
      trustUserId = existingTrust.rows[0].id;
      console.log('📋 Using existing trust user');
    }

    // Create sample students and applications
    for (const student of students) {
      // Check if student exists
      const existingStudent = await client.query('SELECT id FROM users WHERE email = $1', [student.email]);
      
      let studentUserId;
      if (existingStudent.rows.length === 0) {
        console.log(`👨‍🎓 Creating student: ${student.name}`);
        
        const studentPassword = await bcrypt.hash('password123', 10);
        const studentUser = await client.query(`
          INSERT INTO users (id, email, password_hash, role)
          VALUES ($1, $2, $3, 'student')
          RETURNING id
        `, [uuidv4(), student.email, studentPassword]);
        
        studentUserId = studentUser.rows[0].id;
        
        // Create student profile
        await client.query(`
          INSERT INTO student_profiles (
            user_id, full_name, phone_number, date_of_birth, gender, address
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          studentUserId,
          student.name,
          '+91-9876543210',
          '2002-05-15',
          student.gender,
          JSON.stringify({
            street: '123 Student Street',
            city: student.city,
            state: student.city === 'Mumbai' ? 'Maharashtra' : 
                   student.city === 'Delhi' ? 'Delhi' :
                   student.city === 'Bangalore' ? 'Karnataka' : 'Tamil Nadu',
            postal: '110001',
            country: 'India'
          })
        ]);
        
        // Create application
        const applicationId = uuidv4();
        await client.query(`
          INSERT INTO applications (
            id, student_user_id, academic_year, current_course_name, 
            school_college_name, status, total_amount_requested, 
            application_snapshot
          ) VALUES ($1, $2, $3, $4, $5, 'submitted', $6, $7)
        `, [
          applicationId,
          studentUserId,
          2024,
          student.course,
          student.college,
          student.amount,
          JSON.stringify({
            profile_at_submission: {
              name: student.name,
              gender: student.gender,
              city: student.city
            }
          })
        ]);
        
        // Add family member (for income calculation)
        await client.query(`
          INSERT INTO family_members (
            id, application_id, name, relation, age, occupation, monthly_income
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          uuidv4(),
          applicationId,
          'Father',
          'father',
          45,
          'Government Employee',
          (student.income * 100000) / 12 // Convert LPA to monthly
        ]);
        
        // Add education history
        await client.query(`
          INSERT INTO education_history (
            id, application_id, institution_name, qualification, 
            year_of_passing, grade
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          uuidv4(),
          applicationId,
          'Previous College',
          '12th Standard',
          2020,
          student.grade.toString()
        ]);
        
        console.log(`✅ Created application for ${student.name} - ${student.course} (${student.gender})`);
      } else {
        console.log(`📋 Student ${student.name} already exists`);
      }
    }

    console.log('\n🎉 Sample data creation completed!');
    console.log('\n📊 Expected Match Scores (for Tech Excellence Trust):');
    console.log('Trust Preferences: Female, CS/IT, Delhi/Mumbai/Bangalore, Income < 5 LPA, Grade > 75%');
    console.log('');
    
    students.forEach(student => {
      let score = 0;
      let details = [];
      
      // Gender (35 points)
      if (student.gender === 'Female') {
        score += 35;
        details.push('Gender: +35');
      } else {
        details.push('Gender: +0');
      }
      
      // Course (30 points)  
      if (['Computer Science Engineering', 'Information Technology'].includes(student.course)) {
        score += 30;
        details.push('Course: +30');
      } else {
        details.push('Course: +0');
      }
      
      // Location (15 points)
      if (['Delhi', 'Mumbai', 'Bangalore'].includes(student.city)) {
        score += 15;
        details.push('Location: +15');
      } else {
        details.push('Location: +0');
      }
      
      // Income (15 points)
      if (student.income <= 5.0) {
        score += 15;
        details.push('Income: +15');
      } else {
        details.push('Income: +0');
      }
      
      // Grade (5 points)
      if (student.grade >= 75.0) {
        score += 5;
        details.push('Grade: +5');
      } else {
        details.push('Grade: +0');
      }
      
      console.log(`${student.name}: ${score}/100 (${details.join(', ')})`);
    });
    
    console.log('\n🔍 Login credentials:');
    console.log(`Trust: ${trustEmail} / password123`);
    console.log('Students: [email from above] / password123');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script if executed directly
if (require.main === module) {
  createSampleData()
    .then(() => {
      console.log('✅ Sample data setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sample data setup failed:', error);
      process.exit(1);
    });
}

module.exports = createSampleData;