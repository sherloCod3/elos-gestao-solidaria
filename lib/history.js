import { todayIso } from './date.js';

export function recordEvent(
  db,
  {
    entidade,
    entidadeId,
    evento,
    statusAnterior = null,
    statusNovo = null,
    atorId,
    data = todayIso(),
    detalhe = null,
  },
) {
  db.prepare(
    `INSERT INTO historico_evento
       (entidade, entidade_id, evento, status_anterior, status_novo, ator_id, data, detalhe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(entidade, entidadeId, evento, statusAnterior, statusNovo, atorId, data, detalhe);
}
