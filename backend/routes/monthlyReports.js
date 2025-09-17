const express = require('express');
const router = express.Router();
const MonthlyReport = require('../models/MonthlyReport');
const Child = require('../models/child'); // <-- we’ll use the real parent links here
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Helpers
const toIdString = (x) => (typeof x === 'object' && x && x._id ? String(x._id) : String(x));

/** Get all child IDs owned by this parent from the DB.
 *  Matches your Child schema: parents[] (new), or legacy parent/parentId. */
async function getMyChildIdsFromDB(userId) {
  const uid = String(userId);
  const rows = await Child.find({
    $or: [
      { parents: uid },            // new: multi-parent
      { parent: uid },             // legacy
      { parentId: uid },           // legacy
    ],
  }).select('_id').lean();
  return rows.map((r) => String(r._id));
}

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
router.get('/', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  const { child, month, page = '1', limit = '20' } = req.query;
  const q = {};

  if (req.user.role === 'parent') {
    // Resolve this parent's child IDs from the Child collection
    const myKids = await getMyChildIdsFromDB(req.user.id || req.user._id);
    if (!myKids.length) return res.json([]); // parent without linked children

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

  if (month) q.month = month; // exact 'YYYY-MM'

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const docs = await MonthlyReport.find(q)
    .populate('child', 'name birthDate externalId') // Child has no childId field
    .sort({ month: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json(docs);
});

// Get by id (admin/parent)
router.get('/:id', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  try {
    const doc = await MonthlyReport.findById(req.params.id)
      .populate('child', 'name birthDate externalId');
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'parent') {
      const myKids = await getMyChildIdsFromDB(req.user.id || req.user._id);
      const thisChildId = String(doc.child?._id || doc.child);
      if (!myKids.includes(thisChildId)) {
        return res.status(403).json({ message: 'Forbidden: not your child' });
      }
    }

    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message || 'Server error' });
  }
});

// Update (admin only)
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
