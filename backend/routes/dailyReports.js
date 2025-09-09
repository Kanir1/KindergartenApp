// routes/dailyReports.js
const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Create pre-sleep report (admin only)
router.post('/pre', requireAuth, requireRole('admin'), ensureCanAccessChild, async (req, res) => {
  try {
    const { child, date, meals, hydration, photos = [] } = req.body;
    const doc = await DailyReport.create({
      child,
      date,
      type: 'preSleep',
      meals,
      hydration,
      photos,                 // ✅ persist photos
      createdBy: req.user.id
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Create post-sleep report (admin only)
router.post('/post', requireAuth, requireRole('admin'), ensureCanAccessChild, async (req, res) => {
  try {
    const { child, date, meals, hydration, sleep, photos = [] } = req.body;
    const doc = await DailyReport.create({
      child,
      date,
      type: 'postSleep',
      meals,
      hydration,
      sleep,
      photos,                 // ✅ persist photos
      createdBy: req.user.id
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// List reports (parent/admin)
router.get('/', requireAuth, requireRole('admin', 'parent'), ensureCanAccessChild, async (req, res) => {
  const { child, from, to, type, page = 1, limit = 20 } = req.query;
  const q = {};
  if (child) q.child = child;
  if (type) q.type = type;
  if (from || to) q.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const docs = await DailyReport.find(q)
    .sort({ date: -1, type: 1 })
    .skip((+page - 1) * +limit)
    .limit(+limit);

  res.json(docs);
});

// Get by id (parent/admin)
router.get('/:id', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const doc = await DailyReport.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  req.query.child = doc.child.toString(); // reuse ensureCanAccessChild
  return require('./_childAccessProxy')(req, res, () => res.json(doc));
});

// Update (admin only)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const existing = await DailyReport.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  Object.assign(existing, req.body);
  await existing.save();
  res.json(existing);
});

// Delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const doc = await DailyReport.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
