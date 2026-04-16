// routes/admin.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Admin, User, CV, CaseStudy, Feedback, FAQ, Testimonial, SiteContent, Analytics } = require('../models');
const { authLimiter, requireAdmin } = require('../middleware/security');

const signAdmin = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

// ── SEED admin on first run ────────────────────────
async function ensureAdmin() {
  try {
    const exists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!exists) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await Admin.create({ username: process.env.ADMIN_USERNAME, password: hashed });
      console.log('✅ Admin account created');
    }
  } catch (e) { console.error('Admin seed error:', e.message); }
}
ensureAdmin();

// POST /api/admin/login
router.post('/login',
  authLimiter,
  [
    body('username').trim().notEmpty().escape(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
      const admin = await Admin.findOne({ username });
      if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

      const token = signAdmin({ id: admin._id, username: admin.username, role: 'admin' });
      res.json({ token, admin: { username: admin.username } });
    } catch {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// ── All routes below require admin JWT ────────────

// GET /api/admin/dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [users, cvs, caseStudies, feedbacks, recentFeedback, recentUsers] = await Promise.all([
      User.countDocuments(),
      CV.countDocuments(),
      CaseStudy.countDocuments({ status: 'published' }),
      Feedback.countDocuments(),
      Feedback.find().sort({ createdAt: -1 }).limit(5).lean(),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password').lean()
    ]);

    // Weekly signups
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklySignups = await User.countDocuments({ createdAt: { $gte: weekAgo } });
    const weeklyCvs = await CV.countDocuments({ createdAt: { $gte: weekAgo } });

    res.json({ users, cvs, caseStudies, feedbacks, weeklySignups, weeklyCvs, recentFeedback, recentUsers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── FAQs ──────────────────────────────────────────
router.get('/faqs', requireAdmin, async (_, res) => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(faqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.post('/faqs', requireAdmin,
  [body('question').trim().notEmpty().escape(), body('answer').trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const faq = await FAQ.create(req.body);
      res.status(201).json(faq);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);
router.put('/faqs/:id', requireAdmin, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!faq) return res.status(404).json({ error: 'Not found' });
    res.json(faq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.delete('/faqs/:id', requireAdmin, async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Testimonials ──────────────────────────────────
router.get('/testimonials', requireAdmin, async (_, res) => {
  try {
    const t = await Testimonial.find().sort({ order: 1 }).lean();
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.post('/testimonials', requireAdmin,
  [body('name').trim().notEmpty(), body('quote').trim().notEmpty()],
  async (req, res) => {
    try {
      const t = await Testimonial.create(req.body);
      res.status(201).json(t);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);
router.put('/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    const t = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.delete('/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Site Content ──────────────────────────────────
router.get('/content', requireAdmin, async (_, res) => {
  try {
    const items = await SiteContent.find().lean();
    const obj = {};
    items.forEach(i => { obj[i.key] = i.value; });
    res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.put('/content', requireAdmin, async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    const ops = Object.entries(updates).map(([key, value]) =>
      SiteContent.findOneAndUpdate({ key }, { key, value, updatedAt: new Date() }, { upsert: true, new: true })
    );
    await Promise.all(ops);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Feedback ──────────────────────────────────────
router.get('/feedback', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const q = status ? { status } : {};
    const [items, total] = await Promise.all([
      Feedback.find(q).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean(),
      Feedback.countDocuments(q)
    ]);
    res.json({ items, total, pages: Math.ceil(total / 20) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.patch('/feedback/:id', requireAdmin, async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(fb);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.delete('/feedback/:id', requireAdmin, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Users ──────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean(),
      User.countDocuments()
    ]);
    res.json({ users, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
