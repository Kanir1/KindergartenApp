// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/child'); // <-- make sure this path is correct

const router = express.Router();

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'parent', childIds = [] } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });

    if (role === 'parent' && Array.isArray(childIds) && childIds.length > 0) {
      const validIds = childIds.filter(isObjectId);
      if (validIds.length !== childIds.length) {
        return res.status(400).json({ message: 'One or more childIds are invalid ObjectIds' });
      }

      const objIds = validIds.map(id => new mongoose.Types.ObjectId(id));
      const result = await Child.updateMany(
        { _id: { $in: objIds } },
        { $set: { parentId: user._id } }
      );

      // Optional: surface counts to make debugging easy
      // e.g., { matchedCount: 1, modifiedCount: 1 }
      user._linkStats = { matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified };
    }

    res.status(201).json({ id: user._id, email: user.email, role: user.role, linkStats: user._linkStats });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});


// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash role email');
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  // ⬇️ derive children from Child.parentId (not from user.children)
  let childIds = [];
  if (user.role === 'parent') {
    const kids = await Child.find({ parentId: user._id }).select('_id').lean();
    childIds = kids.map(k => String(k._id));
  }

  const payload = { id: user._id, role: user.role, children: childIds };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

  res.json({ token, user: { id: user._id, email: user.email, role: user.role, children: childIds } });
});


module.exports = router;
