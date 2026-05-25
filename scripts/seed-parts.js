const { db, runMigrations } = require('../src/config/database');

runMigrations();

const parts = [
  // Freios
  { code: 'PF-1023', name: 'Pastilha de Freio Dianteira',     category: 'Freios',      description: 'Kit com 4 pastilhas',       default_price: 89.90 },
  { code: 'PF-2044', name: 'Pastilha de Freio Traseira',      category: 'Freios',      description: 'Kit com 4 pastilhas',       default_price: 79.90 },
  { code: 'DF-4401', name: 'Disco de Freio Dianteiro',        category: 'Freios',      description: 'Par de discos ventilados',  default_price: 210.00 },
  { code: 'DF-4402', name: 'Disco de Freio Traseiro',         category: 'Freios',      description: 'Par de discos sólidos',     default_price: 180.00 },
  { code: 'CF-0011', name: 'Fluido de Freio DOT 4',           category: 'Freios',      description: 'Frasco 500ml',              default_price: 32.00 },

  // Suspensão
  { code: 'AT-2210', name: 'Amortecedor Traseiro',            category: 'Suspensão',   description: 'Par com mola',              default_price: 380.00 },
  { code: 'AD-1100', name: 'Amortecedor Dianteiro',           category: 'Suspensão',   description: 'Par com mola',              default_price: 420.00 },
  { code: 'BA-0055', name: 'Batente de Amortecedor',          category: 'Suspensão',   description: 'Kit 4 peças',               default_price: 65.00 },
  { code: 'CA-9981', name: 'Coxim do Amortecedor',            category: 'Suspensão',   description: 'Par dianteiro',             default_price: 95.00 },
  { code: 'BR-3310', name: 'Barra Estabilizadora Dianteira',  category: 'Suspensão',   description: 'Com buchas',                default_price: 140.00 },
  { code: 'BU-0021', name: 'Bucha da Bandeja',                category: 'Suspensão',   description: 'Kit 4 peças',               default_price: 55.00 },

  // Motor
  { code: 'FO-1122', name: 'Filtro de Óleo',                  category: 'Motor',       description: 'Rosca 3/4-16',              default_price: 28.00 },
  { code: 'FA-3344', name: 'Filtro de Ar',                    category: 'Motor',       description: 'Elemento filtrante',        default_price: 42.00 },
  { code: 'FC-5566', name: 'Filtro de Cabine',                category: 'Motor',       description: 'Dupla função carvão ativo', default_price: 38.00 },
  { code: 'OM-5W30', name: 'Óleo Motor 5W30 4L',              category: 'Motor',       description: 'Sintético API SN',          default_price: 95.00 },
  { code: 'OM-10W40',name: 'Óleo Motor 10W40 4L',             category: 'Motor',       description: 'Semi-sintético',            default_price: 72.00 },
  { code: 'TT-0093', name: 'Termostato',                      category: 'Motor',       description: 'Com alojamento',            default_price: 85.00 },
  { code: 'BD-5510', name: 'Bomba D\'Água',                   category: 'Motor',       description: 'Com junta',                 default_price: 165.00 },
  { code: 'CDK-221', name: 'Kit Correia Dentada',             category: 'Motor',       description: 'Correia + tensor + rolete', default_price: 220.00 },
  { code: 'VE-0088', name: 'Vela de Ignição',                 category: 'Motor',       description: 'Iridium (jogo 4)',          default_price: 140.00 },
  { code: 'BO-1144', name: 'Bobina de Ignição',               category: 'Motor',       description: 'Individual',                default_price: 110.00 },

  // Embreagem
  { code: 'KE-7731', name: 'Kit Embreagem Completo',          category: 'Embreagem',   description: 'Disco + platô + rolamento', default_price: 480.00 },
  { code: 'CE-1104', name: 'Cabo de Embreagem',               category: 'Embreagem',   description: 'Regulagem automática',      default_price: 45.00 },

  // Elétrica
  { code: 'SE-6612', name: 'Sensor de Estacionamento Traseiro',category: 'Elétrica',   description: 'Kit 4 sensores',            default_price: 35.00 },
  { code: 'CE-7741', name: 'Central de Estacionamento',       category: 'Elétrica',    description: 'Universal',                 default_price: 180.00 },
  { code: 'BAT-60',  name: 'Bateria 60Ah',                    category: 'Elétrica',    description: 'Selada livre de manutenção',default_price: 380.00 },
  { code: 'AL-0033', name: 'Alternador',                      category: 'Elétrica',    description: 'Remanufaturado',            default_price: 520.00 },
  { code: 'AN-0044', name: 'Motor de Arranque',               category: 'Elétrica',    description: 'Remanufaturado',            default_price: 450.00 },
  { code: 'SX-1122', name: 'Sensor de Oxigênio (Sonda Lambda)',category: 'Elétrica',   description: 'Universal 4 fios',          default_price: 195.00 },

  // Vidros e Carroceria
  { code: 'VT-3302', name: 'Vidro Traseiro Liso',             category: 'Carroceria',  description: 'Original',                  default_price: 320.00 },
  { code: 'VD-1010', name: 'Vidro Dianteiro',                 category: 'Carroceria',  description: 'Com faixa',                 default_price: 580.00 },
  { code: 'RP-4411', name: 'Retrovisor Esquerdo Completo',    category: 'Carroceria',  description: 'Com elétrico e espelho',    default_price: 145.00 },

  // Transmissão
  { code: 'CV-5501', name: 'Coifa de Semi-eixo',              category: 'Transmissão', description: 'Kit com grampos',           default_price: 48.00 },
  { code: 'SE-3301', name: 'Semi-eixo Direito',               category: 'Transmissão', description: 'Remanufaturado',            default_price: 310.00 },
  { code: 'SE-3302', name: 'Semi-eixo Esquerdo',              category: 'Transmissão', description: 'Remanufaturado',            default_price: 310.00 },

  // Direção
  { code: 'BC-2211', name: 'Bomba de Direção Hidráulica',     category: 'Direção',     description: 'Remanufaturada',            default_price: 480.00 },
  { code: 'MC-0012', name: 'Manga de Eixo Dianteira',         category: 'Direção',     description: 'Com rolamento',             default_price: 175.00 },
  { code: 'RE-1133', name: 'Rolamento de Roda Dianteiro',     category: 'Direção',     description: 'Kit completo',              default_price: 95.00 },
];

let inserted = 0;
let skipped = 0;

db.exec('BEGIN');
try {
  const stmt = db.prepare('INSERT OR IGNORE INTO parts_catalog (code, name, description, default_price) VALUES (?,?,?,?)');
  for (const p of parts) {
    const r = stmt.run(p.code, p.name, p.description, p.default_price);
    if (r.changes > 0) inserted++;
    else skipped++;
  }
  db.exec('COMMIT');
  console.log(`✓ Catálogo populado: ${inserted} peças inseridas, ${skipped} já existiam.`);
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}
