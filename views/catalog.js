import { escapeHtml, formatQuantity } from '../lib/text.js';
import { stockStatus } from '../lib/ledger.js';
import { RESOURCE_TYPE_LABELS, ROLE_LABELS } from '../lib/constants.js';
import {
  checkboxField,
  emptyState,
  hiddenField,
  inputField,
  selectField,
  textareaField,
} from './components.js';

export function renderResourceList({ resources }) {
  const rows = resources
    .map((resource) => {
      const isGood = resource.tipo === 'bem' && resource.controla_estoque === 1;
      const status = isGood ? stockStatus(resource.saldo, resource.estoque_minimo) : null;
      const statusLabel = !isGood
        ? 'Não controla'
        : status === 'abaixo'
          ? 'Abaixo do mínimo'
          : status === 'sem-estoque'
            ? 'Sem estoque'
            : 'OK';
      const statusTone = !isGood ? 'neutral' : status === 'ok' ? 'ok' : status === 'sem-estoque' ? 'danger' : 'attention';
      return `<tr>
        <td data-label="Recurso"><a href="/recursos/${resource.id}/editar">${escapeHtml(resource.nome)}</a></td>
        <td data-label="Tipo">${escapeHtml(RESOURCE_TYPE_LABELS[resource.tipo] ?? resource.tipo)}</td>
        <td data-label="Unidade">${escapeHtml(resource.unidade)}</td>
        <td data-label="Categoria">${escapeHtml(resource.categoria || '—')}</td>
        <td data-label="Saldo" class="num">${isGood ? escapeHtml(formatQuantity(resource.saldo, resource.unidade)) : '—'}</td>
        <td data-label="Mínimo" class="num">${isGood ? escapeHtml(formatQuantity(resource.estoque_minimo, resource.unidade)) : '—'}</td>
        <td data-label="Situação"><span class="chip chip-${statusTone}">${escapeHtml(statusLabel)}</span></td>
        <td data-label="Ativo">${resource.ativo ? '<span class="chip chip-ok">Ativo</span>' : '<span class="chip chip-neutral">Inativo</span>'}</td>
      </tr>`;
    })
    .join('');

  return `<section class="panel">
    <div class="panel-head">
      <h2>Catálogo de recursos</h2>
      <p class="muted small">Bens controlados por estoque. Serviços entram na v2.</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Recurso</th><th>Tipo</th><th>Unidade</th><th>Categoria</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Situação</th><th>Ativo</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState({
            title: 'Nenhum recurso cadastrado',
            text: 'Comece cadastrando os bens que a organização recebe e distribui.',
            action: '<a class="btn btn-primary" href="/recursos/novo">Cadastrar recurso</a>',
          })
    }
  </section>`;
}

export function renderResourceForm({ values, errors = {}, mode = 'novo' }) {
  const isEdit = mode === 'editar';
  const isService = values.tipo === 'servico';
  const action = isEdit ? `/recursos/${values.id}` : '/recursos';
  const typeField = isService
    ? `${hiddenField('tipo', 'servico')}<div class="field"><label>Tipo</label><p class="readonly">Serviço (criado fora da interface da v1)</p></div>`
    : selectField({
        name: 'tipo',
        label: 'Tipo',
        value: values.tipo || 'bem',
        error: errors.tipo,
        required: true,
        help: 'Na v1, a interface opera apenas com bens. Serviços serão habilitados na v2.',
        options: [
          { value: 'bem', label: 'Bem' },
          { value: 'servico', label: 'Serviço (v2)', disabled: true },
        ],
      });

  return `<form class="panel form-panel" method="post" action="${action}">
    <div class="form-grid">
      ${inputField({
        name: 'nome',
        label: 'Nome do recurso',
        value: values.nome ?? '',
        error: errors.nome,
        required: true,
        max: 80,
        placeholder: 'Ex.: Arroz 5 kg',
      })}
      ${typeField}
      ${selectField({
        name: 'unidade',
        label: 'Unidade',
        value: values.unidade ?? '',
        error: errors.unidade,
        required: true,
        placeholder: 'Selecione',
        options: [
          { value: 'kg', label: 'kg' },
          { value: 'un', label: 'un (unidade)' },
          { value: 'L', label: 'L (litro)' },
          { value: 'h', label: 'h (hora, serviço)' },
          { value: 'sessao', label: 'sessão (serviço)' },
        ],
      })}
      ${inputField({
        name: 'categoria',
        label: 'Categoria',
        value: values.categoria ?? '',
        error: errors.categoria,
        max: 60,
        placeholder: 'Ex.: Alimentos',
      })}
      ${inputField({
        name: 'estoque_minimo',
        label: 'Estoque mínimo',
        value: values.estoque_minimo ?? '0',
        error: errors.estoque_minimo,
        type: 'number',
        min: 0,
        inputmode: 'numeric',
        help: 'Usado para gerar o alerta de estoque baixo.',
      })}
      ${checkboxField({
        name: 'ativo',
        label: 'Recurso ativo',
        checked: values.ativo === undefined ? true : Boolean(values.ativo),
        help: 'Recursos inativos não podem ser usados em novas doações ou entregas.',
      })}
      <div class="field field-span-2">
        ${textareaField({
          name: 'observacoes',
          label: 'Observações',
          value: values.observacoes ?? '',
          error: errors.observacoes,
          rows: 3,
        })}
      </div>
    </div>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/recursos">Cancelar</a>
      <button class="btn btn-primary" type="submit">${isEdit ? 'Salvar alterações' : 'Cadastrar recurso'}</button>
    </div>
  </form>`;
}

export function renderDonorList({ donors }) {
  const rows = donors
    .map(
      (donor) => `<tr>
        <td data-label="Doador"><a href="/doadores/${donor.id}/editar">${escapeHtml(donor.nome)}</a></td>
        <td data-label="Tipo">${escapeHtml(donor.tipo === 'PF' ? 'Pessoa física' : donor.tipo === 'PJ' ? 'Pessoa jurídica' : 'Não informado')}</td>
        <td data-label="Contato">${escapeHtml(donor.contato || '—')}</td>
        <td data-label="Doações" class="num">${donor.doacoes}</td>
      </tr>`,
    )
    .join('');
  return `<section class="panel">
    <div class="panel-head">
      <h2>Doadores</h2>
      <p class="muted small">Quem doou e quantas doações foram registradas.</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table><thead><tr><th>Doador</th><th>Tipo</th><th>Contato</th><th class="num">Doações</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : emptyState({
            title: 'Nenhum doador cadastrado',
            text: 'Cadastre o primeiro doador para registrar doações.',
            action: '<a class="btn btn-primary" href="/doadores/novo">Cadastrar doador</a>',
          })
    }
  </section>`;
}

export function renderDonorForm({ values, errors = {}, mode = 'novo' }) {
  const isEdit = mode === 'editar';
  const action = isEdit ? `/doadores/${values.id}` : '/doadores';
  return `<form class="panel form-panel" method="post" action="${action}">
    <div class="form-grid">
      ${inputField({
        name: 'nome',
        label: 'Nome',
        value: values.nome ?? '',
        error: errors.nome,
        required: true,
        max: 100,
        placeholder: 'Ex.: Mercado Exemplo',
      })}
      ${selectField({
        name: 'tipo',
        label: 'Tipo',
        value: values.tipo ?? '',
        error: errors.tipo,
        placeholder: 'Não informado',
        options: [
          { value: 'PF', label: 'Pessoa física' },
          { value: 'PJ', label: 'Pessoa jurídica' },
        ],
      })}
      ${inputField({
        name: 'contato',
        label: 'Contato',
        value: values.contato ?? '',
        error: errors.contato,
        max: 120,
        placeholder: 'Telefone, e-mail ou pessoa de contato',
      })}
      <div class="field field-span-2">
        ${textareaField({ name: 'observacoes', label: 'Observações', value: values.observacoes ?? '', error: errors.observacoes })}
      </div>
    </div>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/doadores">Cancelar</a>
      <button class="btn btn-primary" type="submit">${isEdit ? 'Salvar alterações' : 'Cadastrar doador'}</button>
    </div>
  </form>`;
}

export function renderFamilyList({ families }) {
  const rows = families
    .map(
      (family) => `<tr>
        <td data-label="Família"><a href="/familias/${family.id}/editar">${escapeHtml(family.codigo)}</a></td>
        <td data-label="Observações">${escapeHtml(family.observacoes || '—')}</td>
        <td data-label="Entregas" class="num">${family.entregas}</td>
      </tr>`,
    )
    .join('');
  return `<section class="panel">
    <div class="panel-head">
      <h2>Famílias</h2>
      <p class="muted small">Identificadas apenas por código, para reduzir dados pessoais.</p>
    </div>
    ${
      rows
        ? `<div class="table-wrap"><table><thead><tr><th>Família</th><th>Observações</th><th class="num">Entregas</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : emptyState({
            title: 'Nenhuma família cadastrada',
            text: 'Cadastre códigos como F-001 para registrar entregas sem dados pessoais.',
            action: '<a class="btn btn-primary" href="/familias/novo">Cadastrar família</a>',
          })
    }
  </section>`;
}

export function renderFamilyForm({ values, errors = {}, mode = 'novo' }) {
  const isEdit = mode === 'editar';
  const action = isEdit ? `/familias/${values.id}` : '/familias';
  return `<form class="panel form-panel" method="post" action="${action}">
    <div class="form-grid">
      ${inputField({
        name: 'codigo',
        label: 'Código da família',
        value: values.codigo ?? '',
        error: errors.codigo,
        required: true,
        max: 5,
        placeholder: 'F-001',
        help: 'Formato F-000, com três dígitos. Não use nomes reais.',
      })}
      <div class="field field-span-2">
        ${textareaField({ name: 'observacoes', label: 'Observações', value: values.observacoes ?? '', error: errors.observacoes })}
      </div>
    </div>
    <div class="form-actions">
      <a class="btn btn-quiet" href="/familias">Cancelar</a>
      <button class="btn btn-primary" type="submit">${isEdit ? 'Salvar alterações' : 'Cadastrar família'}</button>
    </div>
  </form>`;
}

export function renderRoleLegend() {
  return Object.entries(ROLE_LABELS)
    .map(([role, label]) => `<span class="chip chip-neutral">${escapeHtml(label)}</span>`)
    .join(' ');
}
