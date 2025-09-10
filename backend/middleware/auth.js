// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const Child = require('../models/child');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized: missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Expect payload to be { id, role } — no need for children in the token anymore
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

/**
 * Ensures the current user can access the child referenced by:
 *  - req.params.childId   OR
 *  - req.body.child       OR
 *  - req.query.child
 *
 * Works with either:
 *  - Child.parent:   ObjectId (single parent)
 *  - Child.parents: [ObjectId] (multiple parents)
 */
async function ensureCanAccessChild(req, res, next) {
  try {
    const { role, id: userId } = req.user || {};
    const childId =
      req.params.childId ||
      req.body.child ||
      req.query.child;

    if (!childId) {
      return res.status(400).json({ message: 'Bad Request: child id is required' });
    }

    // Admins can access any child
    if (role === 'admin') return next();

    // For parents: verify ownership on the child document
    const child = await Child.findById(childId).select('parent parents').lean();
    if (!child) return res.status(404).json({ message: 'Child not found' });

    const userIdStr = String(userId);

    // Support either schema shape:
    const hasParentsArray =
      Array.isArray(child.parents) && child.parents.length > 0;
    const matchesParentsArray =
      hasParentsArray && child.parents.some(p => String(p) === userIdStr);

    const matchesSingleParent =
      child.parent && String(child.parent) === userIdStr;

    if (role === 'parent' && (matchesParentsArray || matchesSingleParent)) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: cannot access this child' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = { requireAuth, requireRole, ensureCanAccessChild };
