// middleware/security.js
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const mongoSanitize = require('mongo-sanitize');

// ── Rate limiters ──────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false
});

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Max 5 feedback submissions per hour.' }
});

// ── Sanitize body recursively ──────────────────────
function sanitizeBody(obj) {
  if (typeof obj === 'string') return xss(mongoSanitize(obj));
  if (Array.isArray(obj)) return obj.map(sanitizeBody);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const k of Object.keys(obj)) {
      const cleanKey = k.replace(/[$\.]/g, '_');
      clean[cleanKey] = sanitizeBody(obj[k]);
    }
    return clean;
  }
  return obj;
}

const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = sanitizeBody(req.body);
  if (req.query) req.query = sanitizeBody(req.query);
  next();
};

// ── JWT auth ───────────────────────────────────────
const jwt = require('jsonwebtoken');

function requireUser(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authLimiter, apiLimiter, feedbackLimiter, sanitizeMiddleware, requireUser, requireAdmin };
