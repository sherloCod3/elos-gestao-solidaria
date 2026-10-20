import { formatDateBR } from '../lib/date.js';
import { escapeHtml, formatQuantity, truncate } from '../lib/text.js';
import { stockStatus } from '../lib/ledger.js';
import { emptyState, metricCard, movementChip, statusChip } from './components.js';

function movementOrigin(movement) {
  if (movement.doacao_id) return `Doação #${movement.doacao_id}`;
  if (movement.entrega_id) return `Entrega #${movement.entrega_id}`;
  if (movement.motivo) return truncate(movement.motivo, 60);
  return '—';
}

function attentionList(items, renderItem, emptyText) {
  if (items.length === 0) {
    return `<p class="muted small">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul class="attention-list">${items.map(renderItem).join('')}</ul>`;
}

export function renderDashboard(data, { flash = null } = {}) {
  const metrics = `<section class="metrics" aria-label="Indicadores">
    ${metricCard({
      label: 'Abaixo do mínimo',
      value: data.lowStock.length,
      detail: data.lowStock.length ? 'recurso(s) precisam de reposição' : 'nenhum recurso abaixo do mínimo',
      tone: data.lowStock.length ? 'attention' : 'neutral',
      href: '/estoque',
    })}
    ${metricCard({
      label: 'Vencem em 7 dias',
      value: data.expiring.length,
      detail: 'itens disponíveis com validade próxima',
      tone: data.expiring.length ? 'attention' : 'neutral',
      href: '/doacoes?status=Disponivel',
    })}
    ${metricCard({
      label: 'Doações pendentes',
      value: data.pendingDonationsCount,
      detail: 'aguardando validação da coordenação',
      tone: data.pendingDonationsCount ? 'attention' : 'neutral',
      href: '/doacoes?status=Recebida',
    })}
    ${metricCard({
      label: 'Entregas em 30 dias',
      value: data.deliveries30Count,
      detail: `desde ${formatDateBR(data.periodStart)}`,
      tone: 'neutral',
      href: '/entregas?status=Entregue',
    })}
  </section>`;

  const attention = `<section class="panel">
    <div class="panel-head">
      <h2>Precisa de atenção</h2>
      <p class="muted small">Sinais gerados a partir do estoque, das validades e dos status.</p>
    </div>
    <div class="attention-grid">
      <div class="attention-block">
        <h3>Estoque baixo</h3>
        ${attentionList(
          data.lowStock.slice(0, 5),
          (item) =>
            `<li><a href="/estoque/ajuste?recurso_id=${item.id}"><span>${escapeHtml(item.nome)}</span><small>faltam ${escapeHtml(
              formatQuantity(item.falta, item.unidade),
            )}</small></a></li>`,
          'Nenhum recurso abaixo do mínimo.',
        )}
      </div>
      <div class="attention-block">
        <h3>Validade próxima</h3>
        ${attentionList(
          data.expiring.slice(0, 5),
          (item) =>
            `<li><a href="/doacoes/${item.doacao_id}"><span>${escapeHtml(item.recurso_nome)}</span><small>${escapeHtml(
              formatDateBR(item.validade),
            )} · ${escapeHtml(item.doador_nome)}</small></a></li>`,
          'Nenhum item disponível vence nos próximos 7 dias.',
        )}
      </div>
      <div class="attention-block">
        <h3>Doações aguardando validação</h3>
        ${attentionList(
          data.pendingDonations,
          (item) =>
            `<li><a href="/doacoes/${item.id}"><span>Doação #${item.id} · ${escapeHtml(item.doador_nome)}</span><small>${escapeHtml(
              formatDateBR(item.data),
            )}${item.atrasada ? ' · atrasada' : ''}</small></a></li>`,
          'Nenhuma doação pendente.',
        )}
      </div>
      <div class="attention-block">
        <h3>Entregas aguardando confirmação</h3>
        ${attentionList(
          data.pendingDeliveries,
          (item) =>
            `<li><a href="/entregas/${item.id}"><span>Entrega #${item.id} · ${escapeHtml(item.familia_codigo)}</span><small>${escapeHtml(
              formatDateBR(item.data),
            )}${item.atrasada ? ' · atrasada' : ''}</small></a></li>`,
          'Nenhuma entrega pendente.',
        )}
      </div>
    </div>
  </section>`;

  const balancesRows = data.balances
    .map((item) => {
      const status = stockStatus(item.saldo, item.estoque_minimo);
      const label = status === 'abaixo' ? 'Abaixo do mínimo' : status === 'sem-estoque' ? 'Sem estoque' : 'OK';
      const tone = status === 'ok' ? 'ok' : status === 'sem-estoque' ? 'danger' : 'attention';
      return `<tr>
        <td data-label="Recurso"><a href="/estoque/ajuste?recurso_id=${item.id}">${escapeHtml(item.nome)}</a></td>
        <td data-label="Categoria">${escapeHtml(item.categoria || '—')}</td>
        <td data-label="Saldo" class="num">${escapeHtml(formatQuantity(item.saldo, item.unidade))}</td>
        <td data-label="Mínimo" class="num">${escapeHtml(formatQuantity(item.estoque_minimo, item.unidade))}</td>
        <td data-label="Situação"><span class="chip chip-${tone}">${escapeHtml(label)}</span></td>
      </tr>`;
    })
    .join('');

  const balancePanel = `<section class="panel">
    <div class="panel-head">
      <h2>Saldo por recurso</h2>
      <p class="muted small">Calculado a partir dos movimentos de estoque.</p>
    </div>
    ${
      balancesRows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Recurso</th><th>Categoria</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Situação</th></tr></thead>
            <tbody>${balancesRows}</tbody>
          </table></div>`
        : emptyState({ title: 'Nenhum recurso ativo', text: 'Cadastre um bem para começar a controlar o estoque.', action: '<a class="btn btn-primary" href="/recursos/novo">Cadastrar recurso</a>' })
    }
  </section>`;

  const movementsRows = data.recentMovements
    .map(
      (movement) => `<tr>
        <td data-label="Data">${escapeHtml(formatDateBR(movement.data))}</td>
        <td data-label="Recurso">${escapeHtml(movement.recurso_nome)}</td>
        <td data-label="Movimento">${movementChip(movement.tipo_movimento)}</td>
        <td data-label="Quantidade" class="num">${escapeHtml(formatQuantity(movement.quantidade, movement.unidade))}</td>
        <td data-label="Origem">${escapeHtml(movementOrigin(movement))}</td>
        <td data-label="Responsável">${escapeHtml(movement.responsavel_nome)}</td>
      </tr>`,
    )
    .join('');

  const recentPanel = `<section class="panel">
    <div class="panel-head">
      <h2>Movimentações recentes</h2>
      <p class="muted small">Últimos lançamentos no ledger de estoque.</p>
    </div>
    ${
      movementsRows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Data</th><th>Recurso</th><th>Movimento</th><th class="num">Quantidade</th><th>Origem</th><th>Responsável</th></tr></thead>
            <tbody>${movementsRows}</tbody>
          </table></div>`
        : emptyState({ title: 'Nenhuma movimentação', text: 'As entradas e saídas aparecerão aqui.' })
    }
  </section>`;

  const donationsRows = data.recentDonations
    .map(
      (item) => `<tr>
        <td data-label="Doação"><a href="/doacoes/${item.id}">#${item.id}</a></td>
        <td data-label="Doador">${escapeHtml(item.doador_nome)}</td>
        <td data-label="Data">${escapeHtml(formatDateBR(item.data))}</td>
        <td data-label="Status">${statusChip(item.status)}</td>
      </tr>`,
    )
    .join('');

  const deliveriesRows = data.recentDeliveries
    .map(
      (item) => `<tr>
        <td data-label="Entrega"><a href="/entregas/${item.id}">#${item.id}</a></td>
        <td data-label="Família">${escapeHtml(item.familia_codigo)}</td>
        <td data-label="Data">${escapeHtml(formatDateBR(item.data))}</td>
        <td data-label="Status">${statusChip(item.status)}</td>
      </tr>`,
    )
    .join('');

  const activity = `<section class="split">
    <div class="panel">
      <div class="panel-head"><h2>Doações recentes</h2><a class="link small" href="/doacoes">Ver todas</a></div>
      ${
        donationsRows
          ? `<div class="table-wrap"><table><thead><tr><th>Doação</th><th>Doador</th><th>Data</th><th>Status</th></tr></thead><tbody>${donationsRows}</tbody></table></div>`
          : emptyState({ title: 'Nenhuma doação', text: 'Registre a primeira doação.' })
      }
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Entregas recentes</h2><a class="link small" href="/entregas">Ver todas</a></div>
      ${
        deliveriesRows
          ? `<div class="table-wrap"><table><thead><tr><th>Entrega</th><th>Família</th><th>Data</th><th>Status</th></tr></thead><tbody>${deliveriesRows}</tbody></table></div>`
          : emptyState({ title: 'Nenhuma entrega', text: 'Registre a primeira entrega.' })
      }
    </div>
  </section>`;

  return `${metrics}${attention}${balancePanel}${recentPanel}${activity}`;
}
