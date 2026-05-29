const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { lookupPlate, getBalance, isValidPlate } = require('../services/plateService');
const { sendQuoteMessage, createInstance, getQRCode, getStatus, deleteInstance } = require('../services/whatsappService');
const User = require('../models/User');
const PartsCatalog = require('../models/PartsCatalog');
const Notification = require('../models/Notification');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');

router.use(requireAuth);

// Consulta placa
router.get('/placa/:plate', async (req, res) => {
  if (!isValidPlate(req.params.plate)) {
    return res.status(400).json({ ok: false, code: 'INVALID_FORMAT', message: 'Formato de placa inválido. Use AAA9999 ou AAA0X00.' });
  }
  const token = process.env.PLATE_API_TOKEN || process.env.APIPLACAS_TOKEN;
  if (!token) {
    return res.status(503).json({ ok: false, code: 'NO_TOKEN', message: 'Token da API de placa não configurado no .env' });
  }
  try {
    const data = await lookupPlate(req.params.plate);
    if (!data) return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Placa não encontrada ou sem dados disponíveis.' });
    res.json({ ok: true, data });
  } catch (err) {
    const status = err.code === 'RATE_LIMIT' ? 429 : err.code === 'INVALID_TOKEN' ? 502 : 404;
    res.status(status).json({ ok: false, code: err.code || 'ERROR', message: err.message });
  }
});

// Saldo de consultas (somente admin)
router.get('/saldo', requireRole('admin'), async (req, res) => {
  const balance = await getBalance();
  if (!balance) return res.status(503).json({ ok: false, message: 'Não foi possível consultar o saldo.' });
  res.json({ ok: true, data: balance });
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

// WhatsApp — gerenciamento de instância por usuário
router.post('/whatsapp/instancia/criar', async (req, res) => {
  const instanceName = `cotou-user-${req.session.userId}`;
  try {
    await createInstance(instanceName);
    User.setWhatsappInstance(req.session.userId, instanceName);
    res.json({ ok: true, instanceName });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

router.get('/whatsapp/instancia/qrcode', async (req, res) => {
  const user = User.findById(req.session.userId);
  if (!user?.whatsapp_instance_name) return res.status(400).json({ ok: false, message: 'Instância não criada. Chame /criar primeiro.' });
  try {
    const data = await getQRCode(user.whatsapp_instance_name);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

router.get('/whatsapp/instancia/status', async (req, res) => {
  const user = User.findById(req.session.userId);
  if (!user?.whatsapp_instance_name) return res.json({ ok: true, connected: false });
  try {
    const status = await getStatus(user.whatsapp_instance_name);
    res.json({ ok: true, ...status });
  } catch (err) {
    res.json({ ok: true, connected: false });
  }
});

router.delete('/whatsapp/instancia/desconectar', async (req, res) => {
  const user = User.findById(req.session.userId);
  if (user?.whatsapp_instance_name) {
    try { await deleteInstance(user.whatsapp_instance_name); } catch (_) {}
    User.clearWhatsappInstance(req.session.userId);
  }
  res.json({ ok: true });
});

// Envio WhatsApp
router.post('/whatsapp/enviar/:id', async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.json({ ok: false, message: 'Cotação não encontrada.' });
  if (quotation.status !== 'cotado' && quotation.status !== 'peca_chegou') {
    return res.json({ ok: false, message: 'Cotação ainda não foi respondida pelo setor de compras.' });
  }

  const user = User.findById(req.session.userId);
  const items = QuotationItem.findByQuotationId(quotation.id);
  try {
    const approvalToken = Quotation.generateApprovalToken(quotation.id);
    await sendQuoteMessage(quotation.customer_phone, quotation, items, user?.whatsapp_instance_name || null, approvalToken);
    Quotation.markWhatsappSent(quotation.id, req.session.userId);
    res.json({ ok: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

// Clientes
router.get('/customers',        (req, res) => res.json({ ok: true, data: Customer.findAll() }));
router.get('/customers/search', (req, res) => res.json(Customer.search(req.query.q || '')));
router.put('/customers/:id',    requireRole('admin', 'vendas'), (req, res) => {
  if (!req.body?.name) return res.status(400).json({ ok: false, message: 'Nome é obrigatório.' });
  Customer.update(parseInt(req.params.id, 10), req.body);
  res.json({ ok: true });
});

// Fornecedores
router.get('/suppliers',        (req, res) => res.json({ ok: true, data: Supplier.findAll() }));
router.post('/suppliers',       requireRole('admin', 'compras'), (req, res) => {
  if (!req.body?.name) return res.status(400).json({ ok: false, message: 'Nome é obrigatório.' });
  const r = Supplier.create(req.body);
  res.json({ ok: true, id: r.lastInsertRowid });
});
router.put('/suppliers/:id',    requireRole('admin', 'compras'), (req, res) => {
  if (!req.body?.name) return res.status(400).json({ ok: false, message: 'Nome é obrigatório.' });
  Supplier.update(parseInt(req.params.id, 10), req.body);
  res.json({ ok: true });
});
router.delete('/suppliers/:id', requireRole('admin', 'compras'), (req, res) => {
  Supplier.remove(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

module.exports = router;
