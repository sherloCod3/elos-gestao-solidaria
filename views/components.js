import { STATUS_LABELS, MOVEMENT_LABELS, statusTone } from '../lib/constants.js';
import { escapeHtml } from '../lib/text.js';

export function statusChip(status) {
  const label = STATUS_LABELS[status] ?? status ?? '—';
  const tone = statusTone(status);
  return `<span class="chip chip-${tone}">${escapeHtml(label)}</span>`;
}

export function movementChip(type) {
  const label = MOVEMENT_LABELS[type] ?? type;
  const tone = type === 'entrada' || type === 'ajuste_entrada' ? 'ok' : 'neutral';
  return `<span class="chip chip-${tone}">${escapeHtml(label)}</span>`;
}

export function metricCard({ label, value, detail = '', tone = 'neutral', href = '' }) {
  const tag = href ? 'a' : 'div';
  const attrs = href ? ` href="${escapeHtml(href)}"` : '';
  return `<${tag} class="metric metric-${tone}"${attrs}>
    <span class="metric-label">${escapeHtml(label)}</span>
    <strong class="metric-value">${escapeHtml(String(value))}</strong>
    ${detail ? `<span class="metric-detail">${escapeHtml(detail)}</span>` : ''}
  </${tag}>`;
}

export function emptyState({ title, text = '', action = '' }) {
  return `<div class="empty">
    <p class="empty-title">${escapeHtml(title)}</p>
    ${text ? `<p class="empty-text">${escapeHtml(text)}</p>` : ''}
    ${action || ''}
  </div>`;
}

export function errorText(error) {
  if (!error) return '';
  return `<p class="field-error">${escapeHtml(error)}</p>`;
}

function fieldId(name) {
  return `f-${String(name).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function describedBy(name, help, error) {
  const ids = [];
  if (help) ids.push(`${fieldId(name)}-help`);
  if (error) ids.push(`${fieldId(name)}-error`);
  return ids.length ? ` aria-describedby="${ids.join(' ')}"` : '';
}

export function inputField({
  name,
  label,
  value = '',
  error = '',
  type = 'text',
  required = false,
  help = '',
  placeholder = '',
  min = '',
  max = '',
  step = '',
  inputmode = '',
  autocomplete = 'off',
}) {
  const id = fieldId(name);
  const attrs = [
    `id="${id}"`,
    `name="${escapeHtml(name)}"`,
    `type="${escapeHtml(type)}"`,
    `value="${escapeHtml(value)}"`,
    required ? 'required' : '',
    placeholder ? `placeholder="${escapeHtml(placeholder)}"` : '',
    min !== '' ? `min="${escapeHtml(String(min))}"` : '',
    max !== '' ? `max="${escapeHtml(String(max))}"` : '',
    step ? `step="${escapeHtml(String(step))}"` : '',
    inputmode ? `inputmode="${escapeHtml(inputmode)}"` : '',
    `autocomplete="${escapeHtml(autocomplete)}"`,
    error ? 'aria-invalid="true"' : '',
    describedBy(name, help, error),
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="field ${error ? 'has-error' : ''}">
    <label for="${id}">${escapeHtml(label)}${required ? ' <span class="req">*</span>' : ''}</label>
    <input ${attrs}>
    ${help ? `<p class="field-help" id="${id}-help">${escapeHtml(help)}</p>` : ''}
    ${error ? `<p class="field-error" id="${id}-error">${escapeHtml(error)}</p>` : ''}
  </div>`;
}

export function selectField({
  name,
  label,
  value = '',
  error = '',
  options = [],
  required = false,
  help = '',
  placeholder = '',
}) {
  const id = fieldId(name);
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  const rendered = normalized
    .map((option) => {
      const selected = String(option.value) === String(value) ? ' selected' : '';
      const disabled = option.disabled ? ' disabled' : '';
      return `<option value="${escapeHtml(option.value)}"${selected}${disabled}>${escapeHtml(option.label)}</option>`;
    })
    .join('');
  const placeholderOption = placeholder
    ? `<option value="">${escapeHtml(placeholder)}</option>`
    : '';
  return `<div class="field ${error ? 'has-error' : ''}">
    <label for="${id}">${escapeHtml(label)}${required ? ' <span class="req">*</span>' : ''}</label>
    <select id="${id}" name="${escapeHtml(name)}" ${required ? 'required' : ''}${
      error ? ' aria-invalid="true"' : ''
    }${describedBy(name, help, error)}>
      ${placeholderOption}${rendered}
    </select>
    ${help ? `<p class="field-help" id="${id}-help">${escapeHtml(help)}</p>` : ''}
    ${error ? `<p class="field-error" id="${id}-error">${escapeHtml(error)}</p>` : ''}
  </div>`;
}

export function textareaField({ name, label, value = '', error = '', required = false, help = '', rows = 3 }) {
  const id = fieldId(name);
  return `<div class="field ${error ? 'has-error' : ''}">
    <label for="${id}">${escapeHtml(label)}${required ? ' <span class="req">*</span>' : ''}</label>
    <textarea id="${id}" name="${escapeHtml(name)}" rows="${rows}"${
      required ? ' required' : ''
    }${error ? ' aria-invalid="true"' : ''}${describedBy(name, help, error)}>${escapeHtml(value)}</textarea>
    ${help ? `<p class="field-help" id="${id}-help">${escapeHtml(help)}</p>` : ''}
    ${error ? `<p class="field-error" id="${id}-error">${escapeHtml(error)}</p>` : ''}
  </div>`;
}

export function checkboxField({ name, label, checked = false, help = '' }) {
  const id = fieldId(name);
  return `<div class="field field-check">
    <label class="check" for="${id}">
      <input id="${id}" type="checkbox" name="${escapeHtml(name)}" value="1"${checked ? ' checked' : ''}>
      <span>${escapeHtml(label)}</span>
    </label>
    ${help ? `<p class="field-help">${escapeHtml(help)}</p>` : ''}
  </div>`;
}

export function hiddenField(name, value) {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}
