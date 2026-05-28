const axios = require('axios');
const Settings = require('../models/Settings');

const DEFAULT_INTRO = 'Sua cotação está pronta! Veja os detalhes abaixo:';
const DEFAULT_OUTRO = 'Confirma para encomendarmos? 😊';

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

function buildMessage(quotation, items, approvalToken) {
  const laborTotal = items.reduce((s, i) => s + (i.labor_cost_compras || i.labor_cost_vendas || 0), 0);
  const partsTotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
  const grandTotal = partsTotal + laborTotal;

  const itensTexto = items.map(i => {
    let linha = `• ${i.part_name}`;
    if (i.part_code) linha += ` (Cód: ${i.part_code})`;
    if (i.total_price) linha += ` — R$ ${i.total_price.toFixed(2)}`;
    if (i.delivery_days) linha += ` | Prazo: ${i.delivery_days} dias`;
    return linha;
  }).join('\n');

  const deliveryDays = items.filter(i => i.delivery_days).map(i => i.delivery_days);
  const prazoTexto = deliveryDays.length
    ? `⏱ Prazo estimado de entrega: ${Math.max(...deliveryDays)} dias úteis`
    : '';

  const intro = Settings.get('whatsapp_intro') || DEFAULT_INTRO;
  const outro = Settings.get('whatsapp_outro') || DEFAULT_OUTRO;

  const vehicle = `${quotation.make || ''} ${quotation.model || ''} ${quotation.year_model || ''}`.trim();
  const laborLine = laborTotal > 0 ? `🔧 Mão de obra: R$ ${laborTotal.toFixed(2)}\n` : '';

  const appUrl = process.env.APP_URL || '';
  const approvalLine = approvalToken && appUrl
    ? `\n\n✅ *Aprovação rápida:*\n${appUrl}/aprovar/${approvalToken}\n_(válido por 48h)_`
    : '';

  return `Olá, *${quotation.customer_name}*! 👋

${intro}

🚗 *Veículo:* ${vehicle} — Placa ${quotation.license_plate}

📦 *Peças cotadas:*
${itensTexto}

${laborLine}💰 *Total estimado: R$ ${grandTotal.toFixed(2)}*
${prazoTexto}

${outro}${approvalLine}`;
}

function getClient() {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiUrl || !apiKey) throw new Error('WhatsApp API não configurada. Verifique WHATSAPP_API_URL e WHATSAPP_API_KEY no .env');
  return { apiUrl, apiKey };
}

async function sendQuoteMessage(customerPhone, quotation, items, instanceName) {
  const { apiUrl, apiKey } = getClient();
  const instance = instanceName || process.env.WHATSAPP_INSTANCE_NAME;
  if (!instance) throw new Error('Instância WhatsApp não definida. Conecte seu WhatsApp nas configurações.');

  const number = formatPhone(customerPhone);
  const text = buildMessage(quotation, items);

  const { data } = await axios.post(
    `${apiUrl}/message/sendText/${instance}`,
    { number, text },
    { headers: { apikey: apiKey }, timeout: 15000 }
  );

  return { ok: true, data };
}

async function createInstance(instanceName) {
  const { apiUrl, apiKey } = getClient();
  const { data } = await axios.post(
    `${apiUrl}/instance/create`,
    { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
    { headers: { apikey: apiKey }, timeout: 15000 }
  );
  return data;
}

async function getQRCode(instanceName) {
  const { apiUrl, apiKey } = getClient();
  const { data } = await axios.get(
    `${apiUrl}/instance/connect/${instanceName}`,
    { headers: { apikey: apiKey }, timeout: 15000 }
  );
  return data;
}

async function getStatus(instanceName) {
  const { apiUrl, apiKey } = getClient();
  const { data } = await axios.get(
    `${apiUrl}/instance/connectionState/${instanceName}`,
    { headers: { apikey: apiKey }, timeout: 10000 }
  );
  const connected = data?.instance?.state === 'open';
  return { connected, state: data?.instance?.state };
}

async function deleteInstance(instanceName) {
  const { apiUrl, apiKey } = getClient();
  await axios.delete(
    `${apiUrl}/instance/delete/${instanceName}`,
    { headers: { apikey: apiKey }, timeout: 10000 }
  );
}

module.exports = { sendQuoteMessage, buildMessage, createInstance, getQRCode, getStatus, deleteInstance };
