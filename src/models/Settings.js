const { db } = require('../config/database');

class Settings {
  static get(key, fallback = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  }

  static set(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, String(value));
  }

  static getAll() {
    return db.prepare('SELECT key, value FROM settings').all()
      .reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  }
}

module.exports = Settings;
