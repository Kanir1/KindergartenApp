const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
const Child = require('../models/child');
const { requireAuth, requireRole, ensureCanAccessChild } = require('../middleware/auth');

// Create pre-sleep report (admin only) — now uses milkMl instead of hydration
router.post(
  '/pre',
  requireAuth,
  requireRole('admin'),
  ensureCanAccessChild,
  async (req, res) => {
    try {
      const { child, date, meals, milkMl = 0, photos = [], notes = '' } = req.body;

      const ml = Number.isFinite(Number(milkMl)) ? Math.max(0, Math.floor(Number(milkMl))) : 0;

      const doc = await DailyReport.create({
        child,
        date,
        type: 'preSleep',
        meals,
        milkMl: ml,
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
       const { child, date, sleep, bathroomCount = 0, photos = [], notes } = req.body;

      // normalize bathroomCount
       const bc = Number.isFinite(Number(bathroomCount)) ? Math.max(0, Math.floor(Number(bathroomCount))) : 0;

       const doc = await DailyReport.create({
          child,
          date,
          type: 'postSleep',
          sleep,                 // { start, end, minutes } — minutes optional if start/end provided
          bathroomCount: bc,
          photos,
          notes,
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
router.get('/', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  try {
    const { child, from, to, type, page = '1', limit = '20' } = req.query;
    const q = {};

    // Normalize type
    if (type) {
      q.type = type === 'pre' ? 'preSleep' : type === 'post' ? 'postSleep' : type;
    }

    // Date range
    if (from || to) q.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    if (req.user.role === 'admin') {
      if (child) q.child = child;
    } else {
      // Parent: compute the list of their child IDs via DB, not JWT
      const userId = req.user.id;
      const myChildIds = await Child.find({
        $or: [{ parents: userId }, { parent: userId }, { parentId: userId }],
      }).distinct('_id');

      if (child) {
        const ok = myChildIds.map(String).includes(String(child));
        if (!ok) return res.status(403).json({ message: 'Forbidden: not your child' });
        q.child = child;
      } else {
        q.child = { $in: myChildIds };
      }
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const docs = await DailyReport.find(q)
      .populate('child', 'name birthDate externalId')
      .sort({ date: -1, type: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json(docs);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Get by id (parent/admin)
router.get('/:id', requireAuth, requireRole('admin', 'parent'), async (req, res) => {
  try {
    const doc = await DailyReport.findById(req.params.id)
      .populate('child', 'name birthDate externalId')
      .lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'admin') return res.json(doc);

    const userId = req.user.id;
    const childId = String(doc.child?._id || doc.child);
    const owns = await Child.exists({
      _id: childId,
      $or: [{ parents: userId }, { parent: userId }, { parentId: userId }],
    });
    if (!owns) return res.status(403).json({ message: 'Forbidden: not your child' });

    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Update (admin only)
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
  try {
    const doc = await DailyReport.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

module.exports = router;
