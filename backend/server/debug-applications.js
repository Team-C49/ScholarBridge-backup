const db = require('./src/utils/db');

async function debugApplications() {
  const client = await db.connect();
  
  try {
    console.log('🔍 Debugging Trust Dashboard - Applications Issue\n');
    
    // 1. Check what applications exist and their status
    console.log('1. 📋 Applications in database:');
    const apps = await client.query(`
      SELECT a.id, sp.full_name, a.current_course_name, a.status, 
             sp.gender, sp.address->>'city' as city, a.total_amount_requested
      FROM applications a 
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      ORDER BY a.created_at
    `);
    
    if (apps.rows.length === 0) {
      console.log('   ❌ No applications found in database!');
    } else {
      apps.rows.forEach(app => {
        console.log(`   - ${app.full_name}: ${app.current_course_name} (${app.gender}, ${app.city}) - Status: ${app.status} - Amount: ₹${app.total_amount_requested}`);
      });
    }
    
    // 2. Check trusts and their preferences
    console.log('\n2. 🏛️ Trusts in database:');
    const trusts = await client.query(`
      SELECT u.id, u.email, t.org_name, t.preferences, t.is_active, t.verified
      FROM users u 
      JOIN trusts t ON u.id = t.user_id
      WHERE u.role = 'trust'
    `);
    
    trusts.rows.forEach(trust => {
      console.log(`   - ${trust.org_name} (${trust.email})`);
      console.log(`     ID: ${trust.id}`);
      console.log(`     Active: ${trust.is_active}, Verified: ${trust.verified}`);
      console.log(`     Preferences: ${JSON.stringify(trust.preferences, null, 6)}`);
    });
    
    // 3. Test the API query manually
    if (trusts.rows.length > 0 && apps.rows.length > 0) {
      const trustId = trusts.rows[0].id; // Use first trust
      console.log(`\n3. 🧮 Testing API query for trust: ${trusts.rows[0].org_name} (${trustId})`);
      
      // Test with different status filters
      const testStatuses = ['submitted', 'all'];
      
      for (const testStatus of testStatuses) {
        let statusFilter = '';
        if (testStatus === 'submitted') {
          statusFilter = "AND a.status = 'submitted'";
        }
        
        const query = `
          SELECT a.id, sp.full_name, a.current_course_name, sp.gender, 
                 sp.address->>'city' as city, a.status, a.total_amount_requested
          FROM applications a
          JOIN student_profiles sp ON a.student_user_id = sp.user_id
          WHERE 1=1 ${statusFilter}
          ORDER BY a.created_at
        `;
        
        const result = await client.query(query);
        console.log(`\n   Status filter "${testStatus}": ${result.rows.length} applications found`);
        result.rows.forEach(app => {
          console.log(`     - ${app.full_name}: ${app.status}`);
        });
      }
      
      // 4. Test the full algorithm query
      console.log('\n4. 🚀 Testing full algorithm query...');
      
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
            COALESCE(AVG(eh.grade::numeric), 0) AS weighted_academic_score,
            COALESCE(SUM(fm.monthly_income), 0) * 12 / 100000 AS total_family_income_lpa
          FROM applications app
          LEFT JOIN education_history eh ON app.id = eh.application_id
          LEFT JOIN family_members fm ON app.id = fm.application_id
          GROUP BY app.id
        )
        SELECT
          a.id AS application_id,
          sp.full_name,
          a.current_course_name,
          sp.address->>'city' as city,
          a.status,
          ad.total_family_income_lpa,
          ad.weighted_academic_score,
          (
            CASE WHEN sp.gender = tp.p_gender OR tp.p_gender IS NULL OR tp.p_gender = 'Any' THEN 35 ELSE 0 END +
            CASE WHEN tp.p_courses IS NULL OR a.current_course_name = ANY(tp.p_courses) THEN 30 ELSE 0 END +
            CASE WHEN tp.p_cities IS NULL OR sp.address->>'city' = ANY(tp.p_cities) THEN 15 ELSE 0 END +
            CASE WHEN tp.p_max_income IS NULL OR ad.total_family_income_lpa <= tp.p_max_income THEN 15 ELSE 0 END +
            CASE WHEN tp.p_min_grade IS NULL OR ad.weighted_academic_score >= tp.p_min_grade THEN 5 ELSE 0 END
          ) AS match_score
        FROM applications a
        JOIN student_profiles sp ON a.student_user_id = sp.user_id
        JOIN application_details ad ON a.id = ad.application_id
        CROSS JOIN trust_prefs tp
        WHERE a.status = 'submitted'
        ORDER BY match_score DESC
      `;
      
      try {
        const fullResult = await client.query(fullQuery, [trustId]);
        console.log(`   Full query result: ${fullResult.rows.length} applications`);
        fullResult.rows.forEach(app => {
          console.log(`     - ${app.full_name}: Score ${app.match_score}, Status: ${app.status || 'NULL'}`);
        });
      } catch (error) {
        console.log(`   ❌ Full query error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    client.release();
  }
}

// Run the debug
debugApplications()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });