// Debug family income and academic percentage calculations
require('dotenv').config();
const db = require('./src/utils/db');

async function debugIncomeAndGrades() {
  console.log('🔍 Debugging Family Income and Academic Percentage Calculations');
  console.log('=' .repeat(60));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // 1. Check trust preferences
    console.log('\n1️⃣ YOUR TRUST PREFERENCES:');
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    console.log('   Max Family Income (LPA):', preferences.max_family_income_lpa);
    console.log('   Min Academic Percentage:', preferences.min_academic_percentage);
    
    // 2. Check family income calculations for each application
    console.log('\n2️⃣ FAMILY INCOME CALCULATIONS:');
    const incomeQuery = `
      SELECT 
        a.id AS application_id,
        sp.full_name,
        sp.gender,
        COUNT(fm.id) AS family_member_count,
        COALESCE(SUM(fm.monthly_income), 0) AS total_monthly_income,
        COALESCE(SUM(fm.monthly_income), 0) * 12 / 100000 AS total_family_income_lpa
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      LEFT JOIN family_members fm ON a.id = fm.application_id
      WHERE a.status = 'submitted'
      GROUP BY a.id, sp.full_name, sp.gender
      ORDER BY sp.full_name
    `;
    
    const { rows: incomeResults } = await db.query(incomeQuery);
    incomeResults.forEach(app => {
      const withinLimit = preferences.max_family_income_lpa ? 
        parseFloat(app.total_family_income_lpa) <= parseFloat(preferences.max_family_income_lpa) : 
        true;
      console.log(`   ${app.full_name}:`);
      console.log(`      Family members: ${app.family_member_count}`);
      console.log(`      Monthly income: ₹${app.total_monthly_income}`);
      console.log(`      Annual income: ${app.total_family_income_lpa} LPA`);
      console.log(`      Within limit (${preferences.max_family_income_lpa} LPA)? ${withinLimit ? '✅' : '❌'}`);
    });
    
    // 3. Check academic percentage calculations
    console.log('\n3️⃣ ACADEMIC PERCENTAGE CALCULATIONS:');
    const gradeQuery = `
      SELECT 
        a.id AS application_id,
        sp.full_name,
        sp.gender,
        COUNT(eh.id) AS education_records,
        string_agg(eh.qualification || ': ' || eh.grade || '%', ', ' ORDER BY eh.year_of_passing DESC) AS grades,
        COALESCE(AVG(
          CASE
            WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = a.id) 
              THEN eh.grade::numeric * 0.5
            WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = a.id) - 1 
              THEN eh.grade::numeric * 0.3
            ELSE eh.grade::numeric * 0.2
          END
        ), 0) AS weighted_academic_score
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      LEFT JOIN education_history eh ON a.id = eh.application_id
      WHERE a.status = 'submitted'
      GROUP BY a.id, sp.full_name, sp.gender
      ORDER BY sp.full_name
    `;
    
    const { rows: gradeResults } = await db.query(gradeQuery);
    gradeResults.forEach(app => {
      const meetsMinimum = preferences.min_academic_percentage ? 
        parseFloat(app.weighted_academic_score) >= parseFloat(preferences.min_academic_percentage) : 
        true;
      console.log(`   ${app.full_name}:`);
      console.log(`      Education records: ${app.education_records}`);
      console.log(`      Grades: ${app.grades || 'None'}`);
      console.log(`      Weighted score: ${app.weighted_academic_score}`);
      console.log(`      Meets minimum (${preferences.min_academic_percentage}%)? ${meetsMinimum ? '✅' : '❌'}`);
    });
    
    // 4. Test the full algorithm with income/grade filtering
    console.log('\n4️⃣ FULL ALGORITHM TEST (with income/grade filtering):');
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
          COALESCE(AVG(
            CASE
              WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) THEN eh.grade::numeric * 0.5
              WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) - 1 THEN eh.grade::numeric * 0.3
              ELSE eh.grade::numeric * 0.2
            END
          ), 0) AS weighted_academic_score,
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
        sp.gender,
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        tp.p_max_income,
        tp.p_min_grade,
        -- Score components
        CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END AS gender_score,
        CASE WHEN tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END AS course_score,
        CASE WHEN tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END AS city_score,
        CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END AS income_score,
        CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END AS academic_score,
        -- Total score
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
      WHERE a.status = 'submitted'
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR array_length(tp.p_courses, 1) IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR array_length(tp.p_cities, 1) IS NULL OR sp.address->>'city' = ANY(tp.p_cities))
      ORDER BY match_score DESC, ad.total_family_income_lpa ASC
    `;
    
    const { rows: fullResults } = await db.query(fullQuery, [trustUserId]);
    console.log(`   Applications returned: ${fullResults.length}`);
    fullResults.forEach((app, i) => {
      console.log(`\n   ${i + 1}. ${app.full_name}:`);
      console.log(`      Gender Score: ${app.gender_score}/35`);
      console.log(`      Course Score: ${app.course_score}/30`);
      console.log(`      City Score: ${app.city_score}/15`);
      console.log(`      Income Score: ${app.income_score}/15 (${app.total_family_income_lpa} LPA <= ${app.p_max_income} LPA?)`);
      console.log(`      Academic Score: ${app.academic_score}/5 (${app.weighted_academic_score} >= ${app.p_min_grade}%?)`);
      console.log(`      TOTAL MATCH SCORE: ${app.match_score}/100`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS:');
    console.log('   Check if income and academic scores are being calculated correctly');
    console.log('   The algorithm uses these scores but does NOT filter out applications');
    console.log('   Applications get 0 points if they don\'t meet criteria, but still show up');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await db.end();
  }
}

debugIncomeAndGrades();