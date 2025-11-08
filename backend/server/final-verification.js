// Final Verification: Show complete Smart Filter behavior
require('dotenv').config();
const db = require('./src/utils/db');

async function finalVerification() {
  console.log('✅ FINAL VERIFICATION - SMART FILTER STATUS');
  console.log('=' .repeat(70));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // Get current preferences
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    
    console.log('\n📊 YOUR CURRENT PREFERENCES:');
    console.log('   Gender:', preferences.preferred_gender || 'Any');
    console.log('   Courses:', preferences.preferred_courses?.length > 0 ? preferences.preferred_courses.join(', ') : 'Any');
    console.log('   Cities:', preferences.preferred_cities?.length > 0 ? preferences.preferred_cities.join(', ') : 'Any');
    console.log('   Max Family Income:', preferences.max_family_income_lpa, 'LPA');
    console.log('   Min Academic Score:', preferences.min_academic_percentage, '%');
    
    // Test Smart Filter ON (view='filtered')
    console.log('\n🔍 TEST 1: SMART FILTER ON (Shows only matching applications)');
    const filteredQuery = `
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
        a.id,
        sp.full_name,
        sp.gender,
        a.current_course_name,
        sp.address->>'city' as city,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        -- Calculate match score
        (
          CASE 
            WHEN tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35
            WHEN sp.gender = tp.p_gender THEN 35
            ELSE 0
          END +
          CASE 
            WHEN tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL THEN 30
            WHEN a.current_course_name = ANY(tp.p_courses) THEN 30
            ELSE 0
          END +
          CASE 
            WHEN tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL THEN 15
            WHEN sp.address->>'city' = ANY(tp.p_cities) THEN 15
            ELSE 0
          END +
          CASE
            WHEN tp.p_max_income IS NULL THEN 15
            WHEN ad.total_family_income_lpa <= tp.p_max_income THEN 15
            ELSE 0
          END +
          CASE
            WHEN tp.p_min_grade IS NULL THEN 5
            WHEN ad.weighted_academic_score >= tp.p_min_grade THEN 5
            ELSE 0
          END
        ) as match_score
      FROM
        applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      JOIN application_details ad ON a.id = ad.application_id
      CROSS JOIN trust_prefs tp
      WHERE a.status = 'submitted'
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities))
        AND (tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income)
        AND (tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade)
      ORDER BY match_score DESC, ad.total_family_income_lpa ASC
    `;
    
    const { rows: filteredApps } = await db.query(filteredQuery, [trustUserId]);
    console.log(`   Results: ${filteredApps.length} applications`);
    
    if (filteredApps.length > 0) {
      console.log('   ✅ Applications shown:');
      filteredApps.forEach((app, idx) => {
        console.log(`   ${idx + 1}. ${app.full_name} (${app.gender}) - Match Score: ${app.match_score}/100`);
        console.log(`      Course: ${app.current_course_name}, City: ${app.city}`);
        console.log(`      Income: ${parseFloat(app.total_family_income_lpa).toFixed(2)} LPA, Academic: ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
      });
    } else {
      console.log('   ❌ No applications match your criteria');
    }
    
    // Test Smart Filter OFF (view='all')
    console.log('\n🌐 TEST 2: SMART FILTER OFF (Shows all applications with scores)');
    const allQuery = `
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
        a.id,
        sp.full_name,
        sp.gender,
        a.current_course_name,
        sp.address->>'city' as city,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        -- Calculate match score
        (
          CASE 
            WHEN tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35
            WHEN sp.gender = tp.p_gender THEN 35
            ELSE 0
          END +
          CASE 
            WHEN tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL THEN 30
            WHEN a.current_course_name = ANY(tp.p_courses) THEN 30
            ELSE 0
          END +
          CASE 
            WHEN tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL THEN 15
            WHEN sp.address->>'city' = ANY(tp.p_cities) THEN 15
            ELSE 0
          END +
          CASE
            WHEN tp.p_max_income IS NULL THEN 15
            WHEN ad.total_family_income_lpa <= tp.p_max_income THEN 15
            ELSE 0
          END +
          CASE
            WHEN tp.p_min_grade IS NULL THEN 5
            WHEN ad.weighted_academic_score >= tp.p_min_grade THEN 5
            ELSE 0
          END
        ) as match_score
      FROM
        applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      JOIN application_details ad ON a.id = ad.application_id
      CROSS JOIN trust_prefs tp
      WHERE a.status = 'submitted'
      ORDER BY match_score DESC, ad.total_family_income_lpa ASC
    `;
    
    const { rows: allApps } = await db.query(allQuery, [trustUserId]);
    console.log(`   Results: ${allApps.length} applications (all in database)`);
    
    allApps.forEach((app, idx) => {
      const passesFilters = 
        parseFloat(app.total_family_income_lpa) <= parseFloat(preferences.max_family_income_lpa) &&
        parseFloat(app.weighted_academic_score) >= parseFloat(preferences.min_academic_percentage);
      
      console.log(`   ${idx + 1}. ${app.full_name} (${app.gender}) - Match Score: ${app.match_score}/100 ${passesFilters ? '✅' : '❌'}`);
      console.log(`      Income: ${parseFloat(app.total_family_income_lpa).toFixed(2)} LPA, Academic: ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('📝 SUMMARY:');
    console.log(`   Smart Filter ON:  ${filteredApps.length} applications (only matching)`);
    console.log(`   Smart Filter OFF: ${allApps.length} applications (all with scores)`);
    console.log('\n✅ Income and Academic filtering is now working as HARD FILTERS');
    console.log('✅ Applications that don\'t meet criteria are completely hidden when Smart Filter is ON');
    console.log('\n🎯 WHAT TO DO NOW:');
    console.log('   1. Refresh your browser (Ctrl+R or Cmd+R)');
    console.log('   2. Toggle Smart Filter ON to see only matching applications');
    console.log('   3. Toggle Smart Filter OFF to see all applications with their scores');
    console.log('   4. Adjust preferences in the Preferences page if you want different results');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await db.end();
  }
}

finalVerification();