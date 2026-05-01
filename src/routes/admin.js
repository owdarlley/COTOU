const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

router.use(requireAuth, requireRole('admin'));

router.get('/usuarios', (req, res) => {
  const users = User.findAll();
  res.render('admin/users/index', { title: 'Gestão de Usuários', users });
});

router.get('/usuarios/novo', (req, res) => {
  res.render('admin/users/new', { title: 'Novo Usuário', errors: [] });
});

router.post('/usuarios', async (req, res) => {
  const { name, email, password, role, phone_whatsapp } = req.body;
  if (!name || !email || !password || !role) {
    return res.render('admin/users/new', { title: 'Novo Usuário', errors: ['Preencha todos os campos obrigatórios.'], body: req.body });
  }
  try {
    await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password, role, phone_whatsapp });
    req.session.flash = { success: `Usuário ${name} criado com sucesso.` };
    res.redirect('/admin/usuarios');
  } catch (e) {
    res.render('admin/users/new', { title: 'Novo Usuário', errors: ['E-mail já cadastrado.'], body: req.body });
  }
});

router.get('/usuarios/:id/editar', (req, res) => {
  const user = User.findById(parseInt(req.params.id));
  if (!user) return res.redirect('/admin/usuarios');
  res.render('admin/users/edit', { title: 'Editar Usuário', user, errors: [] });
});

router.post('/usuarios/:id', async (req, res) => {
  const { name, email, role, phone_whatsapp, active, new_password } = req.body;
  User.update(parseInt(req.params.id), { name, email, role, phone_whatsapp, active: active === '1' ? 1 : 0 });
  if (new_password) await User.updatePassword(parseInt(req.params.id), new_password);
  req.session.flash = { success: 'Usuário atualizado.' };
  res.redirect('/admin/usuarios');
});

router.post('/usuarios/:id/desativar', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) {
    req.session.flash = { error: 'Você não pode desativar seu próprio usuário.' };
    return res.redirect('/admin/usuarios');
  }
  User.deactivate(id);
  req.session.flash = { success: 'Usuário desativado.' };
  res.redirect('/admin/usuarios');
});

module.exports = router;
