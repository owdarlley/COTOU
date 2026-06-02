require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const { runMigrations } = require('./config/database');
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

runMigrations();

const app = express();

app.use(helmet());
app.use(compression());
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve prototype at /prototype/index.html
app.use('/prototype', express.static(path.join(__dirname, '../public/prototype')));

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET não definida. Configure a variável de ambiente.');
  }
  console.warn('[AVISO] SESSION_SECRET não definida — usando valor temporário. Configure o .env antes de ir para produção.');
}

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: sessionSecret || 'cotou-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Dashboard summary
app.get('/', requireAuth, (req, res) => {
  const counts = Quotation.countByStatus(req.session.userId, req.session.userRole);
  const statusMap = {};
  counts.forEach(r => { statusMap[r.status] = r.count; });
  const recent = Quotation.findAll({ userId: req.session.userId, role: req.session.userRole, page: 1, limit: 5 });
  const unreadCount = Notification.countUnread(req.session.userId);
  const user = User.findById(req.session.userId);
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

app.use('/auth', authRoutes);
app.use('/cotacoes', quotationsRoutes);
app.use('/pecas', partsRoutes);
app.use('/notificacoes', notificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ ok: false, error: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
});

module.exports = app;
