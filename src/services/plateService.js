const axios = require('axios');

function isValidPlate(plate) {
  const p = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return /^[A-Z]{3}[0-9]{4}$/.test(p) ||        // AAA9999 (formato antigo)
         /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p); // AAA0X00 (Mercosul)
}

async function lookupPlate(plate) {
  const token = process.env.PLATE_API_TOKEN || process.env.APIPLACAS_TOKEN;
  const baseUrl = process.env.PLATE_API_BASE_URL || 'https://wdapi2.com.br';
  const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!token) return null;

  try {
    const { data } = await axios.get(`${baseUrl}/consulta/${clean}/${token}`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'COTOU/1.0' }
    });

    if (!data || typeof data !== 'object') return null;

    const hasVehicleData = data.MARCA || data.marca || data.MODELO || data.modelo;
    if (!hasVehicleData) {
      console.warn('[PlateService] Sem dados do veículo:', JSON.stringify(data).substring(0, 200));
      return null;
    }

    return normalize(data);
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      console.warn('[PlateService] Status HTTP:', status);
      if (status === 401) throw Object.assign(new Error('Placa inválida ou não encontrada.'), { code: 'INVALID_PLATE' });
      if (status === 402) throw Object.assign(new Error('Token da API inválido.'), { code: 'INVALID_TOKEN' });
      if (status === 406) throw Object.assign(new Error('Sem resultados para esta placa.'), { code: 'NO_RESULTS' });
      if (status === 429) throw Object.assign(new Error('Limite de consultas diárias atingido.'), { code: 'RATE_LIMIT' });
    }
    console.warn('[PlateService] Erro na consulta:', err.message);
    return null;
  }
}

async function getBalance() {
  const token = process.env.PLATE_API_TOKEN || process.env.APIPLACAS_TOKEN;
  const baseUrl = process.env.PLATE_API_BASE_URL || 'https://wdapi2.com.br';
  if (!token) return null;
  try {
    const { data } = await axios.get(`${baseUrl}/saldo/${token}`, {
      timeout: 8000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'COTOU/1.0' }
    });
    return data;
  } catch (err) {
    console.warn('[PlateService] Erro ao consultar saldo:', err.message);
    return null;
  }
}

function findChassis(data) {
  // Varre recursivamente todos os campos string procurando um VIN completo (17 chars, sem asterisco)
  const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
  const candidates = [];

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val.trim() && !val.includes('*')) {
        if (VIN_RE.test(val.trim())) candidates.push(val.trim().toUpperCase());
      } else if (typeof val === 'object') {
        walk(val);
      }
    }
  }

  walk(data);
  if (candidates.length) return candidates[0];

  // Fallback: qualquer campo chamado chassi (mesmo mascarado)
  const extra = data.extra || {};
  const masked = [data.CHASSI, data.chassi, data.chassis, data.CHASSIS, extra.chassi, extra.CHASSI]
    .filter(v => v && typeof v === 'string' && v.trim())
    .sort((a, b) => b.length - a.length);
  return masked[0] || '';
}

function normalize(data) {
  if (!data) return null;

  const make  = data.MARCA  || data.marca  || '';
  const model = data.MODELO || data.modelo || '';
  const sub   = data.SUBMODELO || data.submodelo || '';
  const fullModel = (sub && sub !== model) ? `${model} ${sub}`.trim() : model;

  const anoModelo = data.anoModelo || data.ano || '';
  const extra = data.extra || {};
  const anoFab    = extra.ano_fabricacao || anoModelo;
  const combustivel = extra.combustivel || data.combustivel || '';

  // Seleciona o item FIPE com maior score quando houver múltiplos
  const fipeList = Array.isArray(data.fipe) ? data.fipe : [];
  const bestFipe = fipeList.length
    ? fipeList.reduce((best, item) => (item.score > best.score ? item : best), fipeList[0])
    : null;

  return {
    make:       make,
    model:      fullModel,
    year_model: parseInt(anoModelo) || null,
    year_manuf: parseInt(anoFab)    || null,
    color:      data.cor       || '',
    fuel:       combustivel,
    chassis:    findChassis(data),
    city:       data.municipio || extra.municipio || '',
    uf:         data.uf        || extra.uf        || '',
    situation:  data.situacao  || '',
    fipe: bestFipe ? {
      codigo: bestFipe.codigo_fipe,
      valor:  bestFipe.valor_medio_fipe,
      score:  bestFipe.score,
    } : null,
    raw: JSON.stringify(data),
  };
}

module.exports = { lookupPlate, getBalance, isValidPlate };
