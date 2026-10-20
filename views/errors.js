import { escapeHtml } from '../lib/text.js';

export function renderErrorPage({ status, title, message, detail = '' }) {
  return `<section class="panel error-panel">
    <p class="eyebrow">Erro ${status}</p>
    <h2>${escapeHtml(title)}</h2>
    <p class="notice">${escapeHtml(message)}</p>
    ${detail ? `<p class="muted small">${escapeHtml(detail)}</p>` : ''}
    <a class="btn btn-primary" href="/dashboard">Voltar ao dashboard</a>
  </section>`;
}
