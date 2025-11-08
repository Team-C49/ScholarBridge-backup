const db = require('./src/utils/db');

async function testTrustDashboardAPI() {
  const client = await db.connect();
  
  try {
    console.log('🧮 Testing Trust Dashboard Algorithm...\n');
    
    // Get the trust user ID
    const trustResult = await client.query(`
      SELECT u.id, t.org_name, t.preferences 
      FROM users u 
      JOIN trusts t ON u.id = t.user_id 
      WHERE u.email = 'tech.trust@example.com'
    `);
    
    if (trustResult.rows.length === 0) {
      console.log('❌ Trust not found. Run create-sample-data.js first.');
      return;
    }
    
    const trust = trustResult.rows[0];
    console.log(`🏛️ Trust: ${trust.org_name}`);
    console.log(`⚙️ Preferences:`, JSON.stringify(trust.preferences, null, 2));
    console.log('');
    
    // Test the main dashboard query (this is exactly what the API endpoint uses)
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
          COALESCE(AVG(
            CASE
              WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) THEN eh.grade::numeric * 0.5
              WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = app.id) - 1 THEN eh.grade::numeric * 0.3
              ELSE eh.grade::numeric * 0.2
            END
          ), 0) AS weighted_academic_score,
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
        ad.total_family_income_lpa,
        ad.weighted_academic_score,
        a.total_amount_requested,
        a.total_amount_approved,
        a.status,
        a.created_at,
        sp.gender,
        a.academic_year,
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
      -- Filter by status
      WHERE a.status = 'submitted'
      -- THE FINAL SORTING HIERARCHY
      ORDER BY
        match_score DESC,
        ad.total_family_income_lpa ASC,
        a.created_at ASC;
    `;

    const result = await client.query(query, [trust.id]);
    
    console.log('📊 Algorithm Results:');
    console.log('='.repeat(100));
    console.log(`${'Student Name'.padEnd(20)} | ${'Course'.padEnd(25)} | ${'City'.padEnd(12)} | ${'Gender'.padEnd(8)} | ${'Income'.padEnd(8)} | ${'Grade'.padEnd(8)} | ${'Score'.padEnd(8)}`);
    console.log('='.repeat(100));
    
    result.rows.forEach(row => {
      console.log(
        `${row.full_name.padEnd(20)} | ` +
        `${row.current_course_name.substring(0,24).padEnd(25)} | ` +
        `${row.city.padEnd(12)} | ` +
        `${row.gender.padEnd(8)} | ` +
        `${row.total_family_income_lpa.toFixed(1).padEnd(8)} | ` +
        `${row.weighted_academic_score.toFixed(1).padEnd(8)} | ` +
        `${row.match_score.toString().padEnd(8)}`
      );
    });
    
    console.log('='.repeat(100));
    console.log(`\n📈 Total Applications: ${result.rows.length}`);
    console.log(`🎯 Perfect Matches (100/100): ${result.rows.filter(r => r.match_score === 100).length}`);
    console.log(`⭐ High Matches (80-99): ${result.rows.filter(r => r.match_score >= 80 && r.match_score < 100).length}`);
    console.log(`✅ Good Matches (60-79): ${result.rows.filter(r => r.match_score >= 60 && r.match_score < 80).length}`);
    console.log(`⚠️ Low Matches (<60): ${result.rows.filter(r => r.match_score < 60).length}`);
    
    // Test smart filtering (only eligible applications)
    console.log('\n🎯 Testing Smart Filtering...');
    const filteredQuery = query.replace(
      'WHERE a.status = \'submitted\'',
      `WHERE a.status = 'submitted'
        AND (tp.p_gender IS NULL OR tp.p_gender = 'Any' OR sp.gender = tp.p_gender)
        AND (tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses))
        AND (tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities))`
    );
    
    const filteredResult = await client.query(filteredQuery, [trust.id]);
    console.log(`📊 Smart Filtering Results: ${filteredResult.rows.length} applications (${result.rows.length - filteredResult.rows.length} filtered out)`);
    
    filteredResult.rows.forEach(row => {
      console.log(`  ✅ ${row.full_name} - ${row.current_course_name} (${row.gender}, ${row.city}) - Score: ${row.match_score}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing algorithm:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
  }
}

// Run the test
testTrustDashboardAPI()
  .then(() => {
    console.log('\n✅ Algorithm test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Algorithm test failed:', error);
    process.exit(1);
  });