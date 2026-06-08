const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { lookupPlate, getBalance, isValidPlate } = require('../services/plateService');
const { sendQuoteMessage, sendTextMessage, createInstance, getQRCode, getStatus, deleteInstance } = require('../services/whatsappService');
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
// Admin pode passar targetUserId no body para gerenciar instância de outro usuário
function resolveTargetUserId(req) {
  const isAdmin = req.session.userRole === 'admin';
  const targetId = req.body?.targetUserId || req.query?.targetUserId;
  return (isAdmin && targetId) ? Number(targetId) : req.session.userId;
}

router.post('/whatsapp/instancia/criar', async (req, res) => {
  const targetId = resolveTargetUserId(req);
  const instanceName = `cotou-user-${targetId}`;
  try {
    await createInstance(instanceName);
    User.setWhatsappInstance(targetId, instanceName);
    res.json({ ok: true, instanceName });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

router.get('/whatsapp/instancia/qrcode', async (req, res) => {
  const targetId = resolveTargetUserId(req);
  const user = User.findById(targetId);
  if (!user?.whatsapp_instance_name) return res.status(400).json({ ok: false, message: 'Instância não criada. Chame /criar primeiro.' });
  try {
    const data = await getQRCode(user.whatsapp_instance_name);
    // Evolution API retorna state:open (sem QR) quando a instância já está conectada
    if (data?.instance?.state === 'open') {
      return res.json({ ok: true, already_connected: true, data });
    }
    res.json({ ok: true, data });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

router.get('/whatsapp/instancia/status', async (req, res) => {
  const targetId = resolveTargetUserId(req);
  const user = User.findById(targetId);
  if (!user?.whatsapp_instance_name) return res.json({ ok: true, connected: false });
  try {
    const status = await getStatus(user.whatsapp_instance_name);
    res.json({ ok: true, ...status });
  } catch (err) {
    res.json({ ok: true, connected: false });
  }
});

router.delete('/whatsapp/instancia/desconectar', async (req, res) => {
  const targetId = resolveTargetUserId(req);
  const user = User.findById(targetId);
  if (user?.whatsapp_instance_name) {
    try { await deleteInstance(user.whatsapp_instance_name); } catch (_) {}
    User.clearWhatsappInstance(targetId);
  }
  res.json({ ok: true });
});

// Consulta de preço para fornecedor (sem exigir valores preenchidos)
router.post('/whatsapp/consultar-fornecedor', async (req, res) => {
  const { supplierPhone, message } = req.body;
  if (!supplierPhone || !message) {
    return res.status(400).json({ ok: false, message: 'supplierPhone e message são obrigatórios.' });
  }
  const user = User.findById(req.session.userId);
  if (!user?.whatsapp_instance_name) {
    return res.status(400).json({ ok: false, message: 'Instância WhatsApp não configurada. Conecte seu WhatsApp primeiro.' });
  }
  try {
    await sendTextMessage(supplierPhone, message, user.whatsapp_instance_name);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

// Envio WhatsApp
router.post('/whatsapp/enviar/:id', async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.json({ ok: false, message: 'Cotação não encontrada.' });
  if (quotation.status !== 'cotado' && quotation.status !== 'peca_chegou') {
    return res.json({ ok: false, message: 'Cotação ainda não foi respondida pelo setor de compras.' });
  }

  const user = User.findById(req.session.userId);
  const instanceName = user?.whatsapp_instance_name || null;

  if (!instanceName) {
    return res.status(400).json({ ok: false, message: 'WhatsApp não configurado. Conecte seu WhatsApp nas configurações antes de enviar.' });
  }

  // Verifica conexão antes de tentar enviar
  try {
    const status = await getStatus(instanceName);
    if (!status.connected) {
      return res.status(400).json({ ok: false, message: 'WhatsApp desconectado. Reconecte sua instância nas configurações antes de enviar.' });
    }
  } catch (_) {
    return res.status(400).json({ ok: false, message: 'Não foi possível verificar a conexão do WhatsApp. Verifique sua instância nas configurações.' });
  }

  const items = QuotationItem.findByQuotationId(quotation.id);
  try {
    const approvalToken = Quotation.generateApprovalToken(quotation.id);
    await sendQuoteMessage(quotation.customer_phone, quotation, items, instanceName, approvalToken);
    Quotation.markWhatsappSent(quotation.id, req.session.userId);
    res.json({ ok: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    const isConnectionClosed = JSON.stringify(err.evolutionBody || '').includes('Connection Closed');
    if (isConnectionClosed) {
      return res.status(400).json({ ok: false, code: 'CONNECTION_CLOSED', message: 'Sessão WhatsApp encerrada. Desconecte e reconecte seu WhatsApp nas configurações.' });
    }
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
