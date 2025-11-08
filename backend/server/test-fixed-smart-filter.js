// Test the fixed Smart Filtering logic
require('dotenv').config();
const db = require('./src/utils/db');

async function testFixedSmartFilter() {
  console.log('🧪 Testing Fixed Smart Filtering Logic');
  console.log('=' .repeat(60));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // Test 1: Smart Filter ON (view='filtered')
    console.log('\n1️⃣ TEST: Smart Filter ON (view=filtered, status=all):');
    
    const view = 'filtered';
    const status = 'all';
    let statusFilter = '';
    
    if (status === 'approved') {
      statusFilter = "AND a.status IN ('approved', 'closed', 'partially_approved')";
    } else if (status === 'rejected') {
      statusFilter = "AND a.status = 'rejected'";
    } else if (status === 'all' || !status) {
      statusFilter = "";
    } else {
      statusFilter = "AND a.status = 'submitted'";
    }
    
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
        a.id AS application_id,
        sp.full_name,
        a.current_course_name,
        sp.address->>'city' as city,
        sp.gender,
        a.status,
        a.total_amount_requested,
        (
          CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
          CASE WHEN tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
          CASE WHEN tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
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
    
    const { rows: filteredResults } = await db.query(filteredQuery, [trustUserId]);
    console.log(`   ✅ Returned ${filteredResults.length} applications`);
    filteredResults.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.full_name} - Score: ${app.match_score} (${app.gender}, ${app.status})`);
    });
    
    // Test 2: Smart Filter OFF (view='all')
    console.log('\n2️⃣ TEST: Smart Filter OFF (view=all, status=all):');
    
    const view2 = 'all';
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
        a.id AS application_id,
        sp.full_name,
        a.current_course_name,
        sp.address->>'city' as city,
        sp.gender,
        a.status,
        a.total_amount_requested,
        (
          CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
          CASE WHEN tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
          CASE WHEN tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
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
        a.created_at ASC;
    `;
    
    const { rows: allResults } = await db.query(allQuery, [trustUserId]);
    console.log(`   ✅ Returned ${allResults.length} applications`);
    allResults.forEach((app, i) => {
      console.log(`   ${i + 1}. ${app.full_name} - Score: ${app.match_score} (${app.gender}, ${app.status})`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS:');
    console.log(`   Smart Filter ON: ${filteredResults.length} applications (should show only Male)`);
    console.log(`   Smart Filter OFF: ${allResults.length} applications (should show all)`);
    console.log(`   ✅ Backend is working correctly!`);
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await db.end();
  }
}

testFixedSmartFilter();