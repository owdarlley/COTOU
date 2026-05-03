const { db, runMigrations } = require('../src/config/database');

runMigrations();

const seed = () => {
  db.exec('BEGIN');
  // Customers
  const customers = [
    { name: 'Carlos Eduardo Mendes',   phone: '(11)98765-4321' },
    { name: 'Ana Paula Ferreira',      phone: '(21)99234-5678' },
    { name: 'Roberto Souza Lima',      phone: '(31)97654-3210' },
    { name: 'Fernanda Oliveira Costa', phone: '(11)91234-5678' },
    { name: 'Marcelo Andrade',         phone: '(41)98888-1234' },
    { name: 'Juliana Nascimento',      phone: '(85)97777-9999' },
    { name: 'Diego Carvalho',          phone: '(11)96543-2109' },
    { name: 'Patrícia Rocha Santos',   phone: '(51)95555-8765' },
  ];

  const customerIds = customers.map(c => {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(c.phone);
    if (existing) return existing.id;
    return Number(db.prepare('INSERT INTO customers (name, phone) VALUES (?,?)').run(c.name, c.phone).lastInsertRowid);
  });

  // Vehicles
  const vehicles = [
    { plate: 'ABC1D23', model: 'Volkswagen Gol 1.0', year_model: 2019, year_manuf: 2018 },
    { plate: 'XYZ5E67', model: 'Toyota Corolla 2.0', year_model: 2022, year_manuf: 2021 },
    { plate: 'MNO3F89', model: 'Chevrolet Onix Plus', year_model: 2023, year_manuf: 2022 },
    { plate: 'DEF2G45', model: 'Ford Ka 1.5',         year_model: 2020, year_manuf: 2020 },
    { plate: 'GHI7H01', model: 'Hyundai HB20',        year_model: 2021, year_manuf: 2021 },
    { plate: 'JKL4I56', model: 'Fiat Strada',          year_model: 2022, year_manuf: 2022 },
    { plate: 'PQR8J90', model: 'Renault Kwid',         year_model: 2020, year_manuf: 2019 },
    { plate: 'STU6K34', model: 'Honda Civic 1.5T',     year_model: 2023, year_manuf: 2023 },
  ];

  const vehicleIds = vehicles.map(v => {
    const existing = db.prepare('SELECT id FROM vehicles WHERE license_plate = ?').get(v.plate);
    if (existing) return existing.id;
    return Number(db.prepare(
      'INSERT INTO vehicles (license_plate, model, year_model, year_manuf) VALUES (?,?,?,?)'
    ).run(v.plate, v.model, v.year_model, v.year_manuf).lastInsertRowid);
  });

  // Count existing quotations for sequential numbering
  let seq = db.prepare("SELECT COUNT(*) as c FROM quotations").get().c;

  const makeQuote = (idx, customerId, vehicleId, createdBy, buyerId, status, notesVendas, notesCompras, daysAgo, customerApproved) => {
    seq++;
    const year = 2026;
    const quoteNumber = `COT-${year}-${String(seq).padStart(4, '0')}`;
    const createdAt = `datetime('now', '-${daysAgo} days')`;

    const result = db.prepare(`
      INSERT INTO quotations
        (quote_number, customer_id, vehicle_id, created_by_user_id, assigned_buyer_id,
         status, notes_vendas, notes_compras, customer_approved, customer_approved_at, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,
        ${customerApproved !== null ? `datetime('now', '-${Math.max(0, daysAgo-1)} days')` : 'NULL'},
        datetime('now', '-${daysAgo} days'),
        datetime('now', '-${Math.max(0, daysAgo-1)} days'))
    `).run(
      quoteNumber, customerId, vehicleId, createdBy, buyerId,
      status, notesVendas, notesCompras,
      customerApproved
    );
    return { id: Number(result.lastInsertRowid), quoteNumber };
  };

  const addItem = (quotationId, partName, partCode, qty, unitPrice, totalPrice, laborCompras, deliveryDays, supplier, itemStatus, notes) => {
    db.prepare(`
      INSERT INTO quotation_items
        (quotation_id, part_name, part_code, quantity, unit_price, total_price,
         labor_cost_compras, delivery_days, supplier_name, item_status, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(quotationId, partName, partCode, qty, unitPrice, totalPrice, laborCompras, deliveryDays, supplier, itemStatus, notes);
  };

  // --- COTAÇÃO 1: pendente (recém aberta) ---
  const q1 = makeQuote(1, customerIds[0], vehicleIds[0], 2, null, 'pendente',
    'Cliente reclamou de barulho ao frear. Verificar pastilhas e disco.',
    null, 2, null);
  addItem(q1.id, 'Pastilha de Freio Dianteira', 'PF-1023', 2, null, null, 0, null, null, 'aguardando', null);
  addItem(q1.id, 'Disco de Freio Dianteiro',    'DF-4401', 2, null, null, 0, null, null, 'aguardando', null);

  // --- COTAÇÃO 2: em_cotacao ---
  const q2 = makeQuote(2, customerIds[1], vehicleIds[1], 2, 3, 'em_cotacao',
    'Veículo apresenta folga na suspensão traseira.',
    null, 4, null);
  addItem(q2.id, 'Amortecedor Traseiro',  'AT-2210', 2, null, null, 0, null, null, 'em_cotacao', null);
  addItem(q2.id, 'Batente de Amortecedor','BA-0055', 2, null, null, 0, null, null, 'em_cotacao', null);
  addItem(q2.id, 'Coxim do Amortecedor',  'CA-9981', 2, null, null, 0, null, null, 'em_cotacao', null);

  // --- COTAÇÃO 3: cotado ---
  const q3 = makeQuote(3, customerIds[2], vehicleIds[2], 2, 3, 'cotado',
    'Embreagem patinando, cliente relata dificuldade de engrenar.',
    'Verificado com fornecedor AutoPeças Belo. Prazo 3 dias úteis.', 7, null);
  addItem(q3.id, 'Kit Embreagem Completo', 'KE-7731', 1, 480.00, 480.00, 120.00, 3, 'AutoPeças Belo', 'cotado', 'Kit inclui disco, platô e rolamento');
  addItem(q3.id, 'Cabo de Embreagem',      'CE-1104', 1,  45.00,  45.00,   0.00, 3, 'AutoPeças Belo', 'cotado', null);

  // --- COTAÇÃO 4: cotado + cliente aprovou ---
  const q4 = makeQuote(4, customerIds[3], vehicleIds[3], 2, 3, 'cotado',
    'Vidro traseiro quebrado por vandalismo.',
    'Peça disponível no estoque do fornecedor.', 5, 1);
  addItem(q4.id, 'Vidro Traseiro Liso', 'VT-3302', 1, 320.00, 320.00, 60.00, 1, 'Vidraçaria Central', 'cotado', 'Original');

  // --- COTAÇÃO 5: peca_chegou ---
  const q5 = makeQuote(5, customerIds[4], vehicleIds[4], 2, 3, 'peca_chegou',
    'Sensor de estacionamento com defeito, apitando sem motivo.',
    'Sensor chegou conforme prazo.', 10, 1);
  addItem(q5.id, 'Sensor de Estacionamento Traseiro', 'SE-6612', 4, 35.00, 140.00, 40.00, 2, 'Eletro Car', 'peca_chegou', null);
  addItem(q5.id, 'Central de Estacionamento',          'CE-7741', 1, 180.00, 180.00, 50.00, 2, 'Eletro Car', 'peca_chegou', null);

  // --- COTAÇÃO 6: cancelado ---
  const q6 = makeQuote(6, customerIds[5], vehicleIds[5], 2, 3, 'cancelado',
    'Cliente pediu para cotar troca de bateria.',
    null, 8, 0);
  addItem(q6.id, 'Bateria 60Ah', 'BAT-60', 1, null, null, 0, null, null, 'aguardando', null);

  // --- COTAÇÃO 7: pendente ---
  const q7 = makeQuote(7, customerIds[6], vehicleIds[6], 2, null, 'pendente',
    'Motor superaquecendo. Suspeita de bomba d\'água.',
    null, 1, null);
  addItem(q7.id, 'Bomba D\'Água',         'BD-5510', 1, null, null, 0, null, null, 'aguardando', null);
  addItem(q7.id, 'Correia Dentada Kit',   'CDK-221', 1, null, null, 0, null, null, 'aguardando', null);
  addItem(q7.id, 'Termostato',            'TT-0093', 1, null, null, 0, null, null, 'aguardando', null);

  // --- COTAÇÃO 8: em_cotacao ---
  const q8 = makeQuote(8, customerIds[7], vehicleIds[7], 2, 3, 'em_cotacao',
    'Troca de óleo e revisão dos 40.000 km.',
    'Aguardando retorno do fornecedor para filtros.', 3, null);
  addItem(q8.id, 'Filtro de Óleo',    'FO-1122', 1, null, null, 0, null, null, 'em_cotacao', null);
  addItem(q8.id, 'Filtro de Ar',      'FA-3344', 1, null, null, 0, null, null, 'em_cotacao', null);
  addItem(q8.id, 'Filtro de Cabine',  'FC-5566', 1, null, null, 0, null, null, 'em_cotacao', null);
  addItem(q8.id, 'Óleo Motor 5W30 4L','OM-5W30', 4, null, null, 0, null, null, 'em_cotacao', null);

  db.exec('COMMIT');
  console.log('Seed concluído! Cotações criadas:');
  [q1,q2,q3,q4,q5,q6,q7,q8].forEach(q => console.log(` - ${q.quoteNumber} (id ${q.id})`));
};

try { seed(); } catch(e) { db.exec('ROLLBACK'); throw e; }
