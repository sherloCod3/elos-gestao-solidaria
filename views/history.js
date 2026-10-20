import { formatDateBR } from '../lib/date.js';
import { escapeHtml, truncate } from '../lib/text.js';
import { emptyState, inputField, selectField } from './components.js';

const ENTITY_LABELS = {
  recurso: 'Recurso',
  doador: 'Doador',
  familia: 'Família',
  doacao: 'Doação',
  entrega: 'Entrega',
  movimento: 'Movimento',
};

const EVENT_LABELS = {
  criado: 'Criado',
  atualizado: 'Atualizado',
  status_alterado: 'Status alterado',
  cancelado: 'Cancelado',
  estoque_ajustado: 'Estoque ajustado',
};

export function renderHistory({ events, filters }) {
  const rows = events
    .map(
      (event) => `<tr>
        <td data-label="Data">${escapeHtml(formatDateBR(event.data))}</td>
        <td data-label="Entidade">${escapeHtml(ENTITY_LABELS[event.entidade] ?? event.entidade)} #${event.entidade_id}</td>
        <td data-label="Evento">${escapeHtml(EVENT_LABELS[event.evento] ?? event.evento.replaceAll('_', ' '))}</td>
        <td data-label="Transição">${escapeHtml(
          event.status_anterior || event.status_novo
            ? `${event.status_anterior ?? '—'} → ${event.status_novo ?? '—'}`
            : '—',
        )}</td>
        <td data-label="Ator">${escapeHtml(event.ator_nome)}</td>
        <td data-label="Detalhe">${escapeHtml(truncate(event.detalhe || '—', 120))}</td>
      </tr>`,
    )
    .join('');

  return `<section class="panel filters">
    <form method="get" action="/historico" class="filter-grid">
      ${selectField({
        name: 'entidade',
        label: 'Entidade',
        value: filters.entidade ?? '',
        placeholder: 'Todas',
        options: Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
      })}
      ${selectField({
        name: 'evento',
        label: 'Evento',
        value: filters.evento ?? '',
        placeholder: 'Todos',
        options: Object.entries(EVENT_LABELS).map(([value, label]) => ({ value, label })),
      })}
      ${inputField({ name: 'de', label: 'De', value: filters.from ?? '', type: 'date' })}
      ${inputField({ name: 'ate', label: 'Até', value: filters.to ?? '', type: 'date' })}
      <div class="filter-actions">
        <button class="btn btn-primary" type="submit">Filtrar</button>
        <a class="btn btn-quiet" href="/historico">Limpar</a>
      </div>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Histórico de eventos</h2>
      <p class="muted small">${events.length} evento(s) encontrado(s). Registro somente de acréscimo.</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Data</th><th>Entidade</th><th>Evento</th><th>Transição</th><th>Ator</th><th>Detalhe</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState({ title: 'Nenhum evento encontrado', text: 'Ajuste os filtros para visualizar o histórico.' })
    }
  </section>`;
}
