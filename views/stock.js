import { todayIso } from '../lib/date.js';
import { escapeHtml, formatQuantity } from '../lib/text.js';
import { stockStatus } from '../lib/ledger.js';
import { emptyState, inputField, selectField, textareaField } from './components.js';

export function renderStockList({ resources, filters }) {
  const rows = resources
    .map((resource) => {
      const status = stockStatus(resource.saldo, resource.estoque_minimo);
      const label = status === 'abaixo' ? 'Abaixo do mínimo' : status === 'sem-estoque' ? 'Sem estoque' : 'OK';
      const tone = status === 'ok' ? 'ok' : status === 'sem-estoque' ? 'danger' : 'attention';
      return `<tr>
        <td data-label="Recurso">${escapeHtml(resource.nome)}</td>
        <td data-label="Categoria">${escapeHtml(resource.categoria || '—')}</td>
        <td data-label="Saldo" class="num">${escapeHtml(formatQuantity(resource.saldo, resource.unidade))}</td>
        <td data-label="Mínimo" class="num">${escapeHtml(formatQuantity(resource.estoque_minimo, resource.unidade))}</td>
        <td data-label="Situação"><span class="chip chip-${tone}">${escapeHtml(label)}</span></td>
        <td data-label="Ações"><a class="link" href="/estoque/ajuste?recurso_id=${resource.id}">Ajustar</a></td>
      </tr>`;
    })
    .join('');

  return `<section class="panel filters">
    <form method="get" action="/estoque" class="filter-grid">
      ${inputField({ name: 'categoria', label: 'Categoria', value: filters.categoria ?? '', placeholder: 'Ex.: Alimentos' })}
      ${selectField({
        name: 'situacao',
        label: 'Situação',
        value: filters.situacao ?? '',
        placeholder: 'Todas',
        options: [
          { value: 'ok', label: 'OK' },
          { value: 'abaixo', label: 'Abaixo do mínimo' },
          { value: 'sem-estoque', label: 'Sem estoque' },
        ],
      })}
      <div class="filter-actions">
        <button class="btn btn-primary" type="submit">Filtrar</button>
        <a class="btn btn-quiet" href="/estoque">Limpar</a>
      </div>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Estoque atual</h2>
      <p class="muted small">Saldo calculado em tempo real a partir dos movimentos.</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Recurso</th><th>Categoria</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Situação</th><th>Ações</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState({ title: 'Nenhum recurso no estoque', text: 'Cadastre um bem para acompanhar o saldo.' })
    }
  </section>`;
}

export function renderAdjustmentForm({ values, errors = {}, recursos, currentUser }) {
  if (!currentUser || currentUser.papel !== 'coordenacao') {
    return `<section class="panel">
      <div class="panel-head"><h2>Ajuste de estoque</h2></div>
      <p class="notice">Apenas a coordenação pode registrar ajustes de estoque. Troque o perfil na barra lateral para continuar.</p>
      <a class="btn btn-quiet" href="/estoque">Voltar ao estoque</a>
    </section>`;
  }
  return `<form class="panel form-panel" method="post" action="/estoque/ajuste">
    <div class="form-grid">
      ${selectField({
        name: 'recurso_id',
        label: 'Recurso',
        value: values.recurso_id ?? '',
        error: errors.recurso_id,
        required: true,
        placeholder: 'Selecione',
        options: recursos.map((resource) => ({
          value: resource.id,
          label: `${resource.nome} · saldo ${resource.saldo} ${resource.unidade}`,
        })),
      })}
      ${selectField({
        name: 'tipo_ajuste',
        label: 'Tipo de ajuste',
        value: values.tipo_ajuste ?? '',
        error: errors.tipo_ajuste,
        required: true,
        placeholder: 'Selecione',
        options: [
          { value: 'entrada', label: 'Entrada (aumenta o saldo)' },
          { value: 'saida', label: 'Saída (reduz o saldo)' },
        ],
      })}
      ${inputField({
        name: 'quantidade',
        label: 'Quantidade',
        value: values.quantidade ?? '',
        error: errors.quantidade,
        type: 'number',
        min: 1,
        inputmode: 'numeric',
        required: true,
      })}
      ${inputField({
        name: 'data',
        label: 'Data do ajuste',
        value: values.data ?? todayIso(),
        error: errors.data,
        type: 'date',
        required: true,
      })}
      <div class="field field-span-2">
        ${textareaField({
          name: 'motivo',
          label: 'Motivo',
          value: values.motivo ?? '',
          error: errors.motivo,
          required: true,
          rows: 3,
          help: 'Entre 5 e 300 caracteres. Ex.: inventário, perda, vencimento, correção de lançamento.',
        })}
      </div>
    </div>
    <p class="muted small">Responsável pelo ajuste: <strong>${escapeHtml(currentUser.nome)}</strong>.</p>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/estoque">Cancelar</a>
      <button class="btn btn-primary" type="submit">Registrar ajuste</button>
    </div>
  </form>`;
}
