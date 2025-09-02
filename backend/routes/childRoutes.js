const express = require('express');
const router = express.Router();
const Child = require('../models/child');

// Get one child's data
router.get('/:id', async (req, res) => {
  const child = await Child.findById(req.params.id);
  res.json(child);
});

// Add a daily log
router.post('/:id/log', async (req, res) => {
  const child = await Child.findById(req.params.id);
  child.dailyLogs.push(req.body);
  await child.save();
  res.send('Log added');
});

// Add a new child (just for testing)
router.post('/', async (req, res) => {
  const newChild = new Child(req.body);
  await newChild.save();
  res.send('Child created');
});

module.exports = router;
