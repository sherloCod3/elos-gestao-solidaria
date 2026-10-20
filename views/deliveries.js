import { formatDateBR } from '../lib/date.js';
import { escapeHtml, formatQuantity } from '../lib/text.js';
import { DELIVERY_STATUS } from '../lib/constants.js';
import { deliveryItemRow } from './donations.js';
import { emptyState, inputField, selectField, statusChip, textareaField } from './components.js';

export function renderDeliveryList({ deliveries, filters, familias }) {
  const rows = deliveries
    .map(
      (delivery) => `<tr>
        <td data-label="Entrega"><a href="/entregas/${delivery.id}">#${delivery.id}</a></td>
        <td data-label="Família">${escapeHtml(delivery.familia_codigo)}</td>
        <td data-label="Data">${escapeHtml(formatDateBR(delivery.data))}</td>
        <td data-label="Status">${statusChip(delivery.status)}</td>
        <td data-label="Itens" class="num">${delivery.itens}</td>
        <td data-label="Quantidade total" class="num">${delivery.quantidade_total}</td>
        <td data-label="Responsável">${escapeHtml(delivery.responsavel_nome)}</td>
      </tr>`,
    )
    .join('');

  return `<section class="panel filters">
    <form method="get" action="/entregas" class="filter-grid">
      ${selectField({
        name: 'status',
        label: 'Status',
        value: filters.status,
        placeholder: 'Todos',
        options: [
          { value: DELIVERY_STATUS.REGISTRADA, label: 'Registrada' },
          { value: DELIVERY_STATUS.ENTREGUE, label: 'Entregue' },
          { value: DELIVERY_STATUS.CANCELADA, label: 'Cancelada' },
        ],
      })}
      ${selectField({
        name: 'familia_id',
        label: 'Família',
        value: filters.familiaId,
        placeholder: 'Todas',
        options: familias.map((familia) => ({ value: familia.id, label: familia.codigo })),
      })}
      ${inputField({ name: 'de', label: 'De', value: filters.from, type: 'date' })}
      ${inputField({ name: 'ate', label: 'Até', value: filters.to, type: 'date' })}
      <div class="filter-actions">
        <button class="btn btn-primary" type="submit">Filtrar</button>
        <a class="btn btn-quiet" href="/entregas">Limpar</a>
      </div>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Entregas</h2>
      <p class="muted small">${deliveries.length} registro(s) encontrado(s).</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Entrega</th><th>Família</th><th>Data</th><th>Status</th><th class="num">Itens</th><th class="num">Qtd. total</th><th>Responsável</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState({
            title: 'Nenhuma entrega encontrada',
            text: 'Ajuste os filtros ou registre uma nova entrega.',
            action: '<a class="btn btn-primary" href="/entregas/nova">Registrar entrega</a>',
          })
    }
  </section>`;
}

export function renderDeliveryForm({ values, errors = {}, recursos, familias, usuarios }) {
  const items = values.items?.length ? values.items : [{}, {}, {}];
  const rows = items.map((item, index) => deliveryItemRow(item, index, recursos, errors)).join('');
  return `<form class="panel form-panel" method="post" action="/entregas">
    <div class="form-grid">
      ${selectField({
        name: 'familia_id',
        label: 'Família',
        value: values.familia_id ?? '',
        error: errors.familia_id,
        required: true,
        placeholder: 'Selecione',
        options: familias.map((familia) => ({ value: familia.id, label: familia.codigo })),
      })}
      ${inputField({
        name: 'data',
        label: 'Data da entrega',
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
        <h2>Itens da entrega</h2>
        <p class="muted small">O saldo é validado no momento da confirmação.</p>
      </div>
      <button class="btn btn-quiet" type="button" data-add-row>Adicionar item</button>
    </div>
    ${errors.itens ? `<p class="field-error">${escapeHtml(errors.itens)}</p>` : ''}
    <div class="item-rows" data-item-rows>${rows}</div>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/entregas">Cancelar</a>
      <button class="btn btn-primary" type="submit">Registrar entrega</button>
    </div>
  </form>`;
}

export function renderDeliveryDetail({ delivery, items, history, currentUser, error = '' }) {
  const canCoordinate = currentUser?.papel === 'coordenacao';
  const shortages =
    delivery.status === DELIVERY_STATUS.REGISTRADA
      ? items.filter((item) => Number(item.saldo_atual) < Number(item.quantidade))
      : [];

  const itemRows = items
    .map(
      (item) => `<tr>
        <td data-label="Recurso">${escapeHtml(item.recurso_nome)}</td>
        <td data-label="Quantidade" class="num">${escapeHtml(formatQuantity(item.quantidade, item.unidade))}</td>
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
        <small>${escapeHtml(event.ator_nome)}</small>
      </li>`,
    )
    .join('');

  let actions = '';
  if (delivery.status === DELIVERY_STATUS.REGISTRADA) {
    actions += `<form method="post" action="/entregas/${delivery.id}/confirmar" class="inline-form" data-confirm="Confirmar a entrega e dar saída no estoque?">
      <button class="btn btn-primary" type="submit"${shortages.length ? ' disabled' : ''}>Confirmar entrega</button>
    </form>`;
  }
  if (canCoordinate && delivery.status !== DELIVERY_STATUS.CANCELADA) {
    actions += `<details class="action-box">
      <summary>Cancelar entrega</summary>
      <form method="post" action="/entregas/${delivery.id}/cancelar" class="stack-form" data-confirm="Cancelar esta entrega?">
        <label for="motivo-entrega">Motivo do cancelamento (opcional)</label>
        <textarea id="motivo-entrega" name="motivo" rows="2" maxlength="300"></textarea>
        <button class="btn btn-danger" type="submit">Confirmar cancelamento</button>
      </form>
    </details>`;
  }

  return `<section class="detail-grid">
    <div class="panel detail-main">
      <div class="panel-head">
        <div>
          <h2>Entrega #${delivery.id}</h2>
          <p class="muted small">Família ${escapeHtml(delivery.familia_codigo)} · ${escapeHtml(formatDateBR(delivery.data))}</p>
        </div>
        ${statusChip(delivery.status)}
      </div>
      ${error ? `<div class="banner banner-danger" role="alert"><p>${escapeHtml(error)}</p></div>` : ''}
      ${
        shortages.length
          ? `<div class="banner banner-attention" role="alert"><p>Saldo insuficiente para confirmar: ${escapeHtml(
              shortages.map((item) => `${item.recurso_nome} (disponível ${item.saldo_atual}, solicitado ${item.quantidade})`).join('; '),
            )}.</p></div>`
          : ''
      }
      <dl class="facts">
        <div><dt>Família</dt><dd>${escapeHtml(delivery.familia_codigo)}</dd></div>
        <div><dt>Data</dt><dd>${escapeHtml(formatDateBR(delivery.data))}</dd></div>
        <div><dt>Responsável</dt><dd>${escapeHtml(delivery.responsavel_nome)}</dd></div>
        <div><dt>Itens</dt><dd>${delivery.itens}</dd></div>
        <div><dt>Quantidade total</dt><dd>${delivery.quantidade_total}</dd></div>
      </dl>
      ${delivery.observacoes ? `<p class="note">${escapeHtml(delivery.observacoes)}</p>` : ''}
      <div class="table-wrap"><table>
        <thead><tr><th>Recurso</th><th class="num">Quantidade</th><th class="num">Saldo atual</th><th>Observação</th></tr></thead>
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
