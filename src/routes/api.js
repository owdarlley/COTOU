const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { lookupPlate } = require('../services/plateService');
const { sendQuoteMessage } = require('../services/whatsappService');
const PartsCatalog = require('../models/PartsCatalog');
const Notification = require('../models/Notification');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');

router.use(requireAuth);

// Consulta placa
router.get('/placa/:plate', async (req, res) => {
  try {
    const data = await lookupPlate(req.params.plate);
    if (!data) return res.json({ ok: false, message: 'Placa não encontrada ou API não configurada.' });
    res.json({ ok: true, data });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

// Autocomplete de peças
router.get('/pecas', (req, res) => {
  const q = req.query.q || '';
  if (q.length < 1) return res.json([]);
  res.json(PartsCatalog.search(q));
});

// Notificações
router.get('/notificacoes', (req, res) => {
  const { items } = Notification.findByUserId(req.session.userId, { limit: 10 });
  res.json(items);
});

router.post('/notificacoes/:id/lida', (req, res) => {
  Notification.markRead(parseInt(req.params.id), req.session.userId);
  const unreadCount = Notification.countUnread(req.session.userId);
  res.json({ ok: true, unreadCount });
});

router.post('/notificacoes/todas-lidas', (req, res) => {
  Notification.markAllRead(req.session.userId);
  res.json({ ok: true });
});

// Envio WhatsApp
router.post('/whatsapp/enviar/:id', async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.json({ ok: false, message: 'Cotação não encontrada.' });
  if (quotation.status !== 'cotado' && quotation.status !== 'peca_chegou') {
    return res.json({ ok: false, message: 'Cotação ainda não foi respondida pelo setor de compras.' });
  }

  const items = QuotationItem.findByQuotationId(quotation.id);
  try {
    await sendQuoteMessage(quotation.customer_phone, quotation, items);
    Quotation.markWhatsappSent(quotation.id, req.session.userId);
    res.json({ ok: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    res.json({ ok: false, message: err.message });
  }
});

module.exports = router;
