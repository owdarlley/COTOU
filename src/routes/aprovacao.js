const express = require('express');
const path = require('path');
const router = express.Router();
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Notification = require('../models/Notification');
const User = require('../models/User');

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
router.post('/api/aprovar/:token', express.json(), (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ ok: false, message: 'Ação inválida.' });

  const ip = req.ip || req.connection?.remoteAddress;
  const q = Quotation.useApprovalToken(req.params.token, action === 'approve', ip);
  if (!q) return res.status(410).json({ ok: false, message: 'Link inválido ou expirado.' });

  // Notifica o vendedor que criou a cotação
  const type = action === 'approve' ? 'cliente_aprovou' : 'cliente_recusou';
  const label = action === 'approve' ? 'aprovou' : 'recusou';
  Notification.create({
    userId: q.created_by_user_id,
    quotationId: q.id,
    type,
    title: `Cliente ${label} a cotação`,
    message: `${q.customer_name} ${label} a cotação ${q.quote_number}.`,
  });

  res.json({ ok: true, approved: action === 'approve' });
});

module.exports = router;
