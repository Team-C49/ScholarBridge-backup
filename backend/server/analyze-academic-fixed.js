// Analyze academic percentage calculation (fixed)
require('dotenv').config();
const db = require('./src/utils/db');

async function analyzeAcademicCalculation() {
  console.log('🔍 ANALYZING ACADEMIC PERCENTAGE CALCULATION');
  console.log('=' .repeat(70));

  try {
    const trustUserId = 'ce9a7267-16d2-4e14-ae36-0c8ccd108821';
    
    // Get preferences
    const prefsResult = await db.query('SELECT preferences FROM trusts WHERE user_id = $1', [trustUserId]);
    const preferences = prefsResult.rows[0]?.preferences || {};
    
    console.log('\n📊 CURRENT PREFERENCES:');
    console.log('   Min Academic Percentage:', preferences.min_academic_percentage, '%');
    
    // Get all applications with their education history
    console.log('\n1️⃣ CURRENT CALCULATION (Weighted by recency):');
    const currentQuery = `
      SELECT
        a.id,
        sp.full_name,
        json_agg(
          json_build_object(
            'qualification', eh.qualification,
            'grade', eh.grade,
            'year', eh.year_of_passing
          ) ORDER BY eh.year_of_passing DESC
        ) as education_history,
        -- Current weighted calculation
        COALESCE(AVG(CASE
          WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = a.id) THEN eh.grade::numeric * 0.5
          WHEN eh.year_of_passing = (SELECT MAX(year_of_passing) FROM education_history WHERE application_id = a.id) - 1 THEN eh.grade::numeric * 0.3
          ELSE eh.grade::numeric * 0.2
        END), 0) AS weighted_academic_score
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      LEFT JOIN education_history eh ON a.id = eh.application_id
      GROUP BY a.id, sp.full_name
      ORDER BY sp.full_name
    `;
    
    const { rows: currentResults } = await db.query(currentQuery);
    currentResults.forEach(app => {
      console.log(`\n   ${app.full_name}:`);
      console.log('   Education History:');
      app.education_history.forEach(edu => {
        console.log(`      - ${edu.qualification} (${edu.year}): ${edu.grade}%`);
      });
      console.log(`   ❌ Weighted Score (Current): ${parseFloat(app.weighted_academic_score).toFixed(2)}%`);
    });
    
    // Show what SIMPLE AVERAGE would be
    console.log('\n\n2️⃣ SIMPLE AVERAGE CALCULATION (What you want):');
    const simpleAvgQuery = `
      SELECT
        a.id,
        sp.full_name,
        json_agg(
          json_build_object(
            'qualification', eh.qualification,
            'grade', eh.grade,
            'year', eh.year_of_passing
          ) ORDER BY eh.year_of_passing DESC
        ) as education_history,
        -- Simple average of all grades
        COALESCE(AVG(eh.grade::numeric), 0) AS simple_average_grade
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      LEFT JOIN education_history eh ON a.id = eh.application_id
      GROUP BY a.id, sp.full_name
      ORDER BY sp.full_name
    `;
    
    const { rows: simpleResults } = await db.query(simpleAvgQuery);
    simpleResults.forEach(app => {
      console.log(`\n   ${app.full_name}:`);
      console.log('   Education History:');
      const grades = [];
      app.education_history.forEach(edu => {
        console.log(`      - ${edu.qualification} (${edu.year}): ${edu.grade}%`);
        grades.push(parseFloat(edu.grade));
      });
      const manualAvg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
      console.log(`   ✅ Simple Average (New): ${parseFloat(app.simple_average_grade).toFixed(2)}%`);
      console.log(`   Manual Calculation: (${grades.join(' + ')}) / ${grades.length} = ${manualAvg.toFixed(2)}%`);
    });
    
    // Compare the two methods
    console.log('\n\n3️⃣ COMPARISON TABLE:');
    console.log('┌─────────────────────────┬──────────────┬──────────────┬────────────┐');
    console.log('│ Student                 │ Weighted OLD │ Simple NEW   │ Difference │');
    console.log('├─────────────────────────┼──────────────┼──────────────┼────────────┤');
    
    currentResults.forEach((curr, idx) => {
      const simple = simpleResults[idx];
      const weighted = parseFloat(curr.weighted_academic_score);
      const avg = parseFloat(simple.simple_average_grade);
      const diff = (avg - weighted).toFixed(2);
      
      const name = curr.full_name.padEnd(23);
      const weightedStr = weighted.toFixed(2).padStart(10);
      const avgStr = avg.toFixed(2).padStart(10);
      const diffStr = (diff > 0 ? '+' : '') + diff;
      
      console.log(`│ ${name} │ ${weightedStr}%  │ ${avgStr}%  │ ${diffStr.padStart(8)}% │`);
    });
    console.log('└─────────────────────────┴──────────────┴──────────────┴────────────┘');
    
    // Test filtering with both methods
    console.log('\n\n4️⃣ FILTERING TEST (Min Academic: ' + preferences.min_academic_percentage + '%):');
    
    const minGrade = parseFloat(preferences.min_academic_percentage);
    
    console.log('\n   With WEIGHTED (Current):');
    const weightedPassing = currentResults.filter(r => parseFloat(r.weighted_academic_score) >= minGrade);
    console.log(`   ${weightedPassing.length} applications would pass`);
    weightedPassing.forEach(r => {
      console.log(`      ✅ ${r.full_name}: ${parseFloat(r.weighted_academic_score).toFixed(2)}%`);
    });
    
    console.log('\n   With SIMPLE AVERAGE (New):');
    const simplePassing = simpleResults.filter(r => parseFloat(r.simple_average_grade) >= minGrade);
    console.log(`   ${simplePassing.length} applications would pass`);
    simplePassing.forEach(r => {
      console.log(`      ✅ ${r.full_name}: ${parseFloat(r.simple_average_grade).toFixed(2)}%`);
    });
    
    console.log('\n\n5️⃣ RECOMMENDATION:');
    console.log('   ❌ Currently using: WEIGHTED calculation (recent grades weighted more heavily)');
    console.log('      Formula: (Most Recent × 0.5) + (Second Recent × 0.3) + (Others × 0.2)');
    console.log('\n   ✅ Will change to: SIMPLE AVERAGE (all grades equal weight)');
    console.log('      Formula: (Grade1 + Grade2 + ... + GradeN) / N');
    console.log('\n   💡 This is more intuitive and matches user expectations!');
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    await db.end();
  }
}

analyzeAcademicCalculation();