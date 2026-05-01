const User = require('../models/User');
const Notification = require('../models/Notification');

module.exports = async function injectLocals(req, res, next) {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;

  if (req.session.userId) {
    res.locals.currentUser = User.findById(req.session.userId);
    res.locals.unreadCount = Notification.countUnread(req.session.userId);
    res.locals.recentNotifications = Notification.findRecent(req.session.userId, 5);
  } else {
    res.locals.currentUser = null;
    res.locals.unreadCount = 0;
    res.locals.recentNotifications = [];
  }

  next();
};
