function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ ok: false, error: 'Sem permissão' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
