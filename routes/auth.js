// routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authLimiter } = require('../middleware/security');
const { sendWelcomeEmail } = require('../utils/email');
const { Analytics } = require('../models');

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/signup
router.post('/signup',
  authLimiter,
  [
    body('name').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 8, max: 72 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'Email already registered.' });

      const hashed = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password: hashed });

      // Fire-and-forget welcome email
      sendWelcomeEmail({ name, email }).catch(() => {});

      // Track signup event
      Analytics.create({ event: 'signup', userId: user._id }).catch(() => {});

      const token = sign({ id: user._id, role: 'user' });
      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

      const token = sign({ id: user._id, role: user.role });
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', require('../middleware/security').requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
