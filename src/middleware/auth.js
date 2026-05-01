function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).render('errors/403', { title: 'Acesso Negado' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
