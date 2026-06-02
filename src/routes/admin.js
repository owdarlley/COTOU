const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { createInstance } = require('../services/whatsappService');

router.use(requireAuth, requireRole('admin'));

// GET /admin/usuarios — lista usuários
router.get('/usuarios', (req, res) => {
  const users = User.findAll();
  res.json({ ok: true, users });
});

// POST /admin/usuarios — criar usuário
router.post('/usuarios', async (req, res) => {
  const { name, email, password, role, phone_whatsapp } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ ok: false, error: 'Preencha todos os campos obrigatórios.' });
  }
  if (!['vendas', 'compras', 'admin'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'Role inválida. Use: vendas, compras ou admin.' });
  }
  try {
    const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password, role, phone_whatsapp });
    const instanceName = `cotou-user-${user.id}`;
    try {
      await createInstance(instanceName);
      User.setWhatsappInstance(user.id, instanceName);
    } catch (waErr) {
      console.warn(`[WhatsApp] Falha ao criar instância para usuário ${user.id}:`, waErr.message);
    }
    res.status(201).json({ ok: true, user: { id: user.id, name: user.name, role: user.role, whatsapp_instance_name: instanceName } });
  } catch (e) {
    res.status(409).json({ ok: false, error: 'E-mail já cadastrado.' });
  }
});

// GET /admin/usuarios/:id — detalhe do usuário
router.get('/usuarios/:id', (req, res) => {
  const user = User.findById(parseInt(req.params.id));
  if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
  res.json({ ok: true, user });
});

// PUT /admin/usuarios/:id — atualizar usuário
router.put('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, role, phone_whatsapp, active, new_password } = req.body;
  const user = User.findById(id);
  if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
  User.update(id, { name, email, role, phone_whatsapp, active: active !== undefined ? (active ? 1 : 0) : user.active });
  if (new_password) await User.updatePassword(id, new_password);
  res.json({ ok: true });
});

// POST /admin/usuarios/:id/desativar — desativar usuário
router.post('/usuarios/:id/desativar', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) {
    return res.status(400).json({ ok: false, error: 'Você não pode desativar seu próprio usuário.' });
  }
  User.deactivate(id);
  res.json({ ok: true });
});

// POST /admin/usuarios/:id/ativar — reativar usuário
router.post('/usuarios/:id/ativar', (req, res) => {
  User.update(parseInt(req.params.id), { active: 1 });
  res.json({ ok: true });
});

// POST /admin/usuarios/:id/senha — redefinir senha
router.post('/usuarios/:id/senha', async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Senha deve ter pelo menos 6 caracteres.' });
  }
  await User.updatePassword(parseInt(req.params.id), new_password);
  res.json({ ok: true });
});

// GET /admin/settings
router.get('/settings', (req, res) => {
  res.json({ ok: true, whatsapp_template: Settings.get('whatsapp_template', '') });
});

// PUT /admin/settings
router.put('/settings', (req, res) => {
  const { whatsapp_template } = req.body;
  if (typeof whatsapp_template !== 'string') return res.status(400).json({ ok: false, error: 'Valor inválido.' });
  Settings.set('whatsapp_template', whatsapp_template);
  res.json({ ok: true });
});

module.exports = router;
