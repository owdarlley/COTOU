const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const PartsCatalog = require('../models/PartsCatalog');
const { generateQuoteNumber } = require('../services/quoteNumberService');
const { notifyUser, notifyAllByRole } = require('../services/notificationService');

router.use(requireAuth);

// Lista de cotações
router.get('/', (req, res) => {
  const { status = 'todos', page = 1 } = req.query;
  const result = Quotation.findAll({
    status,
    userId: req.session.userId,
    role: req.session.userRole,
    page: parseInt(page),
    limit: 15
  });
  res.render('quotations/index', {
    title: 'Cotações',
    topbarSubtitle: 'Gerencie todas as solicitações',
    ...result,
    currentStatus: status
  });
});

// Formulário nova cotação (apenas vendas)
router.get('/nova', requireRole('vendas', 'admin'), (req, res) => {
  res.render('quotations/new', { title: 'Nova Cotação', errors: [] });
});

// Criar cotação
router.post('/', requireRole('vendas', 'admin'), async (req, res) => {
  const {
    customer_name, customer_phone,
    vehicle_plate, vehicle_make, vehicle_model, vehicle_year_model,
    vehicle_year_manuf, vehicle_color, vehicle_fuel, vehicle_chassis,
    notes_vendas,
    parts = [], part_names = [], part_codes = [], quantities = [],
    labor_costs = []
  } = req.body;

  if (!customer_name || !customer_phone || !vehicle_plate) {
    return res.render('quotations/new', {
      title: 'Nova Cotação',
      errors: ['Preencha os campos obrigatórios: cliente, telefone e placa.'],
      body: req.body
    });
  }

  const itemNames = Array.isArray(part_names) ? part_names : [part_names];
  const itemCodes = Array.isArray(part_codes) ? part_codes : [part_codes];
  const itemQtds  = Array.isArray(quantities) ? quantities : [quantities];
  const itemLabors = Array.isArray(labor_costs) ? labor_costs : [labor_costs];

  const validItems = itemNames.filter(n => n && n.trim());
  if (validItems.length === 0) {
    return res.render('quotations/new', {
      title: 'Nova Cotação',
      errors: ['Adicione pelo menos uma peça à cotação.'],
      body: req.body
    });
  }

  const customer = Customer.findOrCreate({ name: customer_name.trim(), phone: customer_phone.trim() });
  const vehicleId = Vehicle.upsert({
    license_plate: vehicle_plate,
    make: vehicle_make || '', model: vehicle_model || '',
    year_model: parseInt(vehicle_year_model) || null,
    year_manuf: parseInt(vehicle_year_manuf) || null,
    color: vehicle_color || '', fuel: vehicle_fuel || '', chassis: vehicle_chassis || '',
    plate_data_json: null
  });

  const quoteNumber = generateQuoteNumber();
  const quotationId = Quotation.create({
    quoteNumber,
    customerId: customer.id,
    vehicleId,
    createdByUserId: req.session.userId,
    notesVendas: notes_vendas || null
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
      laborCostVendas: parseFloat(itemLabors[i]) || 0
    });
  }

  const quotation = Quotation.findById(quotationId);
  await notifyAllByRole('compras', {
    quotationId,
    type: 'nova_cotacao',
    title: `Nova cotação #${quoteNumber}`,
    message: `${quotation.creator_name} abriu cotação para ${customer_name} — ${vehicle_make || ''} ${vehicle_model || ''} ${vehicle_plate}`
  });

  req.session.flash = { success: `Cotação #${quoteNumber} criada com sucesso!` };
  res.redirect(`/cotacoes/${quotationId}`);
});

// Detalhe da cotação
router.get('/:id', (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).render('errors/404', { title: 'Não encontrado' });

  const items = QuotationItem.findByQuotationId(quotation.id);
  const partsTotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
  const laborTotal = items.reduce((s, i) => s + (i.labor_cost_compras || i.labor_cost_vendas || 0), 0);

  res.render('quotations/show', {
    title: `Cotação #${quotation.quote_number}`,
    quotation,
    items,
    partsTotal,
    laborTotal,
    grandTotal: partsTotal + laborTotal
  });
});

// Mudar status (compras/admin)
router.post('/:id/status', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).json({ ok: false });

  const { status } = req.body;
  const allowed = ['em_cotacao', 'cancelado'];
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: 'Status inválido.' });

  Quotation.updateStatus(quotation.id, status, req.session.userId);

  await notifyUser(quotation.created_by_user_id, {
    quotationId: quotation.id,
    type: 'status_atualizado',
    title: `Cotação #${quotation.quote_number} atualizada`,
    message: `Status alterado para "${status === 'em_cotacao' ? 'Em cotação' : 'Cancelado'}" por ${req.session.userName}`
  });

  req.session.flash = { success: 'Status atualizado!' };
  res.redirect(`/cotacoes/${quotation.id}`);
});

// Compras responde a cotação (preenche valores)
router.post('/:id/responder', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).render('errors/404', { title: 'Não encontrado' });

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

  req.session.flash = { success: 'Cotação respondida! O vendedor foi notificado.' };
  res.redirect(`/cotacoes/${quotation.id}`);
});

// Vendas registra resposta do cliente
router.post('/:id/resposta-cliente', requireRole('vendas', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).render('errors/404', { title: 'Não encontrado' });

  const approved = req.body.approved === '1';
  Quotation.setCustomerApproval(quotation.id, approved);

  const verb = approved ? 'APROVOU' : 'RECUSOU';
  await notifyAllByRole('compras', {
    quotationId: quotation.id,
    type: 'cotacao_atualizada',
    title: `Cliente ${verb} — Cotação #${quotation.quote_number}`,
    message: approved
      ? `${req.session.userName} informou que o cliente aprovou. Pode encomendar!`
      : `${req.session.userName} informou que o cliente recusou a cotação.`
  });

  req.session.flash = {
    success: approved
      ? 'Aprovação registrada! O setor de compras foi notificado.'
      : 'Recusa registrada. O setor de compras foi notificado.'
  };
  res.redirect(`/cotacoes/${quotation.id}`);
});

// Marcar peça chegou
router.post('/:id/peca-chegou', requireRole('compras', 'admin'), async (req, res) => {
  const quotation = Quotation.findById(parseInt(req.params.id));
  if (!quotation) return res.status(404).render('errors/404', { title: 'Não encontrado' });

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

  req.session.flash = { success: 'Chegada registrada! O vendedor foi notificado.' };
  res.redirect(`/cotacoes/${quotation.id}`);
});

module.exports = router;
