// Debug: Check what's happening with Smart Filter ON
require('dotenv').config();
const db = require('./src/utils/db');

async function debugCurrentIssue() {
  console.log('🔍 DEBUGGING SMART FILTER ISSUE');
  console.log('=' .repeat(70));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // 1. Check current preferences
    console.log('\n1️⃣ CURRENT PREFERENCES IN DATABASE:');
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    console.log(JSON.stringify(preferences, null, 2));
    
    // 2. Check all applications with their data
    console.log('\n2️⃣ ALL APPLICATIONS WITH CALCULATED VALUES:');
    const allAppsQuery = `
      WITH application_details AS (
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
        a.status
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      JOIN application_details ad ON a.id = ad.application_id
      ORDER BY sp.full_name
    `;
    
    const { rows: allApps } = await db.query(allAppsQuery);
    console.log(`   Total applications: ${allApps.length}`);
    allApps.forEach(app => {
      console.log(`   - ${app.full_name} (${app.gender})`);
      console.log(`     Course: ${app.current_course_name}, City: ${app.city}`);
      console.log(`     Income: ${parseFloat(app.total_family_income_lpa).toFixed(2)} LPA, Academic: ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
      console.log(`     Status: ${app.status}`);
    });
    
    // 3. Test the exact query from the backend
    console.log('\n3️⃣ TESTING BACKEND QUERY (SMART FILTER ON):');
    const backendQuery = `
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
        tp.p_gender,
        tp.p_courses,
        tp.p_cities,
        tp.p_max_income,
        tp.p_min_grade
      FROM trust_prefs tp
    `;
    
    const { rows: trustPrefs } = await db.query(backendQuery, [trustUserId]);
    console.log('   Trust Preferences from CTE:');
    console.log(JSON.stringify(trustPrefs[0], null, 2));
    
    // 4. Test each filter condition separately
    console.log('\n4️⃣ TESTING EACH FILTER CONDITION:');
    
    const tp = trustPrefs[0];
    console.log(`   Gender Filter: p_gender = ${tp.p_gender}`);
    console.log(`   - Condition: tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender`);
    console.log(`   - ${tp.p_gender === null || tp.p_gender === 'Any' ? '✅ PASSES (Any gender)' : `Only shows ${tp.p_gender}`}`);
    
    console.log(`\n   Course Filter: p_courses = ${JSON.stringify(tp.p_courses)}`);
    console.log(`   - Condition: tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses)`);
    console.log(`   - ${tp.p_courses === null || tp.p_courses.length === 0 ? '✅ PASSES (Any course)' : `Only shows ${tp.p_courses.join(', ')}`}`);
    
    console.log(`\n   City Filter: p_cities = ${JSON.stringify(tp.p_cities)}`);
    console.log(`   - Condition: tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities)`);
    console.log(`   - ${tp.p_cities === null || tp.p_cities.length === 0 ? '✅ PASSES (Any city)' : `Only shows ${tp.p_cities.join(', ')}`}`);
    
    console.log(`\n   Income Filter: p_max_income = ${tp.p_max_income}`);
    console.log(`   - Condition: tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income`);
    console.log(`   - ${tp.p_max_income === null ? '✅ PASSES (No limit)' : `Only shows income <= ${tp.p_max_income} LPA`}`);
    
    console.log(`\n   Academic Filter: p_min_grade = ${tp.p_min_grade}`);
    console.log(`   - Condition: tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade`);
    console.log(`   - ${tp.p_min_grade === null ? '✅ PASSES (No minimum)' : `Only shows academic >= ${tp.p_min_grade}%`}`);
    
    // 5. Run the full query with all filters
    console.log('\n5️⃣ RUNNING FULL QUERY WITH ALL FILTERS:');
    const fullQuery = `
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
        ad.weighted_academic_score
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
    `;
    
    const { rows: filteredApps } = await db.query(fullQuery, [trustUserId]);
    console.log(`   ✅ Filtered applications: ${filteredApps.length}`);
    
    if (filteredApps.length === 0) {
      console.log('\n   ❌ NO APPLICATIONS RETURNED!');
      console.log('   🔍 Let me check which condition is failing...\n');
      
      // Test each condition individually
      for (const app of allApps) {
        console.log(`   Testing: ${app.full_name}`);
        
        // Gender check
        const genderPass = tp.p_gender === null || tp.p_gender === 'Any' || app.gender === tp.p_gender;
        console.log(`      Gender: ${genderPass ? '✅' : '❌'} (${app.gender} vs ${tp.p_gender})`);
        
        // Course check
        const coursePass = tp.p_courses === null || tp.p_courses.length === 0 || tp.p_courses.includes(app.current_course_name);
        console.log(`      Course: ${coursePass ? '✅' : '❌'} (${app.current_course_name})`);
        
        // City check
        const cityPass = tp.p_cities === null || tp.p_cities.length === 0 || tp.p_cities.includes(app.city);
        console.log(`      City: ${cityPass ? '✅' : '❌'} (${app.city})`);
        
        // Income check
        const incomePass = tp.p_max_income === null || parseFloat(app.total_family_income_lpa) <= parseFloat(tp.p_max_income);
        console.log(`      Income: ${incomePass ? '✅' : '❌'} (${parseFloat(app.total_family_income_lpa).toFixed(2)} vs ${tp.p_max_income} max)`);
        
        // Academic check
        const academicPass = tp.p_min_grade === null || parseFloat(app.weighted_academic_score) >= parseFloat(tp.p_min_grade);
        console.log(`      Academic: ${academicPass ? '✅' : '❌'} (${parseFloat(app.weighted_academic_score).toFixed(2)} vs ${tp.p_min_grade} min)`);
        
        const allPass = genderPass && coursePass && cityPass && incomePass && academicPass;
        console.log(`      Overall: ${allPass ? '✅ SHOULD SHOW' : '❌ FILTERED OUT'}\n`);
      }
    } else {
      filteredApps.forEach(app => {
        console.log(`   - ${app.full_name}: ${app.gender}, ${app.current_course_name}`);
        console.log(`     Income: ${parseFloat(app.total_family_income_lpa).toFixed(2)} LPA, Academic: ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await db.end();
  }
}

debugCurrentIssue();