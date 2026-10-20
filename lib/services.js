import { transaction } from '../db.js';
import { DomainError, ValidationFailure, assertDomain } from './errors.js';
import { recordEvent } from './history.js';
import { assertSufficientBalance, balanceFor, insertMovement } from './ledger.js';
import {
  validateAdjustmentInput,
  validateDeliveryInput,
  validateDonationInput,
  validateDonorInput,
  validateFamilyInput,
  validateResourceInput,
} from './validation.js';
import {
  DELIVERY_STATUS,
  DONATION_STATUS,
  MOVEMENT_TYPES,
  RESOURCE_TYPES,
} from './constants.js';
import { todayIso } from './date.js';

function assertActor(actor) {
  assertDomain(actor?.id, 'É necessário identificar o usuário responsável.', 'ator_ausente');
}

function assertCoordination(actor) {
  assertActor(actor);
  assertDomain(actor.papel === 'coordenacao', 'Esta ação exige o papel de coordenação.', 'permissao');
}

function throwIfErrors(errors, values) {
  if (Object.keys(errors).length > 0) {
    throw new ValidationFailure(errors, values);
  }
}

function reasonOrDefault(value, fallback) {
  const reason = String(value ?? '').trim();
  if (!reason) return fallback;
  if (reason.length > 300) {
    throw new DomainError('O motivo deve ter no máximo 300 caracteres.', 'motivo_longo');
  }
  return reason;
}

export function createResource(db, input, actor) {
  assertActor(actor);
  const { values, errors } = validateResourceInput(input);
  throwIfErrors(errors, values);

  const id = transaction(db, () => {
    const info = db
      .prepare(
        `INSERT INTO recurso
           (nome, tipo, unidade, categoria, controla_estoque, estoque_minimo, ativo, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        values.nome,
        values.tipo,
        values.unidade,
        values.categoria || null,
        values.controla_estoque,
        values.estoque_minimo,
        values.ativo ? 1 : 0,
        values.observacoes || null,
      );
    const newId = Number(info.lastInsertRowid);
    recordEvent(db, {
      entidade: 'recurso',
      entidadeId: newId,
      evento: 'criado',
      atorId: actor.id,
      detalhe: `${values.nome} (${values.tipo})`,
    });
    return newId;
  });
  return id;
}

export function updateResource(db, id, input, actor) {
  assertActor(actor);
  const existing = db.prepare('SELECT * FROM recurso WHERE id = ?').get(id);
  assertDomain(existing, 'Recurso não encontrado.', 'nao_encontrado');

  const { values, errors } = validateResourceInput(input);
  throwIfErrors(errors, values);

  const hasMovements = Number(
    db.prepare('SELECT COUNT(*) AS total FROM movimento_recurso WHERE recurso_id = ?').get(id).total,
  );
  if (hasMovements > 0 && (existing.tipo !== values.tipo || existing.unidade !== values.unidade)) {
    throw new DomainError(
      'Não é possível alterar o tipo ou a unidade de um recurso que já possui movimentos de estoque.',
      'recurso_com_movimentos',
    );
  }

  transaction(db, () => {
    db.prepare(
      `UPDATE recurso
       SET nome = ?, tipo = ?, unidade = ?, categoria = ?, controla_estoque = ?,
           estoque_minimo = ?, ativo = ?, observacoes = ?
       WHERE id = ?`,
    ).run(
      values.nome,
      values.tipo,
      values.unidade,
      values.categoria || null,
      values.controla_estoque,
      values.estoque_minimo,
      values.ativo ? 1 : 0,
      values.observacoes || null,
      id,
    );
    recordEvent(db, {
      entidade: 'recurso',
      entidadeId: id,
      evento: 'atualizado',
      atorId: actor.id,
      detalhe: values.nome,
    });
  });
}

export function createDonor(db, input, actor) {
  assertActor(actor);
  const { values, errors } = validateDonorInput(input);
  throwIfErrors(errors, values);

  return transaction(db, () => {
    const info = db
      .prepare('INSERT INTO doador (nome, tipo, contato, observacoes) VALUES (?, ?, ?, ?)')
      .run(values.nome, values.tipo || null, values.contato || null, values.observacoes || null);
    const id = Number(info.lastInsertRowid);
    recordEvent(db, {
      entidade: 'doador',
      entidadeId: id,
      evento: 'criado',
      atorId: actor.id,
      detalhe: values.nome,
    });
    return id;
  });
}

export function updateDonor(db, id, input, actor) {
  assertActor(actor);
  const existing = db.prepare('SELECT * FROM doador WHERE id = ?').get(id);
  assertDomain(existing, 'Doador não encontrado.', 'nao_encontrado');
  const { values, errors } = validateDonorInput(input);
  throwIfErrors(errors, values);

  transaction(db, () => {
    db.prepare('UPDATE doador SET nome = ?, tipo = ?, contato = ?, observacoes = ? WHERE id = ?').run(
      values.nome,
      values.tipo || null,
      values.contato || null,
      values.observacoes || null,
      id,
    );
    recordEvent(db, {
      entidade: 'doador',
      entidadeId: id,
      evento: 'atualizado',
      atorId: actor.id,
      detalhe: values.nome,
    });
  });
}

export function createFamily(db, input, actor) {
  assertActor(actor);
  const { values, errors } = validateFamilyInput(input);
  throwIfErrors(errors, values);

  const duplicate = db.prepare('SELECT id FROM familia WHERE codigo = ?').get(values.codigo);
  if (duplicate) {
    throw new ValidationFailure({ codigo: 'Já existe uma família com este código.' }, values);
  }

  return transaction(db, () => {
    const info = db
      .prepare('INSERT INTO familia (codigo, observacoes) VALUES (?, ?)')
      .run(values.codigo, values.observacoes || null);
    const id = Number(info.lastInsertRowid);
    recordEvent(db, {
      entidade: 'familia',
      entidadeId: id,
      evento: 'criado',
      atorId: actor.id,
      detalhe: values.codigo,
    });
    return id;
  });
}

export function updateFamily(db, id, input, actor) {
  assertActor(actor);
  const existing = db.prepare('SELECT * FROM familia WHERE id = ?').get(id);
  assertDomain(existing, 'Família não encontrada.', 'nao_encontrado');
  const { values, errors } = validateFamilyInput(input);
  throwIfErrors(errors, values);

  const duplicate = db
    .prepare('SELECT id FROM familia WHERE codigo = ? AND id <> ?')
    .get(values.codigo, id);
  if (duplicate) {
    throw new ValidationFailure({ codigo: 'Já existe uma família com este código.' }, values);
  }

  transaction(db, () => {
    db.prepare('UPDATE familia SET codigo = ?, observacoes = ? WHERE id = ?').run(
      values.codigo,
      values.observacoes || null,
      id,
    );
    recordEvent(db, {
      entidade: 'familia',
      entidadeId: id,
      evento: 'atualizado',
      atorId: actor.id,
      detalhe: values.codigo,
    });
  });
}

function validateDonationReferences(db, values, errors) {
  const donor = db.prepare('SELECT * FROM doador WHERE id = ?').get(values.doador_id);
  if (!donor) errors.doador_id = 'Doador não encontrado.';

  const responsible = db.prepare('SELECT * FROM usuario WHERE id = ? AND ativo = 1').get(values.responsavel_id);
  if (!responsible) errors.responsavel_id = 'Responsável não encontrado ou inativo.';

  values.items.forEach((item, index) => {
    if (!item.recurso_id) return;
    const resource = db.prepare('SELECT * FROM recurso WHERE id = ?').get(item.recurso_id);
    if (!resource) {
      errors[`itens.${index}.recurso_id`] = 'Recurso não encontrado.';
    } else if (resource.tipo !== RESOURCE_TYPES.BEM) {
      errors[`itens.${index}.recurso_id`] = 'Na v1, apenas bens podem ser doados.';
    } else if (!resource.ativo) {
      errors[`itens.${index}.recurso_id`] = 'Recurso inativo não pode ser usado em novas doações.';
    }
  });
}

export function createDonation(db, input, actor) {
  assertActor(actor);
  const { values, errors } = validateDonationInput(input);
  validateDonationReferences(db, values, errors);
  throwIfErrors(errors, values);

  return transaction(db, () => {
    const info = db
      .prepare(
        `INSERT INTO doacao (doador_id, data, status, responsavel_id, observacoes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(values.doador_id, values.data, DONATION_STATUS.RECEBIDA, values.responsavel_id, values.observacoes || null);
    const doacaoId = Number(info.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO doacao_item (doacao_id, recurso_id, quantidade, validade, observacoes)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const item of values.items) {
      insertItem.run(
        doacaoId,
        item.recurso_id,
        Number(item.quantidade),
        item.validade || null,
        item.observacoes || null,
      );
    }
    recordEvent(db, {
      entidade: 'doacao',
      entidadeId: doacaoId,
      evento: 'criado',
      statusNovo: DONATION_STATUS.RECEBIDA,
      atorId: actor.id,
      detalhe: `${values.items.length} item(ns)`,
    });
    return doacaoId;
  });
}

function validateDeliveryReferences(db, values, errors) {
  const family = db.prepare('SELECT * FROM familia WHERE id = ?').get(values.familia_id);
  if (!family) errors.familia_id = 'Família não encontrada.';

  const responsible = db.prepare('SELECT * FROM usuario WHERE id = ? AND ativo = 1').get(values.responsavel_id);
  if (!responsible) errors.responsavel_id = 'Responsável não encontrado ou inativo.';

  values.items.forEach((item, index) => {
    if (!item.recurso_id) return;
    const resource = db.prepare('SELECT * FROM recurso WHERE id = ?').get(item.recurso_id);
    if (!resource) {
      errors[`itens.${index}.recurso_id`] = 'Recurso não encontrado.';
    } else if (resource.tipo !== RESOURCE_TYPES.BEM) {
      errors[`itens.${index}.recurso_id`] = 'Na v1, apenas bens podem ser entregues.';
    } else if (!resource.ativo) {
      errors[`itens.${index}.recurso_id`] = 'Recurso inativo não pode ser usado em novas entregas.';
    }
  });
}

export function createDelivery(db, input, actor) {
  assertActor(actor);
  const { values, errors } = validateDeliveryInput(input);
  validateDeliveryReferences(db, values, errors);
  throwIfErrors(errors, values);

  return transaction(db, () => {
    const info = db
      .prepare(
        `INSERT INTO entrega (familia_id, data, status, responsavel_id, observacoes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(values.familia_id, values.data, DELIVERY_STATUS.REGISTRADA, values.responsavel_id, values.observacoes || null);
    const entregaId = Number(info.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO entrega_item (entrega_id, recurso_id, quantidade, observacoes)
       VALUES (?, ?, ?, ?)`,
    );
    for (const item of values.items) {
      insertItem.run(entregaId, item.recurso_id, Number(item.quantidade), item.observacoes || null);
    }
    recordEvent(db, {
      entidade: 'entrega',
      entidadeId: entregaId,
      evento: 'criado',
      statusNovo: DELIVERY_STATUS.REGISTRADA,
      atorId: actor.id,
      detalhe: `${values.items.length} item(ns)`,
    });
    return entregaId;
  });
}

export function validateDonation(db, doacaoId, actor) {
  assertCoordination(actor);
  const donation = db.prepare('SELECT * FROM doacao WHERE id = ?').get(doacaoId);
  assertDomain(donation, 'Doação não encontrada.', 'nao_encontrado');
  assertDomain(
    donation.status === DONATION_STATUS.RECEBIDA,
    'Somente doações com status Recebida podem ser validadas.',
    'transicao_invalida',
  );
  const items = db.prepare('SELECT * FROM doacao_item WHERE doacao_id = ?').all(doacaoId);
  assertDomain(items.length > 0, 'A doação não possui itens.', 'doacao_sem_itens');

  for (const item of items) {
    const resource = db.prepare('SELECT * FROM recurso WHERE id = ?').get(item.recurso_id);
    assertDomain(resource?.ativo === 1, 'A doação contém um recurso inativo.', 'recurso_inativo');
    assertDomain(resource?.tipo === RESOURCE_TYPES.BEM, 'A doação contém um recurso que não é bem.', 'tipo_invalido');
  }

  transaction(db, () => {
    const movementDate = todayIso();
    for (const item of items) {
      insertMovement(db, {
        recursoId: item.recurso_id,
        tipo: MOVEMENT_TYPES.ENTRADA,
        quantidade: Number(item.quantidade),
        data: movementDate,
        doacaoId,
        validade: item.validade,
        responsavelId: actor.id,
        motivo: `Validação da doação #${doacaoId}`,
      });
    }
    db.prepare('UPDATE doacao SET status = ? WHERE id = ?').run(DONATION_STATUS.DISPONIVEL, doacaoId);
    recordEvent(db, {
      entidade: 'doacao',
      entidadeId: doacaoId,
      evento: 'status_alterado',
      statusAnterior: DONATION_STATUS.RECEBIDA,
      statusNovo: DONATION_STATUS.DISPONIVEL,
      atorId: actor.id,
      detalhe: `Entrada de estoque gerada para ${items.length} item(ns).`,
    });
  });
}

export function cancelDonation(db, doacaoId, actor, reason = '') {
  assertCoordination(actor);
  const donation = db.prepare('SELECT * FROM doacao WHERE id = ?').get(doacaoId);
  assertDomain(donation, 'Doação não encontrada.', 'nao_encontrado');
  assertDomain(
    [DONATION_STATUS.RECEBIDA, DONATION_STATUS.DISPONIVEL].includes(donation.status),
    'Esta doação não pode mais ser cancelada.',
    'transicao_invalida',
  );
  const cleanReason = reasonOrDefault(reason, 'Cancelamento pela coordenação');
  const items = db.prepare('SELECT * FROM doacao_item WHERE doacao_id = ?').all(doacaoId);

  transaction(db, () => {
    if (donation.status === DONATION_STATUS.DISPONIVEL) {
      for (const item of items) {
        const saldo = balanceFor(db, item.recurso_id);
        if (saldo < Number(item.quantidade)) {
          const resource = db.prepare('SELECT nome FROM recurso WHERE id = ?').get(item.recurso_id);
          throw new DomainError(
            `Não é possível cancelar: o saldo de ${resource?.nome ?? 'um item'} é ${saldo}, mas a doação tinha ${item.quantidade}.`,
            'saldo_insuficiente',
          );
        }
        insertMovement(db, {
          recursoId: item.recurso_id,
          tipo: MOVEMENT_TYPES.SAIDA,
          quantidade: Number(item.quantidade),
          data: todayIso(),
          doacaoId,
          validade: item.validade,
          responsavelId: actor.id,
          motivo: `Cancelamento da doação #${doacaoId}: ${cleanReason}`,
        });
      }
    }
    db.prepare('UPDATE doacao SET status = ? WHERE id = ?').run(DONATION_STATUS.CANCELADA, doacaoId);
    recordEvent(db, {
      entidade: 'doacao',
      entidadeId: doacaoId,
      evento: 'cancelado',
      statusAnterior: donation.status,
      statusNovo: DONATION_STATUS.CANCELADA,
      atorId: actor.id,
      detalhe: cleanReason,
    });
  });
}

export function confirmDelivery(db, entregaId, actor) {
  assertActor(actor);
  const delivery = db.prepare('SELECT * FROM entrega WHERE id = ?').get(entregaId);
  assertDomain(delivery, 'Entrega não encontrada.', 'nao_encontrado');
  assertDomain(
    delivery.status === DELIVERY_STATUS.REGISTRADA,
    'Somente entregas com status Registrada podem ser confirmadas.',
    'transicao_invalida',
  );
  const items = db.prepare('SELECT * FROM entrega_item WHERE entrega_id = ?').all(entregaId);
  assertDomain(items.length > 0, 'A entrega não possui itens.', 'entrega_sem_itens');

  transaction(db, () => {
    const shortages = [];
    for (const item of items) {
      const resource = db.prepare('SELECT nome, unidade, ativo, tipo FROM recurso WHERE id = ?').get(item.recurso_id);
      assertDomain(resource?.ativo === 1, 'A entrega contém um recurso inativo.', 'recurso_inativo');
      assertDomain(resource?.tipo === RESOURCE_TYPES.BEM, 'A entrega contém um recurso que não é bem.', 'tipo_invalido');
      const saldo = balanceFor(db, item.recurso_id);
      if (saldo < Number(item.quantidade)) {
        shortages.push(`${resource.nome}: disponível ${saldo}, solicitado ${item.quantidade}`);
      }
    }
    if (shortages.length > 0) {
      throw new DomainError(`Saldo insuficiente para confirmar a entrega. ${shortages.join('; ')}.`, 'saldo_insuficiente');
    }

    const movementDate = todayIso();
    for (const item of items) {
      insertMovement(db, {
        recursoId: item.recurso_id,
        tipo: MOVEMENT_TYPES.SAIDA,
        quantidade: Number(item.quantidade),
        data: movementDate,
        entregaId,
        responsavelId: actor.id,
        motivo: `Entrega #${entregaId}`,
      });
    }
    db.prepare('UPDATE entrega SET status = ? WHERE id = ?').run(DELIVERY_STATUS.ENTREGUE, entregaId);
    recordEvent(db, {
      entidade: 'entrega',
      entidadeId: entregaId,
      evento: 'status_alterado',
      statusAnterior: DELIVERY_STATUS.REGISTRADA,
      statusNovo: DELIVERY_STATUS.ENTREGUE,
      atorId: actor.id,
      detalhe: `Saída de estoque gerada para ${items.length} item(ns).`,
    });
  });
}

export function cancelDelivery(db, entregaId, actor, reason = '') {
  assertCoordination(actor);
  const delivery = db.prepare('SELECT * FROM entrega WHERE id = ?').get(entregaId);
  assertDomain(delivery, 'Entrega não encontrada.', 'nao_encontrado');
  assertDomain(
    [DELIVERY_STATUS.REGISTRADA, DELIVERY_STATUS.ENTREGUE].includes(delivery.status),
    'Esta entrega não pode mais ser cancelada.',
    'transicao_invalida',
  );
  const items = db.prepare('SELECT * FROM entrega_item WHERE entrega_id = ?').all(entregaId);
  const cleanReason = reasonOrDefault(reason, 'Cancelamento pela coordenação');

  transaction(db, () => {
    if (delivery.status === DELIVERY_STATUS.ENTREGUE) {
      for (const item of items) {
        insertMovement(db, {
          recursoId: item.recurso_id,
          tipo: MOVEMENT_TYPES.ENTRADA,
          quantidade: Number(item.quantidade),
          data: todayIso(),
          entregaId,
          responsavelId: actor.id,
          motivo: `Cancelamento da entrega #${entregaId}: ${cleanReason}`,
        });
      }
    }
    db.prepare('UPDATE entrega SET status = ? WHERE id = ?').run(DELIVERY_STATUS.CANCELADA, entregaId);
    recordEvent(db, {
      entidade: 'entrega',
      entidadeId: entregaId,
      evento: 'cancelado',
      statusAnterior: delivery.status,
      statusNovo: DELIVERY_STATUS.CANCELADA,
      atorId: actor.id,
      detalhe: cleanReason,
    });
  });
}

export function adjustStock(db, input, actor) {
  assertCoordination(actor);
  const { values, errors } = validateAdjustmentInput(input);
  throwIfErrors(errors, values);

  const resource = db.prepare('SELECT * FROM recurso WHERE id = ?').get(values.recurso_id);
  if (!resource) {
    throw new ValidationFailure({ recurso_id: 'Recurso não encontrado.' }, values);
  }
  if (resource.tipo !== RESOURCE_TYPES.BEM || resource.controla_estoque !== 1) {
    throw new ValidationFailure({ recurso_id: 'Ajustes de estoque são permitidos apenas para bens.' }, values);
  }
  if (!resource.ativo) {
    throw new ValidationFailure({ recurso_id: 'Recurso inativo não pode receber ajustes.' }, values);
  }

  return transaction(db, () => {
    if (values.tipo_ajuste === 'saida') {
      assertSufficientBalance(db, resource.id, Number(values.quantidade), resource.nome);
    }
    const movementId = insertMovement(db, {
      recursoId: resource.id,
      tipo: values.tipo_ajuste === 'entrada' ? MOVEMENT_TYPES.AJUSTE_ENTRADA : MOVEMENT_TYPES.AJUSTE_SAIDA,
      quantidade: Number(values.quantidade),
      data: values.data,
      responsavelId: actor.id,
      motivo: values.motivo,
    });
    recordEvent(db, {
      entidade: 'movimento',
      entidadeId: movementId,
      evento: 'estoque_ajustado',
      atorId: actor.id,
      data: values.data,
      detalhe: `${values.tipo_ajuste === 'entrada' ? 'Entrada' : 'Saída'} de ${values.quantidade} ${resource.unidade} em ${resource.nome}: ${values.motivo}`,
    });
    return movementId;
  });
}
