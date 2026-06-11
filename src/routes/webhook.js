const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const { notifyUser, notifyAllByRole } = require('../services/notificationService');
const { sendTextMessage } = require('../services/whatsappService');

function extractPhone(jid) {
  return String(jid || '').replace(/@.*$/, '').replace(/\D/g, '');
}

router.post('/whatsapp/webhook', express.json({ limit: '1mb' }), async (req, res) => {
  res.json({ ok: true }); // responde imediatamente — a Evolution API não espera processamento

  try {
    const { event, instance, data, apikey } = req.body;

    console.log(`[WH] evento="${event}" instance="${instance}" fromMe=${data?.key?.fromMe}`);

    console.log(`[WH] apikey recebida="${apikey}"`);

    if (event !== 'messages.upsert') {
      console.log(`[WH] evento ignorado: "${event}"`);
      return;
    }
    if (!data || data.key?.fromMe !== false) {
      console.log(`[WH] fromMe=${data?.key?.fromMe}, ignorando`);
      return;
    }

    const remoteJid = data.key?.remoteJid || '';
    if (remoteJid.endsWith('@g.us')) return; // ignora grupos

    const msgType = data.messageType || '';
    let action = null;

    if (msgType === 'buttonsResponseMessage') {
      // Formato legado de botões
      const btnId = data.message?.buttonsResponseMessage?.selectedButtonId;
      if (btnId === 'btn_aprovar') action = 'approve';
      else if (btnId === 'btn_recusar') action = 'reject';
    } else if (msgType === 'interactiveResponseMessage') {
      // Formato atual: nativeFlowMessage (quick_reply)
      try {
        const params = JSON.parse(
          data.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}'
        );
        if (params.id === 'btn_aprovar') action = 'approve';
        else if (params.id === 'btn_recusar') action = 'reject';
      } catch (_) {}
    } else if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
      // Fallback: cliente digita "1" ou "2"
      const text = (
        data.message?.conversation ||
        data.message?.extendedTextMessage?.text ||
        ''
      ).trim();
      if (text === '1') action = 'approve';
      else if (text === '2') action = 'reject';
    }

    if (!action) {
      console.log(`[WH] ${remoteJid} msgType="${msgType}" — sem ação reconhecida`);
      return;
    }

    const phone = extractPhone(remoteJid);
    if (!phone) return;

    console.log(`[WH] ${phone} → ação="${action}"`);
    const quotation = Quotation.findPendingByPhone(phone, instance);
    if (!quotation) {
      console.log(`[WH] nenhuma cotação pendente para ${phone} na instância ${instance}`);
      return;
    }
    console.log(`[WH] cotação encontrada: ${quotation.quote_number}`);

    Quotation.setCustomerApproval(quotation.id, action === 'approve', 'whatsapp');

    const label = action === 'approve' ? 'aprovou' : 'recusou';
    const notifPayload = {
      quotationId: quotation.id,
      type: 'status_atualizado',
      title: `Cliente ${label} a cotação`,
      message: `${quotation.customer_name} ${label} a cotação ${quotation.quote_number} via WhatsApp.`,
    };

    // Deduplicação: cada usuário recebe no máximo uma notificação por evento
    const notifiedIds = new Set();

    const notifyOnce = async (userId) => {
      if (!userId || notifiedIds.has(userId)) return;
      notifiedIds.add(userId);
      await notifyUser(userId, notifPayload);
    };

    await notifyOnce(quotation.created_by_user_id);
    await notifyOnce(quotation.assigned_buyer_id);

    if (action === 'approve') {
      const User = require('../models/User');
      for (const u of User.findAllByRole('compras')) {
        await notifyOnce(u.id);
      }
    }

    // Emite para TODOS os usuários conectados — qualquer um que esteja visualizando a cotação recebe
    try {
      const { getIO } = require('../config/socket');
      getIO().emit('quotation_updated', {
        id: quotation.id,
        customer_approved: action === 'approve' ? 1 : 0,
        customer_approved_at: new Date().toISOString(),
        customer_approval_source: 'whatsapp',
      });
    } catch (_) {}

    const firstName = (quotation.customer_name || '').split(' ')[0];
    const confirmMsg = action === 'approve'
      ? `✅ Perfeito, ${firstName}! Sua confirmação foi registrada. Em breve entraremos em contato.`
      : `😔 Entendemos, ${firstName}. Recusa registrada. Qualquer dúvida, é só chamar!`;

    await sendTextMessage(phone, confirmMsg, instance).catch(() => {});
  } catch (_) {}
});

module.exports = router;
