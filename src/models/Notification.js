const { db } = require('../config/database');

class Notification {
  static async create({ userId, quotationId, type, title, message, quotationItemId }) {
    const result = await db.prepare(
      'INSERT INTO notifications (user_id, quotation_id, quotation_item_id, type, title, message) VALUES (?,?,?,?,?,?)'
    ).run(userId, quotationId || null, quotationItemId || null, type, title, message);
    return await db.prepare('SELECT * FROM notifications WHERE id = ?').get(Number(result.lastInsertRowid));
  }

  static async findByUserId(userId, { onlyUnread = false, page = 1, limit = 20 } = {}) {
    const where = onlyUnread ? 'WHERE user_id = ? AND read_at IS NULL' : 'WHERE user_id = ?';
    const offset = (page - 1) * limit;
    const items = await db.prepare(`
      SELECT n.*, q.quote_number FROM notifications n
      LEFT JOIN quotations q ON q.id = n.quotation_id
      ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `).all(userId, limit, offset);
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM notifications ${where}`).get(userId)).count;
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  static async markRead(id, userId) {
    await db.prepare("UPDATE notifications SET read_at=datetime('now') WHERE id=? AND user_id=? AND read_at IS NULL").run(id, userId);
  }

  static async markAllRead(userId) {
    await db.prepare("UPDATE notifications SET read_at=datetime('now') WHERE user_id=? AND read_at IS NULL").run(userId);
  }

  static async countUnread(userId) {
    return (await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND read_at IS NULL').get(userId)).count;
  }

  static async deleteAll(userId) {
    await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  }

  static async hasUnreadOfType(userId, type) {
    return !!(await db.prepare('SELECT 1 FROM notifications WHERE user_id=? AND type=? AND read_at IS NULL LIMIT 1').get(userId, type));
  }

  static async findRecent(userId, limit = 5) {
    return await db.prepare(`
      SELECT n.*, q.quote_number FROM notifications n
      LEFT JOIN quotations q ON q.id = n.quotation_id
      WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?
    `).all(userId, limit);
  }
}

module.exports = Notification;
