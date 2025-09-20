// src/index.js
require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json({ limit: '10mb' }));

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const trustRoutes = require('./routes/trust');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/trusts', trustRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }));

app.listen(port, () => console.log(`Server running on ${port}`));
