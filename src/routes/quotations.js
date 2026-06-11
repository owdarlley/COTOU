const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../middleware/auth');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const PartsCatalog = require('../models/PartsCatalog');
const { generateQuoteNumber } = require('../services/quoteNumberService');
const { notifyUser, notifyAllByRole } = require('../services/notificationService');

router.use(requireAuth);

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
router.post('/', requireRole('vendas', 'admin'), async (req, res) => {
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

  const customer = Customer.findOrCreate({ name: customer_name.trim(), phone: customer_phone.trim() });
  const vehicleId = Vehicle.upsert({
    license_plate: vehicle_plate,
    make: '', model: vehicle_model || '',
    year_model: parseInt(vehicle_year_model) || null,
    year_manuf: parseInt(vehicle_year_manuf) || null,
    color: '', fuel: '', chassis: vehicle_chassis || '',
    plate_data_json: null
  });

  const quoteNumber = generateQuoteNumber();

  let photoPath = null;
  const photoBase64 = req.body.photo_base64;
  if (photoBase64 && photoBase64.startsWith('data:image')) {
    const matches = photoBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1];
      const data = Buffer.from(matches[2], 'base64');
      const uploadDir = path.join(__dirname, '../../public/uploads/quotations');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filename = `${quoteNumber}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, filename), data);
      photoPath = `/uploads/quotations/${filename}`;
    }
  }

  const quotationId = Quotation.create({
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
    QuotationItem.create({
      quotationId,
      partName: itemNames[i].trim(),
      partCode: code,
      partCatalogId: catalog ? catalog.id : null,
      quantity: parseInt(itemQtds[i]) || 1,
      laborCostVendas: 0
    });
  }

  const quotation = Quotation.findById(quotationId);
  await notifyAllByRole('compras', {
    quotationId,
    type: 'nova_cotacao',
    title: `Nova cotação #${quoteNumber}`,
    message: `${quotation.creator_name} abriu cotação para ${customer_name} — ${vehicle_model || ''} ${vehicle_plate}`
  });

  res.status(201).json({ ok: true, quotationId, quoteNumber });
});

// GET /cotacoes/:id — detalhe da cotação
router.get('/:id', (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

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

  await notifyUser(quotation.created_by_user_id, {
    quotationId: quotation.id,
    type: 'status_atualizado',
    title: `Cotação #${quotation.quote_number} atualizada`,
    message: `Status alterado para "${status === 'em_cotacao' ? 'Em cotação' : 'Cancelado'}" por ${req.session.userName}`
  });

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

  const ids      = Array.isArray(item_ids) ? item_ids : [item_ids];
  const uPrices  = Array.isArray(unit_prices) ? unit_prices : [unit_prices];
  const tPrices  = Array.isArray(total_prices) ? total_prices : [total_prices];
  const labors   = Array.isArray(labor_costs_compras) ? labor_costs_compras : [labor_costs_compras];
  const days     = Array.isArray(delivery_days) ? delivery_days : [delivery_days];
  const deadlines = Array.isArray(delivery_deadlines) ? delivery_deadlines : [delivery_deadlines];
  const suppliers = Array.isArray(supplier_names) ? supplier_names : [supplier_names];
  const notes    = Array.isArray(item_notes) ? item_notes : [item_notes];

  for (let i = 0; i < ids.length; i++) {
    if (!ids[i]) continue;
    QuotationItem.updatePrices(parseInt(ids[i]), {
      unitPrice: parseFloat(uPrices[i]) || null,
      totalPrice: parseFloat(tPrices[i]) || null,
      laborCostCompras: parseFloat(labors[i]) || 0,
      deliveryDays: parseInt(days[i]) || null,
      deliveryDeadline: deadlines[i] || null,
      supplierName: suppliers[i] || null,
      notes: notes[i] || null
    });
  }

  Quotation.respond(quotation.id, { buyerId: req.session.userId, notesCompras: notes_compras });

  await notifyUser(quotation.created_by_user_id, {
    quotationId: quotation.id,
    type: 'cotacao_respondida',
    title: `Cotação #${quotation.quote_number} respondida!`,
    message: `O setor de compras (${req.session.userName}) preencheu os valores. Verifique e envie ao cliente.`
  });

  res.json({ ok: true });
});

// POST /cotacoes/:id/resposta-cliente — vendas registra resposta do cliente
router.post('/:id/resposta-cliente', requireRole('vendas', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false, error: 'Cotação não encontrada.' });

  const approved = req.body.approved === '1' || req.body.approved === true || req.body.approved === 1;
  Quotation.setCustomerApproval(quotation.id, approved, 'manual');

  const verb = approved ? 'APROVOU' : 'RECUSOU';
  await notifyAllByRole('compras', {
    quotationId: quotation.id,
    type: 'cotacao_atualizada',
    title: `Cliente ${verb} — Cotação #${quotation.quote_number}`,
    message: approved
      ? `${req.session.userName} informou que o cliente aprovou. Pode encomendar!`
      : `${req.session.userName} informou que o cliente recusou a cotação.`
  });

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

  await notifyUser(quotation.created_by_user_id, {
    quotationId: quotation.id,
    type: 'peca_chegou',
    title: `Peça chegou — Cotação #${quotation.quote_number}`,
    message: `O comprador ${req.session.userName} confirmou a chegada da peça. Avise o cliente!`
  });

  res.json({ ok: true });
});

module.exports = router;
