const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Child = require('../models/child');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Parent-only registration (no child yet)
 * POST /api/parents/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: 'parent' });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, children: [] });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/**
 * Admin: link children to a parent by Mongo ObjectIds.
 * Bi-directional + non-destructive:
 *  - $addToSet child.parents += parentId
 *  - set legacy parent / parentId for compatibility
 *  - $addToSet user.children += childIds
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

    const [childRes, userRes] = await Promise.all([
      Child.updateMany(
        { _id: { $in: validIds } },
        {
          $addToSet: { parents: parentId },
          $set: {
            parent: parentId,   // legacy field
            parentId: parentId  // legacy field
          }
        }
      ),
      User.updateOne({ _id: parentId }, { $addToSet: { children: { $each: validIds } } })
    ]);

    return res.json({
      ok: true,
      childrenMatched: childRes.matchedCount ?? childRes.n,
      childrenModified: childRes.modifiedCount ?? childRes.nModified,
      userUpdated: userRes.modifiedCount ?? userRes.nModified ?? 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to link children' });
  }
});

/**
 * Admin: unlink specific children from a parent.
 * Bi-directional:
 *  - $pull child.parents -= parentId
 *  - unset legacy parent / parentId
 *  - $pull user.children -= childIds
 */
router.post('/:parentId/unlink-children', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { parentId } = req.params;
    const { childIds = [] } = req.body;

    if (!isObjectId(parentId)) return res.status(400).json({ message: 'Invalid parentId' });

    const validIds = childIds.filter(isObjectId);

    const [childRes, userRes] = await Promise.all([
      Child.updateMany(
        { _id: { $in: validIds } },
        {
          $pull: { parents: parentId },
          $unset: { parent: '', parentId: '' } // clear legacy
        }
      ),
      User.updateOne({ _id: parentId }, { $pull: { children: { $in: validIds } } })
    ]);

    return res.json({
      ok: true,
      childrenMatched: childRes.matchedCount ?? childRes.n,
      childrenModified: childRes.modifiedCount ?? childRes.nModified,
      userUpdated: userRes.modifiedCount ?? userRes.nModified ?? 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to unlink children' });
  }
});

/**
 * Parent self-serve: link (or create) a child by human-friendly externalId.
 * - If externalId exists and is unowned or already owned by this parent -> link.
 * - If it exists and is owned by another -> 409.
 * - If it does not exist -> create and link.
 */
router.post('/link-child', requireAuth, requireRole('parent'), async (req, res) => {
  try {
    const { externalId, name, birthDate } = req.body;
    if (!externalId) return res.status(400).json({ message: 'externalId required' });

    const ext = String(externalId).trim().toUpperCase();
    const idOk = /^[A-Z0-9-]+$/.test(ext);
    if (!idOk) return res.status(400).json({ message: 'Invalid Child ID format' });

    // Atomic link-or-create: allow matching when unowned or already owned by this parent
    let kid = await Child.findOneAndUpdate(
      {
        externalId: ext,
        $or: [
          { parents: { $exists: false } },
          { parents: { $size: 0 } },
          { parents: req.user.id },
          { parentId: null }, { parentId: { $exists: false } }, { parentId: req.user.id } // legacy allowance
        ],
      },
      {
        $setOnInsert: {
          externalId: ext,
          name: (name || '').trim(),
          birthDate: birthDate || null,
          parent: req.user.id,   // legacy
          parentId: req.user.id, // legacy
          parents: [req.user.id]
        },
        $set: {
          parent: req.user.id,   // legacy
          parentId: req.user.id, // legacy
          $addToSet: { parents: req.user.id },
          ...(name ? { name: String(name).trim() } : {}),
          ...(birthDate ? { birthDate } : {}),
        },
      },
      { new: true, upsert: true }
    );

    // If upsert/update didn't match because someone else owns it, return 409
    if (!kid) {
      const existing = await Child.findOne({ externalId: ext });
      if (existing) {
        const ownedByOther =
          (Array.isArray(existing.parents) && existing.parents.length > 0 && !existing.parents.some(p => String(p) === String(req.user.id))) ||
          (existing.parent && String(existing.parent) !== String(req.user.id)) ||
          (existing.parentId && String(existing.parentId) !== String(req.user.id));
        if (ownedByOther) {
          return res.status(409).json({ message: 'Child ID is already linked to another parent' });
        }
      }
      return res.status(409).json({ message: 'Child ID already exists' });
    }

    // Reverse link on the user
    await User.updateOne({ _id: req.user.id }, { $addToSet: { children: kid._id } });

    return res.json(kid);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Child ID already exists' });
    }
    console.error(e);
    return res.status(400).json({ message: e.message || 'Failed to link child' });
  }
});

module.exports = router;
