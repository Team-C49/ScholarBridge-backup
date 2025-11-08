// Debug script to check real user data (not test data)
require('dotenv').config();
const db = require('./src/utils/db');

async function debugRealUserData() {
  console.log('🔍 Debugging Real User Data in ScholarBridge Database');
  console.log('=' .repeat(60));

  try {
    // 1. Check all users in the system
    console.log('\n1️⃣ ALL USERS IN DATABASE:');
    const usersQuery = `
      SELECT u.id, u.email, u.role, u.created_at,
             CASE 
               WHEN u.role = 'student' THEN sp.full_name
               WHEN u.role = 'trust' THEN t.org_name
               ELSE 'N/A'
             END as display_name
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id AND u.role = 'student'
      LEFT JOIN trusts t ON u.id = t.user_id AND u.role = 'trust'
      ORDER BY u.created_at DESC
    `;
    
    const { rows: users } = await db.query(usersQuery);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.display_name || 'Unnamed'} (${user.email})`);
      console.log(`      Role: ${user.role}, ID: ${user.id}`);
      console.log(`      Created: ${user.created_at.toLocaleString()}`);
      console.log('');
    });

    // 2. Check all applications
    console.log('\n2️⃣ ALL APPLICATIONS IN DATABASE:');
    const applicationsQuery = `
      SELECT a.id, a.student_user_id, sp.full_name as student_name, 
             a.current_course_name, a.status, a.total_amount_requested,
             a.academic_year, a.created_at,
             sp.address->>'city' as city, sp.gender
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      ORDER BY a.created_at DESC
    `;
    
    const { rows: applications } = await db.query(applicationsQuery);
    if (applications.length === 0) {
      console.log('   ❌ No applications found in database');
    } else {
      applications.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.student_name} - ${app.current_course_name}`);
        console.log(`      Status: ${app.status}, Amount: ₹${app.total_amount_requested}`);
        console.log(`      City: ${app.city}, Gender: ${app.gender}`);
        console.log(`      Year: ${app.academic_year}, Created: ${app.created_at.toLocaleString()}`);
        console.log(`      Student ID: ${app.student_user_id}, App ID: ${app.id}`);
        console.log('');
      });
    }

    // 3. Check all trusts and their preferences
    console.log('\n3️⃣ ALL TRUSTS IN DATABASE:');
    const trustsQuery = `
      SELECT t.user_id, t.org_name, t.contact_email, t.is_active, t.verified,
             t.preferences, u.email as login_email, t.created_at
      FROM trusts t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `;
    
    const { rows: trusts } = await db.query(trustsQuery);
    if (trusts.length === 0) {
      console.log('   ❌ No trusts found in database');
    } else {
      trusts.forEach((trust, index) => {
        console.log(`   ${index + 1}. ${trust.org_name}`);
        console.log(`      Login Email: ${trust.login_email}`);
        console.log(`      Contact Email: ${trust.contact_email}`);
        console.log(`      Active: ${trust.is_active}, Verified: ${trust.verified}`);
        console.log(`      Trust ID: ${trust.user_id}`);
        console.log(`      Created: ${trust.created_at.toLocaleString()}`);
        if (trust.preferences) {
          console.log(`      Preferences: ${JSON.stringify(trust.preferences, null, 2)}`);
        } else {
          console.log(`      Preferences: Not set (will show all applications)`);
        }
        console.log('');
      });
    }

    // 4. Test the matching algorithm for each trust-application combination
    console.log('\n4️⃣ MATCHING ALGORITHM TEST:');
    if (trusts.length > 0 && applications.length > 0) {
      for (const trust of trusts) {
        console.log(`\n   Testing matches for Trust: ${trust.org_name}`);
        console.log(`   Trust ID: ${trust.user_id}`);
        
        // Test the actual API query
        const dashboardQuery = `
          WITH
          trust_prefs AS (
            SELECT
              preferences->>'preferred_gender' AS p_gender,
              jsonb_array_to_text_array(preferences->'preferred_courses') AS p_courses,
              jsonb_array_to_text_array(preferences->'preferred_cities') AS p_cities,
              (preferences->>'max_family_income_lpa')::numeric AS p_max_income,
              (preferences->>'min_academic_percentage')::numeric AS p_min_grade
            FROM trusts
            WHERE user_id = $1
          ),
          application_details AS (
            SELECT
              app.id AS application_id,
              COALESCE(AVG(CASE
                WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) THEN eh.grade::numeric * 0.5
                WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) - 1 THEN eh.grade::numeric * 0.3
                ELSE eh.grade::numeric * 0.2
              END), 0) AS weighted_academic_score,
              COALESCE(SUM(fm.monthly_income), 0) * 12 / 100000 AS total_family_income_lpa
            FROM
              applications app
            LEFT JOIN education_history eh ON app.id = eh.application_id
            LEFT JOIN family_members fm ON app.id = fm.application_id
            GROUP BY app.id
          )
          SELECT
            a.id AS application_id,
            sp.full_name,
            a.current_course_name,
            sp.address->>'city' as city,
            sp.gender,
            ad.total_family_income_lpa,
            ad.weighted_academic_score,
            a.status,
            a.total_amount_requested,
            (
              CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
              CASE WHEN tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
              CASE WHEN tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
              CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END +
              CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END
            ) AS match_score,
            tp.p_gender, tp.p_courses, tp.p_cities, tp.p_max_income, tp.p_min_grade
          FROM
            applications a
          JOIN
            student_profiles sp ON a.student_user_id = sp.user_id
          JOIN
            application_details ad ON a.id = ad.application_id
          CROSS JOIN
            trust_prefs tp
          WHERE a.status = 'submitted'
          ORDER BY match_score DESC, a.created_at ASC;
        `;
        
        const { rows: matches } = await db.query(dashboardQuery, [trust.user_id]);
        
        if (matches.length === 0) {
          console.log(`      ❌ No applications match (or no applications have status 'submitted')`);
        } else {
          console.log(`      ✅ Found ${matches.length} matching applications:`);
          matches.forEach((match, i) => {
            console.log(`         ${i + 1}. ${match.full_name} - Score: ${match.match_score}`);
            console.log(`            Course: ${match.current_course_name}`);
            console.log(`            City: ${match.city}, Gender: ${match.gender}`);
            console.log(`            Status: ${match.status}`);
            console.log(`            Trust preferences - Gender: ${match.p_gender}, Cities: ${match.p_cities}, Courses: ${match.p_courses}`);
          });
        }
      }
    } else {
      console.log('   ⚠️  Cannot test matching - missing trusts or applications');
    }

    // 5. Check for the helper function
    console.log('\n5️⃣ CHECKING HELPER FUNCTION:');
    try {
      const helperTest = await db.query(`SELECT jsonb_array_to_text_array('["test1", "test2"]'::jsonb) as result`);
      console.log('   ✅ Helper function jsonb_array_to_text_array exists and works');
    } catch (error) {
      console.log('   ❌ Helper function missing or broken:', error.message);
      console.log('   💡 You need to run the database setup script to create the helper function');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await db.end();
  }
}

debugRealUserData();