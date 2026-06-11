const axios = require('axios');
const { db } = require('../config/database');
const logger = require('../config/logger');

const CACHE_TTL_DAYS = 30;

function getCached(plate) {
  return db.prepare(
    `SELECT data_json FROM plate_cache WHERE plate = ? AND cached_at > datetime('now', '-${CACHE_TTL_DAYS} days')`
  ).get(plate);
}

function setCache(plate, data) {
  try {
    db.prepare('INSERT OR REPLACE INTO plate_cache (plate, data_json, cached_at) VALUES (?, ?, datetime(\'now\'))').run(plate, JSON.stringify(data));
  } catch (_) {}
}

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

  const cached = getCached(clean);
  if (cached) {
    logger.info({ plate: clean }, '[PlateService] cache hit');
    return JSON.parse(cached.data_json);
  }

  try {
    const { data } = await axios.get(`${baseUrl}/consulta/${clean}/${token}`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'COTOU/1.0' }
    });

    if (!data || typeof data !== 'object') return null;

    const hasVehicleData = data.MARCA || data.marca || data.MODELO || data.modelo;
    if (!hasVehicleData) {
      logger.warn({ snippet: JSON.stringify(data).substring(0, 200) }, '[PlateService] sem dados do veículo');
      return null;
    }

    const result = normalize(data);
    if (result) setCache(clean, result);
    return result;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      logger.warn({ status }, '[PlateService] status HTTP inesperado');
      if (status === 401) throw Object.assign(new Error('Placa inválida ou não encontrada.'), { code: 'INVALID_PLATE' });
      if (status === 402) throw Object.assign(new Error('Token da API inválido.'), { code: 'INVALID_TOKEN' });
      if (status === 406) throw Object.assign(new Error('Sem resultados para esta placa.'), { code: 'NO_RESULTS' });
      if (status === 429) throw Object.assign(new Error('Limite de consultas diárias atingido.'), { code: 'RATE_LIMIT' });
    }
    logger.warn({ err }, '[PlateService] erro na consulta de placa');
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
    logger.warn({ err }, '[PlateService] erro ao consultar saldo');
    return null;
  }
}

function findChassis(data) {
  // VIN: 17 chars, somente A-H J-N P-R S-Z 0-9 (sem I O Q)
  const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/i;
  const raw = JSON.stringify(data);
  const match = raw.match(VIN_RE);
  if (match) return match[0].toUpperCase();

  // fallback: campo chassi conhecido, preferindo sem asterisco
  const extra = data.extra || {};
  const candidates = [data.CHASSI, data.chassi, data.chassis, data.CHASSIS, extra.chassi, extra.CHASSI]
    .filter(v => v && typeof v === 'string' && v.trim());
  return candidates.find(v => !v.includes('*')) || candidates[0] || '';
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
    raw: JSON.stringify(data),
  };
}

module.exports = { lookupPlate, getBalance, isValidPlate };
