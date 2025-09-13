// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/child'); // path is correct

const router = express.Router();

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'parent',
      childIds = [],
      newChild, // { name: string, externalId: string, birthDate?: string }
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email & password required' });
    }

    // Enforce unique email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // ⛔️ Pre-check: if admin supplied a newChild with an existing externalId, fail early
    if (newChild && typeof newChild === 'object') {
      const ext = (newChild.externalId || '').trim().toUpperCase();
      const childName = (newChild.name || '').trim();
      if (!ext || !childName) {
        return res
          .status(400)
          .json({ message: 'newChild.externalId and newChild.name are required' });
      }
      const exists = await Child.findOne({ externalId: ext });
      if (exists) {
        return res.status(409).json({
          message: 'Child ID already exists. Use the Link Parent ↔ Child tool instead.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });

    // Parent-specific: link or create children
    if (user.role === 'parent') {
      // 1) Optional: link existing children by Mongo ObjectIds — ONLY if unowned
      if (Array.isArray(childIds) && childIds.length) {
        const validIds = childIds.filter(isObjectId);
        if (validIds.length !== childIds.length) {
          return res.status(400).json({ message: 'One or more childIds are invalid ObjectIds' });
        }

        const objIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
        const result = await Child.updateMany(
          {
            _id: { $in: objIds },
            // "unowned" => no parents[], no legacy parent/parentId
            $and: [
              { $or: [{ parents: { $exists: false } }, { parents: { $size: 0 } }] },
              { $or: [{ parent: null }, { parent: { $exists: false } }] },
              { $or: [{ parentId: null }, { parentId: { $exists: false } }] },
            ],
          },
          {
            // set all ownership shapes
            $set: { parentId: user._id, parent: user._id },
            $addToSet: { parents: user._id },
          }
        );

        user._linkStats = {
          matched: result.matchedCount ?? result.n,
          modified: result.modifiedCount ?? result.nModified,
        };
      }

      // 2) Admin-supplied newChild by human-friendly externalId
      if (newChild && typeof newChild === 'object') {
        const ext = (newChild.externalId || '').trim().toUpperCase();
        const childName = (newChild.name || '').trim();

        // We already validated presence & existence above.
        try {
          await Child.create({
            name: childName,
            externalId: ext,
            birthDate: newChild.birthDate || null,
            // set all ownership shapes — this new child belongs ONLY to this parent at creation
            parentId: user._id,   // legacy
            parent:   user._id,   // legacy
            parents: [user._id],  // preferred
          });
        } catch (e) {
          // If a race caused a duplicate externalId, roll back the user so registration fails entirely
          if (e?.code === 11000) {
            await User.deleteOne({ _id: user._id });
            return res.status(409).json({
              message: 'Child ID already exists. Use the Link Parent ↔ Child tool instead.',
            });
          }
          // Any other error: also roll back the user
          await User.deleteOne({ _id: user._id });
          return res.status(400).json({ message: e.message || 'Failed to create child' });
        }
      }
    }

    // Derive children list for token from Child.parentId
    const kids = await Child.find({ parentId: user._id }).select('_id').lean();
    const childIdsForToken = kids.map((k) => String(k._id));

    const payload = { id: user._id, role: user.role, children: childIdsForToken };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, children: childIdsForToken },
      linkStats: user._linkStats,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: e.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // passwordHash might be select:false in the schema; explicitly include it
  const user = await User.findOne({ email }).select('+passwordHash role email');
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  // Derive children from Child.parentId (not embedded in User)
  let childIds = [];
  if (user.role === 'parent') {
    const kids = await Child.find({ parentId: user._id }).select('_id').lean();
    childIds = kids.map((k) => String(k._id));
  }

  const payload = { id: user._id, role: user.role, children: childIds };
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({ token, user: { id: user._id, email: user.email, role: user.role, children: childIds } });
});

module.exports = router;
