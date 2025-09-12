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
      { parent: parentId },         // single field
      { parentId: parentId },       // legacy
    ],
  };
}

/**
 * GET /api/admin/parents
 * List all parent users with counts (children, daily, monthly).
 */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('_id name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Compute counts per parent (simple + clear)
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
 * SAFE removal:
 *  1) Unlink this parent from all children (both new + legacy fields).
 *  2) Identify children that became orphaned (no parents[], no legacy parent/parentId).
 *  3) Delete reports for those orphaned children, then delete the children.
 *  4) Delete the parent user.
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const parent = await User.findById(id).session(session);
      if (!parent) {
        return res.status(404).json({ message: 'Parent not found' });
      }
      if (parent.role !== 'parent') {
        return res.status(400).json({ message: 'Target user is not a parent' });
      }

      const childIds = await Child
        .distinct('_id', childFilterForParent(parent._id))
        .session(session);

      // 1) Unlink the parent from children (both new and legacy fields)
      await Child.updateMany(
        { _id: { $in: childIds } },
        {
          $pull: { parents: parent._id },
          $unset: { parent: "", parentId: "" }
        }
      ).session(session);

      // 2) Find children that are now orphaned (no parents[], no legacy)
      const orphanIds = await Child.distinct('_id', {
        _id: { $in: childIds },
        $and: [
          { $or: [{ parents: { $exists: false } }, { parents: { $size: 0 } }] },
          { parent: { $exists: false } },
          { parentId: { $exists: false } },
        ],
      }).session(session);

      // 3) Delete reports for orphaned children, then delete the children
      const [dailyRes, monthlyRes] = await Promise.all([
        DailyReport.deleteMany({ child: { $in: orphanIds } }).session(session),
        MonthlyReport.deleteMany({ child: { $in: orphanIds } }).session(session),
      ]);
      const childrenRes = await Child.deleteMany({ _id: { $in: orphanIds } }).session(session);

      // (Optional) cleanup reverse link array on user doc — not strictly required
      // since we're deleting the user anyway.

      // 4) Delete the parent user
      await User.deleteOne({ _id: parent._id }).session(session);

      res.json({
        ok: true,
        deleted: {
          children: childrenRes?.deletedCount || 0,
          dailyReports: (dailyRes?.deletedCount || 0),
          monthlyReports: (monthlyRes?.deletedCount || 0),
          user: 1,
        },
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Delete failed' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
