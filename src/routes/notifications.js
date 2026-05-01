const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(requireAuth);

router.get('/', (req, res) => {
  const { page = 1 } = req.query;
  const result = Notification.findByUserId(req.session.userId, { page: parseInt(page) });
  res.render('notifications/index', { title: 'Notificações', ...result });
});

router.post('/todas-lidas', (req, res) => {
  Notification.markAllRead(req.session.userId);
  req.session.flash = { success: 'Todas as notificações marcadas como lidas.' };
  res.redirect('/notificacoes');
});

module.exports = router;
