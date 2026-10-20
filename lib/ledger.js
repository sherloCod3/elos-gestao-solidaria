import { DomainError } from './errors.js';
import { MOVEMENT_TYPES } from './constants.js';

const SIGNED_BALANCE_SQL = `
  COALESCE(SUM(
    CASE
      WHEN m.tipo_movimento IN ('entrada', 'ajuste_entrada') THEN m.quantidade
      WHEN m.tipo_movimento IN ('saida', 'ajuste_saida') THEN -m.quantidade
      ELSE 0
    END
  ), 0)
`;

export function balanceFor(db, recursoId) {
  const row = db
    .prepare(
      `SELECT ${SIGNED_BALANCE_SQL} AS saldo
       FROM movimento_recurso m
       WHERE m.recurso_id = ?`,
    )
    .get(recursoId);
  return Number(row?.saldo ?? 0);
}

export function listBalances(db, { includeInactive = false } = {}) {
  return db
    .prepare(
      `SELECT
         r.id, r.nome, r.tipo, r.unidade, r.categoria, r.controla_estoque,
         r.estoque_minimo, r.ativo, r.observacoes, r.created_at,
         ${SIGNED_BALANCE_SQL} AS saldo
       FROM recurso r
       LEFT JOIN movimento_recurso m ON m.recurso_id = r.id
       WHERE (? = 1 OR r.ativo = 1)
       GROUP BY r.id
       ORDER BY r.ativo DESC, r.nome COLLATE NOCASE`,
    )
    .all(includeInactive ? 1 : 0)
    .map((row) => ({ ...row, saldo: Number(row.saldo) }));
}

export function assertSufficientBalance(db, recursoId, quantidade, label = 'este recurso') {
  const saldo = balanceFor(db, recursoId);
  if (saldo < quantidade) {
    throw new DomainError(
      `Saldo insuficiente para ${label}: disponível ${saldo}, solicitado ${quantidade}.`,
      'saldo_insuficiente',
    );
  }
  return saldo;
}

export function insertMovement(
  db,
  {
    recursoId,
    tipo,
    quantidade,
    data,
    doacaoId = null,
    entregaId = null,
    validade = null,
    responsavelId,
    motivo = null,
  },
) {
  if (!Object.values(MOVEMENT_TYPES).includes(tipo)) {
    throw new DomainError('Tipo de movimento inválido.', 'movimento_invalido');
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new DomainError('Quantidade do movimento deve ser um inteiro positivo.', 'movimento_invalido');
  }
  const info = db
    .prepare(
      `INSERT INTO movimento_recurso
         (recurso_id, tipo_movimento, quantidade, data, doacao_id, entrega_id, validade, responsavel_id, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(recursoId, tipo, quantidade, data, doacaoId, entregaId, validade, responsavelId, motivo);
  return Number(info.lastInsertRowid);
}

export function stockStatus(saldo, estoqueMinimo) {
  if (saldo <= 0) return 'sem-estoque';
  if (saldo < estoqueMinimo) return 'abaixo';
  return 'ok';
}
