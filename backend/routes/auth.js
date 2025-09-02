// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/register  (use for seeding admin/parent; remove in prod if needed)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'parent', children = [] } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role, children });
    res.status(201).json({ id: user._id, email: user.email, role: user.role });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/auth/login  -> returns JWT with { id, role, children }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash children role');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, role: user.role, children: user.children?.map(String) || [] };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

    res.json({ token, user: { id: user._id, email: user.email, role: user.role, children: payload.children } });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
