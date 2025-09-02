// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const childRoutes = require('./routes/childRoutes');
const dailyReports = require('./routes/dailyReports');
const monthlyReports = require('./routes/monthlyReports');
const authRoutes = require('./routes/auth'); // <- add this file (below)

const app = express();

// CORS — set your dev/prod frontend URLs
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: false,
}));
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/daily-reports', dailyReports);
app.use('/api/monthly-reports', monthlyReports);
app.use('/api/auth', authRoutes);

// Central error handler (so thrown errors become JSON)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  // (Mongoose 6+ no longer needs these options, safe to keep)
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error(err));
