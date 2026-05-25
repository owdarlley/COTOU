const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(requireAuth);

function addTimeLabel(n) {
  if (!n.created_at) return n;
  const diff = Date.now() - new Date(n.created_at).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let time_label;
  if (mins < 1) time_label = 'agora há pouco';
  else if (mins < 60) time_label = `${mins} min atrás`;
  else if (hours < 24) time_label = `${hours}h atrás`;
  else if (days === 1) time_label = 'ontem';
  else time_label = `${days} dias atrás`;
  return { ...n, time_label };
}

// GET /notificacoes — lista de notificações do usuário (query: page)
router.get('/', (req, res) => {
  const { page = 1 } = req.query;
  const result = Notification.findByUserId(req.session.userId, { page: parseInt(page) });
  const notifications = result.items.map(addTimeLabel);
  res.json({ ok: true, ...result, items: notifications });
});

// POST /notificacoes/marcar-todas — marcar todas como lidas
router.post('/marcar-todas', (req, res) => {
  Notification.markAllRead(req.session.userId);
  res.json({ ok: true });
});

// POST /notificacoes/todas-lidas — alias para compatibilidade
router.post('/todas-lidas', (req, res) => {
  Notification.markAllRead(req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
