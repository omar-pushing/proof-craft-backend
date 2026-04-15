// models/index.js
const mongoose = require('mongoose');

// ── USER ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 100 },
  email:     { type: String, required: true, unique: true, lowercase: true, maxlength: 200 },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  cvCount:   { type: Number, default: 0 },
  csCount:   { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// ── ADMIN ─────────────────────────────────────────
const adminSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ── CV ────────────────────────────────────────────
const cvSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, default: 'My CV' },
  template:  { type: String, enum: ['modern','classic','minimal'], default: 'modern' },
  color:     { type: String, default: '#2A4A3C' },
  font:      { type: String, default: 'Playfair Display' },
  data:      { type: mongoose.Schema.Types.Mixed },
  isPublic:  { type: Boolean, default: false },
  shareSlug: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ── CASE STUDY ────────────────────────────────────
const caseStudySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true, maxlength: 200 },
  status:    { type: String, enum: ['draft','published'], default: 'draft' },
  category:  { type: String },
  data:      { type: mongoose.Schema.Types.Mixed },
  shareSlug: { type: String, unique: true, sparse: true },
  views:     { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ── FEEDBACK ──────────────────────────────────────
const feedbackSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 100 },
  email:     { type: String, required: true, maxlength: 200 },
  subject:   { type: String, required: true, maxlength: 200 },
  message:   { type: String, required: true, maxlength: 2000 },
  rating:    { type: Number, min: 1, max: 5 },
  status:    { type: String, enum: ['new','read','replied'], default: 'new' },
  createdAt: { type: Date, default: Date.now }
});

// ── SITE CONTENT ──────────────────────────────────
const siteContentSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

// ── FAQ ───────────────────────────────────────────
const faqSchema = new mongoose.Schema({
  question:  { type: String, required: true, maxlength: 500 },
  answer:    { type: String, required: true, maxlength: 2000 },
  order:     { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// ── TESTIMONIAL ───────────────────────────────────
const testimonialSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 100 },
  role:      { type: String, required: true, maxlength: 200 },
  initials:  { type: String, maxlength: 3 },
  quote:     { type: String, required: true, maxlength: 1000 },
  isActive:  { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// ── ANALYTICS EVENT ───────────────────────────────
const analyticsSchema = new mongoose.Schema({
  event:     { type: String, required: true }, // 'signup','cv_created','cs_published','page_view'
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  meta:      { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  User:        mongoose.model('User', userSchema),
  Admin:       mongoose.model('Admin', adminSchema),
  CV:          mongoose.model('CV', cvSchema),
  CaseStudy:   mongoose.model('CaseStudy', caseStudySchema),
  Feedback:    mongoose.model('Feedback', feedbackSchema),
  SiteContent: mongoose.model('SiteContent', siteContentSchema),
  FAQ:         mongoose.model('FAQ', faqSchema),
  Testimonial: mongoose.model('Testimonial', testimonialSchema),
  Analytics:   mongoose.model('Analytics', analyticsSchema)
};
