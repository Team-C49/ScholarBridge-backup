// server/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 4000;

// Basic security & parsers
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Basic rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// --- ROUTES ---
// NOTE: routes are under server/src/routes/
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/student');
const trustRoutes = require('./src/routes/trust');
const adminRoutes = require('./src/routes/admin');
const uploadRoutes = require('./src/routes/uploads');

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/trusts', trustRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// Health and basic error handlers
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => console.log(`ScholarBridge backend listening on port ${port}`));
