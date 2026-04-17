require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { apiLimiter, sanitizeMiddleware } = require('./middleware/security');

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.error('Please set these variables in your Vercel project settings.');
  }
}

const app = express();
// Trust first proxy for secure cookies when behind a proxy (like Vercel)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      contentSecurityPolicy: false,
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'https://proofcraft.online'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

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

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(sanitizeMiddleware);

app.use('/api/', apiLimiter);

let adminRoutes = null;

try {
  app.use('/api/auth', require('./routes/auth'));
  adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);

  const cvRoutes = require('./routes/cv');
  app.use('/api/cv', cvRoutes);
  app.use('/api/casestudies', cvRoutes.csRouter);

  const feedbackRoutes = require('./routes/feedback');
  app.use('/api/feedback', feedbackRoutes);
  const { pubRouter } = require('./routes/feedback');
  app.use('/api/public', pubRouter);
} catch (err) {
  console.error('❌ Route initialization error:', err.message);
  console.error(err.stack);
}

const path = require('path');
const fs = require('fs');

const adminPath = path.join(__dirname, 'admin', 'index.html');

if (fs.existsSync(adminPath)) {
  app.get('/admin', (_, res) => {
    try {
      res.sendFile(adminPath);
    } catch (err) {
      console.error('Admin file error:', err.message);
      res.status(404).json({ error: 'Admin dashboard not found' });
    }
  });

  app.get('/admin/', (_, res) => {
    try {
      res.sendFile(adminPath);
    } catch (err) {
      console.error('Admin file error:', err.message);
      res.status(404).json({ error: 'Admin dashboard not found' });
    }
  });
}

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

const PORT = process.env.PORT || 3001;

if (!process.env.MONGODB_URI) {
  console.error('⚠️  MONGODB_URI not configured. Database features will not work.');
}

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, { 
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000 
  })
    .then(async () => {
      console.log('✅ MongoDB connected');
      if (adminRoutes && adminRoutes.ensureAdmin) {
        try {
          await adminRoutes.ensureAdmin();
        } catch (e) {
          console.error('Admin init error:', e.message);
        }
      }
    })
    .catch(err => console.error('❌ MongoDB connection failed:', err.message));
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;