// backend/routes/parents.js
const express = require('express');
const mongoose = require('mongoose');
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const router = express.Router();

router.post('/:parentId/link-children', requireAuth, requireRole('admin'), async (req, res) => {
  const { parentId } = req.params;
  const { childIds = [] } = req.body;

  if (!isObjectId(parentId)) return res.status(400).json({ message: 'Invalid parentId' });
  if (!Array.isArray(childIds) || childIds.length === 0) {
    return res.status(400).json({ message: 'childIds must be a non-empty array' });
  }
  const validIds = childIds.filter(isObjectId);
  if (validIds.length !== childIds.length) return res.status(400).json({ message: 'One or more childIds invalid' });

  await Child.updateMany({ _id: { $in: validIds } }, { $set: { parentId } });
  res.json({ ok: true });
});

router.post('/:parentId/unlink-children', requireAuth, requireRole('admin'), async (req, res) => {
  const { parentId } = req.params;
  const { childIds = [] } = req.body;

  if (!isObjectId(parentId)) return res.status(400).json({ message: 'Invalid parentId' });
  const validIds = childIds.filter(isObjectId);
  await Child.updateMany({ _id: { $in: validIds }, parentId }, { $set: { parentId: null } });
  res.json({ ok: true });
});

module.exports = router;
