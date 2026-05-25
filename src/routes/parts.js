const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const PartsCatalog = require('../models/PartsCatalog');

router.use(requireAuth);

router.get('/', (req, res) => {
  const { q = '', page = 1 } = req.query;
  const result = PartsCatalog.findAll({ q, page: parseInt(page) });
  res.render('parts/index', { title: 'Catálogo de Peças', parts: result.items, ...result, q });
});

router.post('/', (req, res) => {
  const { code, name, description, default_price } = req.body;
  if (!code || !name) {
    req.session.flash = { error: 'Código e nome são obrigatórios.' };
    return res.redirect('/pecas');
  }
  try {
    PartsCatalog.create({ code: code.trim().toUpperCase(), name: name.trim(), description, default_price: parseFloat(default_price) || null });
    req.session.flash = { success: 'Peça adicionada ao catálogo.' };
  } catch (e) {
    req.session.flash = { error: 'Código já existe no catálogo.' };
  }
  res.redirect('/pecas');
});

router.post('/:id/editar', (req, res) => {
  const { code, name, description, default_price } = req.body;
  PartsCatalog.update(parseInt(req.params.id), {
    code: code.trim().toUpperCase(), name: name.trim(), description,
    default_price: parseFloat(default_price) || null
  });
  req.session.flash = { success: 'Peça atualizada.' };
  res.redirect('/pecas');
});

router.post('/:id/excluir', requireRole('admin', 'compras'), (req, res) => {
  PartsCatalog.delete(parseInt(req.params.id));
  req.session.flash = { success: 'Peça removida.' };
  res.redirect('/pecas');
});

module.exports = router;
