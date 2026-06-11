// Seed: 30 cotações com status 'cotado'
// Distribuição: 15 aguardando resposta do cliente, 10 aprovadas, 5 recusadas
require('dotenv').config();
const { db } = require('../src/config/database');

const customers = db.prepare('SELECT id, name, phone FROM customers').all();
const vehicles  = db.prepare('SELECT id, license_plate, model FROM vehicles').all();

const suppliers = ['AutoPeças Central', 'FreioParts Distribuidora', 'GlassWay Vidros', 'EletroParts', 'MotoFlex Peças', 'TurboStore', 'OriginalParts BR'];

const partsPool = [
  { name: 'Pastilha de Freio Dianteira', code: 'PF-1023', unitPrice: 89.90,  labor: 80  },
  { name: 'Disco de Freio Dianteiro',    code: 'DF-4401', unitPrice: 145.00, labor: 0   },
  { name: 'Amortecedor Traseiro',        code: 'AT-2210', unitPrice: 310.00, labor: 120 },
  { name: 'Correia Dentada',             code: 'CD-1139', unitPrice: 68.00,  labor: 150 },
  { name: 'Filtro de Óleo',             code: 'FO-1122', unitPrice: 28.00,  labor: 0   },
  { name: 'Filtro de Ar Motor',         code: 'FA-3344', unitPrice: 42.00,  labor: 0   },
  { name: 'Vela de Ignição',            code: 'VE-7788', unitPrice: 17.00,  labor: 40  },
  { name: 'Bateria 60Ah',               code: 'BAT-60',  unitPrice: 389.00, labor: 0   },
  { name: 'Sensor de Temperatura',      code: 'ST-4421', unitPrice: 95.00,  labor: 60  },
  { name: 'Bomba de Combustível',       code: 'BC-7712', unitPrice: 420.00, labor: 90  },
  { name: 'Bobina de Ignição',          code: 'BI-3301', unitPrice: 185.00, labor: 30  },
  { name: 'Radiador de Água',           code: 'RA-9911', unitPrice: 520.00, labor: 110 },
  { name: 'Alternador Remanufaturado',  code: 'ALT-55',  unitPrice: 680.00, labor: 120 },
  { name: 'Embreagem Completa',         code: 'EMB-77',  unitPrice: 480.00, labor: 200 },
  { name: 'Tensor Correia',             code: 'TC-2244', unitPrice: 78.00,  labor: 0   },
  { name: 'Rolamento Roda Dianteira',   code: 'RR-1100', unitPrice: 130.00, labor: 70  },
  { name: 'Cubo de Roda Traseiro',      code: 'CR-3312', unitPrice: 210.00, labor: 80  },
  { name: 'Coxim Motor',                code: 'CM-6677', unitPrice: 95.00,  labor: 60  },
  { name: 'Mangueira Radiador Superior',code: 'MR-2211', unitPrice: 45.00,  labor: 0   },
  { name: 'Cano de Freio Traseiro',     code: 'CF-8830', unitPrice: 62.00,  labor: 50  },
];

// quote_number progressivo a partir de COT-2026-0025
let counter = 25;

// Distribuição: 15 aguardando cliente | 10 aprovadas | 5 recusadas
// Índices 0..14 = aguardando | 15..24 = aprovadas | 25..29 = recusadas
const now = new Date('2026-06-11T08:00:00Z');

const insertQ  = db.prepare(`
  INSERT INTO quotations
    (quote_number, customer_id, vehicle_id, created_by_user_id, assigned_buyer_id,
     status, notes_vendas, notes_compras,
     whatsapp_sent_at, customer_approved, customer_approved_at, customer_approval_source,
     created_at, updated_at)
  VALUES (?,?,?,?,?, ?,?,?, ?,?,?,?, ?,?)
`);

const insertI = db.prepare(`
  INSERT INTO quotation_items
    (quotation_id, part_name, part_code, quantity,
     unit_price, total_price, labor_cost_compras,
     delivery_days, supplier_name, created_at)
  VALUES (?,?,?,?, ?,?,?, ?,?,?)
`);

db.exec('BEGIN');
try {
for (let i = 0; i < 30; i++) {
    const qNum   = `COT-2026-${String(counter++).padStart(4, '0')}`;
    const cust   = customers[i % customers.length];
    const veh    = vehicles[i % vehicles.length];
    const daysAgo = 20 - Math.floor(i / 2);
    const createdAt = new Date(now - daysAgo * 86400000).toISOString();
    const updatedAt = new Date(now - (daysAgo - 1) * 86400000).toISOString();

    // Resposta do cliente
    let customerApproved = null;
    let customerApprovedAt = null;
    let approvalSource = null;
    let whatsappSentAt = null;

    if (i < 15) {
      // Aguardando: alguns já têm WhatsApp enviado, outros não
      whatsappSentAt = i < 10 ? new Date(now - (daysAgo - 2) * 86400000).toISOString() : null;
    } else if (i < 25) {
      // Aprovadas pelo cliente
      whatsappSentAt = new Date(now - (daysAgo - 2) * 86400000).toISOString();
      customerApproved = 1;
      customerApprovedAt = new Date(now - (daysAgo - 3) * 86400000).toISOString();
      approvalSource = i % 2 === 0 ? 'whatsapp' : 'link';
    } else {
      // Recusadas pelo cliente
      whatsappSentAt = new Date(now - (daysAgo - 2) * 86400000).toISOString();
      customerApproved = 0;
      customerApprovedAt = new Date(now - (daysAgo - 3) * 86400000).toISOString();
      approvalSource = 'whatsapp';
    }

    const notesCompras = [
      'Peça disponível em estoque imediato.',
      'Fornecedor confirmou entrega em 2 dias.',
      'Verificado — peça original, sem substituto.',
      'Cotado com 2 fornecedores, menor preço selecionado.',
      'Prazo pode encurtar se cliente confirmar até amanhã.',
    ][i % 5];

    const result = insertQ.run(
      qNum, cust.id, veh.id, 2, 3,
      'cotado', null, notesCompras,
      whatsappSentAt, customerApproved, customerApprovedAt, approvalSource,
      createdAt, updatedAt
    );
    const qId = Number(result.lastInsertRowid);

    // 1 a 3 peças por cotação
    const numParts = 1 + (i % 3);
    for (let p = 0; p < numParts; p++) {
      const part = partsPool[(i + p) % partsPool.length];
      const qty  = p === 0 ? 1 : (p % 2) + 1;
      const supplier = suppliers[i % suppliers.length];
      insertI.run(
        qId, part.name, part.code, qty,
        part.unitPrice, +(part.unitPrice * qty).toFixed(2), p === 0 ? part.labor : 0,
        2 + (i % 5), supplier, createdAt
      );
    }
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

const total = db.prepare("SELECT COUNT(*) as cnt FROM quotations WHERE status = 'cotado'").get();
const respondidas = db.prepare("SELECT COUNT(*) as cnt FROM quotations WHERE customer_approved IS NOT NULL").get();
console.log(`✅ 30 cotações inseridas.`);
console.log(`   Total com status 'cotado': ${total.cnt}`);
console.log(`   Com resposta do cliente: ${respondidas.cnt}`);
