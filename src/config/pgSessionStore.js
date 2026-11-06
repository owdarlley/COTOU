'use strict';

const session = require('express-session');
const { db } = require('./database');

/** Store de sessões do express-session em PostgreSQL (tabela `sessions`). */
class PgSessionStore extends session.Store {
  constructor({ ttlSeconds = 28800 } = {}) {
    super();
    this.ttl = ttlSeconds;
  }

  expiresFrom(sess) {
    const exp = sess && sess.cookie && sess.cookie.expires;
    return exp ? new Date(exp) : new Date(Date.now() + this.ttl * 1000);
  }

  get(sid, cb) {
    db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > now()').get(sid)
      .then((row) => cb(null, row ? JSON.parse(row.sess) : null))
      .catch(cb);
  }

  set(sid, sess, cb = () => {}) {
    db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
                ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expires = EXCLUDED.expires`)
      .run(sid, JSON.stringify(sess), this.expiresFrom(sess).toISOString())
      .then(() => cb(null))
      .catch(cb);
  }

  destroy(sid, cb = () => {}) {
    db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid).then(() => cb(null)).catch(cb);
  }

  touch(sid, sess, cb = () => {}) {
    db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?')
      .run(this.expiresFrom(sess).toISOString(), sid)
      .then(() => cb(null))
      .catch(cb);
  }
}

module.exports = PgSessionStore;
