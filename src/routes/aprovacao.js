const express = require('express');
const path = require('path');
const router = express.Router();
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const { notifyUser, notifyAllByRole } = require('../services/notificationService');

// Serve a página pública de aprovação (sem auth)
router.get('/aprovar/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/aprovar.html'));
});

// Dados da cotação pelo token (sem auth)
router.get('/api/aprovar/:token', (req, res) => {
  const q = Quotation.getByApprovalToken(req.params.token);
  if (!q) return res.status(404).json({ ok: false, expired: true, message: 'Link inválido ou expirado.' });
  if (q.customer_approved !== null) return res.status(410).json({ ok: false, used: true, approved: q.customer_approved === 1, message: 'Este link já foi utilizado.' });
  const items = QuotationItem.findByQuotationId(q.id);
  res.json({ ok: true, quotation: q, items });
});

// Cliente confirma ou recusa (sem auth)
router.post('/api/aprovar/:token', express.json(), async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ ok: false, message: 'Ação inválida.' });

  const ip = req.ip || req.connection?.remoteAddress;
  const q = Quotation.useApprovalToken(req.params.token, action === 'approve', ip);
  if (!q) return res.status(410).json({ ok: false, message: 'Link inválido ou expirado.' });

  const label = action === 'approve' ? 'aprovou' : 'recusou';
  const notifPayload = {
    quotationId: q.id,
    type: 'status_atualizado',
    title: `Cliente ${label} a cotação`,
    message: `${q.customer_name} ${label} a cotação ${q.quote_number} via link.`,
  };

  // Notifica o vendedor, compras (se aprovado) e admin
  await notifyUser(q.created_by_user_id, notifPayload);
  if (action === 'approve') await notifyAllByRole('compras', notifPayload);
  await notifyAllByRole('admin', notifPayload);

  // Atualiza a UI em tempo real apenas para quem tem acesso à cotação
  try {
    const { emitQuotationUpdate } = require('../config/socket');
    emitQuotationUpdate(q, {
      id: q.id,
      customer_approved: action === 'approve' ? 1 : 0,
      customer_approved_at: new Date().toISOString(),
      customer_approval_source: 'link',
    });
  } catch (_) {}

  res.json({ ok: true, approved: action === 'approve' });
});

module.exports = router;
