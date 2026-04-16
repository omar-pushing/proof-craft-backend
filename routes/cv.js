// routes/cv.js
const router = require('express').Router();
const { CV } = require('../models');
const { requireUser } = require('../middleware/security');
const { User, Analytics } = require('../models');
const crypto = require('crypto');

router.get('/', requireUser, async (req, res) => {
  try {
    const cvs = await CV.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
    res.json(cvs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', requireUser, async (req, res) => {
  try {
    const { title, template, color, font, data } = req.body;
    const cv = await CV.create({ userId: req.user.id, title, template, color, font, data });
    await User.findByIdAndUpdate(req.user.id, { $inc: { cvCount: 1 } });
    Analytics.create({ event: 'cv_created', userId: req.user.id }).catch(() => {});
    res.status(201).json(cv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', requireUser, async (req, res) => {
  try {
    const cv = await CV.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!cv) return res.status(404).json({ error: 'Not found' });
    res.json(cv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', requireUser, async (req, res) => {
  try {
    await CV.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Make public / get share link
router.post('/:id/share', requireUser, async (req, res) => {
  try {
    const slug = crypto.randomBytes(6).toString('hex');
    const cv = await CV.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isPublic: true, shareSlug: slug },
      { new: true }
    );
    res.json({ url: `https://proofcraft.online/cv/${slug}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Public view
router.get('/public/:slug', async (req, res) => {
  try {
    const cv = await CV.findOne({ shareSlug: req.params.slug, isPublic: true }).lean();
    if (!cv) return res.status(404).json({ error: 'Not found' });
    res.json(cv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
module.exports.csRouter = csRouter;

// ─────────────────────────────────────────────────
// routes/casestudy.js
const csRouter = require('express').Router();
const { CaseStudy } = require('../models');
const { requireUser: ru } = require('../middleware/security');
const crypto2 = require('crypto');

csRouter.get('/', ru, async (req, res) => {
  try {
    const items = await CaseStudy.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

csRouter.post('/', ru, async (req, res) => {
  try {
    const cs = await CaseStudy.create({ ...req.body, userId: req.user.id });
    const { Analytics: A, User: U } = require('../models');
    U.findByIdAndUpdate(req.user.id, { $inc: { csCount: 1 } }).catch(() => {});
    A.create({ event: 'cs_created', userId: req.user.id }).catch(() => {});
    res.status(201).json(cs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

csRouter.put('/:id', ru, async (req, res) => {
  try {
    const cs = await CaseStudy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!cs) return res.status(404).json({ error: 'Not found' });
    res.json(cs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

csRouter.delete('/:id', ru, async (req, res) => {
  try {
    await CaseStudy.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

csRouter.post('/:id/publish', ru, async (req, res) => {
  try {
    const slug = crypto2.randomBytes(7).toString('hex');
    const cs = await CaseStudy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'published', shareSlug: slug },
      { new: true }
    );
    const { Analytics: A } = require('../models');
    A.create({ event: 'cs_published', userId: req.user.id }).catch(() => {});
    res.json({ url: `https://proofcraft.online/case/${slug}`, cs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

csRouter.get('/public/:slug', async (req, res) => {
  try {
    const cs = await CaseStudy.findOneAndUpdate(
      { shareSlug: req.params.slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();
    if (!cs) return res.status(404).json({ error: 'Not found' });
    res.json(cs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports.csRouter = csRouter;
