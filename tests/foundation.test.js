import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { closeDatabase, openDatabase } from '../db.js';
import { DomainError, ValidationFailure } from '../lib/errors.js';
import { addDaysIso, todayIso } from '../lib/date.js';
import { balanceFor } from '../lib/ledger.js';
import { getDashboardData } from '../lib/repo.js';
import {
  adjustStock,
  cancelDelivery,
  cancelDonation,
  confirmDelivery,
  createDelivery,
  createDonation,
  createDonor,
  createFamily,
  createResource,
  validateDonation,
} from '../lib/services.js';

function setup() {
  const db = openDatabase(':memory:');
  const coord = Number(
    db
      .prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Coordenação Teste', 'coordenacao', 1)")
      .run().lastInsertRowid,
  );
  const vol = Number(
    db
      .prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Voluntário Teste', 'voluntario', 1)")
      .run().lastInsertRowid,
  );
  return {
    db,
    coord: db.prepare('SELECT * FROM usuario WHERE id = ?').get(coord),
    vol: db.prepare('SELECT * FROM usuario WHERE id = ?').get(vol),
  };
}

function createBasics(db, actor) {
  const arroz = createResource(
    db,
    { nome: 'Arroz 5 kg', tipo: 'bem', unidade: 'kg', estoque_minimo: '10', ativo: '1' },
    actor,
  );
  const feijao = createResource(
    db,
    { nome: 'Feijão 1 kg', tipo: 'bem', unidade: 'kg', estoque_minimo: '5', ativo: '1' },
    actor,
  );
  const doador = createDonor(db, { nome: 'Mercado Exemplo', tipo: 'PJ' }, actor);
  const familia = createFamily(db, { codigo: 'F-001' }, actor);
  return { arroz, feijao, doador, familia };
}

test('CA-15: o schema aceita recurso do tipo servico', () => {
  const { db } = setup();
  db.prepare(
    "INSERT INTO recurso (nome, tipo, unidade, controla_estoque, estoque_minimo) VALUES ('Orientação', 'servico', 'h', 0, 0)",
  ).run();
  const row = db.prepare("SELECT * FROM recurso WHERE tipo = 'servico'").get();
  assert.equal(row.tipo, 'servico');
  closeDatabase(db);
});

test('validação de recurso rejeita nome vazio', () => {
  const { db, coord } = setup();
  assert.throws(
    () => createResource(db, { nome: '', tipo: 'bem', unidade: 'kg' }, coord),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.nome),
  );
  closeDatabase(db);
});

test('cadastros básicos e código de família único', () => {
  const { db, coord } = setup();
  createBasics(db, coord);
  assert.throws(
    () => createFamily(db, { codigo: 'F-001' }, coord),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.codigo),
  );
  assert.throws(
    () => createFamily(db, { codigo: 'X-001' }, coord),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.codigo),
  );
  closeDatabase(db);
});

test('fluxo completo: doação multi-item, validação, entrega e saldo', () => {
  const { db, coord } = setup();
  const { arroz, feijao, doador, familia } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [
        { recurso_id: String(arroz), quantidade: '20', validade: addDaysIso(todayIso(), 10) },
        { recurso_id: String(feijao), quantidade: '5', validade: addDaysIso(todayIso(), 10) },
      ],
    },
    coord,
  );

  assert.equal(balanceFor(db, arroz), 0);
  assert.equal(balanceFor(db, feijao), 0);
  validateDonation(db, doacao, coord);
  assert.equal(balanceFor(db, arroz), 20);
  assert.equal(balanceFor(db, feijao), 5);

  const entrega = createDelivery(
    db,
    {
      familia_id: String(familia),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '2' }],
    },
    coord,
  );
  confirmDelivery(db, entrega, coord);
  assert.equal(balanceFor(db, arroz), 18);
  assert.equal(balanceFor(db, feijao), 5);

  const movements = db.prepare('SELECT * FROM movimento_recurso WHERE recurso_id = ?').all(arroz);
  assert.equal(movements.length, 2);
  assert.deepEqual(
    movements.map((m) => m.tipo_movimento),
    ['entrada', 'saida'],
  );

  const donationEvents = db
    .prepare("SELECT evento FROM historico_evento WHERE entidade = 'doacao' AND entidade_id = ? ORDER BY id")
    .all(doacao)
    .map((event) => event.evento);
  assert.deepEqual(donationEvents, ['criado', 'status_alterado']);

  const deliveryEvents = db
    .prepare("SELECT evento FROM historico_evento WHERE entidade = 'entrega' AND entidade_id = ? ORDER BY id")
    .all(entrega)
    .map((event) => event.evento);
  assert.deepEqual(deliveryEvents, ['criado', 'status_alterado']);
  closeDatabase(db);
});

test('doação sem itens é rejeitada', () => {
  const { db, coord } = setup();
  const { doador } = createBasics(db, coord);
  assert.throws(
    () =>
      createDonation(
        db,
        { doador_id: String(doador), data: todayIso(), responsavel_id: String(coord.id), items: [] },
        coord,
      ),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.itens),
  );
  closeDatabase(db);
});

test('recurso sem unidade ou com tipo inválido é rejeitado', () => {
  const { db, coord } = setup();
  assert.throws(
    () => createResource(db, { nome: 'Sem unidade', tipo: 'bem', unidade: '' }, coord),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.unidade),
  );
  assert.throws(
    () => createResource(db, { nome: 'Tipo inválido', tipo: 'outro', unidade: 'kg' }, coord),
    (error) => error instanceof ValidationFailure && Boolean(error.errors.tipo),
  );
  closeDatabase(db);
});

test('data futura e quantidade zero são rejeitadas com erro de campo', () => {
  const { db, coord } = setup();
  const { arroz, doador } = createBasics(db, coord);
  assert.throws(
    () =>
      createDonation(
        db,
        {
          doador_id: String(doador),
          data: addDaysIso(todayIso(), 1),
          responsavel_id: String(coord.id),
          items: [{ recurso_id: String(arroz), quantidade: '0' }],
        },
        coord,
      ),
    (error) =>
      error instanceof ValidationFailure &&
      Boolean(error.errors.data) &&
      Boolean(error.errors['itens.0.quantidade']),
  );
  closeDatabase(db);
});

test('dashboard alerta validade próxima de item disponível', () => {
  const { db, coord } = setup();
  const { arroz, doador } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '4', validade: addDaysIso(todayIso(), 3) }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);
  const data = getDashboardData(db);
  assert.equal(data.expiring.length, 1);
  assert.equal(data.expiring[0].recurso_nome, 'Arroz 5 kg');
  assert.equal(data.expiring[0].doacao_id, doacao);
  closeDatabase(db);
});

test('entrega acima do saldo é bloqueada sem alterar estado', () => {
  const { db, coord } = setup();
  const { arroz, doador, familia } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '2' }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);

  const entrega = createDelivery(
    db,
    {
      familia_id: String(familia),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '5' }],
    },
    coord,
  );

  assert.throws(
    () => confirmDelivery(db, entrega, coord),
    (error) => error instanceof DomainError && error.code === 'saldo_insuficiente',
  );
  assert.equal(balanceFor(db, arroz), 2);
  assert.equal(db.prepare('SELECT status FROM entrega WHERE id = ?').get(entrega).status, 'Registrada');
  assert.equal(
    db.prepare('SELECT COUNT(*) AS total FROM movimento_recurso WHERE entrega_id = ?').get(entrega).total,
    0,
  );
  closeDatabase(db);
});

test('cancelamento de doação validada gera saída compensatória', () => {
  const { db, coord } = setup();
  const { arroz, doador } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '5' }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);
  assert.equal(balanceFor(db, arroz), 5);
  cancelDonation(db, doacao, coord, 'Doação cadastrada em duplicidade');
  assert.equal(balanceFor(db, arroz), 0);
  assert.equal(db.prepare('SELECT status FROM doacao WHERE id = ?').get(doacao).status, 'Cancelada');
  const saida = db
    .prepare("SELECT * FROM movimento_recurso WHERE doacao_id = ? AND tipo_movimento = 'saida'")
    .get(doacao);
  assert.ok(saida);
  closeDatabase(db);
});

test('cancelamento de doação já distribuída é bloqueado', () => {
  const { db, coord } = setup();
  const { arroz, doador, familia } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '2' }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);
  const entrega = createDelivery(
    db,
    {
      familia_id: String(familia),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '1' }],
    },
    coord,
  );
  confirmDelivery(db, entrega, coord);

  assert.throws(
    () => cancelDonation(db, doacao, coord),
    (error) => error instanceof DomainError && error.code === 'saldo_insuficiente',
  );
  assert.equal(balanceFor(db, arroz), 1);
  assert.equal(db.prepare('SELECT status FROM doacao WHERE id = ?').get(doacao).status, 'Disponivel');
  closeDatabase(db);
});

test('cancelamento de entrega confirmada gera entrada compensatória', () => {
  const { db, coord } = setup();
  const { arroz, doador, familia } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '10' }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);
  const entrega = createDelivery(
    db,
    {
      familia_id: String(familia),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '3' }],
    },
    coord,
  );
  confirmDelivery(db, entrega, coord);
  assert.equal(balanceFor(db, arroz), 7);
  cancelDelivery(db, entrega, coord, 'Entrega registrada para a família errada');
  assert.equal(balanceFor(db, arroz), 10);
  assert.equal(db.prepare('SELECT status FROM entrega WHERE id = ?').get(entrega).status, 'Cancelada');
  closeDatabase(db);
});

test('ajuste exige coordenação e respeita saldo', () => {
  const { db, coord, vol } = setup();
  const { arroz } = createBasics(db, coord);

  assert.throws(
    () =>
      adjustStock(
        db,
        { recurso_id: String(arroz), tipo_ajuste: 'entrada', quantidade: '5', motivo: 'Inventário inicial', data: todayIso() },
        vol,
      ),
    (error) => error instanceof DomainError && error.code === 'permissao',
  );

  adjustStock(
    db,
    { recurso_id: String(arroz), tipo_ajuste: 'entrada', quantidade: '5', motivo: 'Inventário inicial', data: todayIso() },
    coord,
  );
  assert.equal(balanceFor(db, arroz), 5);

  assert.throws(
    () =>
      adjustStock(
        db,
        { recurso_id: String(arroz), tipo_ajuste: 'saida', quantidade: '9', motivo: 'Perda por vencimento', data: todayIso() },
        coord,
      ),
    (error) => error instanceof DomainError && error.code === 'saldo_insuficiente',
  );
  assert.equal(balanceFor(db, arroz), 5);
  closeDatabase(db);
});

test('dashboard reflete o ledger e aponta estoque abaixo do mínimo', () => {
  const { db, coord } = setup();
  const { arroz, doador, familia } = createBasics(db, coord);
  const doacao = createDonation(
    db,
    {
      doador_id: String(doador),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '20' }],
    },
    coord,
  );
  validateDonation(db, doacao, coord);
  const entrega = createDelivery(
    db,
    {
      familia_id: String(familia),
      data: todayIso(),
      responsavel_id: String(coord.id),
      items: [{ recurso_id: String(arroz), quantidade: '15' }],
    },
    coord,
  );
  confirmDelivery(db, entrega, coord);

  const data = getDashboardData(db);
  const row = data.balances.find((item) => item.id === arroz);
  assert.equal(row.saldo, 5);
  const low = data.lowStock.find((item) => item.id === arroz);
  assert.ok(low);
  assert.equal(low.falta, 5);
  closeDatabase(db);
});

test('persistência: recurso e saldo sobrevivem ao fechamento do banco', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kodie-test-'));
  const file = path.join(dir, 'test.sqlite');
  let db = openDatabase(file);
  const coord = db.prepare("INSERT INTO usuario (nome, papel) VALUES ('Coordenação', 'coordenacao')").run();
  const actor = db.prepare('SELECT * FROM usuario WHERE id = ?').get(Number(coord.lastInsertRowid));
  const arroz = createResource(
    db,
    { nome: 'Arroz', tipo: 'bem', unidade: 'kg', estoque_minimo: '0', ativo: '1' },
    actor,
  );
  adjustStock(
    db,
    { recurso_id: String(arroz), tipo_ajuste: 'entrada', quantidade: '7', motivo: 'Inventário inicial', data: todayIso() },
    actor,
  );
  closeDatabase(db);

  db = openDatabase(file);
  assert.equal(balanceFor(db, arroz), 7);
  assert.equal(db.prepare('SELECT nome FROM recurso WHERE id = ?').get(arroz).nome, 'Arroz');
  closeDatabase(db);
  fs.rmSync(dir, { recursive: true, force: true });
});
