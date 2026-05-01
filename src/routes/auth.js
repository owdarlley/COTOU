const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', { title: 'Login — COTOU', layout: false });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('auth/login', { title: 'Login — COTOU', layout: false, error: 'Preencha todos os campos.' });
  }

  const user = User.findByEmail((email || '').trim().toLowerCase());
  if (!user) {
    return res.render('auth/login', { title: 'Login — COTOU', layout: false, error: 'E-mail ou senha inválidos.' });
  }

  const valid = await User.verifyPassword(user, password);
  if (!valid) {
    return res.render('auth/login', { title: 'Login — COTOU', layout: false, error: 'E-mail ou senha inválidos.' });
  }

  req.session.userId   = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;

  const returnTo = req.session.returnTo || '/';
  delete req.session.returnTo;

  req.session.save((err) => {
    if (err) {
      console.error('[Login] Erro ao salvar sessão:', err);
      return res.render('auth/login', { title: 'Login — COTOU', layout: false, error: 'Erro interno. Tente novamente.' });
    }
    res.redirect(returnTo);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
