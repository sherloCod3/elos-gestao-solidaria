import { formatDateBR } from '../lib/date.js';
import { escapeHtml, formatQuantity, truncate } from '../lib/text.js';
import { DONATION_STATUS } from '../lib/constants.js';
import { emptyState, statusChip } from './components.js';
import { inputField, selectField, textareaField } from './components.js';

export function resourceOptions(resources, selected) {
  return resources
    .map((resource) => {
      const isSelected = String(resource.id) === String(selected ?? '');
      return `<option value="${resource.id}" data-saldo="${resource.saldo}" data-unidade="${escapeHtml(
        resource.unidade,
      )}"${isSelected ? ' selected' : ''}>${escapeHtml(resource.nome)} · saldo ${resource.saldo} ${escapeHtml(
        resource.unidade,
      )}${resource.ativo ? '' : ' (inativo)'}</option>`;
    })
    .join('');
}

function donationItemRow(item = {}, index = 0, resources = [], errors = {}) {
  const rowError = (field) => errors[`itens.${index}.${field}`] ?? '';
  const itemInput = (name, label, value, extra = '') =>
    `<div class="field ${rowError(name) ? 'has-error' : ''}">
      <label for="item-${index}-${name}">${escapeHtml(label)}</label>
      <input id="item-${index}-${name}" name="${name}" value="${escapeHtml(value ?? '')}" ${extra}>
      ${rowError(name) ? `<p class="field-error">${escapeHtml(rowError(name))}</p>` : ''}
    </div>`;

  return `<div class="item-row" data-item-row>
    <div class="field ${rowError('recurso_id') ? 'has-error' : ''}">
      <label for="item-${index}-recurso_id">Recurso</label>
      <select id="item-${index}-recurso_id" name="recurso_id" class="js-resource-select">
        <option value="">Selecione</option>
        ${resourceOptions(resources, item.recurso_id)}
      </select>
      ${rowError('recurso_id') ? `<p class="field-error">${escapeHtml(rowError('recurso_id'))}</p>` : ''}
    </div>
    ${itemInput('quantidade', 'Quantidade', item.quantidade, 'inputmode="numeric" min="1" type="number" class="js-quantity"')}
    ${itemInput('validade', 'Validade (opcional)', item.validade, 'type="date"')}
    ${itemInput('item_observacoes', 'Observação do item', item.observacoes)}
    <button type="button" class="btn btn-quiet btn-small item-remove" data-remove-row>Remover</button>
    <p class="balance-hint js-balance-hint" aria-live="polite"></p>
  </div>`;
}

export function deliveryItemRow(item = {}, index = 0, resources = [], errors = {}) {
  const rowError = (field) => errors[`itens.${index}.${field}`] ?? '';
  return `<div class="item-row" data-item-row>
    <div class="field ${rowError('recurso_id') ? 'has-error' : ''}">
      <label for="item-${index}-recurso_id">Recurso</label>
      <select id="item-${index}-recurso_id" name="recurso_id" class="js-resource-select">
        <option value="">Selecione</option>
        ${resourceOptions(resources, item.recurso_id)}
      </select>
      ${rowError('recurso_id') ? `<p class="field-error">${escapeHtml(rowError('recurso_id'))}</p>` : ''}
    </div>
    <div class="field ${rowError('quantidade') ? 'has-error' : ''}">
      <label for="item-${index}-quantidade">Quantidade</label>
      <input id="item-${index}-quantidade" name="quantidade" value="${escapeHtml(item.quantidade ?? '')}" type="number" min="1" inputmode="numeric" class="js-quantity">
      ${rowError('quantidade') ? `<p class="field-error">${escapeHtml(rowError('quantidade'))}</p>` : ''}
    </div>
    <div class="field ${rowError('observacoes') ? 'has-error' : ''}">
      <label for="item-${index}-item_observacoes">Observação do item</label>
      <input id="item-${index}-item_observacoes" name="item_observacoes" value="${escapeHtml(item.observacoes ?? '')}">
      ${rowError('observacoes') ? `<p class="field-error">${escapeHtml(rowError('observacoes'))}</p>` : ''}
    </div>
    <button type="button" class="btn btn-quiet btn-small item-remove" data-remove-row>Remover</button>
    <p class="balance-hint js-balance-hint" aria-live="polite"></p>
  </div>`;
}

export function renderDonationList({ donations, filters, doadores }) {
  const rows = donations
    .map(
      (donation) => `<tr>
        <td data-label="Doação"><a href="/doacoes/${donation.id}">#${donation.id}</a></td>
        <td data-label="Doador">${escapeHtml(donation.doador_nome)}</td>
        <td data-label="Data">${escapeHtml(formatDateBR(donation.data))}</td>
        <td data-label="Status">${statusChip(donation.status)}</td>
        <td data-label="Itens" class="num">${donation.itens}</td>
        <td data-label="Quantidade total" class="num">${donation.quantidade_total}</td>
        <td data-label="Responsável">${escapeHtml(donation.responsavel_nome)}</td>
      </tr>`,
    )
    .join('');

  return `<section class="panel filters">
    <form method="get" action="/doacoes" class="filter-grid">
      ${selectField({
        name: 'status',
        label: 'Status',
        value: filters.status,
        placeholder: 'Todos',
        options: [
          { value: DONATION_STATUS.RECEBIDA, label: 'Recebida' },
          { value: DONATION_STATUS.DISPONIVEL, label: 'Disponível' },
          { value: DONATION_STATUS.CANCELADA, label: 'Cancelada' },
        ],
      })}
      ${selectField({
        name: 'doador_id',
        label: 'Doador',
        value: filters.doadorId,
        placeholder: 'Todos',
        options: doadores.map((doador) => ({ value: doador.id, label: doador.nome })),
      })}
      ${inputField({ name: 'de', label: 'De', value: filters.from, type: 'date' })}
      ${inputField({ name: 'ate', label: 'Até', value: filters.to, type: 'date' })}
      <div class="filter-actions">
        <button class="btn btn-primary" type="submit">Filtrar</button>
        <a class="btn btn-quiet" href="/doacoes">Limpar</a>
      </div>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Doações</h2>
      <p class="muted small">${donations.length} registro(s) encontrado(s).</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Doação</th><th>Doador</th><th>Data</th><th>Status</th><th class="num">Itens</th><th class="num">Qtd. total</th><th>Responsável</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState({
            title: 'Nenhuma doação encontrada',
            text: 'Ajuste os filtros ou registre uma nova doação.',
            action: '<a class="btn btn-primary" href="/doacoes/nova">Registrar doação</a>',
          })
    }
  </section>`;
}

export function renderDonationForm({ values, errors = {}, recursos, doadores, usuarios }) {
  const items = values.items?.length ? values.items : [{}, {}, {}];
  const rows = items.map((item, index) => donationItemRow(item, index, recursos, errors)).join('');
  return `<form class="panel form-panel" method="post" action="/doacoes">
    <div class="form-grid">
      ${selectField({
        name: 'doador_id',
        label: 'Doador',
        value: values.doador_id ?? '',
        error: errors.doador_id,
        required: true,
        placeholder: 'Selecione',
        options: doadores.map((doador) => ({ value: doador.id, label: doador.nome })),
      })}
      ${inputField({
        name: 'data',
        label: 'Data da doação',
        value: values.data ?? '',
        error: errors.data,
        type: 'date',
        required: true,
      })}
      ${selectField({
        name: 'responsavel_id',
        label: 'Responsável pelo registro',
        value: values.responsavel_id ?? '',
        error: errors.responsavel_id,
        required: true,
        placeholder: 'Selecione',
        options: usuarios.map((user) => ({ value: user.id, label: user.nome })),
      })}
      <div class="field field-span-2">
        ${textareaField({ name: 'observacoes', label: 'Observações', value: values.observacoes ?? '', error: errors.observacoes })}
      </div>
    </div>
    <div class="items-head">
      <div>
        <h2>Itens da doação</h2>
        <p class="muted small">Uma linha por recurso. Quantidades são inteiras na v1.</p>
      </div>
      <button class="btn btn-quiet" type="button" data-add-row>Adicionar item</button>
    </div>
    ${errors.itens ? `<p class="field-error">${escapeHtml(errors.itens)}</p>` : ''}
    <div class="item-rows" data-item-rows>${rows}</div>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/doacoes">Cancelar</a>
      <button class="btn btn-primary" type="submit">Registrar doação</button>
    </div>
  </form>`;
}

export function renderDonationDetail({ donation, items, history, currentUser, error = '' }) {
  const canCoordinate = currentUser?.papel === 'coordenacao';
  const itemRows = items
    .map(
      (item) => `<tr>
        <td data-label="Recurso">${escapeHtml(item.recurso_nome)}</td>
        <td data-label="Quantidade" class="num">${escapeHtml(formatQuantity(item.quantidade, item.unidade))}</td>
        <td data-label="Validade">${item.validade ? escapeHtml(formatDateBR(item.validade)) : '—'}</td>
        <td data-label="Saldo atual" class="num">${escapeHtml(formatQuantity(item.saldo_atual, item.unidade))}</td>
        <td data-label="Observação">${escapeHtml(item.observacoes || '—')}</td>
      </tr>`,
    )
    .join('');

  const historyItems = history
    .map(
      (event) => `<li>
        <div class="timeline-head"><strong>${escapeHtml(event.evento.replaceAll('_', ' '))}</strong><time>${escapeHtml(
          formatDateBR(event.data),
        )}</time></div>
        <p>${escapeHtml(event.detalhe || '')}</p>
        <small>${escapeHtml(event.ator_nome)}${
          event.status_anterior || event.status_novo
            ? ` · ${escapeHtml(event.status_anterior ?? '—')} → ${escapeHtml(event.status_novo ?? '—')}`
            : ''
        }</small>
      </li>`,
    )
    .join('');

  let actions = '';
  if (donation.status === DONATION_STATUS.RECEBIDA && canCoordinate) {
    actions += `<form method="post" action="/doacoes/${donation.id}/validar" class="inline-form" data-confirm="Validar esta doação e dar entrada no estoque?">
      <button class="btn btn-primary" type="submit">Validar e dar entrada</button>
    </form>`;
  }
  if (canCoordinate && donation.status !== DONATION_STATUS.CANCELADA) {
    actions += `<details class="action-box">
      <summary>Cancelar doação</summary>
      <form method="post" action="/doacoes/${donation.id}/cancelar" class="stack-form" data-confirm="Cancelar esta doação?">
        <label for="motivo-doacao">Motivo do cancelamento (opcional)</label>
        <textarea id="motivo-doacao" name="motivo" rows="2" maxlength="300"></textarea>
        <button class="btn btn-danger" type="submit">Confirmar cancelamento</button>
      </form>
    </details>`;
  }
  if (!canCoordinate && donation.status === DONATION_STATUS.RECEBIDA) {
    actions += `<p class="notice">Apenas a coordenação pode validar ou cancelar doações.</p>`;
  }

  return `<section class="detail-grid">
    <div class="panel detail-main">
      <div class="panel-head">
        <div>
          <h2>Doação #${donation.id}</h2>
          <p class="muted small">${escapeHtml(donation.doador_nome)} · ${escapeHtml(formatDateBR(donation.data))}</p>
        </div>
        ${statusChip(donation.status)}
      </div>
      ${error ? `<div class="banner banner-danger" role="alert"><p>${escapeHtml(error)}</p></div>` : ''}
      <dl class="facts">
        <div><dt>Doador</dt><dd>${escapeHtml(donation.doador_nome)}</dd></div>
        <div><dt>Data</dt><dd>${escapeHtml(formatDateBR(donation.data))}</dd></div>
        <div><dt>Responsável</dt><dd>${escapeHtml(donation.responsavel_nome)}</dd></div>
        <div><dt>Itens</dt><dd>${donation.itens}</dd></div>
        <div><dt>Quantidade total</dt><dd>${donation.quantidade_total}</dd></div>
      </dl>
      ${donation.observacoes ? `<p class="note">${escapeHtml(donation.observacoes)}</p>` : ''}
      <div class="table-wrap"><table>
        <thead><tr><th>Recurso</th><th class="num">Quantidade</th><th>Validade</th><th class="num">Saldo atual</th><th>Observação</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table></div>
      ${actions ? `<div class="detail-actions">${actions}</div>` : ''}
    </div>
    <aside class="panel">
      <div class="panel-head"><h2>Histórico</h2></div>
      ${historyItems ? `<ol class="timeline">${historyItems}</ol>` : '<p class="muted small">Sem eventos registrados.</p>'}
    </aside>
  </section>`;
}
