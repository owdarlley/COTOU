const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { rateLimit } = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth');
const { db } = require('../config/database');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const PartsCatalog = require('../models/PartsCatalog');
const AuditLog = require('../models/AuditLog');
const { generateQuoteNumber } = require('../services/quoteNumberService');
const { notifyUser, notifyAllByRole } = require('../services/notificationService');

router.use(requireAuth);

const createQuotationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Muitas cotações criadas. Aguarde um momento.' },
});

const ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function detectImageType(buffer) {
  if (buffer.length < 8) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp';
  return null;
}

// GET /cotacoes — lista de cotações (query: status, page)
router.get('/', (req, res) => {
  const { status = 'todos', page = 1, limit = 15 } = req.query;
  const result = Quotation.findAll({
    status,
    userId: req.session.userId,
    role: req.session.userRole,
    page: parseInt(page),
    limit: Math.min(parseInt(limit) || 15, 500),
  });
  res.json({ ok: true, ...result, currentStatus: status });
});

// POST /cotacoes — criar cotação (vendas/admin)
router.post('/', requireRole('vendas', 'admin'), createQuotationLimiter, async (req, res) => {
  const {
    customer_name, customer_phone,
    vehicle_plate, vehicle_model, vehicle_year_model,
    vehicle_year_manuf, vehicle_chassis,
    notes_vendas,
    part_names = [], part_codes = [], quantities = []
  } = req.body;

  if (!customer_name || !customer_phone || !vehicle_plate) {
    return res.status(400).json({
      ok: false,
      error: 'Preencha os campos obrigatórios: cliente, telefone e placa.'
    });
  }

  const itemNames = Array.isArray(part_names) ? part_names : [part_names];
  const itemCodes = Array.isArray(part_codes) ? part_codes : [part_codes];
  const itemQtds  = Array.isArray(quantities) ? quantities : [quantities];

  const validItems = itemNames.filter(n => n && n.trim());
  if (validItems.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Adicione pelo menos uma peça à cotação.'
    });
  }

  // Valida e processa foto antes de abrir a transação
  let photoPath = null;
  let photoFilePath = null;
  const photoBase64 = req.body.photo_base64;
  if (photoBase64 && photoBase64.startsWith('data:image')) {
    const matches = photoBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const declaredExt = matches[1].toLowerCase();
      let buffer;
      try {
        buffer = Buffer.from(matches[2], 'base64');
      } catch {
        return res.status(400).json({ ok: false, error: 'Dados da imagem inválidos.' });
      }
      if (buffer.length > MAX_PHOTO_BYTES) {
        return res.status(400).json({ ok: false, error: 'Imagem muito grande. Máximo 5MB.' });
      }
      const detectedType = detectImageType(buffer);
      if (!detectedType) {
        return res.status(400).json({ ok: false, error: 'Tipo de imagem não suportado. Use JPEG, PNG ou WebP.' });
      }
      if (!ALLOWED_IMAGE_TYPES.includes(declaredExt)) {
        return res.status(400).json({ ok: false, error: 'Extensão de imagem não permitida.' });
      }
      const quoteNumber = generateQuoteNumber();
      const uploadDir = path.join(__dirname, '../../public/uploads/quotations');
      try {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filename = `${quoteNumber}.${detectedType}`;
        photoFilePath = path.join(uploadDir, filename);
        fs.writeFileSync(photoFilePath, buffer);
        photoPath = `/uploads/quotations/${filename}`;
      } catch (ioErr) {
        console.error('[Quotation] Falha ao salvar foto:', ioErr.message);
        return res.status(500).json({ ok: false, error: 'Falha ao processar imagem. Tente novamente.' });
      }
    }
  }

  const quoteNumber = generateQuoteNumber();
  let quotationId;

  try {
    db.exec('BEGIN IMMEDIATE');

    const customer = Customer.findOrCreate({ name: customer_name.trim(), phone: customer_phone.trim() });
    const vehicleId = Vehicle.upsert({
      license_plate: vehicle_plate,
      make: '', model: vehicle_model || '',
      year_model: parseInt(vehicle_year_model) || null,
      year_manuf: parseInt(vehicle_year_manuf) || null,
      color: '', fuel: '', chassis: vehicle_chassis || '',
      plate_data_json: null
    });

    quotationId = Quotation.create({
      quoteNumber,
      customerId: customer.id,
      vehicleId,
      createdByUserId: req.session.userId,
      notesVendas: notes_vendas || null,
      photoPath
    });

    for (let i = 0; i < itemNames.length; i++) {
      if (!itemNames[i] || !itemNames[i].trim()) continue;
      const code = itemCodes[i] ? itemCodes[i].trim() : null;
      const catalog = code ? PartsCatalog.findByCode(code) : null;
      const qty = parseInt(itemQtds[i]);
      QuotationItem.create({
        quotationId,
        partName: itemNames[i].trim(),
        partCode: code,
        partCatalogId: catalog ? catalog.id : null,
        quantity: (qty && qty > 0) ? qty : 1,
        laborCostVendas: 0
      });
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (photoFilePath) {
      try { fs.unlinkSync(photoFilePath); } catch {}
    }
    console.error('[Quotation] Falha ao criar cotação:', err.message);
    return res.status(500).json({ ok: false, error: 'Erro ao salvar cotação. Tente novamente.' });
  }

  AuditLog.insert({
    userId: req.session.userId,
    quotationId,
    action: 'created',
    newValue: { quoteNumber, customer_name, vehicle_plate },
    ip: req.ip,
  });

  try {
    const quotation = Quotation.findById(quotationId);
    const notifNova = {
      quotationId,
      type: 'nova_cotacao',
      title: `Nova cotação #${quoteNumber}`,
      message: `${quotation?.creator_name || req.session.userName} abriu cotação para ${customer_name} — ${vehicle_model || ''} ${vehicle_plate}`
    };
    await notifyAllByRole('compras', notifNova);
    await notifyAllByRole('admin', notifNova);
  } catch (notifErr) {
    console.error('[Quotation] Falha ao notificar:', notifErr.message);
  }

  res.status(201).json({ ok: true, quotationId, quoteNumber });
});

// GET /cotacoes/:id — detalhe da cotação
router.get('/:id', (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  // Vendas só acessam suas próprias cotações; compras/admin veem tudo
  if (req.session.userRole === 'vendas' && quotation.created_by_user_id !== req.session.userId) {
    return res.status(403).json({ ok: false, error: 'Acesso negado.' });
  }

  const items = QuotationItem.findByQuotationId(quotation.id);
  const partsTotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
  const laborTotal = items.reduce((s, i) => s + (i.labor_cost_compras || i.labor_cost_vendas || 0), 0);

  res.json({
    ok: true,
    quotation,
    items,
    partsTotal,
    laborTotal,
    grandTotal: partsTotal + laborTotal
  });
});

// POST /cotacoes/:id/status — mudar status (compras/admin)
router.post('/:id/status', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const { status } = req.body;
  const allowed = ['em_cotacao', 'cancelado'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Status inválido.' });
  }

  Quotation.updateStatus(quotation.id, status, req.session.userId);

  AuditLog.insert({
    userId: req.session.userId,
    quotationId: quotation.id,
    action: 'status_changed',
    oldValue: { status: quotation.status },
    newValue: { status },
    ip: req.ip,
  });

  try {
    const notifStatus = {
      quotationId: quotation.id,
      type: 'status_atualizado',
      title: `Cotação #${quotation.quote_number} atualizada`,
      message: `Status alterado para "${status === 'em_cotacao' ? 'Em cotação' : 'Cancelado'}" por ${req.session.userName}`
    };
    await notifyUser(quotation.created_by_user_id, notifStatus);
    await notifyAllByRole('admin', notifStatus);
  } catch (notifErr) {
    console.error('[Quotation] Falha ao notificar:', notifErr.message);
  }

  res.json({ ok: true, status });
});

// POST /cotacoes/:id/responder — compras preenche valores
router.post('/:id/responder', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const {
    notes_compras,
    item_ids = [], unit_prices = [], total_prices = [],
    labor_costs_compras = [], delivery_days = [], delivery_deadlines = [],
    supplier_names = [], item_notes = []
  } = req.body;

  const ids       = Array.isArray(item_ids) ? item_ids : [item_ids];
  const uPrices   = Array.isArray(unit_prices) ? unit_prices : [unit_prices];
  const tPrices   = Array.isArray(total_prices) ? total_prices : [total_prices];
  const labors    = Array.isArray(labor_costs_compras) ? labor_costs_compras : [labor_costs_compras];
  const days      = Array.isArray(delivery_days) ? delivery_days : [delivery_days];
  const deadlines = Array.isArray(delivery_deadlines) ? delivery_deadlines : [delivery_deadlines];
  const suppliers = Array.isArray(supplier_names) ? supplier_names : [supplier_names];
  const notes     = Array.isArray(item_notes) ? item_notes : [item_notes];

  try {
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i]) continue;
      const unitPrice = parseFloat(uPrices[i]);
      const totalPrice = parseFloat(tPrices[i]);
      const labor = parseFloat(labors[i]);
      const dDays = parseInt(days[i]);
      QuotationItem.updatePrices(parseInt(ids[i]), {
        unitPrice: (!isNaN(unitPrice) && unitPrice >= 0) ? unitPrice : null,
        totalPrice: (!isNaN(totalPrice) && totalPrice >= 0) ? totalPrice : null,
        laborCostCompras: (!isNaN(labor) && labor >= 0) ? labor : 0,
        deliveryDays: (!isNaN(dDays) && dDays > 0) ? dDays : null,
        deliveryDeadline: deadlines[i] || null,
        supplierName: suppliers[i] || null,
        notes: notes[i] || null
      });
    }

    Quotation.respond(quotation.id, { buyerId: req.session.userId, notesCompras: notes_compras });
  } catch (err) {
    console.error('[Quotation] Falha ao registrar resposta:', err.message);
    return res.status(500).json({ ok: false, error: 'Erro ao salvar resposta. Tente novamente.' });
  }

  AuditLog.insert({
    userId: req.session.userId,
    quotationId: quotation.id,
    action: 'prices_filled',
    ip: req.ip,
  });

  try {
    const notifRespondida = {
      quotationId: quotation.id,
      type: 'cotacao_respondida',
      title: `Cotação #${quotation.quote_number} respondida!`,
      message: `O setor de compras (${req.session.userName}) preencheu os valores. Verifique e envie ao cliente.`
    };
    await notifyUser(quotation.created_by_user_id, notifRespondida);
    await notifyAllByRole('admin', notifRespondida);
  } catch (notifErr) {
    console.error('[Quotation] Falha ao notificar:', notifErr.message);
  }

  res.json({ ok: true });
});

// POST /cotacoes/:id/resposta-cliente — vendas registra resposta do cliente
router.post('/:id/resposta-cliente', requireRole('vendas', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const approved = req.body.approved === '1' || req.body.approved === true || req.body.approved === 1;
  Quotation.setCustomerApproval(quotation.id, approved, 'manual');

  AuditLog.insert({
    userId: req.session.userId,
    quotationId: quotation.id,
    action: approved ? 'customer_approved_manual' : 'customer_rejected_manual',
    ip: req.ip,
  });

  const verb = approved ? 'APROVOU' : 'RECUSOU';
  try {
    const notifResposta = {
      quotationId: quotation.id,
      type: 'cotacao_atualizada',
      title: `Cliente ${verb} — Cotação #${quotation.quote_number}`,
      message: approved
        ? `${req.session.userName} informou que o cliente aprovou. Pode encomendar!`
        : `${req.session.userName} informou que o cliente recusou a cotação.`
    };
    await notifyAllByRole('compras', notifResposta);
    await notifyAllByRole('admin', notifResposta);
  } catch (notifErr) {
    console.error('[Quotation] Falha ao notificar:', notifErr.message);
  }

  res.json({ ok: true, approved });
});

// POST /cotacoes/:id/peca-chegou — marcar chegada da peça (compras/admin)
router.post('/:id/peca-chegou', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const { item_id } = req.body;
  if (item_id) {
    QuotationItem.markArrived(parseInt(item_id));
  } else {
    const items = QuotationItem.findByQuotationId(quotation.id);
    items.forEach(item => QuotationItem.markArrived(item.id));
    Quotation.markPartArrived(quotation.id);
  }

  AuditLog.insert({
    userId: req.session.userId,
    quotationId: quotation.id,
    action: 'part_arrived',
    newValue: item_id ? { item_id } : { all: true },
    ip: req.ip,
  });

  try {
    const notifPeca = {
      quotationId: quotation.id,
      type: 'peca_chegou',
      title: `Peça chegou — Cotação #${quotation.quote_number}`,
      message: `O comprador ${req.session.userName} confirmou a chegada da peça. Avise o cliente!`
    };
    await notifyUser(quotation.created_by_user_id, notifPeca);
    await notifyAllByRole('admin', notifPeca);
  } catch (notifErr) {
    console.error('[Quotation] Falha ao notificar:', notifErr.message);
  }

  res.json({ ok: true });
});

// GET /api/cotacoes/:id/audit-log — histórico de auditoria da cotação
router.get('/:id/audit-log', (req, res) => {
  const id = parseInt(req.params.id);
  const qt = Quotation.findById(id);
  if (!qt) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const { userRole, userId } = req.session;
  const hasAccess = userRole === 'admin' || userRole === 'compras' ||
    qt.created_by_user_id === userId || qt.assigned_buyer_id === userId;
  if (!hasAccess) return res.status(403).json({ ok: false, error: 'Acesso negado.' });

  const logs = AuditLog.findByQuotationId(id);
  res.json({ ok: true, logs });
});

module.exports = router;
