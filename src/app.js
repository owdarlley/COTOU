require('dotenv').config();
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const PgSessionStore = require('./config/pgSessionStore');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const logger = require('./config/logger');
const pinoHttp = require('pino-http');
const { requireAuth } = require('./middleware/auth');
const Quotation = require('./models/Quotation');
const Notification = require('./models/Notification');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const quotationsRoutes = require('./routes/quotations');
const partsRoutes = require('./routes/parts');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const aprovacaoRoutes = require('./routes/aprovacao');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Trust nginx proxy so req.secure works correctly behind HTTPS termination
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", 'https://unpkg.com', 'https://cdn.socket.io', "'unsafe-inline'", "'unsafe-eval'"],
      'style-src':  ["'self'", 'https:', "'unsafe-inline'"],
      'font-src':   ["'self'", 'https:', 'data:'],
      'img-src':    ["'self'", 'data:', 'https:'],
      'connect-src':["'self'", 'https:'],
    },
  },
}));
app.use(compression());
const allowedOrigins = [
  'https://owdarlley.github.io',
  'https://cotou.darlley.dev.br',
  'https://cotou.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Força entrega sem cache do index.html — redireciona com ?v=timestamp para quebrar cache do browser e CDN
app.get(['/prototype', '/prototype/index.html'], async (req, res) => {
  if (!req.query.v) return res.redirect(302, `/prototype/index.html?v=${Date.now()}`);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.sendFile(require('path').join(__dirname, '../public/prototype/index.html'));
});
app.use('/prototype', express.static(path.join(__dirname, '../public/prototype')));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET não definida. Configure a variável de ambiente.');
  }
  logger.warn('[AVISO] SESSION_SECRET não definida — usando valor temporário. Configure o .env antes de ir para produção.');
}

// Front (github.io) e API (cotou.darlley.dev.br) são sites diferentes: precisa de SameSite=None + Secure.
const cookieSecure = process.env.COOKIE_SECURE === 'true' || !!process.env.VERCEL;

const sessionMiddleware = session({
  store: new PgSessionStore({ ttlSeconds: 28800 }),
  secret: sessionSecret || 'cotou-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    // secure/sameSite:none only when actually behind HTTPS (set COOKIE_SECURE=true in .env after SSL is configured)
    secure: cookieSecure,
    sameSite: cookieSecure ? 'none' : 'lax'
  }
});
app.use(sessionMiddleware);

// CSRF — valida X-CSRF-Token em todas as mutations autenticadas
app.use(async (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const exempt = ['/auth/login', '/auth/logout', '/api/whatsapp/webhook'];
  if (exempt.some(p => req.path === p)) return next();
  if (/^\/(api\/)?aprovar\//.test(req.path)) return next();
  const token = req.headers['x-csrf-token'];
  if (!token || !req.session?.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ ok: false, error: 'Token CSRF inválido. Recarregue a página.' });
  }
  next();
});

// Health check
app.get('/health', async (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Raiz abre o front (protótipo React)
app.get('/', (req, res) => res.redirect(302, '/prototype/index.html'));

// Dashboard summary
app.get('/', requireAuth, async (req, res) => {
  const counts = await Quotation.countByStatus(req.session.userId, req.session.userRole);
  const statusMap = {};
  counts.forEach(r => { statusMap[r.status] = r.count; });
  const recent = await Quotation.findAll({ userId: req.session.userId, role: req.session.userRole, page: 1, limit: 5 });
  const unreadCount = await Notification.countUnread(req.session.userId);
  const user = await User.findById(req.session.userId);
  res.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
    statusMap,
    recentQuotations: recent.items,
    unreadCount
  });
});

// Rotas públicas (sem autenticação) — devem vir antes do requireAuth
app.use(aprovacaoRoutes);
app.use('/api', webhookRoutes);

app.use('/auth', authRoutes);
app.use('/cotacoes', quotationsRoutes);
app.use('/pecas', partsRoutes);
app.use('/notificacoes', notificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.use(async (req, res) => res.status(404).json({ ok: false, error: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  logger.error({ err }, 'Erro interno do servidor');
  res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
});

module.exports = app;
module.exports.sessionMiddleware = sessionMiddleware;
