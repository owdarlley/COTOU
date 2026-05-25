const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// POST /auth/login
router.post('/login', async (req, res) => {
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

  req.session.userId   = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;

  req.session.save((err) => {
    if (err) {
      console.error('[Login] Erro ao salvar sessão:', err);
      return res.status(500).json({ ok: false, error: 'Erro interno. Tente novamente.' });
    }
    res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = User.findById(req.session.userId);
  if (!user) return res.status(401).json({ ok: false, error: 'Usuário não encontrado.' });
  res.json({ user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

module.exports = router;
