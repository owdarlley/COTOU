'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

const { setup, teardown, startServer, makeClient } = require('./setup');

let server, base, adminClient, vendaClient, comprasClient;

before(async () => {
  await setup();
  ({ server, base } = await startServer());

  const User = require('../src/models/User');
  await User.create({ name: 'Vendas Teste', email: 'vendas@test.cotou', password: 'Venda123', role: 'vendas' });
  await User.create({ name: 'Compras Teste', email: 'compras@test.cotou', password: 'Compra123', role: 'compras' });

  adminClient  = makeClient(base);
  vendaClient  = makeClient(base);
  comprasClient = makeClient(base);
  await adminClient.login('admin@test.cotou', 'Senha123');
  await vendaClient.login('vendas@test.cotou', 'Venda123');
  await comprasClient.login('compras@test.cotou', 'Compra123');
});

after(() => {
  server.close();
  teardown();
});

const PAYLOAD_MINIMO = {
  customer_name: 'Cliente Teste',
  customer_phone: '11999990001',
  vehicle_plate: 'TST0001',
  vehicle_model: 'Corolla',
  vehicle_year_model: 2020,
  part_names: ['Pastilha Freio'],
  quantities: [2],
};

describe('GET /cotacoes', () => {
  test('retorna lista para usuário autenticado', async () => {
    const { status, data } = await vendaClient.get('/cotacoes?limit=20');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.items));
  });

  test('requer autenticação', async () => {
    const { status } = await makeClient(base).get('/cotacoes');
    assert.equal(status, 401);
  });
});

describe('POST /cotacoes', () => {
  test('vendas cria cotação com payload mínimo', async () => {
    const { status, data } = await vendaClient.post('/cotacoes', PAYLOAD_MINIMO);
    assert.equal(status, 201, `esperava 201, recebeu ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.ok, true);
    assert.ok(data.quoteNumber, 'deve retornar o número da cotação');
    assert.ok(data.quotationId, 'deve retornar o id da cotação');
  });

  test('falha sem dados obrigatórios', async () => {
    const { status } = await vendaClient.post('/cotacoes', { customer_name: 'Só nome' });
    assert.equal(status, 400);
  });

  test('falha sem itens', async () => {
    const { status } = await vendaClient.post('/cotacoes', {
      ...PAYLOAD_MINIMO,
      part_names: [],
    });
    assert.equal(status, 400);
  });

  test('compras não pode criar cotação', async () => {
    const { status } = await comprasClient.post('/cotacoes', PAYLOAD_MINIMO);
    assert.equal(status, 403);
  });
});

describe('GET /cotacoes/:id', () => {
  let quoteId;

  before(async () => {
    const r = await vendaClient.post('/cotacoes', {
      ...PAYLOAD_MINIMO,
      customer_phone: '11999990002',
      vehicle_plate: 'TST0002',
    });
    quoteId = r.data.quotationId;
  });

  test('retorna cotação existente com itens', async () => {
    const { status, data } = await vendaClient.get(`/cotacoes/${quoteId}`);
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.quotation);
    assert.equal(data.quotation.id, quoteId);
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
  });

  test('retorna 404 para id inexistente', async () => {
    const { status } = await vendaClient.get('/cotacoes/999999');
    assert.equal(status, 404);
  });
});

describe('POST /cotacoes/:id/status', () => {
  let quoteId;

  before(async () => {
    const r = await vendaClient.post('/cotacoes', {
      ...PAYLOAD_MINIMO,
      customer_phone: '11999990003',
      vehicle_plate: 'TST0003',
    });
    quoteId = r.data.quotationId;
  });

  test('compras altera status para em_cotacao', async () => {
    const { status, data } = await comprasClient.post(`/cotacoes/${quoteId}/status`, { status: 'em_cotacao' });
    assert.equal(status, 200, JSON.stringify(data));
    assert.equal(data.ok, true);
  });

  test('status inválido retorna 400', async () => {
    const { status } = await comprasClient.post(`/cotacoes/${quoteId}/status`, { status: 'invalido' });
    assert.equal(status, 400);
  });

  test('vendas não pode alterar status', async () => {
    const { status } = await vendaClient.post(`/cotacoes/${quoteId}/status`, { status: 'cancelado' });
    assert.equal(status, 403);
  });
});

describe('GET /cotacoes/:id/audit-log', () => {
  let quoteId;

  before(async () => {
    const r = await vendaClient.post('/cotacoes', {
      ...PAYLOAD_MINIMO,
      customer_phone: '11999990004',
      vehicle_plate: 'TST0004',
    });
    quoteId = r.data.quotationId;
  });

  test('admin acessa audit log da cotação', async () => {
    const { status, data } = await adminClient.get(`/cotacoes/${quoteId}/audit-log`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.logs));
  });

  test('compras acessa audit log', async () => {
    const { status } = await comprasClient.get(`/cotacoes/${quoteId}/audit-log`);
    assert.equal(status, 200);
  });
});
