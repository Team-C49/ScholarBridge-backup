// Diagnose the Smart Filtering issue
require('dotenv').config();
const db = require('./src/utils/db');

async function diagnoseSmartFilterIssue() {
  console.log('🔍 Diagnosing Smart Filtering Issue');
  console.log('=' .repeat(60));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821'; // Your trust ID
    
    // 1. Check current preferences
    console.log('\n1️⃣ CURRENT PREFERENCES IN DATABASE:');
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    console.log(JSON.stringify(preferences, null, 2));
    
    // 2. Test what the backend query sees
    console.log('\n2️⃣ WHAT THE BACKEND ALGORITHM SEES:');
    const trustPrefsTest = await db.query(`
      SELECT
        preferences->>'preferred_gender' AS p_gender,
        jsonb_array_to_text_array(preferences->'preferred_courses') AS p_courses,
        jsonb_array_to_text_array(preferences->'preferred_cities') AS p_cities,
        (preferences->>'max_family_income_lpa')::numeric AS p_max_income,
        (preferences->>'min_academic_percentage')::numeric AS p_min_grade
      FROM trusts
      WHERE user_id = $1
    `, [trustUserId]);
    
    console.log('Parsed preferences:', trustPrefsTest.rows[0]);
    
    // 3. Test the Smart Filter logic (view='filtered')
    console.log('\n3️⃣ TESTING SMART FILTER (filtered view):');
    const view = 'filtered';
    
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
      )
      SELECT
        a.id AS application_id,
        sp.full_name,
        sp.gender,
        a.current_course_name,
        sp.address->>'city' as city,
        a.status,
        tp.p_gender,
        tp.p_courses,
        tp.p_cities,
        -- Check each filter condition
        (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender) as gender_passes,
        (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses)) as course_passes,
        (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities)) as city_passes
      FROM
        applications a
      JOIN
        student_profiles sp ON a.student_user_id = sp.user_id
      CROSS JOIN
        trust_prefs tp
      WHERE a.status = 'submitted'
      ${view !== 'all' ? `
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities))
      ` : ''}
    `;
    
    const { rows: filteredResults } = await db.query(filteredQuery, [trustUserId]);
    console.log(`   Applications returned: ${filteredResults.length}`);
    
    if (filteredResults.length > 0) {
      console.log('\n   ✅ Applications found:');
      filteredResults.forEach((app, i) => {
        console.log(`   ${i + 1}. ${app.full_name} (${app.gender})`);
        console.log(`      Course: ${app.current_course_name}, City: ${app.city}`);
        console.log(`      Gender passes: ${app.gender_passes}, Course passes: ${app.course_passes}, City passes: ${app.city_passes}`);
      });
    } else {
      console.log('   ❌ NO APPLICATIONS PASSED THE FILTER');
      console.log('   Let me check why...');
      
      // Debug: Check without filters
      const debugQuery = `
        WITH
        trust_prefs AS (
          SELECT
            preferences->>'preferred_gender' AS p_gender,
            jsonb_array_to_text_array(preferences->'preferred_courses') AS p_courses,
            jsonb_array_to_text_array(preferences->'preferred_cities') AS p_cities
          FROM trusts
          WHERE user_id = $1
        )
        SELECT
          a.id,
          sp.full_name,
          sp.gender,
          a.current_course_name,
          sp.address->>'city' as city,
          tp.p_gender,
          tp.p_courses,
          tp.p_cities,
          -- Check each condition
          (tp.p_gender IS NULL) as gender_is_null,
          (tp.p_gender = 'Any') as gender_is_any,
          (sp.gender = tp.p_gender) as gender_matches,
          (tp.p_courses IS NULL) as courses_is_null,
          (array_length(tp.p_courses, 1) IS NULL) as courses_array_empty,
          (tp.p_cities IS NULL) as cities_is_null,
          (array_length(tp.p_cities, 1) IS NULL) as cities_array_empty
        FROM
          applications a
        JOIN
          student_profiles sp ON a.student_user_id = sp.user_id
        CROSS JOIN
          trust_prefs tp
        WHERE a.status = 'submitted'
        LIMIT 3
      `;
      
      const { rows: debugResults } = await db.query(debugQuery, [trustUserId]);
      console.log('\n   🐛 DEBUG INFO (first 3 applications):');
      debugResults.forEach((app) => {
        console.log(`\n   ${app.full_name}:`);
        console.log(`      Student Gender: "${app.gender}"`);
        console.log(`      Preference Gender: "${app.p_gender}"`);
        console.log(`      Gender Filter: NULL=${app.gender_is_null}, ANY=${app.gender_is_any}, MATCH=${app.gender_matches}`);
        console.log(`      Should pass gender? ${app.gender_is_null || app.gender_is_any || app.gender_matches}`);
        console.log(`      Course: "${app.current_course_name}"`);
        console.log(`      Preference Courses: ${JSON.stringify(app.p_courses)}`);
        console.log(`      Courses Filter: NULL=${app.courses_is_null}, EMPTY=${app.courses_array_empty}`);
        console.log(`      Should pass course? ${app.courses_is_null || app.courses_array_empty}`);
        console.log(`      City: "${app.city}"`);
        console.log(`      Preference Cities: ${JSON.stringify(app.p_cities)}`);
        console.log(`      Cities Filter: NULL=${app.cities_is_null}, EMPTY=${app.cities_array_empty}`);
        console.log(`      Should pass city? ${app.cities_is_null || app.cities_array_empty}`);
      });
    }
    
    // 4. Test without filters (view='all')
    console.log('\n\n4️⃣ TESTING WITHOUT FILTER (all view):');
    const allQuery = `
      SELECT
        a.id AS application_id,
        sp.full_name,
        sp.gender,
        a.current_course_name,
        sp.address->>'city' as city
      FROM
        applications a
      JOIN
        student_profiles sp ON a.student_user_id = sp.user_id
      WHERE a.status = 'submitted'
    `;
    
    const { rows: allResults } = await db.query(allQuery);
    console.log(`   Applications returned: ${allResults.length}`);
    allResults.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.full_name} (${app.gender}) - ${app.current_course_name}, ${app.city}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS COMPLETE');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await db.end();
  }
}

diagnoseSmartFilterIssue();