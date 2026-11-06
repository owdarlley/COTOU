const { db } = require('../config/database');

class Settings {
  static async get(key, fallback = null) {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  }

  static async set(key, value) {
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value));
  }

  static async getAll() {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  }
}

module.exports = Settings;
