// routes/childRoutes.js
const express = require('express');
const router = express.Router();
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

// ---------- helpers ----------
function ownsChildDoc(childDoc, userId) {
  const uid = String(userId);
  if (childDoc.parent && String(childDoc.parent) === uid) return true;         // legacy
  if (childDoc.parentId && String(childDoc.parentId) === uid) return true;     // legacy
  if (Array.isArray(childDoc.parents) && childDoc.parents.some(p => String(p) === uid)) return true;
  return false;
}

function normalizeId(childId, externalId) {
  const id = (childId ?? externalId ?? '').toString().trim();
  return id.length ? id : null;
}

// ========== PARENT: list only their children ==========
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

/**
 * ❌ Removed: POST /children/mine
 * Parents no longer create children themselves.
 * Use the admin UI + /admin/link flow to connect parents ↔ children.
 */

// ========== ADMIN: create child ==========
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, birthDate, childId, externalId, group } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (!birthDate) {
      return res.status(400).json({ message: 'birthDate is required' });
    }

    const idVal = normalizeId(childId, externalId);
    if (!idVal) {
      return res.status(400).json({ message: 'childId (or externalId) is required' });
    }

    // Block duplicates on either field
    const dupe = await Child.exists({ $or: [{ externalId: idVal }, { childId: idVal }] });
    if (dupe) {
      return res.status(409).json({ message: 'A child with this ID already exists' });
    }

    const payload = {
      name: String(name).trim(),
      birthDate, // expect ISO string (yyyy-mm-dd) from the form
      externalId: idVal,
      childId: idVal,   // keep legacy field populated if your schema still has it
      group: group?.toString().trim() || undefined,
      // Do NOT attach parents here; use the separate link flow.
    };

    const created = await Child.create(payload);
    return res.status(201).json({ message: 'Child created', child: created });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
});

// ========== ADMIN: list all children (with derived parentName) ==========
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const rows = await Child.find()
      .sort({ createdAt: -1 })
      .populate('parents', 'name email')
      .lean();

    const children = rows.map((c) => ({
      ...c,
      parentName: Array.isArray(c.parents)
        ? c.parents.map((p) => p?.name || p?.email).filter(Boolean).join(', ')
        : '',
    }));

    res.json(children);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ========== GET one (admin OR owning parent) ==========
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

// ========== ADMIN: add embedded log (if still used) ==========
router.post('/:id/log', requireAuth, requireRole('admin'), async (req, res) => {
  const one = await Child.findById(req.params.id);
  if (!one) return res.status(404).json({ message: 'Not found' });
  if (!Array.isArray(one.dailyLogs)) one.dailyLogs = [];
  one.dailyLogs.push(req.body);
  await one.save();
  res.json({ message: 'Log added', child: one });
});

module.exports = router;
