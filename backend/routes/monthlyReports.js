// routes/monthlyReports.js
const express = require('express');
const router = express.Router();
const MonthlyReport = require('../models/MonthlyReport');
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Create
router.post('/', requireAuth, requireRole('admin','parent'), ensureCanAccessChild, async (req, res) => {
  try {
    const { child, month, summary, milestones, mealsOverview, sleepOverview, hydrationOverview } = req.body;
    const doc = await MonthlyReport.create({ child, month, summary, milestones, mealsOverview, sleepOverview, hydrationOverview });
    res.status(201).json(doc);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// List
router.get('/', requireAuth, requireRole('admin','parent'), ensureCanAccessChild, async (req, res) => {
  const { child, month, page = 1, limit = 20 } = req.query;
  const q = {};
  if (child) q.child = child;
  if (month) q.month = month;
  const docs = await MonthlyReport.find(q).sort({ month: -1 }).skip((+page-1)*+limit).limit(+limit);
  res.json(docs);
});

// Get by id
router.get('/:id', requireAuth, requireRole('admin','parent'), async (req, res) => {
  const doc = await MonthlyReport.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  req.query.child = doc.child.toString();
  return require('./_childAccessProxy')(req, res, () => res.json(doc));
});

// Update
router.put('/:id', requireAuth, requireRole('admin','parent'), async (req, res) => {
  const existing = await MonthlyReport.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  req.body.child = existing.child.toString();
  ensureCanAccessChild(req, res, async () => {
    Object.assign(existing, req.body);
    await existing.save();
    res.json(existing);
  });
});

// Delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const doc = await MonthlyReport.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
