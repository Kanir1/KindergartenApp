// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized: missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, children: [] }
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

function ensureCanAccessChild(req, res, next) {
  const { role, children = [] } = req.user || {};
  const childId = req.params.childId || req.body.child || req.query.child;

  if (role === 'admin') return next();
  if (role === 'parent' && childId && children.map(String).includes(String(childId))) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: cannot access this child' });
}

module.exports = { requireAuth, requireRole, ensureCanAccessChild };
