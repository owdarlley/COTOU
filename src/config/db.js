'use strict';

// Ponto único de acesso ao banco (PostgreSQL / Supabase). Ver database.js.
const { db, runMigrations } = require('./database');

module.exports = { db, runMigrations };
