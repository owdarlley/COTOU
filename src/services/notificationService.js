const Notification = require('../models/Notification');

async function notifyUser(userId, { quotationId, quotationItemId, type, title, message }) {
  const notification = Notification.create({ userId, quotationId, quotationItemId, type, title, message });
  const unreadCount = Notification.countUnread(userId);

  try {
    const { getIO } = require('../config/socket');
    getIO().to(`user:${userId}`).emit('nova_notificacao', {
      id: notification.id,
      type,
      title,
      message,
      quotationId,
      unreadCount,
      createdAt: notification.created_at
    });
  } catch (_) {
    // socket não inicializado ainda (seed/tests)
  }

  return notification;
}

async function notifyAllByRole(role, payload) {
  const User = require('../models/User');
  const users = User.findAllByRole(role);
  for (const u of users) {
    await notifyUser(u.id, payload);
  }
}

module.exports = { notifyUser, notifyAllByRole };
