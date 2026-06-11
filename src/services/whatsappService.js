const axios = require('axios');
const https = require('https');
const Settings = require('../models/Settings');
const { formatPhoneForWhatsApp } = require('../utils/phone');

// Self-hosted Evolution API uses self-signed cert — skip TLS verification
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const DEFAULT_TEMPLATE = `Olá, [NOME DO CLIENTE]! 👋

Sua cotação está pronta! Veja os detalhes abaixo:

🚗 *Veículo:* [VEÍCULO] — Placa [PLACA]

📦 *Peças cotadas:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]💰 *Total estimado: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Para confirmar ou recusar, responda com:
*1* — ✅ Confirmar pedido
*2* — ❌ Não tenho interesse`;

function buildShortMessage(quotation, items) {
  const partsTotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
  const laborTotal = items.reduce((s, i) => s + (i.labor_cost_compras || i.labor_cost_vendas || 0), 0);
  const grandTotal = partsTotal + laborTotal;
  const vehicle = [quotation.make, quotation.model, quotation.year_model].filter(Boolean).join(' ');
  const itens = items.map(i => {
    let l = `• ${i.part_name}`;
    if (i.total_price) l += ` — R$ ${i.total_price.toFixed(2)}`;
    return l;
  }).join('\n');
  const prazo = items.filter(i => i.delivery_days).map(i => i.delivery_days);
  const prazoLinha = prazo.length ? `\n⏱ *Prazo:* até ${Math.max(...prazo)} dias úteis` : '';
  return `Olá, ${quotation.customer_name}! 👋\n\nSua cotação *${quotation.quote_number}* está pronta!\n\n🚗 *${vehicle}* — Placa ${quotation.license_plate}\n\n📦 *Peças:*\n${itens}${prazoLinha}\n\n💰 *Total: R$ ${grandTotal.toFixed(2)}*\n\nPara confirmar ou recusar, responda com:\n*1* — ✅ Confirmar pedido\n*2* — ❌ Não tenho interesse`;
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

  const vehicle = `${quotation.make || ''} ${quotation.model || ''} ${quotation.year_model || ''}`.trim();
  const laborLine = laborTotal > 0 ? `🔧 Mão de obra: R$ ${laborTotal.toFixed(2)}\n` : '';

  const template = Settings.get('whatsapp_template') || DEFAULT_TEMPLATE;
  let msg = template
    .replace(/\[NOME DO CLIENTE\]/g, quotation.customer_name || '')
    .replace(/\[NÚMERO DA COTAÇÃO\]/g, quotation.quote_number || '')
    .replace(/\[VEÍCULO\]/g, vehicle)
    .replace(/\[PLACA\]/g, quotation.license_plate || '')
    .replace(/\[LISTA DE PEÇAS\]/g, itensTexto)
    .replace(/\[MÃO DE OBRA\]/g, laborLine)
    .replace(/\[TOTAL\]/g, grandTotal.toFixed(2))
    .replace(/\[PRAZO DE ENTREGA\]/g, prazoTexto);

  const appUrl = process.env.APP_URL || '';
  if (approvalToken && appUrl) {
    msg += `\n\n✅ *Aprovação rápida:*\n${appUrl}/aprovar/${approvalToken}\n_(válido por 48h)_`;
  }

  return msg;
}

function getClient() {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiUrl || !apiKey) throw new Error('WhatsApp API não configurada. Verifique WHATSAPP_API_URL e WHATSAPP_API_KEY no .env');
  const headers = { apikey: apiKey };
  const agent = apiUrl.startsWith('https') ? httpsAgent : undefined;
  return { apiUrl, apiKey, headers, agent };
}

function axiosError(err) {
  if (err.response) {
    const body = err.response.data;
    const detail = typeof body === 'object'
      ? (body.message || body.error || JSON.stringify(body))
      : String(body);
    const e = new Error(`Evolution API ${err.response.status}: ${detail}`);
    e.evolutionStatus = err.response.status;
    e.evolutionBody = body;
    return e;
  }
  return err;
}

async function sendQuoteMessage(customerPhone, quotation, items, instanceName, approvalToken) {
  const { apiUrl, headers, agent } = getClient();
  const instance = instanceName || process.env.WHATSAPP_INSTANCE_NAME;
  if (!instance) throw new Error('Instância WhatsApp não definida. Conecte seu WhatsApp nas configurações.');

  const number = formatPhoneForWhatsApp(customerPhone);
  const text = buildMessage(quotation, items, approvalToken);

  try {
    const { data } = await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      { number, text },
      { headers, httpsAgent: agent, timeout: 15000 }
    );
    return { ok: true, data };
  } catch (err) {
    throw axiosError(err);
  }
}

async function sendTextMessage(phone, text, instanceName) {
  const { apiUrl, headers, agent } = getClient();
  const instance = instanceName || process.env.WHATSAPP_INSTANCE_NAME;
  if (!instance) throw new Error('Instância WhatsApp não definida.');
  try {
    const { data } = await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      { number: formatPhoneForWhatsApp(phone), text },
      { headers, httpsAgent: agent, timeout: 15000 }
    );
    return data;
  } catch (err) {
    throw axiosError(err);
  }
}

async function createInstance(instanceName) {
  const { apiUrl, headers, agent } = getClient();
  try {
    const { data } = await axios.post(
      `${apiUrl}/instance/create`,
      { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
      { headers, httpsAgent: agent, timeout: 15000 }
    );
    return data;
  } catch (err) {
    // 403 = instance already exists — not an error, just reuse it
    if (err.response?.status === 403) return { instanceName };
    throw err;
  }
}

async function getQRCode(instanceName) {
  const { apiUrl, headers, agent } = getClient();
  const { data } = await axios.get(
    `${apiUrl}/instance/connect/${instanceName}`,
    { headers, httpsAgent: agent, timeout: 15000 }
  );
  return data;
}

async function getStatus(instanceName) {
  const { apiUrl, headers, agent } = getClient();
  const { data } = await axios.get(
    `${apiUrl}/instance/connectionState/${instanceName}`,
    { headers, httpsAgent: agent, timeout: 10000 }
  );
  const connected = data?.instance?.state === 'open';
  return { connected, state: data?.instance?.state };
}

async function deleteInstance(instanceName) {
  const { apiUrl, headers, agent } = getClient();
  await axios.delete(
    `${apiUrl}/instance/delete/${instanceName}`,
    { headers, httpsAgent: agent, timeout: 10000 }
  );
}

async function logoutInstance(instanceName) {
  const { apiUrl, headers, agent } = getClient();
  await axios.delete(
    `${apiUrl}/instance/logout/${instanceName}`,
    { headers, httpsAgent: agent, timeout: 10000 }
  );
}

async function setWebhook(instanceName, webhookUrl) {
  const { apiUrl, headers, agent } = getClient();
  await axios.post(
    `${apiUrl}/webhook/set/${instanceName}`,
    {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT'],
      },
    },
    { headers, httpsAgent: agent, timeout: 10000 }
  );
}

module.exports = { sendQuoteMessage, sendTextMessage, createInstance, getQRCode, getStatus, deleteInstance, logoutInstance, setWebhook };
