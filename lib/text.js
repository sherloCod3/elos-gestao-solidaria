import { UNIT_LABELS } from './constants.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatQuantity(value, unit) {
  const number = Number(value ?? 0);
  return `${number.toLocaleString('pt-BR')} ${UNIT_LABELS[unit] ?? unit ?? ''}`.trim();
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function truncate(value, length = 90) {
  const text = String(value ?? '').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}
