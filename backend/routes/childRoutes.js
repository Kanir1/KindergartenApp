// backend/routes/childRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const Child = require('../models/child');
const { requireAuth, requireRole } = require('../middleware/auth');

const tryRequire = (p) => { try { return require(p); } catch { return null; } };
const DailyReport = tryRequire('../models/DailyReport');   // adjust if your file differs
const MonthlyReport = tryRequire('../models/MonthlyReport');

// ---------- helpers ----------
function ownsChildDoc(childDoc, userId) {
  const uid = String(userId);
  if (childDoc.parent && String(childDoc.parent) === uid) return true;     // legacy
  if (childDoc.parentId && String(childDoc.parentId) === uid) return true; // legacy
  if (Array.isArray(childDoc.parents) && childDoc.parents.some(p => String(p) === uid)) return true;
  return false;
}

// storage for pickup photos (required)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `pickup_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// ================== SPECIFIC ROUTES FIRST ==================

// PARENT: list only their children
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

// ADMIN: create child
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, birthDate, externalId, childId, group } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'name is required' });
    if (!birthDate) return res.status(400).json({ message: 'birthDate is required' });

    const idVal = (externalId ?? childId ?? '').toString().trim();
    if (!idVal) return res.status(400).json({ message: 'childId (or externalId) is required' });

    const dupe = await Child.exists({ $or: [{ externalId: idVal }, { childId: idVal }] });
    if (dupe) return res.status(409).json({ message: 'A child with this ID already exists' });

    const created = await Child.create({
      name: String(name).trim(),
      birthDate,
      externalId: idVal,
      childId: idVal, // legacy mirror if present in schema
      group: group?.toString().trim() || undefined,
    });

    res.status(201).json({ message: 'Child created', child: created });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ADMIN: list all children
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

// Parent notes (medical condition + special notes)
router.patch('/:id/parent-notes', requireAuth, async (req, res) => {
  try {
    const one = await Child.findById(req.params.id);
    if (!one) return res.status(404).json({ message: 'Not found' });

    const allowed = req.user.role === 'admin' || ownsChildDoc(one, req.user.id);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const { medicalCondition = '', specialNotes = '' } = req.body || {};
    one.medicalCondition = String(medicalCondition);
    one.specialNotes = String(specialNotes);
    await one.save();
    res.json({ message: 'Saved', child: one });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Authorized pickups (create)
router.post('/:id/pickups', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const one = await Child.findById(req.params.id);
    if (!one) return res.status(404).json({ message: 'Not found' });

    const allowed = req.user.role === 'admin' || ownsChildDoc(one, req.user.id);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const { name, phone } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ message: 'name is required' });
    if (!phone?.trim()) return res.status(400).json({ message: 'phone is required' });
    if (!req.file) return res.status(400).json({ message: 'photo is required' });

    const photoUrl = `/uploads/${req.file.filename}`;
    one.authorizedPickups.push({
      name: name.trim(),
      phone: phone.trim(),
      photoUrl,
      addedBy: req.user.id,
    });
    await one.save();
    const created = one.authorizedPickups[one.authorizedPickups.length - 1];
    res.status(201).json({ message: 'Added pickup', pickup: created });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Authorized pickups (delete)
router.delete('/:id/pickups/:pid', requireAuth, async (req, res) => {
  try {
    const one = await Child.findById(req.params.id);
    if (!one) return res.status(404).json({ message: 'Not found' });

    const allowed = req.user.role === 'admin' || ownsChildDoc(one, req.user.id);
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const before = one.authorizedPickups.length;
    one.authorizedPickups = one.authorizedPickups.filter(p => String(p._id) !== String(req.params.pid));
    if (one.authorizedPickups.length === before) {
      return res.status(404).json({ message: 'Pickup not found' });
    }
    await one.save();
    res.json({ message: 'Removed pickup' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ================== CATCH-ALL (put LAST) ==================

// GET one (admin OR owning parent)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // guard invalid ObjectId -> 404 (not 500)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Not found' });
    }

    const one = await Child.findById(req.params.id).lean();
    if (!one) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'admin') return res.json(one);
    if (req.user.role === 'parent' && ownsChildDoc(one, req.user.id)) return res.json(one);

    return res.status(403).json({ message: 'Forbidden' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Not found' });
    }

    // Load child (need pickups to clean photos)
    const child = await Child.findById(id);
    if (!child) return res.status(404).json({ message: 'Not found' });

    // 1) Delete reports referencing this child (supports either "child" or "childId" field)
    const filter = { $or: [{ child: id }, { childId: id }] };
    if (DailyReport) await DailyReport.deleteMany(filter);
    if (MonthlyReport) await MonthlyReport.deleteMany(filter);

    // 2) Remove pickup photos from disk
    if (Array.isArray(child.authorizedPickups)) {
      await Promise.all(
        child.authorizedPickups.map((p) => {
          if (!p.photoUrl?.startsWith('/uploads/')) return Promise.resolve();
          const filePath = path.join(__dirname, '..', p.photoUrl);
          return fs.promises.unlink(filePath).catch(() => {});
        })
      );
    }

    // 3) Delete the child itself
    await Child.deleteOne({ _id: id });

    res.json({ message: 'Child and related reports deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
