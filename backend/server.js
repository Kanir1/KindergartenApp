// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const childRoutes = require('./routes/childRoutes');
const dailyReports = require('./routes/dailyReports');
const monthlyReports = require('./routes/monthlyReports');
const parentsRoutes = require('./routes/parents');
const adminParents = require('./routes/adminParents');

const app = express();

// CORS — set your dev/prod frontend URLs
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: false, // using Bearer tokens, not cookies
}));

app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);               // JWT issue/verify + register/link (uses Child.parentId) :contentReference[oaicite:1]{index=1}
app.use('/api/children', childRoutes);          // parent: /mine; admin: /, /:id (with ownership check) :contentReference[oaicite:2]{index=2}
app.use('/api/daily', dailyReports);    // admin writes; parent/admin read with child access checks :contentReference[oaicite:3]{index=3}
app.use('/api/monthly', monthlyReports);// admin writes; parent/admin read with child access checks :contentReference[oaicite:4]{index=4}
app.use('/api/parents', parentsRoutes);         // admin link/unlink children to a parent :contentReference[oaicite:5]{index=5}
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/admin/parents', adminParents);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/required-items', require('./routes/requiredItems'));




// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error(err));
