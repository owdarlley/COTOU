require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const methodOverride = require('method-override');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const { runMigrations } = require('./config/database');
const injectLocals = require('./middleware/locals');
const authRoutes = require('./routes/auth');
const quotationsRoutes = require('./routes/quotations');
const partsRoutes = require('./routes/parts');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { requireAuth } = require('./middleware/auth');
const Quotation = require('./models/Quotation');

runMigrations();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || 'cotou-secret',
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use(injectLocals);

// Dashboard
app.get('/', requireAuth, (req, res) => {
  const counts = Quotation.countByStatus(req.session.userId, req.session.userRole);
  const statusMap = {};
  counts.forEach(r => { statusMap[r.status] = r.count; });

  const recent = Quotation.findAll({
    userId: req.session.userId,
    role: req.session.userRole,
    page: 1,
    limit: 5
  });

  const name = (req.session.userName || '').split(' ')[0];
  res.render('dashboard/index', {
    title: 'Painel — COTOU',
    topbarSubtitle: `Bem-vindo de volta${name ? ', ' + name : ''}!`,
    statusMap,
    recentQuotations: recent.items
  });
});

app.use('/', authRoutes);
app.use('/cotacoes', quotationsRoutes);
app.use('/pecas', partsRoutes);
app.use('/notificacoes', notificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).render('errors/404', { title: 'Página não encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { title: 'Erro interno' });
});

module.exports = app;
