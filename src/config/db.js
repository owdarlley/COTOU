'use strict';

/**
 * Adapter de banco de dados — ponto único de acesso ao banco.
 *
 * SQLite (padrão): usa node:sqlite (DatabaseSync, API síncrona).
 *   Ativo quando DATABASE_URL não está definido.
 *
 * PostgreSQL (futuro): requer pg + refatoração dos models para async.
 *   Para migrar:
 *     1. npm install pg
 *     2. Definir DATABASE_URL=postgres://user:pass@host:5432/dbname no .env
 *     3. Converter todos os models para async (findById → async findById, etc.)
 *     4. Adicionar await em todas as chamadas de model nas routes
 *     5. Descomentar o adapter pg abaixo e adaptar a API
 *
 * API exposta (SQLite):
 *   db.prepare(sql).get(...params)   → linha ou undefined
 *   db.prepare(sql).all(...params)   → array de linhas
 *   db.prepare(sql).run(...params)   → { changes, lastInsertRowid }
 *   db.exec(sql)                     → void (DDL / multi-statement)
 */

const { db, runMigrations } = require('./database');

// ── Futura implementação pg (esqueleto) ──────────────────────────────────────
// const { Pool } = require('pg');
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//
// const pgAdapter = {
//   prepare: (sql) => ({
//     async get(...params) { const { rows } = await pool.query(sql, params); return rows[0]; },
//     async all(...params) { const { rows } = await pool.query(sql, params); return rows; },
//     async run(...params) { const r = await pool.query(sql, params); return { changes: r.rowCount }; },
//   }),
//   exec: async (sql) => { await pool.query(sql); },
// };
// ────────────────────────────────────────────────────────────────────────────

module.exports = { db, runMigrations };
