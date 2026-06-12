const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req),
  message: { ok: false, error: 'Muitas tentativas. Aguarde 15 minutos.' },
});

// POST /auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Preencha todos os campos.' });
  }

  const user = User.findByEmail((email || '').trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ ok: false, error: 'E-mail ou senha inválidos.' });
  }

  const valid = await User.verifyPassword(user, password);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'E-mail ou senha inválidos.' });
  }

  req.session.userId         = user.id;
  req.session.userRole       = user.role;
  req.session.userName       = user.name;
  req.session.organizationId = user.organization_id ?? 1;
  req.session.csrfToken      = crypto.randomBytes(32).toString('hex');

  req.session.save((err) => {
    if (err) {
      console.error('[Login] Erro ao salvar sessão:', err);
      return res.status(500).json({ ok: false, error: 'Erro interno. Tente novamente.' });
    }
    res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role }, csrfToken: req.session.csrfToken });
  });
});

// GET /auth/users — lista pública de usuários ativos (para tela de login)
// Retorna id, name e email para o acesso rápido da tela de login — role não exposta
router.get('/users', (req, res) => {
  const users = User.findAll()
    .filter(u => u.active)
    .map(u => ({ id: u.id, name: u.name, email: u.email }));
  res.json({ ok: true, users });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /auth/csrf — retorna (ou gera) token CSRF da sessão atual
router.get('/csrf', requireAuth, (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.json({ ok: true, csrfToken: req.session.csrfToken });
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = User.findById(req.session.userId);
  if (!user) return res.status(401).json({ ok: false, error: 'Usuário não encontrado.' });
  res.json({ user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

module.exports = router;
