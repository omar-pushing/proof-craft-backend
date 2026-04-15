// routes/feedback.js
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Feedback } = require('../models');
const { feedbackLimiter } = require('../middleware/security');
const { sendFeedbackNotification } = require('../utils/email');

// POST /api/feedback
router.post('/',
  feedbackLimiter,
  [
    body('name').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('subject').trim().notEmpty().isLength({ max: 200 }).escape(),
    body('message').trim().notEmpty().isLength({ max: 2000 }),
    body('rating').optional().isInt({ min: 1, max: 5 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, subject, message, rating } = req.body;
    try {
      const fb = await Feedback.create({ name, email, subject, message, rating });

      // Email notification (non-blocking)
      sendFeedbackNotification({ name, email, subject, message, rating }).catch(err => {
        console.error('Email send failed:', err.message);
      });

      res.status(201).json({ ok: true, id: fb._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

module.exports = router;

// ─────────────────────────────────────────────────
// routes/public.js  — site content for frontend
const pubRouter = require('express').Router();
const { FAQ, Testimonial, SiteContent } = require('../models');

pubRouter.get('/faqs', async (_, res) => {
  const faqs = await FAQ.find({ isActive: true }).sort({ order: 1 }).select('-__v').lean();
  res.json(faqs);
});

pubRouter.get('/testimonials', async (_, res) => {
  const t = await Testimonial.find({ isActive: true }).sort({ order: 1 }).select('-__v').lean();
  res.json(t);
});

pubRouter.get('/content', async (_, res) => {
  const items = await SiteContent.find().lean();
  const obj = {};
  items.forEach(i => { obj[i.key] = i.value; });
  res.json(obj);
});

// Real stats (public-safe, no sensitive data)
pubRouter.get('/stats', async (_, res) => {
  const { User, CV, CaseStudy } = require('../models');
  const [users, cvs, cases] = await Promise.all([
    User.countDocuments(),
    CV.countDocuments(),
    CaseStudy.countDocuments({ status: 'published' })
  ]);
  res.json({ users, cvs, publishedCases: cases });
});

module.exports.pubRouter = pubRouter;
