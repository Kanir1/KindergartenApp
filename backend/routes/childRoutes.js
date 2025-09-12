const express = require('express');
const router = express.Router();
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper: check ownership regardless of schema shape
function ownsChildDoc(childDoc, userId) {
  const uid = String(userId);
  if (childDoc.parent && String(childDoc.parent) === uid) return true;
  if (childDoc.parentId && String(childDoc.parentId) === uid) return true; // legacy
  if (Array.isArray(childDoc.parents) && childDoc.parents.some(p => String(p) === uid)) return true;
  return false;
}

// ===== PARENT: list only their children =====
router.get('/mine', requireAuth, requireRole('parent'), async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await Child.find({
      $or: [{ parents: userId }, { parent: userId }, { parentId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ===== PARENT: create a new child for themselves =====
router.post('/mine', requireAuth, requireRole('parent'), async (req, res) => {
  try {
    // Minimal fields (match registration)
    const { name, birthDate, childId, externalId } = req.body || {};

    if (!name) return res.status(400).json({ message: 'name is required' });
    if (!birthDate) return res.status(400).json({ message: 'birthDate is required' });
    if (!childId && !externalId)
      return res.status(400).json({ message: 'childId (or externalId) is required' });

    const idVal = String(childId || externalId).trim();

    // 🔒 Duplicate check: block same Child ID for this parent
    const exists = await Child.exists({
      $and: [
        { $or: [{ childId: idVal }, { externalId: idVal }] },
        { $or: [{ parents: req.user.id }, { parent: req.user.id }, { parentId: req.user.id }] },
      ],
    });
    if (exists) {
      return res.status(409).json({ message: 'Child ID already used for your account' });
    }

    // Build payload (map to both fields so either schema works)
    const payload = {
      name: name.trim(),
      birthDate,
      // childId is not in the schema; we still set it to keep any existing logic relying on it.
      childId: idVal,
      externalId: idVal,
      // attach current parent in all supported shapes
      parents: [req.user.id],  // preferred
      parent: req.user.id,     // legacy
      parentId: req.user.id,   // legacy
    };

    const child = await Child.create(payload);
    res.status(201).json({ message: 'Child created', child });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ===== ADMIN: create child (unchanged) =====
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const newChild = await Child.create(req.body);
    res.status(201).json({ message: 'Child created', child: newChild });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ===== ADMIN: list all children (unchanged) =====
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const children = await Child.find().sort({ createdAt: -1 });
  res.json(children);
});

// ===== GET one (admin OR owning parent) =====
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const one = await Child.findById(req.params.id).lean();
    if (!one) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'admin') return res.json(one);
    if (req.user.role === 'parent' && ownsChildDoc(one, req.user.id)) {
      return res.json(one);
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// ===== ADMIN: add embedded log (if you still use them) =====
router.post('/:id/log', requireAuth, requireRole('admin'), async (req, res) => {
  const one = await Child.findById(req.params.id);
  if (!one) return res.status(404).json({ message: 'Not found' });
  if (!Array.isArray(one.dailyLogs)) one.dailyLogs = [];
  one.dailyLogs.push(req.body);
  await one.save();
  res.json({ message: 'Log added', child: one });
});

module.exports = router;
