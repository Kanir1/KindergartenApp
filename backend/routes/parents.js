// backend/routes/parents.js
const express = require('express');
const mongoose = require('mongoose');
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Admin: link children to a parent by Mongo ObjectIds.
 * Safer behavior: only link children that are currently unowned.
 */
router.post('/:parentId/link-children', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { parentId } = req.params;
    const { childIds = [] } = req.body;

    if (!isObjectId(parentId)) return res.status(400).json({ message: 'Invalid parentId' });
    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ message: 'childIds must be a non-empty array' });
    }

    const validIds = childIds.filter(isObjectId);
    if (validIds.length !== childIds.length) {
      return res.status(400).json({ message: 'One or more childIds invalid' });
    }

    const result = await Child.updateMany(
      { _id: { $in: validIds }, $or: [{ parentId: null }, { parentId: { $exists: false } }] },
      { $set: { parentId } }
    );

    return res.json({
      ok: true,
      matched: result.matchedCount ?? result.n,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to link children' });
  }
});

/**
 * Admin: unlink specific children from a parent.
 */
router.post('/:parentId/unlink-children', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { parentId } = req.params;
    const { childIds = [] } = req.body;

    if (!isObjectId(parentId)) return res.status(400).json({ message: 'Invalid parentId' });

    const validIds = childIds.filter(isObjectId);
    const result = await Child.updateMany(
      { _id: { $in: validIds }, parentId },
      { $set: { parentId: null } }
    );

    return res.json({
      ok: true,
      matched: result.matchedCount ?? result.n,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to unlink children' });
  }
});

/**
 * Parent self-serve: link (or create) a child by human-friendly externalId.
 * - If externalId exists and is unowned -> link to this parent.
 * - If it exists and is owned by another -> 409.
 * - If it does not exist -> create and link.
 * Uses atomic findOneAndUpdate with upsert to avoid races.
 */
router.post('/link-child', requireAuth, requireRole('parent'), async (req, res) => {
  try {
    const { externalId, name, birthDate } = req.body;
    if (!externalId) return res.status(400).json({ message: 'externalId required' });

    const ext = String(externalId).trim().toUpperCase();

    // Optional externalId format validation: uppercase letters, digits, dashes
    const idOk = /^[A-Z0-9-]+$/.test(ext);
    if (!idOk) return res.status(400).json({ message: 'Invalid Child ID format' });

    // Atomic link-or-create: allow matching when unowned or already owned by this parent
    let kid = await Child.findOneAndUpdate(
      {
        externalId: ext,
        $or: [{ parentId: null }, { parentId: { $exists: false } }, { parentId: req.user.id }],
      },
      {
        $setOnInsert: {
          externalId: ext,
          name: (name || '').trim(),
          birthDate: birthDate || null,
          parentId: req.user.id,
        },
        $set: {
          parentId: req.user.id,
          ...(name ? { name: String(name).trim() } : {}),
          ...(birthDate ? { birthDate } : {}),
        },
      },
      { new: true, upsert: true }
    );

    // If upsert/update didn't match because someone else owns it, return 409
    if (!kid) {
      const existing = await Child.findOne({ externalId: ext });
      if (existing && String(existing.parentId) !== String(req.user.id)) {
        return res.status(409).json({ message: 'Child ID is already linked to another parent' });
      }
      // Fallback (should not happen): generic conflict
      return res.status(409).json({ message: 'Child ID already exists' });
    }

    return res.json(kid);
  } catch (e) {
    // Handle unique key race on externalId
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Child ID already exists' });
    }
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to link child' });
  }
});

module.exports = router;
