const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');
const Child = require('../models/child');
const DailyReport = require('../models/DailyReport');
const MonthlyReport = require('../models/MonthlyReport');

const { requireAuth, requireRole } = require('../middleware/auth');

// Helper: find all childIds owned by a given parent id, regardless of schema shape
function childFilterForParent(parentId) {
  return {
    $or: [
      { parents: parentId },        // array of ObjectIds
      { parent: parentId },         // single field (legacy)
      { parentId: parentId },       // legacy
    ],
  };
}

/**
 * GET /api/admin/parents
 * List all parent users with counts (children, daily, monthly).
 */
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('_id name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const results = await Promise.all(
      parents.map(async (p) => {
        const childIds = await Child.distinct('_id', childFilterForParent(p._id));
        const [dailyCount, monthlyCount] = await Promise.all([
          DailyReport.countDocuments({ child: { $in: childIds } }),
          MonthlyReport.countDocuments({ child: { $in: childIds } }),
        ]);
        return {
          _id: p._id,
          name: p.name || '',
          email: p.email || '',
          createdAt: p.createdAt,
          childCount: childIds.length,
          dailyCount,
          monthlyCount,
        };
      })
    );

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Failed to load parents' });
  }
});

/**
 * DELETE /api/admin/parents/:id
 * New behavior:
 *   - Unlink this parent from all children (preserve children & reports).
 *   - If a child still has other parents, copy the first remaining id back to legacy fields.
 *   - Delete ONLY the parent user.
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const parent = await User.findById(id);
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    if (parent.role !== 'parent') {
      return res.status(400).json({ message: 'Target user is not a parent' });
    }

    // Unlink from any children (handle both new and legacy fields),
    // but DO NOT delete children or reports.
    const childIds = await Child.distinct('_id', childFilterForParent(parent._id));
    const unlinkRes = await Child.updateMany(
      { _id: { $in: childIds } },
      {
        $pull: { parents: parent._id },
        $unset: { parent: '', parentId: '' }, // clear legacy for now
      }
    );

    // For children that still have at least one parent left, copy the first remaining
    // parent id back into the legacy fields so the UI that reads legacy fields keeps working.
    const stillLinked = await Child.find({
      _id: { $in: childIds },
      parents: { $exists: true, $not: { $size: 0 } },
    })
      .select('_id parents')
      .lean();

    for (const ch of stillLinked) {
      const fallback = ch.parents[0];
      await Child.updateOne(
        { _id: ch._id },
        { $set: { parent: fallback, parentId: fallback } }
      );
    }

    // Finally, delete just the parent user
    await User.deleteOne({ _id: parent._id });

    res.json({
      ok: true,
      userDeleted: 1,
      childrenUnlinked: unlinkRes.modifiedCount ?? unlinkRes.nModified ?? 0,
      legacyRefilled: stillLinked.length,
      note: 'Children and all reports were preserved; legacy parent fields refilled where applicable.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Delete failed' });
  }
});

module.exports = router;
