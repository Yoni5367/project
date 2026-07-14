require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const timeout = require('express-timeout-handler');
const { logger } = require('./services/logger');

const app = express();

// ── Trust proxy (for rate limiting behind nginx/cloudflare) ──
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// ── CORS ──────────────────────────────────────────────
const allowedOrigin = process.env.FRONTEND_URL;
if (!allowedOrigin && process.env.NODE_ENV === 'production') {
  logger.error('FRONTEND_URL not set in production!');
}
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? (allowedOrigin || 'http://localhost:5173') : true,
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limited', { ip: req.ip, path: req.path });
    res.status(429).json({ error: 'Too many requests, slow down.' });
  },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts.' },
  handler: (req, res) => {
    logger.warn('Auth rate limited', { ip: req.ip, path: req.path });
    res.status(429).json({ error: 'Too many login attempts.' });
  },
});
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Request Logging ───────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// ── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Request Timeout ───────────────────────────────────
app.use(timeout.handler({
  timeout: 30000,
  onTimeout: (req, res) => {
    logger.warn('Request timed out', { method: req.method, path: req.path });
    res.status(408).json({ error: 'Request timed out' });
  },
}));

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/applications',  require('./routes/applications'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/agreements',    require('./routes/agreements'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/housemate',     require('./routes/housemate'));

// ── Health Check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'Debale API', version: '1.0.0', time: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Debale API running on port ${PORT}`);
  console.log(`
  ╔══════════════════════════════════════╗
  ║     Debale API Server                ║
  ║     Running on port ${PORT}              ║
  ║     http://localhost:${PORT}/api/health ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
