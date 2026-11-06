const User = require('../models/User');
const Notification = require('../models/Notification');

module.exports = async function injectLocals(req, res, next) {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  res.locals.currentPath = req.path;

  if (req.session && req.session.userId) {
    try {
      res.locals.currentUser = await User.findById(req.session.userId);
      res.locals.unreadCount = await Notification.countUnread(req.session.userId);
      res.locals.recentNotifications = await Notification.findRecent(req.session.userId, 5);
      res.locals.hasRespondida = await Notification.hasUnreadOfType(req.session.userId, 'cotacao_respondida');
    } catch (err) {
      console.error('[locals] Erro ao carregar dados do usuário:', err.message);
      res.locals.currentUser = null;
      res.locals.unreadCount = 0;
      res.locals.recentNotifications = [];
    }
  } else {
    res.locals.currentUser = null;
    res.locals.unreadCount = 0;
    res.locals.recentNotifications = [];
  }

  next();
};
