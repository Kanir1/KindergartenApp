// routes/monthlyReports.js
const express = require('express');
const router = express.Router();
const MonthlyReport = require('../models/MonthlyReport');
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Create (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  ensureCanAccessChild,
  async (req, res) => {
    try {
      const {
        child,
        month, // 'YYYY-MM'
        summary,
        milestones,
        mealsOverview,
        sleepOverview,
        hydrationOverview,
        notes = '',
      } = req.body;

      // Optional pre-check to avoid throw; uncomment if you prefer
      // const exists = await MonthlyReport.exists({ child, month });
      // if (exists) return res.status(409).json({ message: 'A monthly report for this child and month already exists.' });

      const doc = await MonthlyReport.create({
        child,
        month,
        summary,
        milestones,
        mealsOverview,
        sleepOverview,
        hydrationOverview,
        notes,
      });
      res.status(201).json(doc);
    } catch (e) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ message: 'A monthly report for this child and month already exists.' });
      }
      return res.status(400).json({ message: e.message });
    }
  }
);

// List (admin/parent)
// Parents can fetch ALL their children’s reports without specifying ?child=,
// or filter to a single child they own. Admins may filter any child.
router.get('/', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const { child, month, page = '1', limit = '20' } = req.query;
  const q = {};

  if (req.user.role === 'parent') {
    const myKids = (req.user.children || []).map(String);
    if (child) {
      if (!myKids.includes(String(child))) {
        return res.status(403).json({ message: 'Forbidden: not your child' });
      }
      q.child = child;
    } else {
      q.child = { $in: myKids };
    }
  } else if (child) {
    q.child = child; // admin filter
  }

  if (month) q.month = month; // exact 'YYYY-MM'; extend if you add ranges later

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const docs = await MonthlyReport.find(q)
    .sort({ month: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json(docs);
});

// Get by id (parent/admin) with per-child access check via proxy
router.get('/:id', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const doc = await MonthlyReport.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  req.query.child = String(doc.child); // reuse ensureCanAccessChild
  return require('./_childAccessProxy')(req, res, () => res.json(doc));
});

// Update (admin only) – duplicate-safe
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await MonthlyReport.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    Object.assign(existing, req.body);
    await existing.save();
    res.json(existing);
  } catch (e) {
    if (e?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'A monthly report for this child and month already exists.' });
    }
    return res.status(400).json({ message: e.message });
  }
});

// Delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const doc = await MonthlyReport.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
