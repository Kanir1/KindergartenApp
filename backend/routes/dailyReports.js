// routes/dailyReports.js
const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Create pre-sleep report (admin only)
router.post(
  '/pre',
  requireAuth,
  requireRole('admin'),
  ensureCanAccessChild,
  async (req, res) => {
    try {
      const { child, date, meals, hydration, photos = [], notes = '' } = req.body;

      // Optional pre-check (uncomment if you prefer avoiding throw)
      // const exists = await DailyReport.exists({ child, date, type: 'preSleep' });
      // if (exists) return res.status(409).json({ message: 'A report for this child, date, and type already exists.' });

      const doc = await DailyReport.create({
        child,
        date,
        type: 'preSleep',
        meals,
        hydration,
        notes,
        photos,
        createdBy: req.user.id,
      });
      res.status(201).json(doc);
    } catch (e) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ message: 'A report for this child, date, and type already exists.' });
      }
      return res.status(400).json({ message: e.message });
    }
  }
);

// Create post-sleep report (admin only)
router.post(
  '/post',
  requireAuth,
  requireRole('admin'),
  ensureCanAccessChild,
  async (req, res) => {
    try {
      const { child, date, meals, hydration, sleep, photos = [], notes = '' } = req.body;

      // Optional pre-check
      // const exists = await DailyReport.exists({ child, date, type: 'postSleep' });
      // if (exists) return res.status(409).json({ message: 'A report for this child, date, and type already exists.' });

      const doc = await DailyReport.create({
        child,
        date,
        type: 'postSleep',
        meals,
        hydration,
        sleep,
        notes,
        photos,
        createdBy: req.user.id,
      });
      res.status(201).json(doc);
    } catch (e) {
      if (e?.code === 11000) {
        return res
          .status(409)
          .json({ message: 'A report for this child, date, and type already exists.' });
      }
      return res.status(400).json({ message: e.message });
    }
  }
);

// List reports (admin/parent)
// Parents can fetch ALL their children’s reports without specifying ?child=,
// or they can filter to a single child they own. Admin can filter any child.
router.get('/', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const { child, from, to, type, page = '1', limit = '20' } = req.query;
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

  if (type) {
    // Allow both 'preSleep'/'postSleep' and shorthand 'pre'/'post'
    let t = type;
    if (type === 'pre') t = 'preSleep';
    if (type === 'post') t = 'postSleep';
    q.type = t;
  }

  if (from || to) q.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const docs = await DailyReport.find(q)
    .sort({ date: -1, type: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json(docs);
});

// Get by id (parent/admin) with per-child access check
router.get('/:id', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const doc = await DailyReport.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  req.query.child = String(doc.child); // reuse ensureCanAccessChild
  return require('./_childAccessProxy')(req, res, () => res.json(doc));
});

// Update (admin only) – also handles duplicate collisions
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await DailyReport.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    Object.assign(existing, req.body);
    await existing.save();
    res.json(existing);
  } catch (e) {
    if (e?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'A report for this child, date, and type already exists.' });
    }
    return res.status(400).json({ message: e.message });
  }
});

// Delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const doc = await DailyReport.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
