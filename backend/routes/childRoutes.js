const express = require('express');
const router = express.Router();
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth'); // optional but recommended

// CREATE child
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const newChild = await Child.create(req.body);
    res.status(201).json({ message: 'Child created', child: newChild }); // <-- return the saved doc
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// LIST children
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const children = await Child.find().sort({ createdAt: -1 });
  res.json(children);
});

// GET one child
router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const one = await Child.findById(req.params.id);
  if (!one) return res.status(404).json({ message: 'Not found' });
  res.json(one);
});

// ADD a daily log to a child (if you still use this)
router.post('/:id/log', requireAuth, requireRole('admin'), async (req, res) => {
  const one = await Child.findById(req.params.id);
  if (!one) return res.status(404).json({ message: 'Not found' });
  one.dailyLogs.push(req.body);
  await one.save();
  res.json({ message: 'Log added', child: one });
});

module.exports = router;
