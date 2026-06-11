// Configuração compartilhada para testes de integração
// Usa um banco SQLite em arquivo temporário separado do dado de produção
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const TEST_DB = path.join(__dirname, '../data/test-cotou.db');
const TEST_SESSION_DIR = path.join(__dirname, '../data/test-sessions');

// Define vars antes de qualquer require da app
process.env.NODE_ENV = 'test';
process.env.DB_PATH = TEST_DB;
process.env.SESSION_SECRET = 'test-secret-cotou-integration';
process.env.COOKIE_SECURE = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.SESSION_FILE_DIR = TEST_SESSION_DIR;

function setup() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_SESSION_DIR)) fs.rmSync(TEST_SESSION_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_SESSION_DIR, { recursive: true });

  // require após setar env para usar o banco de teste
  const { runMigrations } = require('../src/config/database');
  runMigrations();

  // Cria usuário admin de teste
  const User = require('../src/models/User');
  return User.create({
    name: 'Admin Teste',
    email: 'admin@test.cotou',
    password: 'Senha123',
    role: 'admin',
  });
}

function teardown() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_SESSION_DIR)) fs.rmSync(TEST_SESSION_DIR, { recursive: true, force: true });
}

async function startServer() {
  // Cada test file faz seu próprio require da app após setar env
  const app = require('../src/app');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return { server, base };
}

// Utilitário de fetch com cookie jar simples
function makeClient(base) {
  let cookie = '';
  let csrfToken = '';

  async function request(method, path, body, extraHeaders = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrfToken && method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/connect\.sid=([^;]+)/);
      if (match) cookie = `connect.sid=${match[1]}`;
    }
    const data = await res.json().catch(() => ({}));
    if (data.csrfToken) csrfToken = data.csrfToken;
    return { status: res.status, data };
  }

  return {
    get:  (path, h) => request('GET',    path, null, h),
    post: (path, body, h) => request('POST',   path, body, h),
    put:  (path, body, h) => request('PUT',    path, body, h),
    del:  (path, h) => request('DELETE', path, null, h),
    login: async (email, password) => {
      const r = await request('POST', '/auth/login', { email, password });
      return r;
    },
  };
}

module.exports = { setup, teardown, startServer, makeClient };
