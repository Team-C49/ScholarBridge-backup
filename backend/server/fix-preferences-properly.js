// Fix: Update preferences to reasonable values (properly this time!)
require('dotenv').config();
const db = require('./src/utils/db');

async function fixPreferences() {
  console.log('🔧 FIXING TRUST PREFERENCES');
  console.log('=' .repeat(60));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // Get current preferences
    const currentResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    console.log('\n📊 CURRENT PREFERENCES:');
    console.log(JSON.stringify(currentResult.rows[0].preferences, null, 2));
    
    // Update to reasonable values
    console.log('\n🔄 UPDATING TO REASONABLE VALUES:');
    console.log('   Max Income: 2 LPA → 25 LPA (covers most applications)');
    console.log('   Min Academic: 0% (no change, this is fine)');
    
    await db.query(`
      UPDATE trusts 
      SET preferences = jsonb_set(preferences, '{max_family_income_lpa}', '"25"')
      WHERE user_id = $1
    `, [trustUserId]);
    
    // Verify the update
    const updatedResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    console.log('\n✅ UPDATED PREFERENCES:');
    console.log(JSON.stringify(updatedResult.rows[0].preferences, null, 2));
    
    // Test how many applications will show now
    const testQuery = `
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
      ORDER BY sp.full_name
    `;
    
    const { rows: applications } = await db.query(testQuery, [trustUserId]);
    
    console.log(`\n📋 APPLICATIONS THAT WILL NOW SHOW (Smart Filter ON):`);
    console.log(`   Total: ${applications.length} applications`);
    
    applications.forEach(app => {
      console.log(`   ✅ ${app.full_name} (${app.gender})`);
      console.log(`      Course: ${app.current_course_name}`);
      console.log(`      Income: ${parseFloat(app.total_family_income_lpa).toFixed(2)} LPA`);
      console.log(`      Academic: ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
    });
    
    if (applications.length === 0) {
      console.log('   ❌ Still no applications! Income limit might still be too low.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Refresh your browser (Ctrl+R or Cmd+R)');
    console.log('   2. The Smart Filter should now show applications');
    console.log('   3. You can adjust the income limit in Preferences if needed');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await db.end();
  }
}

fixPreferences();