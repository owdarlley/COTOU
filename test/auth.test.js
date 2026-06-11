'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

const { setup, teardown, startServer, makeClient } = require('./setup');

let server, base;

before(async () => {
  await setup();
  ({ server, base } = await startServer());
});

after(async () => {
  server.close();
  teardown();
});

describe('POST /auth/login', () => {
  test('retorna 400 com campos vazios', async () => {
    const client = makeClient(base);
    const { status, data } = await client.post('/auth/login', {});
    assert.equal(status, 400);
    assert.equal(data.ok, false);
  });

  test('retorna 401 com senha errada', async () => {
    const client = makeClient(base);
    const { status, data } = await client.post('/auth/login', { email: 'admin@test.cotou', password: 'errada' });
    assert.equal(status, 401);
    assert.equal(data.ok, false);
  });

  test('retorna ok=true e csrfToken com credenciais corretas', async () => {
    const client = makeClient(base);
    const { status, data } = await client.login('admin@test.cotou', 'Senha123');
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.csrfToken, 'deve retornar csrfToken');
    assert.equal(data.user.role, 'admin');
  });

  test('sessão autenticada acessa rota protegida', async () => {
    const client = makeClient(base);
    await client.login('admin@test.cotou', 'Senha123');
    const { status, data } = await client.get('/');
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.user);
  });

  test('sem sessão recebe 401 em rota protegida', async () => {
    const client = makeClient(base);
    const { status } = await client.get('/');
    assert.equal(status, 401);
  });
});

describe('CSRF', () => {
  test('POST sem token CSRF retorna 403', async () => {
    const client = makeClient(base);
    await client.login('admin@test.cotou', 'Senha123');
    // Envia sem X-CSRF-Token — CSRF middleware dispara antes da auth → 403
    const res = await fetch(`${base}/notificacoes/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: '' },
    });
    assert.equal(res.status, 403);
  });

  test('POST com token válido passa o middleware CSRF', async () => {
    const client = makeClient(base);
    await client.login('admin@test.cotou', 'Senha123');
    // O makeClient já envia X-CSRF-Token automaticamente após login
    const { status } = await client.post('/notificacoes/read-all', {});
    assert.notEqual(status, 403);
  });
});

describe('GET /auth/users', () => {
  test('retorna lista de usuários sem senhas', async () => {
    const { status, data } = await makeClient(base).get('/auth/users');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.users));
    for (const u of data.users) {
      assert.ok(!u.password_hash, 'não deve expor password_hash');
      assert.ok(!u.role, 'não deve expor role');
    }
  });
});
