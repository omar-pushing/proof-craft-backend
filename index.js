// index.js — ProofCraft Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { apiLimiter, sanitizeMiddleware } = require('./middleware/security');

const app = express();

// ── Security headers ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'https://proofcraft.online'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ── CORS ──────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://proofcraft.online',
  'https://proof-craft-backend.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.options('*', cors());

// ── Body & compression ────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Sanitize all input ────────────────────────────
app.use(sanitizeMiddleware);

// ── Global rate limit ─────────────────────────────
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

const cvRoutes = require('./routes/cv');
app.use('/api/cv', cvRoutes);
app.use('/api/casestudies', cvRoutes.csRouter);

const feedbackRoutes = require('./routes/feedback');
app.use('/api/feedback', feedbackRoutes);
const { pubRouter } = require('./routes/feedback');
app.use('/api/public', pubRouter);

// ── Admin Dashboard SPA ───────────────────────────
const path = require('path');
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Health check ──────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── 404 ───────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ── Connect DB & start ────────────────────────────
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
