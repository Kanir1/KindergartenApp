// routes/requiredItems.js
const express = require('express');
const router = express.Router();
const RequiredItems = require('../models/RequiredItems');
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

// helper: confirm the requesting parent is linked to the child
async function parentOwnsChild(parentId, childId) {
  const child = await Child.findOne({
    _id: childId,
    $or: [{ parents: parentId }, { parent: parentId }, { parentId: parentId }],
  }).select('_id');
  return !!child;
}

/** Create a new required-items notice (ADMIN only) */
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { child, items } = req.body; // items = {diapers, wetWipes, clothing, other}
    if (!child) return res.status(400).json({ message: 'child is required' });

    const doc = await RequiredItems.create({
      child,
      items: {
        diapers: !!items?.diapers,
        wetWipes: !!items?.wetWipes,
        clothing: !!items?.clothing,
        other: items?.other || '',
      },
      createdBy: req.user.id,
      readBy: [], // new notice → unread for all parents
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/** Get latest notice for a child (ADMIN can read any; PARENT only own child) */
router.get('/latest/:childId', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    if (req.user.role !== 'admin') {
      const ok = await parentOwnsChild(req.user.id, childId);
      if (!ok) return res.status(403).json({ message: 'Forbidden' });
    }

    const doc = await RequiredItems.findOne({ child: childId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(doc || null);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/** Mark latest notice as read by current parent (no-op for admin) */
router.post('/latest/:childId/read', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    if (req.user.role === 'admin') return res.json({ ok: true });

    const ok = await parentOwnsChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    const latest = await RequiredItems.findOne({ child: childId }).sort({ createdAt: -1 });
    if (!latest) return res.json({ ok: true });

    if (!latest.readBy.map(String).includes(String(req.user.id))) {
      latest.readBy.push(req.user.id);
      await latest.save();
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
