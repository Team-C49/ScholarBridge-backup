// Test the current Best Fit algorithm with your real trust account
require('dotenv').config();
const db = require('./src/utils/db');

async function testBestFitAlgorithm() {
  console.log('🧪 Testing Best Fit Algorithm with Your Real Trust Account');
  console.log('=' .repeat(60));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821'; // Your trust ID (somp)
    
    // Test 1: Get current preferences
    console.log('\n1️⃣ YOUR CURRENT TRUST PREFERENCES:');
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    console.log('   Current preferences:', JSON.stringify(preferences, null, 2));
    
    // Test 2: Test the dashboard algorithm exactly as it should work
    console.log('\n2️⃣ TESTING DASHBOARD ALGORITHM:');
    
    const statusFilter = "AND a.status = 'submitted'";
    const view = 'filtered'; // This should filter based on preferences
    
    const query = `
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
          -- Calculate Weighted Academic Score from education_history (most recent 3 years)
          COALESCE(AVG(CASE
            WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) THEN eh.grade::numeric * 0.5
            WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) - 1 THEN eh.grade::numeric * 0.3
            ELSE eh.grade::numeric * 0.2
          END), 0) AS weighted_academic_score,
          -- Calculate Total Family Income in Lakhs Per Annum by summing all family members
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
        sp.gender,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        a.status,
        a.total_amount_requested,
        a.total_amount_approved,
        a.created_at,
        -- THE FINAL SCORING ALGORITHM
        (
          CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
          CASE WHEN tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
          CASE WHEN tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
          CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END +
          CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END
        ) AS match_score,
        -- Debug info
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
      ${view !== 'all' ? `
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities))
      ` : ''}
      ORDER BY
        match_score DESC,
        ad.total_family_income_lpa ASC,
        a.created_at ASC;
    `;
    
    console.log('   Running algorithm query...');
    const { rows: results } = await db.query(query, [trustUserId]);
    
    console.log(`   ✅ Algorithm returned ${results.length} applications`);
    
    if (results.length > 0) {
      console.log('\n3️⃣ RESULTS RANKED BY MATCH SCORE:');
      results.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.full_name} - Score: ${app.match_score}`);
        console.log(`      Course: ${app.current_course_name}`);
        console.log(`      City: ${app.city}, Gender: ${app.gender}`);
        console.log(`      Amount: ₹${app.total_amount_requested}`);
        console.log(`      Family Income: ${app.total_family_income_lpa} LPA`);
        console.log(`      Academic Score: ${app.weighted_academic_score}`);
        
        // Score breakdown
        const genderMatch = (app.gender === app.p_gender || app.p_gender === null || app.p_gender === 'Any') ? 35 : 0;
        const courseMatch = (app.p_courses === null || app.current_course_name === app.p_courses?.find(c => c === app.current_course_name)) ? 30 : 0;
        const cityMatch = (app.p_cities === null || app.city === app.p_cities?.find(c => c === app.city)) ? 15 : 0;
        const incomeMatch = (app.p_max_income === null || app.total_family_income_lpa <= app.p_max_income) ? 15 : 0;
        const academicMatch = (app.p_min_grade === null || app.weighted_academic_score >= app.p_min_grade) ? 5 : 0;
        
        console.log(`      Score breakdown: Gender(${genderMatch}) + Course(${courseMatch}) + City(${cityMatch}) + Income(${incomeMatch}) + Academic(${academicMatch}) = ${app.match_score}`);
        console.log('');
      });
      
      console.log('🎯 SUMMARY:');
      console.log(`   - Your trust "${preferences.preferred_gender || 'Any'}" gender preference is working`);
      console.log(`   - Course filtering: ${preferences.preferred_courses?.length > 0 ? preferences.preferred_courses.join(', ') : 'All courses accepted'}`);
      console.log(`   - City filtering: ${preferences.preferred_cities?.length > 0 ? preferences.preferred_cities.join(', ') : 'All cities accepted'}`);
      console.log(`   - Income limit: ${preferences.max_family_income_lpa || 'No limit'} LPA`);
      console.log(`   - Academic minimum: ${preferences.min_academic_percentage || 'No minimum'}%`);
      
    } else {
      console.log('   ❌ No applications match your criteria');
      console.log('   💡 This could mean:');
      console.log('     - Your preferences are too restrictive');
      console.log('     - No applications exist with status "submitted"');
      console.log('     - There\'s an issue with the filtering logic');
    }
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error testing algorithm:', error);
    await db.end();
  }
}

testBestFitAlgorithm();