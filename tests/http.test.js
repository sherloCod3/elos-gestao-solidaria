import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { closeDatabase, openDatabase } from '../db.js';
import { createRequestHandler } from '../server.js';
import { todayIso } from '../lib/date.js';

function formBody(data) {
  return new URLSearchParams(data).toString();
}

test('rotas HTTP: cadastro, doação, validação, entrega e bloqueio por saldo', async (t) => {
  const db = openDatabase(':memory:');
  const handler = createRequestHandler(db);
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const coordinator = db.prepare("SELECT * FROM usuario WHERE papel = 'coordenacao' ORDER BY id LIMIT 1").get();
  const volunteer = db.prepare("SELECT * FROM usuario WHERE papel = 'voluntario' ORDER BY id LIMIT 1").get();
  const cookie = `kodie_usuario=${coordinator.id}`;

  const request = (path, options = {}) =>
    fetch(`${base}${path}`, {
      redirect: 'manual',
      ...options,
      headers: { cookie, ...(options.headers ?? {}) },
    });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDatabase(db);
  });

  await t.test('GET /dashboard responde e contém a navegação', async () => {
    const response = await request('/dashboard');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'self'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(html, /Dashboard/);
    assert.match(html, /Recursos/);
    assert.match(html, /Doações/);
  });

  await t.test('POST /recursos válido redireciona e persiste', async () => {
    const response = await request('/recursos', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        nome: 'Arroz Teste',
        tipo: 'bem',
        unidade: 'kg',
        categoria: 'Alimentos',
        estoque_minimo: '5',
        ativo: '1',
        observacoes: '',
      }),
    });
    assert.equal(response.status, 303);
    const location = response.headers.get('location');
    assert.match(location, /^\/recursos\/\d+\/editar\?ok=recurso-criado$/);
    const detail = await request(location);
    assert.equal(detail.status, 200);
    assert.match(await detail.text(), /Arroz Teste/);
  });

  await t.test('POST /recursos inválido responde 422 com erro de campo', async () => {
    const response = await request('/recursos', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({ nome: '', tipo: 'bem', unidade: 'kg', estoque_minimo: '0', ativo: '1' }),
    });
    assert.equal(response.status, 422);
    const html = await response.text();
    assert.match(html, /Nome é obrigatório/);
  });

  await t.test('POST /doadores e /familias criam registros', async () => {
    const donorResponse = await request('/doadores', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({ nome: 'Doador HTTP', tipo: 'PF', contato: '', observacoes: '' }),
    });
    assert.equal(donorResponse.status, 303);

    const familyResponse = await request('/familias', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({ codigo: 'F-900', observacoes: '' }),
    });
    assert.equal(familyResponse.status, 303);
  });

  let donationLocation;
  await t.test('POST /doacoes cria doação Recebida sem movimentar estoque', async () => {
    const donor = db.prepare("SELECT * FROM doador WHERE nome = 'Doador HTTP'").get();
    const resource = db.prepare("SELECT * FROM recurso WHERE nome = 'Arroz Teste'").get();
    const family = db.prepare("SELECT * FROM familia WHERE codigo = 'F-900'").get();
    assert.ok(donor && resource && family);

    const response = await request('/doacoes', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        doador_id: String(donor.id),
        data: todayIso(),
        responsavel_id: String(coordinator.id),
        observacoes: '',
        recurso_id: String(resource.id),
        quantidade: '20',
        validade: '',
        item_observacoes: '',
      }),
    });
    assert.equal(response.status, 303);
    donationLocation = response.headers.get('location');
    const detail = await request(donationLocation);
    const html = await detail.text();
    assert.match(html, /Recebida/);
    assert.equal(
      Number(db.prepare('SELECT COUNT(*) AS total FROM movimento_recurso WHERE recurso_id = ?').get(resource.id).total),
      0,
    );
  });

  let deliveryLocation;
  await t.test('validação gera entrada e entrega acima do saldo é bloqueada', async () => {
    const donationId = Number(donationLocation.match(/\/doacoes\/(\d+)/)[1]);
    const resource = db.prepare("SELECT * FROM recurso WHERE nome = 'Arroz Teste'").get();
    const family = db.prepare("SELECT * FROM familia WHERE codigo = 'F-900'").get();

    const validateResponse = await request(`/doacoes/${donationId}/validar`, { method: 'POST' });
    assert.equal(validateResponse.status, 303);

    const balance = Number(
      db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN tipo_movimento = 'entrada' THEN quantidade ELSE -quantidade END), 0) AS saldo
           FROM movimento_recurso WHERE recurso_id = ?`,
        )
        .get(resource.id).saldo,
    );
    assert.equal(balance, 20);

    const deliveryResponse = await request('/entregas', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        familia_id: String(family.id),
        data: todayIso(),
        responsavel_id: String(coordinator.id),
        observacoes: '',
        recurso_id: String(resource.id),
        quantidade: '99',
        item_observacoes: '',
      }),
    });
    assert.equal(deliveryResponse.status, 303);
    deliveryLocation = deliveryResponse.headers.get('location');
    const deliveryId = Number(deliveryLocation.match(/\/entregas\/(\d+)/)[1]);

    const confirmResponse = await request(`/entregas/${deliveryId}/confirmar`, { method: 'POST' });
    assert.equal(confirmResponse.status, 409);
    const html = await confirmResponse.text();
    assert.match(html, /Saldo insuficiente/);
    assert.equal(db.prepare('SELECT status FROM entrega WHERE id = ?').get(deliveryId).status, 'Registrada');
    assert.equal(
      Number(db.prepare('SELECT COUNT(*) AS total FROM movimento_recurso WHERE entrega_id = ?').get(deliveryId).total),
      0,
    );
  });

  await t.test('entrega dentro do saldo é confirmada e cancelamento devolve o saldo', async () => {
    const resource = db.prepare("SELECT * FROM recurso WHERE nome = 'Arroz Teste'").get();
    const family = db.prepare("SELECT * FROM familia WHERE codigo = 'F-900'").get();
    const createResponse = await request('/entregas', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        familia_id: String(family.id),
        data: todayIso(),
        responsavel_id: String(coordinator.id),
        observacoes: '',
        recurso_id: String(resource.id),
        quantidade: '4',
        item_observacoes: '',
      }),
    });
    assert.equal(createResponse.status, 303);
    const id = Number(createResponse.headers.get('location').match(/\/entregas\/(\d+)/)[1]);

    const confirmResponse = await request(`/entregas/${id}/confirmar`, { method: 'POST' });
    assert.equal(confirmResponse.status, 303);
    const balanceAfterConfirm = Number(
      db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN tipo_movimento IN ('entrada', 'ajuste_entrada') THEN quantidade ELSE -quantidade END), 0) AS saldo
           FROM movimento_recurso WHERE recurso_id = ?`,
        )
        .get(resource.id).saldo,
    );
    assert.equal(balanceAfterConfirm, 16);

    const cancelResponse = await request(`/entregas/${id}/cancelar`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({ motivo: 'Teste de cancelamento' }),
    });
    assert.equal(cancelResponse.status, 303);
    const balanceAfterCancel = Number(
      db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN tipo_movimento IN ('entrada', 'ajuste_entrada') THEN quantidade ELSE -quantidade END), 0) AS saldo
           FROM movimento_recurso WHERE recurso_id = ?`,
        )
        .get(resource.id).saldo,
    );
    assert.equal(balanceAfterCancel, 20);
  });

  await t.test('perfil de voluntário não pode validar doação', async () => {
    const donor = db.prepare("SELECT * FROM doador WHERE nome = 'Doador HTTP'").get();
    const resource = db.prepare("SELECT * FROM recurso WHERE nome = 'Arroz Teste'").get();
    const createResponse = await request('/doacoes', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        doador_id: String(donor.id),
        data: todayIso(),
        responsavel_id: String(volunteer.id),
        observacoes: '',
        recurso_id: String(resource.id),
        quantidade: '1',
        validade: '',
        item_observacoes: '',
      }),
    });
    assert.equal(createResponse.status, 303);
    const id = Number(createResponse.headers.get('location').match(/\/doacoes\/(\d+)/)[1]);
    const response = await fetch(`${base}/doacoes/${id}/validar`, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie: `kodie_usuario=${volunteer.id}` },
    });
    assert.equal(response.status, 409);
    assert.match(await response.text(), /coordenação/);
  });

  await t.test('GET /health responde JSON', async () => {
    const response = await request('/health');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.ok(data.users >= 2);
  });
});
