'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

const { setup, teardown, startServer, makeClient } = require('./setup');

let server, base, adminClient, vendaClient;

before(async () => {
  await setup();
  ({ server, base } = await startServer());

  const User = require('../src/models/User');
  await User.create({ name: 'Vendas', email: 'vendas2@test.cotou', password: 'Venda123', role: 'vendas' });

  adminClient = makeClient(base);
  vendaClient = makeClient(base);
  await adminClient.login('admin@test.cotou', 'Senha123');
  await vendaClient.login('vendas2@test.cotou', 'Venda123');
});

after(() => {
  server.close();
  teardown();
});

describe('GET /admin/usuarios', () => {
  test('admin lista usuários', async () => {
    const { status, data } = await adminClient.get('/admin/usuarios');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.users));
    assert.ok(data.users.length >= 1);
  });

  test('vendas não acessa rota admin', async () => {
    const { status } = await vendaClient.get('/admin/usuarios');
    assert.equal(status, 403);
  });
});

describe('POST /admin/usuarios — validação de senha', () => {
  test('senha fraca (< 8 chars) é rejeitada', async () => {
    const { status, data } = await adminClient.post('/admin/usuarios', {
      name: 'Novo', email: 'novo@test.cotou', password: 'abc12', role: 'vendas'
    });
    assert.equal(status, 400);
    assert.match(data.error, /8 caracteres/);
  });

  test('senha sem maiúscula é rejeitada', async () => {
    const { status, data } = await adminClient.post('/admin/usuarios', {
      name: 'Novo', email: 'novo@test.cotou', password: 'senha12345', role: 'vendas'
    });
    assert.equal(status, 400);
    assert.match(data.error, /maiúscula/);
  });

  test('senha sem número é rejeitada', async () => {
    const { status, data } = await adminClient.post('/admin/usuarios', {
      name: 'Novo', email: 'novo@test.cotou', password: 'SenhaSemNumero', role: 'vendas'
    });
    assert.equal(status, 400);
    assert.match(data.error, /número/);
  });

  test('senha válida cria usuário com sucesso', async () => {
    const { status, data } = await adminClient.post('/admin/usuarios', {
      name: 'Novo Válido', email: 'novo.valido@test.cotou', password: 'Senha123', role: 'vendas'
    });
    assert.equal(status, 201, JSON.stringify(data));
    assert.equal(data.ok, true);
  });

  test('e-mail duplicado retorna 409', async () => {
    const { status } = await adminClient.post('/admin/usuarios', {
      name: 'Dup', email: 'novo.valido@test.cotou', password: 'Senha123', role: 'vendas'
    });
    assert.equal(status, 409);
  });
});

describe('POST /admin/usuarios/:id/senha', () => {
  test('redefinição com senha fraca é rejeitada', async () => {
    const { data: list } = await adminClient.get('/admin/usuarios');
    const user = list.users[0];
    const { status, data } = await adminClient.post(`/admin/usuarios/${user.id}/senha`, {
      new_password: 'fraca'
    });
    assert.equal(status, 400);
    assert.ok(data.error);
  });

  test('redefinição com senha válida funciona', async () => {
    const { data: list } = await adminClient.get('/admin/usuarios');
    const user = list.users[0];
    const { status } = await adminClient.post(`/admin/usuarios/${user.id}/senha`, {
      new_password: 'NovaSenha1'
    });
    assert.equal(status, 200);
  });
});

describe('GET /admin/audit-log', () => {
  test('admin acessa audit log', async () => {
    const { status, data } = await adminClient.get('/admin/audit-log');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.logs));
    assert.equal(typeof data.total, 'number');
  });

  test('vendas não acessa audit log global', async () => {
    const { status } = await vendaClient.get('/admin/audit-log');
    assert.equal(status, 403);
  });
});
