const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const PartsCatalog = require('../models/PartsCatalog');

router.use(requireAuth);

// GET /pecas — lista peças (query: q, page)
router.get('/', (req, res) => {
  const { q = '', page = 1 } = req.query;
  const result = PartsCatalog.findAll({ q, page: parseInt(page) });
  res.json({ ok: true, ...result, q });
});

// POST /pecas — criar peça (admin/compras)
router.post('/', requireRole('admin', 'compras'), (req, res) => {
  const { code, name, description, default_price } = req.body;
  if (!code || !name) {
    return res.status(400).json({ ok: false, error: 'Código e nome são obrigatórios.' });
  }
  try {
    const id = PartsCatalog.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description,
      default_price: parseFloat(default_price) || null
    });
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(409).json({ ok: false, error: 'Código já existe no catálogo.' });
  }
});

// PUT /pecas/:id — atualizar peça
router.put('/:id', requireRole('admin', 'compras'), (req, res) => {
  const { code, name, description, default_price } = req.body;
  PartsCatalog.update(parseInt(req.params.id), {
    code: code ? code.trim().toUpperCase() : undefined,
    name: name ? name.trim() : undefined,
    description,
    default_price: parseFloat(default_price) || null
  });
  res.json({ ok: true });
});

// DELETE /pecas/:id — remover peça
router.delete('/:id', requireRole('admin', 'compras'), (req, res) => {
  PartsCatalog.delete(parseInt(req.params.id));
  res.json({ ok: true });
});

// Manter compatibilidade com rotas POST legacy
router.post('/:id/editar', requireRole('admin', 'compras'), (req, res) => {
  const { code, name, description, default_price } = req.body;
  PartsCatalog.update(parseInt(req.params.id), {
    code: code ? code.trim().toUpperCase() : undefined,
    name: name ? name.trim() : undefined,
    description,
    default_price: parseFloat(default_price) || null
  });
  res.json({ ok: true });
});

router.post('/:id/excluir', requireRole('admin', 'compras'), (req, res) => {
  PartsCatalog.delete(parseInt(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
