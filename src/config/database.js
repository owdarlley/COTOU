'use strict';

/**
 * Acesso ao PostgreSQL (Supabase) com a mesma API usada antes com SQLite:
 *   db.prepare(sql).get(...params)  → Promise<linha | undefined>
 *   db.prepare(sql).all(...params)  → Promise<linhas[]>
 *   db.prepare(sql).run(...params)  → Promise<{ changes, lastInsertRowid }>
 *   db.exec(sql)                    → Promise<void>
 *   db.transaction(async (tx) => {}) → Promise<resultado> (tx tem a mesma API)
 *
 * O SQL escrito em dialeto SQLite é traduzido: `?` → `$n`, datetime('now') → now(),
 * LIKE → ILIKE (SQLite é case-insensitive), strftime('%Y', x) → to_char(x, 'YYYY').
 */

const { AsyncLocalStorage } = require('async_hooks');
const { Pool, types } = require('pg');

// Dentro de db.transaction, todas as queries (inclusive as dos models) usam o mesmo client.
const txStore = new AsyncLocalStorage();

// COUNT(*) e bigint chegam como string no pg; o código espera number.
types.setTypeParser(20, (v) => Number(v));
// timestamptz → 'YYYY-MM-DD HH:MM:SS' (UTC), mesmo formato do SQLite.
types.setTypeParser(1184, (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 19) : v));

const TABLES_WITH_ID = new Set([
  'organizations', 'users', 'customers', 'vehicles', 'parts_catalog', 'quotations',
  'quotation_items', 'notifications', 'audit_log', 'suppliers',
]);

let pool = null;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definida');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 3),
      idleTimeoutMillis: 10000,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function translate(sql) {
  let i = 0;
  return sql
    .replace(/datetime\('now',\s*'(-?\d+)\s*days'\)/gi, "(now() + interval '$1 days')")
    .replace(/datetime\('now',\s*'(-?)\$\{[^}]+\}\s*days'\)/gi, 'now()')
    .replace(/datetime\('now'\)/gi, 'now()')
    .replace(/strftime\('%Y',\s*([a-z_.]+)\)/gi, "to_char($1, 'YYYY')")
    .replace(/\bLIKE\b/g, 'ILIKE')
    .replace(/\?/g, () => `$${++i}`);
}

function makeApi(execute) {
  return {
    prepare(rawSql) {
      const sql = translate(rawSql);
      return {
        async get(...params) {
          const r = await execute(sql, params);
          return r.rows[0];
        },
        async all(...params) {
          const r = await execute(sql, params);
          return r.rows;
        },
        async run(...params) {
          const m = /^\s*INSERT\s+INTO\s+([a-z_]+)/i.exec(sql);
          const wantsId = m && TABLES_WITH_ID.has(m[1].toLowerCase()) && !/\bRETURNING\b/i.test(sql);
          const r = await execute(wantsId ? `${sql} RETURNING id` : sql, params);
          return { changes: r.rowCount, lastInsertRowid: wantsId ? r.rows[0]?.id : undefined };
        },
      };
    },
    async exec(sql) {
      await execute(sql, []);
    },
  };
}

const db = makeApi((sql, params) => (txStore.getStore() || getPool()).query(sql, params));

db.transaction = async (fn) => {
  if (txStore.getStore()) return fn(db); // já dentro de uma transação
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await txStore.run(client, () => fn(db));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignora */ }
    throw err;
  } finally {
    client.release();
  }
};

// O schema é aplicado diretamente no Supabase (migrations/pg/). Mantido por compatibilidade.
async function runMigrations() {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '../../migrations/pg');
  await db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at TIMESTAMPTZ DEFAULT now())');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const done = await db.prepare('SELECT name FROM _migrations WHERE name = ?').get(file);
    if (done) continue;
    await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    await db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  }
}

module.exports = { db, runMigrations, getPool };
