// COTOU — mock data + in-memory store
// Exposes: window.useStore, window.StoreProvider, window.COTOU_DATA, window.fmt

const { createContext, useContext, useReducer, useEffect, useMemo, useState, useRef, useCallback } = React;

/* =========================================================
   Seed data
   ========================================================= */

const SEED_USERS = [
  { id: 1, name: 'Admin',   email: 'admin@cotou.com.br',   role: 'admin',   active: true, phone_whatsapp: '', whatsapp_instance: 'cotou-user-1', whatsapp_connected: false, created_at: '2026-06-05T00:00:00Z' },
  { id: 2, name: 'Vendas',  email: 'vendas@cotou.com.br',  role: 'vendas',  active: true, phone_whatsapp: '', whatsapp_instance: 'cotou-user-2', whatsapp_connected: false, created_at: '2026-06-05T00:00:00Z' },
  { id: 3, name: 'Compras', email: 'compras@cotou.com.br', role: 'compras', active: true, phone_whatsapp: '', whatsapp_instance: 'cotou-user-3', whatsapp_connected: false, created_at: '2026-06-05T00:00:00Z' },
];

const SEED_PARTS = [
  { id: 1,  code: 'PF-1023', name: 'Pastilha de Freio Dianteira',  description: 'Kit com 4 pastilhas',                 default_price: 89.90,  category: 'Freios' },
  { id: 2,  code: 'DF-4401', name: 'Disco de Freio Dianteiro',     description: 'Par de discos ventilados',            default_price: 210.00, category: 'Freios' },
  { id: 3,  code: 'PT-2298', name: 'Pastilha de Freio Traseira',   description: 'Kit com 4 pastilhas',                 default_price: 78.50,  category: 'Freios' },
  { id: 4,  code: 'AT-2210', name: 'Amortecedor Traseiro',         description: 'Par com mola',                        default_price: 380.00, category: 'Suspensão' },
  { id: 5,  code: 'AD-2208', name: 'Amortecedor Dianteiro',        description: 'Par a gás',                           default_price: 420.00, category: 'Suspensão' },
  { id: 6,  code: 'KE-7731', name: 'Kit Embreagem Completo',       description: 'Disco + platô + rolamento',           default_price: 480.00, category: 'Embreagem' },
  { id: 7,  code: 'CE-1104', name: 'Cabo de Embreagem',            description: 'Cabo + bucha',                        default_price: 45.00,  category: 'Embreagem' },
  { id: 8,  code: 'FO-1122', name: 'Filtro de Óleo',               description: 'Rosca 3/4-16',                         default_price: 28.00,  category: 'Motor' },
  { id: 9,  code: 'FA-3344', name: 'Filtro de Ar Motor',           description: 'Elemento filtrante',                  default_price: 42.00,  category: 'Motor' },
  { id: 10, code: 'FC-5511', name: 'Filtro de Combustível',        description: 'Linha pressurizada',                  default_price: 55.00,  category: 'Motor' },
  { id: 11, code: 'BAT-60',  name: 'Bateria 60Ah',                 description: 'Selada livre de manutenção',          default_price: 380.00, category: 'Elétrica' },
  { id: 12, code: 'BAT-70',  name: 'Bateria 70Ah',                 description: 'Selada livre de manutenção',          default_price: 460.00, category: 'Elétrica' },
  { id: 13, code: 'BD-5510', name: 'Bomba D\'Água',                description: 'Com junta',                           default_price: 165.00, category: 'Motor' },
  { id: 14, code: 'VT-3302', name: 'Vidro Traseiro Liso',          description: 'Original',                            default_price: 320.00, category: 'Carroceria' },
  { id: 15, code: 'SE-6612', name: 'Sensor de Estacionamento',     description: 'Kit 4 sensores traseiro',             default_price: 280.00, category: 'Elétrica' },
  { id: 16, code: 'CO-2233', name: 'Correia Dentada',              description: 'Kit com tensor',                      default_price: 195.00, category: 'Motor' },
  { id: 17, code: 'VE-7788', name: 'Vela de Ignição',              description: 'Jogo com 4',                          default_price: 68.00,  category: 'Motor' },
  { id: 18, code: 'RAD-9911',name: 'Radiador',                     description: 'Alumínio com reservatório',           default_price: 540.00, category: 'Motor' },
  { id: 19, code: 'LF-1010', name: 'Lâmpada Farol H4',             description: 'Par 60/55W',                          default_price: 38.00,  category: 'Elétrica' },
  { id: 20, code: 'RT-4422', name: 'Retentor Comando',             description: 'Borracha NBR',                        default_price: 22.00,  category: 'Motor' },
  { id: 21, code: 'PI-7700', name: 'Pivô da Suspensão',            description: 'Par lado direito/esquerdo',           default_price: 145.00, category: 'Suspensão' },
  { id: 22, code: 'MO-1198', name: 'Mola Helicoidal Dianteira',    description: 'Par',                                  default_price: 220.00, category: 'Suspensão' },
];

const PHONE = '15998569990';
const SEED_CUSTOMERS = [
  { id: 1,  name: 'Darlley Alves de Almeida',  phone: PHONE, created_at: '2026-05-27T10:00:00Z' },
  { id: 2,  name: 'Carlos Eduardo Mendes',      phone: PHONE, created_at: '2026-05-28T08:00:00Z' },
  { id: 3,  name: 'Ana Paula Ferreira',         phone: PHONE, created_at: '2026-05-29T09:00:00Z' },
  { id: 4,  name: 'Roberto Souza Lima',         phone: PHONE, created_at: '2026-05-30T10:00:00Z' },
  { id: 5,  name: 'Fernanda Oliveira Costa',    phone: PHONE, created_at: '2026-05-31T11:00:00Z' },
  { id: 6,  name: 'Marcelo Andrade',            phone: PHONE, created_at: '2026-06-01T14:00:00Z' },
  { id: 7,  name: 'Juliana Nascimento',         phone: PHONE, created_at: '2026-06-02T08:30:00Z' },
  { id: 8,  name: 'Diego Carvalho',             phone: PHONE, created_at: '2026-06-03T15:00:00Z' },
  { id: 9,  name: 'Patricia Rocha Santos',      phone: PHONE, created_at: '2026-06-04T09:00:00Z' },
  { id: 10, name: 'Ricardo Henrique Martins',   phone: PHONE, created_at: '2026-06-05T08:00:00Z' },
];

const SEED_SUPPLIERS = [
  { id: 1, name: 'AutoPecas Central',        phone: PHONE, notes: 'Freios, suspensao e motor',  active: 1, created_at: '2026-05-06T10:00:00Z' },
  { id: 2, name: 'GlassWay Vidros',          phone: PHONE, notes: 'Vidros e acessorios',         active: 1, created_at: '2026-05-06T10:00:00Z' },
  { id: 3, name: 'EletroParts',              phone: PHONE, notes: 'Eletrica e eletronica',       active: 1, created_at: '2026-05-06T10:00:00Z' },
  { id: 4, name: 'FreioParts Distribuidora', phone: PHONE, notes: 'Freios e suspensao',          active: 1, created_at: '2026-05-06T10:00:00Z' },
  { id: 5, name: 'MotoFlex Pecas',           phone: PHONE, notes: 'Motor e transmissao',         active: 1, created_at: '2026-05-06T10:00:00Z' },
  { id: 6, name: 'CarroceriaBR',             phone: PHONE, notes: 'Funilaria e carroceria',      active: 1, created_at: '2026-05-06T10:00:00Z' },
];

// Helper to compute total from items
function calcTotals(items) {
  const partsTotal = items.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
  const laborTotal = items.reduce((s, it) => s + (Number(it.labor_cost_compras) || Number(it.labor_cost_vendas) || 0), 0);
  return { partsTotal, laborTotal, grandTotal: partsTotal + laborTotal };
}

const SEED_QUOTATIONS_UNUSED = [
  {
    id: 1, quote_number: 'COT-2026-0001', status: 'pendente',
    customer_name: 'Carlos Eduardo Mendes', customer_phone: '11987654321',
    vehicle: { plate: 'ABC1D23', make: 'VOLKSWAGEN', model: 'Gol 1.0', year_model: 2019, year_manuf: 2018, color: 'PRATA', fuel: 'FLEX', chassis: '9BWZZZ377VT004251' },
    created_by_user_id: 2, assigned_buyer_id: null,
    creator_name: 'João Vendas', buyer_name: null,
    notes_vendas: 'Cliente relata barulho ao frear pela manhã. Verificar pastilhas dianteiras e disco.',
    notes_compras: null,
    photo_path: null,
    customer_approved: null,
    whatsapp_sent_at: null,
    created_at: '2026-05-24T10:30:00Z',
    items: [
      { id: 101, part_name: 'Pastilha de Freio Dianteira', part_code: 'PF-1023', quantity: 1, unit_price: null, total_price: null, labor_cost_compras: null, delivery_days: null, supplier_name: null, item_status: 'aguardando', notes: null },
      { id: 102, part_name: 'Disco de Freio Dianteiro',     part_code: 'DF-4401', quantity: 1, unit_price: null, total_price: null, labor_cost_compras: null, delivery_days: null, supplier_name: null, item_status: 'aguardando', notes: null },
    ],
  },
  {
    id: 2, quote_number: 'COT-2026-0002', status: 'em_cotacao',
    customer_name: 'Ana Paula Ferreira', customer_phone: '21992345678',
    vehicle: { plate: 'XYZ5E67', make: 'TOYOTA', model: 'Corolla 2.0 XEi', year_model: 2022, year_manuf: 2021, color: 'PRETO', fuel: 'FLEX', chassis: '9BFZF26P288196922' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Folga na suspensão traseira do lado direito. Cliente prefere peça original.',
    notes_compras: null, photo_path: null, customer_approved: null, whatsapp_sent_at: null,
    created_at: '2026-05-22T14:00:00Z',
    messages: [
      { id: 1, from: 2, text: 'Cliente precisa urgente, carro parado.', ts: '2026-05-22T14:05:00Z' },
      { id: 2, from: 3, text: 'Entendido. Já estou verificando com fornecedores.', ts: '2026-05-22T14:10:00Z' },
    ],
    items: [
      { id: 201, part_name: 'Amortecedor Traseiro', part_code: 'AT-2210', quantity: 2, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
      { id: 202, part_name: 'Mola Helicoidal',      part_code: 'MO-1198', quantity: 2, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
    ],
  },
  {
    id: 3, quote_number: 'COT-2026-0003', status: 'cotado',
    customer_name: 'Roberto Souza Lima', customer_phone: '31976543210',
    vehicle: { plate: 'MNO3F89', make: 'CHEVROLET', model: 'Onix Plus 1.0 Turbo', year_model: 2023, year_manuf: 2023, color: 'BRANCO', fuel: 'FLEX', chassis: '9BGJF19BX0B123456' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Embreagem patinando em subida. Inspeção visual sugere disco gasto.',
    notes_compras: 'Fornecedor AutoPeças Belo Horizonte. Prazo 3 dias úteis.',
    photo_path: null, customer_approved: null, whatsapp_sent_at: null,
    created_at: '2026-05-19T09:00:00Z',
    messages: [
      { id: 1, from: 2, text: 'Pode verificar se tem versão nacional?', ts: '2026-05-19T14:00:00Z' },
      { id: 2, from: 3, text: 'Tem sim, inclusive mais barata. Coloquei na cotação.', ts: '2026-05-19T14:22:00Z' },
    ],
    items: [
      { id: 301, part_name: 'Kit Embreagem Completo', part_code: 'KE-7731', quantity: 1, unit_price: 480.00, total_price: 480.00, labor_cost_compras: 120.00, delivery_days: 3, supplier_name: 'AutoPeças Belo', item_status: 'cotado', notes: 'Kit inclui disco, platô e rolamento' },
      { id: 302, part_name: 'Cabo de Embreagem',      part_code: 'CE-1104', quantity: 1, unit_price: 45.00,  total_price: 45.00,  labor_cost_compras: 0,      delivery_days: 3, supplier_name: 'AutoPeças Belo', item_status: 'cotado', notes: null },
    ],
  },
  {
    id: 4, quote_number: 'COT-2026-0004', status: 'cotado',
    customer_name: 'Fernanda Oliveira Costa', customer_phone: '11912345678',
    vehicle: { plate: 'DEF2G45', make: 'FORD', model: 'Ka 1.5 SE', year_model: 2020, year_manuf: 2019, color: 'VERMELHO', fuel: 'FLEX', chassis: '9BFZF26P0J8234567' },
    created_by_user_id: 4, assigned_buyer_id: 3,
    creator_name: 'Ricardo Atende', buyer_name: 'Maria Compras',
    notes_vendas: 'Vidro traseiro estilhaçado. Cliente quer original.',
    notes_compras: 'Peça em estoque com o fornecedor parceiro.',
    photo_path: null, customer_approved: 1, whatsapp_sent_at: '2026-05-21T15:00:00Z',
    created_at: '2026-05-20T11:00:00Z',
    items: [
      { id: 401, part_name: 'Vidro Traseiro Liso', part_code: 'VT-3302', quantity: 1, unit_price: 320.00, total_price: 320.00, labor_cost_compras: 60.00, delivery_days: 2, supplier_name: 'GlassWay', item_status: 'cotado', notes: null },
    ],
  },
  {
    id: 5, quote_number: 'COT-2026-0005', status: 'peca_chegou',
    customer_name: 'Marcelo Andrade', customer_phone: '41988881234',
    vehicle: { plate: 'GHI7H01', make: 'HYUNDAI', model: 'HB20 1.0 Sense', year_model: 2021, year_manuf: 2021, color: 'PRATA', fuel: 'FLEX', chassis: 'MALAM51ASLM345678' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Sensor de estacionamento traseiro com defeito intermitente.',
    notes_compras: 'Sensor chegou em 24h, instalação rápida.',
    photo_path: null, customer_approved: 1, whatsapp_sent_at: '2026-05-16T11:30:00Z',
    created_at: '2026-05-15T08:00:00Z',
    items: [
      { id: 501, part_name: 'Sensor de Estacionamento', part_code: 'SE-6612', quantity: 1, unit_price: 280.00, total_price: 280.00, labor_cost_compras: 90.00, delivery_days: 1, supplier_name: 'EletroParts', item_status: 'peca_chegou', notes: null, arrived_at: '2026-05-16T16:00:00Z' },
    ],
  },
  {
    id: 6, quote_number: 'COT-2026-0006', status: 'cancelado',
    customer_name: 'Juliana Nascimento', customer_phone: '85977779999',
    vehicle: { plate: 'JKL4I56', make: 'FIAT', model: 'Strada Endurance', year_model: 2022, year_manuf: 2022, color: 'PRETO', fuel: 'FLEX', chassis: '9BD158A38N0456789' },
    created_by_user_id: 2, assigned_buyer_id: null,
    creator_name: 'João Vendas', buyer_name: null,
    notes_vendas: 'Troca de bateria preventiva.',
    notes_compras: null, photo_path: null, customer_approved: 0, whatsapp_sent_at: null,
    created_at: '2026-05-18T16:00:00Z',
    items: [
      { id: 601, part_name: 'Bateria 60Ah', part_code: 'BAT-60', quantity: 1, unit_price: null, total_price: null, item_status: 'aguardando', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
    ],
  },
  {
    id: 7, quote_number: 'COT-2026-0007', status: 'pendente',
    customer_name: 'Diego Carvalho', customer_phone: '11965432109',
    vehicle: { plate: 'PQR8J90', make: 'RENAULT', model: 'Kwid Zen 1.0', year_model: 2020, year_manuf: 2020, color: 'BRANCO', fuel: 'FLEX', chassis: '93YAAZHC2KJ567890' },
    created_by_user_id: 4, assigned_buyer_id: null,
    creator_name: 'Ricardo Atende', buyer_name: null,
    notes_vendas: 'Motor superaquecendo em trânsito parado. Suspeita: bomba d\'água e radiador.',
    notes_compras: null, photo_path: null, customer_approved: null, whatsapp_sent_at: null,
    created_at: '2026-05-25T07:00:00Z',
    items: [
      { id: 701, part_name: 'Bomba D\'Água', part_code: 'BD-5510', quantity: 1, unit_price: null, total_price: null, item_status: 'aguardando', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
      { id: 702, part_name: 'Radiador',      part_code: 'RAD-9911', quantity: 1, unit_price: null, total_price: null, item_status: 'aguardando', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
    ],
  },
  {
    id: 8, quote_number: 'COT-2026-0008', status: 'em_cotacao',
    customer_name: 'Patrícia Rocha Santos', customer_phone: '51955558765',
    vehicle: { plate: 'STU6K34', make: 'HONDA', model: 'Civic 1.5T Touring', year_model: 2023, year_manuf: 2023, color: 'CINZA', fuel: 'GASOLINA', chassis: '2HGFE2F59PH678901' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Revisão 40.000 km. Trocar óleo, filtros e velas.',
    notes_compras: null, photo_path: null, customer_approved: null, whatsapp_sent_at: null,
    created_at: '2026-05-23T13:00:00Z',
    items: [
      { id: 801, part_name: 'Filtro de Óleo',        part_code: 'FO-1122', quantity: 1, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
      { id: 802, part_name: 'Filtro de Ar Motor',    part_code: 'FA-3344', quantity: 1, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
      { id: 803, part_name: 'Filtro de Combustível', part_code: 'FC-5511', quantity: 1, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
      { id: 804, part_name: 'Vela de Ignição',       part_code: 'VE-7788', quantity: 4, unit_price: null, total_price: null, item_status: 'em_cotacao', supplier_name: null, delivery_days: null, labor_cost_compras: null, notes: null },
    ],
  },
  {
    id: 9, quote_number: 'COT-2026-0009', status: 'cotado',
    customer_name: 'Dárlley Alves de Almeida', customer_phone: '15998569990',
    vehicle: { plate: '25S6S52S', make: 'CHEVROLET', model: 'Onix 1.0 Turbo LTZ', year_model: 2023, year_manuf: 2022, color: 'BRANCO', fuel: 'FLEX', chassis: '9BGJF19BX0B789012' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Freio traseiro com ruído ao frear. Verificar pastilha e disco.',
    notes_compras: 'Pastilhas e discos disponíveis no fornecedor. Preço competitivo.',
    photo_path: null, customer_approved: 0, whatsapp_sent_at: null,
    created_at: '2026-05-27T10:00:00Z',
    messages: [],
    items: [
      { id: 901, part_name: 'Pastilha de Freio Traseira', part_code: 'PF-8821', quantity: 1, unit_price: 189.90, total_price: 189.90, labor_cost_compras: 80.00, delivery_days: 1, supplier_name: 'FreioParts', item_status: 'cotado', notes: 'Par completo' },
      { id: 902, part_name: 'Disco de Freio Traseiro',    part_code: 'DF-4456', quantity: 2, unit_price: 145.00, total_price: 290.00, labor_cost_compras: 0,     delivery_days: 1, supplier_name: 'FreioParts', item_status: 'cotado', notes: null },
    ],
  },
  {
    id: 10, quote_number: 'COT-2026-0010', status: 'em_cotacao',
    customer_name: 'Roberto Nascimento', customer_phone: '11976543210',
    vehicle: { plate: 'EBA7923', make: 'FORD', model: 'Fiesta Sedan 1.6 Flex', year_model: 2008, year_manuf: 2007, color: 'PRATA', fuel: 'FLEX', chassis: '9BFZF26P288196922' },
    created_by_user_id: 2, assigned_buyer_id: 3,
    creator_name: 'João Vendas', buyer_name: 'Maria Compras',
    notes_vendas: 'Cliente relata barulho no motor e vidro elétrico com defeito.',
    notes_compras: null,
    photo_path: null, customer_approved: null, whatsapp_sent_at: null,
    created_at: '2026-05-29T08:30:00Z',
    messages: [],
    items: [
      { id: 1001, part_name: 'Correia Dentada', part_code: 'CD-1139', quantity: 1, unit_price: null, total_price: null, labor_cost_compras: null, delivery_days: null, supplier_name: null, item_status: 'em_cotacao', notes: null },
      { id: 1002, part_name: 'Regulador de Vidro Elétrico Dianteiro Esquerdo', part_code: 'RV-2241', quantity: 1, unit_price: null, total_price: null, labor_cost_compras: null, delivery_days: null, supplier_name: null, item_status: 'em_cotacao', notes: null },
    ],
  },
];

const SEED_QUOTATIONS = [
  {
    id:1, quote_number:'COT-2026-0001', status:'pendente',
    customer_name:'Darlley Alves de Almeida', customer_phone:PHONE,
    customer_id:1, vehicle_id:1,
    vehicle:{ plate:'ABC1D23', make:'VOLKSWAGEN', model:'Gol 1.0', year_model:2019, year_manuf:2018, color:'PRATA', fuel:'FLEX', chassis:'9BWZZZ377VT004251' },
    created_by_user_id:2, assigned_buyer_id:null, creator_name:'Vendas', buyer_name:null,
    notes_vendas:'Cliente relata barulho ao frear. Verificar pastilhas e discos dianteiros.', notes_compras:null,
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-05-27T10:00:00Z',
    items:[
      { id:1, part_name:'Pastilha de Freio Dianteira', part_code:'PF-1023', quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:null, item_status:'aguardando', notes:null },
      { id:2, part_name:'Disco de Freio Dianteiro',    part_code:'DF-4401', quantity:2, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:null, item_status:'aguardando', notes:null },
    ],
  },
  {
    id:2, quote_number:'COT-2026-0002', status:'em_cotacao',
    customer_name:'Carlos Eduardo Mendes', customer_phone:PHONE,
    customer_id:2, vehicle_id:2,
    vehicle:{ plate:'XYZ5E67', make:'TOYOTA', model:'Corolla 2.0 XEi', year_model:2022, year_manuf:2021, color:'PRETO', fuel:'FLEX', chassis:'9BFZF26P288196922' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Folga na suspensao traseira lado direito. Cliente prefere peca original.', notes_compras:'Verificando com fornecedores.',
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-05-28T08:00:00Z',
    items:[
      { id:3, part_name:'Amortecedor Traseiro', part_code:'AT-2210', quantity:2, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'FreioParts', item_status:'em_cotacao', notes:null },
      { id:4, part_name:'Mola Helicoidal',      part_code:'MO-1198', quantity:2, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'FreioParts', item_status:'em_cotacao', notes:null },
    ],
  },
  {
    id:3, quote_number:'COT-2026-0003', status:'cotado',
    customer_name:'Ana Paula Ferreira', customer_phone:PHONE,
    customer_id:3, vehicle_id:3,
    vehicle:{ plate:'MNO3F89', make:'CHEVROLET', model:'Onix Plus 1.0T', year_model:2023, year_manuf:2023, color:'BRANCO', fuel:'FLEX', chassis:'9BGJF19BX0B123456' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Embreagem patinando em subida. Disco aparentemente gasto.', notes_compras:'FreioParts — prazo 2 dias uteis.',
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-05-29T09:00:00Z',
    items:[
      { id:5, part_name:'Kit Embreagem Completo', part_code:'KE-7731', quantity:1, unit_price:480.00, total_price:480.00, labor_cost_compras:120.00, delivery_days:2, supplier_name:'FreioParts Distribuidora', item_status:'cotado', notes:'Kit disco + plato + rolamento' },
      { id:6, part_name:'Cabo de Embreagem',      part_code:'CE-1104', quantity:1, unit_price:45.00,  total_price:45.00,  labor_cost_compras:0,      delivery_days:2, supplier_name:'FreioParts Distribuidora', item_status:'cotado', notes:null },
    ],
  },
  {
    id:4, quote_number:'COT-2026-0004', status:'cotado',
    customer_name:'Roberto Souza Lima', customer_phone:PHONE,
    customer_id:4, vehicle_id:4,
    vehicle:{ plate:'DEF2G45', make:'FORD', model:'Ka 1.5 SE', year_model:2020, year_manuf:2019, color:'VERMELHO', fuel:'FLEX', chassis:'9BFZF26P0J8234567' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Vidro traseiro estilhacado. Cliente quer peca original.', notes_compras:'GlassWay — em estoque.',
    photo_path:null, customer_approved:1, whatsapp_sent_at:null, created_at:'2026-05-30T10:00:00Z',
    items:[
      { id:7, part_name:'Vidro Traseiro Liso', part_code:'VT-3302', quantity:1, unit_price:320.00, total_price:320.00, labor_cost_compras:60.00, delivery_days:2, supplier_name:'GlassWay Vidros', item_status:'cotado', notes:null },
    ],
  },
  {
    id:5, quote_number:'COT-2026-0005', status:'peca_chegou',
    customer_name:'Fernanda Oliveira Costa', customer_phone:PHONE,
    customer_id:5, vehicle_id:5,
    vehicle:{ plate:'GHI7H01', make:'HYUNDAI', model:'HB20 1.0 Sense', year_model:2021, year_manuf:2021, color:'PRATA', fuel:'FLEX', chassis:'MALAM51ASLM345678' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Sensor de estacionamento com defeito intermitente.', notes_compras:'EletroParts — chegou em 24h.',
    photo_path:null, customer_approved:1, whatsapp_sent_at:null, created_at:'2026-05-31T11:00:00Z',
    items:[
      { id:8, part_name:'Sensor de Estacionamento', part_code:'SE-6612', quantity:1, unit_price:280.00, total_price:280.00, labor_cost_compras:90.00, delivery_days:1, supplier_name:'EletroParts', item_status:'peca_chegou', notes:null },
    ],
  },
  {
    id:6, quote_number:'COT-2026-0006', status:'pendente',
    customer_name:'Marcelo Andrade', customer_phone:PHONE,
    customer_id:6, vehicle_id:6,
    vehicle:{ plate:'JKL4I56', make:'FIAT', model:'Strada Endurance', year_model:2022, year_manuf:2022, color:'PRETO', fuel:'FLEX', chassis:'9BD158A38N0456789' },
    created_by_user_id:2, assigned_buyer_id:null, creator_name:'Vendas', buyer_name:null,
    notes_vendas:'Troca de bateria preventiva. Bateria com 5 anos de uso.', notes_compras:null,
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-06-01T14:00:00Z',
    items:[
      { id:9, part_name:'Bateria 60Ah', part_code:'BAT-60', quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:null, item_status:'aguardando', notes:null },
    ],
  },
  {
    id:7, quote_number:'COT-2026-0007', status:'em_cotacao',
    customer_name:'Juliana Nascimento', customer_phone:PHONE,
    customer_id:7, vehicle_id:7,
    vehicle:{ plate:'PQR8J90', make:'RENAULT', model:'Kwid Zen 1.0', year_model:2020, year_manuf:2020, color:'BRANCO', fuel:'FLEX', chassis:'93YAAZHC2KJ567890' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Motor superaquecendo no transito. Suspeita bomba dagua e radiador.', notes_compras:'Buscando com MotoFlex.',
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-06-02T08:30:00Z',
    items:[
      { id:10, part_name:'Bomba D Agua', part_code:'BD-5510', quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'MotoFlex Pecas', item_status:'em_cotacao', notes:null },
      { id:11, part_name:'Radiador',     part_code:'RAD-9911',quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'MotoFlex Pecas', item_status:'em_cotacao', notes:null },
    ],
  },
  {
    id:8, quote_number:'COT-2026-0008', status:'cotado',
    customer_name:'Diego Carvalho', customer_phone:PHONE,
    customer_id:8, vehicle_id:8,
    vehicle:{ plate:'STU6K34', make:'HONDA', model:'Civic 1.5T Tour', year_model:2023, year_manuf:2023, color:'CINZA', fuel:'GASOLINA', chassis:'2HGFE2F59PH678901' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Revisao 40.000 km: oleo, filtros e velas.', notes_compras:'AutoPecas Central — kit completo disponivel.',
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-06-03T15:00:00Z',
    items:[
      { id:12, part_name:'Filtro de Oleo',       part_code:'FO-1122', quantity:1, unit_price:28.00, total_price:28.00,  labor_cost_compras:0,    delivery_days:1, supplier_name:'AutoPecas Central', item_status:'cotado', notes:null },
      { id:13, part_name:'Filtro de Ar Motor',   part_code:'FA-3344', quantity:1, unit_price:42.00, total_price:42.00,  labor_cost_compras:0,    delivery_days:1, supplier_name:'AutoPecas Central', item_status:'cotado', notes:null },
      { id:14, part_name:'Filtro de Combustivel',part_code:'FC-5511', quantity:1, unit_price:55.00, total_price:55.00,  labor_cost_compras:0,    delivery_days:1, supplier_name:'AutoPecas Central', item_status:'cotado', notes:null },
      { id:15, part_name:'Vela de Ignicao',      part_code:'VE-7788', quantity:4, unit_price:17.00, total_price:68.00,  labor_cost_compras:80.00,delivery_days:1, supplier_name:'AutoPecas Central', item_status:'cotado', notes:'Jogo com 4 velas NGK' },
    ],
  },
  {
    id:9, quote_number:'COT-2026-0009', status:'peca_chegou',
    customer_name:'Patricia Rocha Santos', customer_phone:PHONE,
    customer_id:9, vehicle_id:9,
    vehicle:{ plate:'EBA7923', make:'FORD', model:'Fiesta 1.6 Flex', year_model:2008, year_manuf:2007, color:'PRATA', fuel:'FLEX', chassis:'9BFZF26P288191234' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Correia dentada vencida + regulador vidro com defeito.', notes_compras:'Pecas chegaram. Aguardando retirada.',
    photo_path:null, customer_approved:1, whatsapp_sent_at:null, created_at:'2026-06-04T09:00:00Z',
    items:[
      { id:16, part_name:'Correia Dentada',                    part_code:'CO-2233', quantity:1, unit_price:195.00, total_price:195.00, labor_cost_compras:150.00, delivery_days:1, supplier_name:'MotoFlex Pecas', item_status:'peca_chegou', notes:'Kit com tensor' },
      { id:17, part_name:'Regulador Vidro Eletrico Diant Esq', part_code:'RV-2241', quantity:1, unit_price:145.00, total_price:145.00, labor_cost_compras:60.00,  delivery_days:1, supplier_name:'EletroParts',    item_status:'peca_chegou', notes:null },
    ],
  },
  {
    id:10, quote_number:'COT-2026-0010', status:'em_cotacao',
    customer_name:'Ricardo Henrique Martins', customer_phone:PHONE,
    customer_id:10, vehicle_id:10,
    vehicle:{ plate:'VWX9L12', make:'JEEP', model:'Renegade 1.8', year_model:2021, year_manuf:2020, color:'AZUL', fuel:'FLEX', chassis:'JF2SHADC9DG012345' },
    created_by_user_id:2, assigned_buyer_id:3, creator_name:'Vendas', buyer_name:'Compras',
    notes_vendas:'Revisao geral apos batida leve: para-choque, farol e lataria.', notes_compras:'Buscando com CarroceriaBR.',
    photo_path:null, customer_approved:null, whatsapp_sent_at:null, created_at:'2026-06-05T08:00:00Z',
    items:[
      { id:18, part_name:'Para-choque Dianteiro', part_code:'PC-0110', quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'CarroceriaBR', item_status:'em_cotacao', notes:null },
      { id:19, part_name:'Farol Dianteiro Esq',   part_code:'FD-2211', quantity:1, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'CarroceriaBR', item_status:'em_cotacao', notes:null },
      { id:20, part_name:'Aplique Lateral',        part_code:'AL-3312', quantity:2, unit_price:null, total_price:null, labor_cost_compras:null, delivery_days:null, supplier_name:'CarroceriaBR', item_status:'em_cotacao', notes:null },
    ],
  },
];
const SEED_NOTIFICATIONS = [
  { id:1, user_id:2, type:'cotacao_respondida', title:'Cotacao COT-2026-0003 respondida', message:'Compras preencheu os valores. Envie ao cliente!', read_at:null, quotation_id:3, created_at:'2026-05-29T16:00:00Z' },
  { id:2, user_id:2, type:'peca_chegou',        title:'Peca chegou — COT-2026-0005',      message:'Compras confirmou chegada do sensor. Avise o cliente!', read_at:null, quotation_id:5, created_at:'2026-06-01T11:00:00Z' },
  { id:3, user_id:3, type:'nova_cotacao',       title:'Nova cotacao COT-2026-0001',        message:'Vendas abriu cotacao — VW Gol ABC1D23.', read_at:null, quotation_id:1, created_at:'2026-05-27T10:05:00Z' },
  { id:4, user_id:3, type:'nova_cotacao',       title:'Nova cotacao COT-2026-0006',        message:'Vendas abriu cotacao — FIAT Strada JKL4I56.', read_at:null, quotation_id:6, created_at:'2026-06-01T14:05:00Z' },
  { id:5, user_id:2, type:'peca_chegou',        title:'Peca chegou — COT-2026-0009',      message:'Correia e regulador chegaram. Avise o cliente!', read_at:null, quotation_id:9, created_at:'2026-06-04T16:00:00Z' },
];

// URL do backend — configurável via localStorage ou parâmetro ?backend=
// Necessário quando o frontend é servido pelo GitHub Pages (domínio diferente do servidor)
function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get('backend');
  if (fromParam) {
    const clean = fromParam.replace(/\/$/, '');
    try { localStorage.setItem('cotou_backend_url', clean); } catch (_) {}
    return clean;
  }
  try {
    const stored = localStorage.getItem('cotou_backend_url');
    if (stored) return stored;
  } catch (_) {}
  if (window.location.hostname === 'owdarlley.github.io') {
    return 'https://cotou.darlley.dev.br';
  }
  return window.location.origin;
}
let PLATE_PROXY_URL = resolveBackendUrl();

// Converte o shape plano do backend para o shape aninhado que o frontend usa
function normalizeQuotation(q, existingItems) {
  return {
    ...q,
    vehicle: {
      plate: q.license_plate,
      make: q.make || '',
      model: q.model || '',
      year_model: q.year_model,
      year_manuf: q.year_manuf,
      color: q.color || '',
      fuel: q.fuel || '',
      chassis: q.chassis || '',
    },
    items: existingItems || q.items || [],
  };
}

/* =========================================================
   Store (reducer)
   ========================================================= */

const StoreContext = createContext(null);

const DEFAULT_WA_TEMPLATE = `Olá, [NOME DO CLIENTE]! 👋

Sua cotação está pronta! Veja os detalhes abaixo:

🚗 *Veículo:* [VEÍCULO] — Placa [PLACA]

📦 *Peças cotadas:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]💰 *Total estimado: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Confirma para encomendarmos? 😊`;

function renderTemplate(settings, quotation, items) {
  const t = calcTotals(items);
  const template = settings?.whatsapp_template || DEFAULT_WA_TEMPLATE;
  const firstName = (quotation.customer_name || '').split(' ')[0] || 'Cliente';
  const vehicle = `${quotation.vehicle?.make || ''} ${quotation.vehicle?.model || ''}`.trim();
  const plate = quotation.vehicle?.plate || '';
  const itensTexto = items.map(it => {
    let l = `• ${it.part_name}`;
    if (it.part_code) l += ` (Cód: ${it.part_code})`;
    if (it.total_price) l += ` — ${fmt.brl(it.total_price)}`;
    if (it.delivery_days) l += ` | Prazo: ${it.delivery_days} dias`;
    return l;
  }).join('\n');
  const laborLine = t.laborTotal > 0 ? `🔧 Mão de obra: ${fmt.brl(t.laborTotal)}\n` : '';
  const deliveryDays = items.filter(i => i.delivery_days).map(i => i.delivery_days);
  const deadline = deliveryDays.length ? `⏱ Prazo estimado de entrega: ${Math.max(...deliveryDays)} dias úteis` : '';
  return template
    .replace(/\[NOME DO CLIENTE\]/g, firstName)
    .replace(/\[NÚMERO DA COTAÇÃO\]/g, quotation.quote_number || '')
    .replace(/\[VEÍCULO\]/g, vehicle)
    .replace(/\[PLACA\]/g, plate)
    .replace(/\[LISTA DE PEÇAS\]/g, itensTexto)
    .replace(/\[MÃO DE OBRA\]/g, laborLine)
    .replace(/\[TOTAL\]/g, t.grandTotal.toFixed(2))
    .replace(/\[PRAZO DE ENTREGA\]/g, deadline);
}

const STATE_VERSION = 6;

const initialState = {
  currentUserId: 2, // start as Vendas
  users: SEED_USERS,
  parts: SEED_PARTS,
  customers: SEED_CUSTOMERS,
  suppliers: SEED_SUPPLIERS,
  quotations: SEED_QUOTATIONS,
  notifications: SEED_NOTIFICATIONS,
  settings: { whatsapp_template: DEFAULT_WA_TEMPLATE },
  toasts: [],
  loggedIn: false,
  waConnectOpen: false,
  route: { name: 'login', params: {} },
};

function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }
function nextQuoteNumber(arr) {
  const max = arr.reduce((m, q) => {
    const n = parseInt((q.quote_number.split('-').pop() || '0'), 10);
    return Math.max(m, n);
  }, 0);
  return 'COT-2026-' + String(max + 1).padStart(4, '0');
}

function reducer(state, action) {
  switch (action.type) {
    case 'login':
      return { ...state, currentUserId: action.userId, loggedIn: true, route: { name: 'dashboard', params: {} } };
    case 'upsert_user': {
      const idx = state.users.findIndex(u => u.id === action.user.id);
      if (idx >= 0) return { ...state, users: state.users.map(u => u.id === action.user.id ? { ...u, ...action.user } : u) };
      return { ...state, users: [...state.users, action.user] };
    }
    case 'set_users':
      return { ...state, users: action.users };
    case 'logout':
      return { ...state, loggedIn: false, route: { name: 'login', params: {} } };
    case 'navigate':
      return { ...state, route: { name: action.name, params: action.params || {} } };
    case 'switch_role': {
      const u = state.users.find(u => u.role === action.role && u.active);
      if (!u) return state;
      // Reset WA status on switch — avoids stale localStorage leaking across users
      return {
        ...state,
        currentUserId: u.id,
        users: state.users.map(x => x.id === u.id ? { ...x, whatsapp_connected: false } : x),
      };
    }
    case 'create_quotation': {
      const id = nextId(state.quotations);
      const quote_number = nextQuoteNumber(state.quotations);
      const user = state.users.find(u => u.id === state.currentUserId);
      const items = action.payload.items.map((it, i) => ({
        id: Date.now() + i,
        part_name: it.part_name,
        part_code: it.part_code || null,
        quantity: it.quantity,
        unit_price: null, total_price: null,
        labor_cost_compras: null, delivery_days: null, supplier_name: null,
        item_status: 'aguardando', notes: null,
      }));
      const q = {
        id, quote_number, status: 'pendente',
        customer_name: action.payload.customer_name,
        customer_phone: action.payload.customer_phone,
        vehicle: action.payload.vehicle,
        created_by_user_id: state.currentUserId,
        assigned_buyer_id: null,
        creator_name: user.name, buyer_name: null,
        notes_vendas: action.payload.notes_vendas || '',
        notes_compras: null,
        photo_path: action.payload.photo_path || null,
        customer_approved: null,
        whatsapp_sent_at: null,
        created_at: new Date().toISOString(),
        messages: [],
        items,
      };
      // Add a notification for compras users
      const buyers = state.users.filter(u => u.role === 'compras' && u.active);
      const notifs = buyers.map((b, i) => ({
        id: nextId(state.notifications) + i,
        user_id: b.id,
        type: 'nova_cotacao',
        title: `Nova cotação #${quote_number}`,
        message: `${user.name} abriu cotação — ${q.vehicle.model} ${q.vehicle.plate}`,
        read_at: null,
        quotation_id: id,
        created_at: q.created_at,
        time_label: 'agora',
      }));
      const existingCustomer = state.customers.find(c => c.phone === action.payload.customer_phone);
      const newCustomers = existingCustomer
        ? state.customers
        : [...state.customers, {
            id: nextId(state.customers),
            name: action.payload.customer_name,
            phone: action.payload.customer_phone,
            created_at: q.created_at,
            updated_at: q.created_at,
          }];
      return {
        ...state,
        quotations: [q, ...state.quotations],
        customers: newCustomers,
        notifications: [...notifs, ...state.notifications],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: `Cotação ${quote_number} criada` }],
        route: { name: 'quotation-detail', params: { id } },
      };
    }
    case 'assign_quotation': {
      const user = state.users.find(u => u.id === state.currentUserId);
      const quotations = state.quotations.map(q =>
        q.id === action.id
          ? { ...q, status: 'em_cotacao', assigned_buyer_id: state.currentUserId, buyer_name: user.name, items: q.items.map(it => ({ ...it, item_status: 'em_cotacao' })) }
          : q
      );
      const q = quotations.find(x => x.id === action.id);
      const notif = {
        id: nextId(state.notifications),
        user_id: q.created_by_user_id,
        type: 'status_atualizado',
        title: `Cotação #${q.quote_number} em cotação`,
        message: `${user.name} assumiu sua cotação.`,
        read_at: null, quotation_id: q.id, created_at: new Date().toISOString(), time_label: 'agora',
      };
      return { ...state, quotations, notifications: [notif, ...state.notifications],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Cotação assumida' }] };
    }
    case 'respond_quotation': {
      const { id, items, notes_compras } = action.payload;
      const user = state.users.find(u => u.id === state.currentUserId);
      const quotations = state.quotations.map(q => {
        if (q.id !== id) return q;
        return {
          ...q, status: 'cotado',
          notes_compras: notes_compras || q.notes_compras,
          items: q.items.map(it => {
            const update = items.find(x => x.id === it.id);
            if (!update) return it;
            return {
              ...it,
              unit_price: Number(update.unit_price) || 0,
              total_price: (Number(update.unit_price) || 0) * (it.quantity || 1),
              labor_cost_compras: Number(update.labor_cost_compras) || 0,
              delivery_days: Number(update.delivery_days) || 0,
              supplier_name: update.supplier_name || null,
              notes: update.notes || null,
              item_status: 'cotado',
            };
          }),
        };
      });
      const q = quotations.find(x => x.id === id);
      const notif = {
        id: nextId(state.notifications),
        user_id: q.created_by_user_id,
        type: 'cotacao_respondida',
        title: `Cotação #${q.quote_number} respondida`,
        message: `${user.name} preencheu os valores.`,
        read_at: null, quotation_id: q.id, created_at: new Date().toISOString(), time_label: 'agora',
      };
      return { ...state, quotations, notifications: [notif, ...state.notifications],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Cotação respondida' }] };
    }
    case 'mark_arrived': {
      const quotations = state.quotations.map(q =>
        q.id === action.id ? { ...q, status: 'peca_chegou', items: q.items.map(it => ({ ...it, item_status: 'peca_chegou', arrived_at: new Date().toISOString() })) } : q
      );
      const q = quotations.find(x => x.id === action.id);
      const notif = {
        id: nextId(state.notifications),
        user_id: q.created_by_user_id,
        type: 'peca_chegou',
        title: `Peça chegou — Cotação #${q.quote_number}`,
        message: `Avise o cliente!`,
        read_at: null, quotation_id: q.id, created_at: new Date().toISOString(), time_label: 'agora',
      };
      return { ...state, quotations, notifications: [notif, ...state.notifications],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Marcado como peça chegou' }] };
    }
    case 'cancel_quotation':
      return {
        ...state,
        quotations: state.quotations.map(q => q.id === action.id ? { ...q, status: 'cancelado' } : q),
        toasts: [...state.toasts, { id: Date.now(), type: 'error', message: 'Cotação cancelada' }],
      };
    case 'customer_response':
      return {
        ...state,
        quotations: state.quotations.map(q => q.id === action.id
          ? { ...q, customer_approved: action.approved ? 1 : 0, customer_approval_source: action.source || null }
          : q),
        toasts: [...state.toasts, { id: Date.now(), type: action.approved ? 'success' : 'error', message: action.approved ? 'Cliente aprovou' : 'Cliente recusou' }],
      };
    case 'add_notification':
      return {
        ...state,
        notifications: [action.notification, ...state.notifications.filter(n => n.id !== action.notification.id)],
      };
    case 'upsert_quotation': {
      const q = action.quotation;
      const exists = state.quotations.some(x => x.id === q.id);
      return {
        ...state,
        quotations: exists
          ? state.quotations.map(x => x.id === q.id ? { ...x, ...q } : x)
          : [q, ...state.quotations],
      };
    }
    case 'load_quotations': {
      // Substitui a lista local pelos dados do backend, preservando items já carregados
      const incoming = action.quotations.map(q =>
        normalizeQuotation(q, state.quotations.find(x => x.id === q.id)?.items)
      );
      // Mantém cotações locais que o backend não retornou (criadas offline)
      const incomingIds = new Set(incoming.map(q => q.id));
      const localOnly = state.quotations.filter(q => !incomingIds.has(q.id));
      return { ...state, quotations: [...incoming, ...localOnly] };
    }
    case 'send_whatsapp': {
      const approvalExpires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      return {
        ...state,
        quotations: state.quotations.map(q => q.id === action.id
          ? { ...q, whatsapp_sent_at: new Date().toISOString(), approval_token: action.approvalToken || null, approval_token_expires_at: approvalExpires }
          : q),
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'WhatsApp enviado! Link de aprovação gerado.', duration: 3200 }],
      };
    }
    case 'open_wa_connect':
      return { ...state, waConnectOpen: true };
    case 'close_wa_connect':
      return { ...state, waConnectOpen: false };
    case 'whatsapp_connect':
      return {
        ...state,
        waConnectOpen: false,
        users: state.users.map(u => u.id === action.userId
          ? { ...u, whatsapp_connected: true, whatsapp_instance: `cotou-user-${action.userId}` }
          : u
        ),
      };
    case 'whatsapp_disconnect':
      return {
        ...state,
        users: state.users.map(u => u.id === action.userId
          ? { ...u, whatsapp_connected: false, whatsapp_instance: null }
          : u
        ),
      };
    case 'mark_notification_read':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.id ? { ...n, read_at: new Date().toISOString() } : n),
      };
    case 'mark_all_read':
      return {
        ...state,
        notifications: state.notifications.map(n => n.user_id === state.currentUserId ? { ...n, read_at: n.read_at || new Date().toISOString() } : n),
      };
    case 'clear_notifications':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.user_id !== state.currentUserId),
      };
    case 'add_part':
      return { ...state, parts: [{ id: nextId(state.parts), ...action.payload }, ...state.parts],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Peça adicionada ao catálogo' }] };
    case 'update_part':
      return { ...state, parts: state.parts.map(p => p.id === action.id ? { ...p, ...action.payload } : p),
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Peça atualizada' }] };
    case 'delete_part':
      return { ...state, parts: state.parts.filter(p => p.id !== action.id),
        toasts: [...state.toasts, { id: Date.now(), type: 'error', message: 'Peça removida' }] };
    case 'add_user':
      return { ...state, users: [{ id: nextId(state.users), active: true, created_at: new Date().toISOString(), ...action.payload }, ...state.users],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Usuário criado' }] };
    case 'update_user':
      return { ...state, users: state.users.map(u => u.id === action.id ? { ...u, ...action.payload } : u),
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Usuário atualizado' }] };
    case 'toggle_user_active':
      return { ...state, users: state.users.map(u => u.id === action.id ? { ...u, active: !u.active } : u) };
    case 'update_settings':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'update_customer':
      return { ...state, customers: state.customers.map(c => c.id === action.id ? { ...c, ...action.payload } : c),
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Cliente atualizado' }] };
    case 'add_supplier':
      return { ...state, suppliers: [...state.suppliers, { id: nextId(state.suppliers), active: 1, created_at: new Date().toISOString(), ...action.payload }],
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Fornecedor adicionado' }] };
    case 'update_supplier':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.id ? { ...s, ...action.payload } : s),
        toasts: [...state.toasts, { id: Date.now(), type: 'success', message: 'Fornecedor atualizado' }] };
    case 'remove_supplier':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.id ? { ...s, active: 0 } : s),
        toasts: [...state.toasts, { id: Date.now(), type: 'error', message: 'Fornecedor removido' }] };
    case 'toast':
      return { ...state, toasts: [...state.toasts, {
        id: Date.now(),
        type: action.tone || 'info',
        message: action.message,
        detail: action.detail || null,
        quotationId: action.quotationId || null,
        duration: action.duration || 3200,
      }] };
    case 'dismiss_toast':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    case 'send_message': {
      const { quotationId, text } = action;
      const qt = state.quotations.find(q => q.id === quotationId);
      const sender = state.users.find(u => u.id === state.currentUserId);
      const newMsg = { id: Date.now(), from: state.currentUserId, text, ts: new Date().toISOString() };
      const otherUserId = sender.role === 'vendas' ? qt.assigned_buyer_id : qt.created_by_user_id;
      const notif = otherUserId ? {
        id: nextId(state.notifications),
        user_id: otherUserId,
        type: 'nova_mensagem',
        title: `Nova mensagem em ${qt.quote_number}`,
        message: `${sender.name}: ${text.length > 60 ? text.slice(0, 57) + '…' : text}`,
        read_at: null, quotation_id: quotationId,
        created_at: newMsg.ts, time_label: 'agora',
      } : null;
      return {
        ...state,
        quotations: state.quotations.map(q =>
          q.id === quotationId ? { ...q, messages: [...(q.messages || []), newMsg] } : q
        ),
        notifications: notif ? [notif, ...state.notifications] : state.notifications,
      };
    }
    default:
      return state;
  }
}

function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = localStorage.getItem('cotou_state');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved._v === STATE_VERSION) {
          return { ...init, ...saved, toasts: [], waConnectOpen: false };
        }
      }
    } catch (_) {}
    return init;
  });

  useEffect(() => {
    const { toasts, waConnectOpen, ...persist } = state;
    localStorage.setItem('cotou_state', JSON.stringify({ ...persist, _v: STATE_VERSION }));
  }, [state]);

  // Restaura o token CSRF ao recarregar com sessão persistida do localStorage —
  // sem isso toda mutação (POST/PUT/DELETE) falha com 403 pois _csrfToken só é
  // setado na resposta do /auth/login, que não roda de novo num reload.
  useEffect(() => {
    if (!state.loggedIn) return;
    fetch(`${PLATE_PROXY_URL}/auth/csrf`, { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { dispatch({ type: 'logout' }); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => { if (data?.csrfToken) _csrfToken = data.csrfToken; })
      .catch(() => {});
  }, [state.loggedIn]);

  // Sincroniza cotações do backend ao logar
  useEffect(() => {
    if (!state.loggedIn) return;
    fetch(`${PLATE_PROXY_URL}/cotacoes?limit=500`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ok && Array.isArray(data.items)) {
          dispatch({ type: 'load_quotations', quotations: data.items });
        }
      })
      .catch(() => {});
  }, [state.loggedIn]);

  // Carrega notificações não lidas do backend ao logar (captura notificações recebidas offline)
  useEffect(() => {
    if (!state.loggedIn) return;
    fetch(`${PLATE_PROXY_URL}/api/notificacoes`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          data.forEach(n => dispatch({ type: 'add_notification', notification: {
            id: n.id,
            user_id: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            quotation_id: n.quotation_id,
            read_at: n.read_at,
            created_at: n.created_at,
          }}));
        }
      })
      .catch(() => {});
  }, [state.loggedIn]);

  // Pede permissão de notificação do browser ao logar
  useEffect(() => {
    if (!state.loggedIn) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [state.loggedIn]);

  // Socket.io — conecta quando logado, desconecta ao sair
  useEffect(() => {
    if (!state.loggedIn || !state.currentUserId) return;
    if (typeof io === 'undefined') return;

    const socket = io(PLATE_PROXY_URL, { withCredentials: true, transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('registrar', { userId: state.currentUserId });
    });

    socket.on('nova_notificacao', (notif) => {
      dispatch({ type: 'add_notification', notification: {
        id: notif.id,
        user_id: state.currentUserId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        quotation_id: notif.quotationId,
        read_at: null,
        created_at: notif.createdAt || new Date().toISOString(),
      }});
      dispatch({ type: 'toast', tone: 'info', message: notif.title, detail: notif.message, quotationId: notif.quotationId, duration: 7000 });
      // Notificação do browser quando aba não está em foco
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try {
          const bn = new Notification(notif.title, { body: notif.message, icon: '/favicon.ico' });
          bn.onclick = () => { window.focus(); bn.close(); };
          setTimeout(() => bn.close(), 8000);
        } catch {}
      }
    });

    socket.on('quotation_updated', ({ id, customer_approved, customer_approved_at, customer_approval_source }) => {
      dispatch({ type: 'customer_response', id, approved: customer_approved === 1, source: customer_approval_source });
      dispatch({ type: 'toast', tone: customer_approved === 1 ? 'success' : 'error',
        message: customer_approved === 1 ? '✅ Cliente aprovou a cotação!' : '❌ Cliente recusou a cotação.' });
    });

    return () => socket.disconnect();
  }, [state.loggedIn, state.currentUserId]);

  const value = useMemo(() => {
    const currentUser = state.users.find(u => u.id === state.currentUserId);
    const myNotifs = state.notifications
      .filter(n => n.user_id === state.currentUserId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const unreadCount = myNotifs.filter(n => !n.read_at).length;
    return { state, dispatch, currentUser, myNotifs, unreadCount, calcTotals };
  }, [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStore() { return useContext(StoreContext); }

/* =========================================================
   Formatters
   ========================================================= */

// SQLite devolve "YYYY-MM-DD HH:MM:SS" sem fuso — tratar como UTC
const parseUTC = (iso) => new Date(iso && !iso.includes('T') ? iso.replace(' ', 'T') + 'Z' : iso);

const fmt = {
  brl: (v) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })),
  brlShort: (v) => (v == null ? '—' : 'R$ ' + Math.round(v).toLocaleString('pt-BR')),
  date: (iso) => {
    if (!iso) return '—';
    return parseUTC(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  },
  datetime: (iso) => {
    if (!iso) return '—';
    return parseUTC(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
  time: (iso) => {
    if (!iso) return '—';
    return parseUTC(iso).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
  ago: (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - parseUTC(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d`;
    return parseUTC(iso).toLocaleDateString('pt-BR');
  },
  phone: (p) => {
    if (!p) return '—';
    const s = String(p).replace(/\D/g, '');
    if (s.length === 11) return `(${s.slice(0,2)}) ${s.slice(2,7)}-${s.slice(7)}`;
    if (s.length === 10) return `(${s.slice(0,2)}) ${s.slice(2,6)}-${s.slice(6)}`;
    return p;
  },
  plate: (p) => p ? String(p).toUpperCase() : '—',
};

function plural(n, sing, plur) { return `${n} ${n === 1 ? sing : plur}`; }
window.plural = plural;

const STATUS_META = {
  pendente:    { label: 'Pendente',     icon: 'bi-hourglass-split', order: 0 },
  em_cotacao:  { label: 'Em cotação',   icon: 'bi-currency-exchange', order: 1 },
  cotado:      { label: 'Cotado',       icon: 'bi-check2-square', order: 2 },
  peca_chegou: { label: 'Peça chegou',  icon: 'bi-box-seam', order: 3 },
  cancelado:   { label: 'Cancelado',    icon: 'bi-x-circle', order: -1 },
};
const ROLE_META = {
  vendas:  { label: 'Vendas',  icon: 'bi-person-vcard' },
  compras: { label: 'Compras', icon: 'bi-bag-check' },
  admin:   { label: 'Admin',   icon: 'bi-shield-lock' },
};

Object.assign(window, {
  StoreProvider, useStore, fmt, STATUS_META, ROLE_META, PLATE_PROXY_URL,
});

