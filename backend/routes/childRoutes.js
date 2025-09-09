const express = require('express');
const router = express.Router();
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');



// Parent: view only their children
router.get('/mine', requireAuth, requireRole('parent'), async (req, res) => {
  const items = await Child.find({ parentId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// CREATE child (admin)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const newChild = await Child.create(req.body);
    res.status(201).json({ message: 'Child created', child: newChild });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// LIST children (admin)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const children = await Child.find().sort({ createdAt: -1 });
  res.json(children);
});

// GET one child (admin OR that child's parent)
router.get('/:id', requireAuth, async (req, res) => {
  const one = await Child.findById(req.params.id).lean();
  if (!one) return res.status(404).json({ message: 'Not found' });
  if (req.user.role === 'admin') return res.json(one);
  if (req.user.role === 'parent' && String(one.parentId) === String(req.user.id)) {
    return res.json(one);
  }
  return res.status(403).json({ message: 'Forbidden' });
});

// ADD a daily log to a child (admin, if you still use embedded logs)
router.post('/:id/log', requireAuth, requireRole('admin'), async (req, res) => {
  const one = await Child.findById(req.params.id);
  if (!one) return res.status(404).json({ message: 'Not found' });
  one.dailyLogs.push(req.body);
  await one.save();
  res.json({ message: 'Log added', child: one });
});

module.exports = router;
