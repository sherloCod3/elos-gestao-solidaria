import { addDaysIso, todayIso } from './date.js';
import { listBalances } from './ledger.js';

export function findUser(db, id) {
  return db.prepare('SELECT * FROM usuario WHERE id = ? AND ativo = 1').get(id) ?? null;
}

export function listUsers(db) {
  return db
    .prepare('SELECT * FROM usuario WHERE ativo = 1 ORDER BY papel DESC, nome COLLATE NOCASE')
    .all();
}

export function firstCoordinator(db) {
  return (
    db
      .prepare("SELECT * FROM usuario WHERE ativo = 1 AND papel = 'coordenacao' ORDER BY id LIMIT 1")
      .get() ?? null
  );
}

export function getResource(db, id) {
  const row = db
    .prepare(
      `SELECT r.*,
         COALESCE((
           SELECT SUM(CASE
             WHEN m.tipo_movimento IN ('entrada', 'ajuste_entrada') THEN m.quantidade
             WHEN m.tipo_movimento IN ('saida', 'ajuste_saida') THEN -m.quantidade
             ELSE 0 END)
           FROM movimento_recurso m WHERE m.recurso_id = r.id
         ), 0) AS saldo
       FROM recurso r WHERE r.id = ?`,
    )
    .get(id);
  return row ? { ...row, saldo: Number(row.saldo) } : null;
}

export function listResources(db, { includeInactive = true } = {}) {
  return listBalances(db, { includeInactive });
}

export function findDonor(db, id) {
  return db.prepare('SELECT * FROM doador WHERE id = ?').get(id) ?? null;
}

export function listDonors(db) {
  return db
    .prepare(
      `SELECT d.*,
         (SELECT COUNT(*) FROM doacao do2 WHERE do2.doador_id = d.id) AS doacoes
       FROM doador d
       ORDER BY d.nome COLLATE NOCASE`,
    )
    .all();
}

export function findFamily(db, id) {
  return db.prepare('SELECT * FROM familia WHERE id = ?').get(id) ?? null;
}

export function listFamilies(db) {
  return db
    .prepare(
      `SELECT f.*,
         (SELECT COUNT(*) FROM entrega e WHERE e.familia_id = f.id) AS entregas
       FROM familia f
       ORDER BY f.codigo COLLATE NOCASE`,
    )
    .all();
}

export function listDonations(db, { status = '', doadorId = '', from = '', to = '' } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }
  if (doadorId) {
    where.push('d.doador_id = ?');
    params.push(doadorId);
  }
  if (from) {
    where.push('d.data >= ?');
    params.push(from);
  }
  if (to) {
    where.push('d.data <= ?');
    params.push(to);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT d.*, dr.nome AS doador_nome, u.nome AS responsavel_nome,
         (SELECT COUNT(*) FROM doacao_item di WHERE di.doacao_id = d.id) AS itens,
         (SELECT COALESCE(SUM(di.quantidade), 0) FROM doacao_item di WHERE di.doacao_id = d.id) AS quantidade_total
       FROM doacao d
       JOIN doador dr ON dr.id = d.doador_id
       JOIN usuario u ON u.id = d.responsavel_id
       ${clause}
       ORDER BY d.data DESC, d.id DESC
       LIMIT 200`,
    )
    .all(...params);
}

export function getDonation(db, id) {
  return (
    db
      .prepare(
        `SELECT d.*, dr.nome AS doador_nome, dr.tipo AS doador_tipo, u.nome AS responsavel_nome,
           (SELECT COUNT(*) FROM doacao_item di WHERE di.doacao_id = d.id) AS itens,
           (SELECT COALESCE(SUM(di.quantidade), 0) FROM doacao_item di WHERE di.doacao_id = d.id) AS quantidade_total
         FROM doacao d
         JOIN doador dr ON dr.id = d.doador_id
         JOIN usuario u ON u.id = d.responsavel_id
         WHERE d.id = ?`,
      )
      .get(id) ?? null
  );
}

export function getDonationItems(db, doacaoId) {
  return db
    .prepare(
      `SELECT di.*, r.nome AS recurso_nome, r.unidade, r.tipo, r.ativo,
         COALESCE((
           SELECT SUM(CASE
             WHEN m.tipo_movimento IN ('entrada', 'ajuste_entrada') THEN m.quantidade
             WHEN m.tipo_movimento IN ('saida', 'ajuste_saida') THEN -m.quantidade
             ELSE 0 END)
           FROM movimento_recurso m WHERE m.recurso_id = r.id
         ), 0) AS saldo_atual
       FROM doacao_item di
       JOIN recurso r ON r.id = di.recurso_id
       WHERE di.doacao_id = ?
       ORDER BY di.id`,
    )
    .all(doacaoId);
}

export function listDeliveries(db, { status = '', familiaId = '', from = '', to = '' } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }
  if (familiaId) {
    where.push('e.familia_id = ?');
    params.push(familiaId);
  }
  if (from) {
    where.push('e.data >= ?');
    params.push(from);
  }
  if (to) {
    where.push('e.data <= ?');
    params.push(to);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT e.*, f.codigo AS familia_codigo, u.nome AS responsavel_nome,
         (SELECT COUNT(*) FROM entrega_item ei WHERE ei.entrega_id = e.id) AS itens,
         (SELECT COALESCE(SUM(ei.quantidade), 0) FROM entrega_item ei WHERE ei.entrega_id = e.id) AS quantidade_total
       FROM entrega e
       JOIN familia f ON f.id = e.familia_id
       JOIN usuario u ON u.id = e.responsavel_id
       ${clause}
       ORDER BY e.data DESC, e.id DESC
       LIMIT 200`,
    )
    .all(...params);
}

export function getDelivery(db, id) {
  return (
    db
      .prepare(
        `SELECT e.*, f.codigo AS familia_codigo, u.nome AS responsavel_nome,
           (SELECT COUNT(*) FROM entrega_item ei WHERE ei.entrega_id = e.id) AS itens,
           (SELECT COALESCE(SUM(ei.quantidade), 0) FROM entrega_item ei WHERE ei.entrega_id = e.id) AS quantidade_total
         FROM entrega e
         JOIN familia f ON f.id = e.familia_id
         JOIN usuario u ON u.id = e.responsavel_id
         WHERE e.id = ?`,
      )
      .get(id) ?? null
  );
}

export function getDeliveryItems(db, entregaId) {
  return db
    .prepare(
      `SELECT ei.*, r.nome AS recurso_nome, r.unidade, r.tipo, r.ativo,
         COALESCE((
           SELECT SUM(CASE
             WHEN m.tipo_movimento IN ('entrada', 'ajuste_entrada') THEN m.quantidade
             WHEN m.tipo_movimento IN ('saida', 'ajuste_saida') THEN -m.quantidade
             ELSE 0 END)
           FROM movimento_recurso m WHERE m.recurso_id = r.id
         ), 0) AS saldo_atual
       FROM entrega_item ei
       JOIN recurso r ON r.id = ei.recurso_id
       WHERE ei.entrega_id = ?
       ORDER BY ei.id`,
    )
    .all(entregaId);
}

export function getHistory(db, { entidade = '', evento = '', from = '', to = '' } = {}) {
  const where = [];
  const params = [];
  if (entidade) {
    where.push('h.entidade = ?');
    params.push(entidade);
  }
  if (evento) {
    where.push('h.evento = ?');
    params.push(evento);
  }
  if (from) {
    where.push('h.data >= ?');
    params.push(from);
  }
  if (to) {
    where.push('h.data <= ?');
    params.push(to);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT h.*, u.nome AS ator_nome
       FROM historico_evento h
       JOIN usuario u ON u.id = h.ator_id
       ${clause}
       ORDER BY h.data DESC, h.id DESC
       LIMIT 300`,
    )
    .all(...params);
}

export function getHistoryFor(db, entidade, entidadeId) {
  return db
    .prepare(
      `SELECT h.*, u.nome AS ator_nome
       FROM historico_evento h
       JOIN usuario u ON u.id = h.ator_id
       WHERE h.entidade = ? AND h.entidade_id = ?
       ORDER BY h.data DESC, h.id DESC`,
    )
    .all(entidade, entidadeId);
}

export function getDashboardData(db) {
  const today = todayIso();
  const expiryLimit = addDaysIso(today, 7);
  const periodStart = addDaysIso(today, -30);
  const pendingDonationCutoff = addDaysIso(today, -2);
  const pendingDeliveryCutoff = addDaysIso(today, -1);

  const balances = listBalances(db).filter((row) => row.ativo === 1 && row.tipo === 'bem');
  const lowStock = balances
    .filter((row) => row.saldo < row.estoque_minimo)
    .map((row) => ({ ...row, falta: row.estoque_minimo - row.saldo }));

  const expiring = db
    .prepare(
      `SELECT di.id, di.validade, di.quantidade, di.recurso_id,
         r.nome AS recurso_nome, r.unidade,
         d.id AS doacao_id, d.data AS doacao_data, dr.nome AS doador_nome
       FROM doacao_item di
       JOIN doacao d ON d.id = di.doacao_id
       JOIN doador dr ON dr.id = d.doador_id
       JOIN recurso r ON r.id = di.recurso_id
       WHERE d.status = 'Disponivel'
         AND di.validade IS NOT NULL
         AND di.validade >= ?
         AND di.validade <= ?
       ORDER BY di.validade ASC, r.nome COLLATE NOCASE`,
    )
    .all(today, expiryLimit);

  const pendingDonations = db
    .prepare(
      `SELECT d.id, d.data, d.status, dr.nome AS doador_nome,
         (SELECT COUNT(*) FROM doacao_item di WHERE di.doacao_id = d.id) AS itens
       FROM doacao d
       JOIN doador dr ON dr.id = d.doador_id
       WHERE d.status = 'Recebida'
       ORDER BY d.data ASC, d.id ASC
       LIMIT 6`,
    )
    .all()
    .map((row) => ({ ...row, atrasada: row.data < pendingDonationCutoff }));

  const pendingDonationsCount = Number(
    db.prepare("SELECT COUNT(*) AS total FROM doacao WHERE status = 'Recebida'").get().total,
  );

  const pendingDeliveries = db
    .prepare(
      `SELECT e.id, e.data, e.status, f.codigo AS familia_codigo,
         (SELECT COUNT(*) FROM entrega_item ei WHERE ei.entrega_id = e.id) AS itens
       FROM entrega e
       JOIN familia f ON f.id = e.familia_id
       WHERE e.status = 'Registrada'
       ORDER BY e.data ASC, e.id ASC
       LIMIT 6`,
    )
    .all()
    .map((row) => ({ ...row, atrasada: row.data < pendingDeliveryCutoff }));

  const pendingDeliveriesCount = Number(
    db.prepare("SELECT COUNT(*) AS total FROM entrega WHERE status = 'Registrada'").get().total,
  );

  const deliveries30Count = Number(
    db
      .prepare("SELECT COUNT(*) AS total FROM entrega WHERE status = 'Entregue' AND data >= ?")
      .get(periodStart).total,
  );

  const recentDonations = listDonations(db).slice(0, 5);
  const recentDeliveries = listDeliveries(db).slice(0, 5);

  const recentMovements = db
    .prepare(
      `SELECT m.*, r.nome AS recurso_nome, r.unidade, u.nome AS responsavel_nome
       FROM movimento_recurso m
       JOIN recurso r ON r.id = m.recurso_id
       JOIN usuario u ON u.id = m.responsavel_id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 8`,
    )
    .all();

  const totals = {
    recursosAtivos: balances.length,
    familias: Number(db.prepare('SELECT COUNT(*) AS total FROM familia').get().total),
    doadores: Number(db.prepare('SELECT COUNT(*) AS total FROM doador').get().total),
  };

  return {
    today,
    expiryLimit,
    periodStart,
    lowStock,
    expiring,
    pendingDonations,
    pendingDonationsCount,
    pendingDeliveries,
    pendingDeliveriesCount,
    deliveries30Count,
    recentDonations,
    recentDeliveries,
    recentMovements,
    totals,
    balances,
  };
}
