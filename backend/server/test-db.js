const pool = require('./src/utils/db');

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB connected:', res.rows[0]);
  } catch (err) {
    console.error('DB connection error:', err.message);
  } finally {
    process.exit();
  }
})();
