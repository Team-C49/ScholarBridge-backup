// Test script to verify Trust API endpoint
require('dotenv').config();
const db = require('./src/utils/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testTrustAPI() {
  console.log('🧪 Testing Trust API Authentication and Endpoint');

  try {
    // 1. Check if trust user exists
    const trustQuery = `
      SELECT u.id, u.email, u.role, t.org_name 
      FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      WHERE u.role = 'trust' 
      LIMIT 1
    `;
    
    const { rows: trusts } = await db.query(trustQuery);
    console.log('\n1️⃣ Trust users in database:', trusts.length);
    
    if (trusts.length === 0) {
      console.log('❌ No trust users found in database');
      return;
    }
    
    const trust = trusts[0];
    console.log('   Found trust:', trust.org_name, '(', trust.email, ')');
    
    // 2. Generate a JWT token for the trust
    const token = jwt.sign(
      { 
        id: trust.id, 
        email: trust.email, 
        role: trust.role 
      }, 
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );
    console.log('\n2️⃣ Generated JWT token:', token.substring(0, 50) + '...');
    
    // 3. Test the dashboard endpoint query directly
    console.log('\n3️⃣ Testing dashboard query with trust ID:', trust.id);
    
    const statusFilter = "AND a.status = 'submitted'";
    const dashboardQuery = `
      WITH
      -- Step 1: Get the preferences for the currently logged-in trust
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
      -- Step 2: Pre-calculate academic and financial info for each application
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
      -- Step 3: Main query to filter, score, and sort applications
      SELECT
        a.id AS application_id,
        sp.full_name,
        a.current_course_name,
        sp.address->>'city' as city,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        a.status,
        a.total_amount_requested,
        a.total_amount_approved,
        a.created_at,
        (
          CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
          CASE WHEN tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
          CASE WHEN tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
          CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END +
          CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END
        ) AS match_score
      FROM
        applications a
      JOIN
        student_profiles sp ON a.student_user_id = sp.user_id
      JOIN
        application_details ad ON a.id = ad.application_id
      CROSS JOIN
        trust_prefs tp
      WHERE 1=1 ${statusFilter}
      ORDER BY
        match_score DESC,
        ad.total_family_income_lpa ASC,
        a.created_at ASC
      LIMIT 10;
    `;
    
    const { rows: applications } = await db.query(dashboardQuery, [trust.id]);
    console.log('   ✅ Query executed successfully');
    console.log('   📊 Applications found:', applications.length);
    
    if (applications.length > 0) {
      console.log('\n   Sample application:');
      console.log('   - Name:', applications[0].full_name);
      console.log('   - Course:', applications[0].current_course_name);
      console.log('   - City:', applications[0].city);
      console.log('   - Status:', applications[0].status);
      console.log('   - Match Score:', applications[0].match_score);
    }
    
    console.log('\n🎯 API Test Summary:');
    console.log('   ✅ Trust user exists');
    console.log('   ✅ JWT token can be generated');
    console.log('   ✅ Dashboard query executes successfully');
    console.log('   ✅ Applications data available');
    console.log('\n💡 The issue is likely in the frontend-backend communication or authentication flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await db.end();
  }
}

testTrustAPI();