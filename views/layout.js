import { escapeHtml } from '../lib/text.js';

const NAV_GROUPS = [
  {
    label: 'Visão geral',
    items: [{ key: 'dashboard', href: '/dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Cadastros',
    items: [
      { key: 'recursos', href: '/recursos', label: 'Recursos' },
      { key: 'doadores', href: '/doadores', label: 'Doadores' },
      { key: 'familias', href: '/familias', label: 'Famílias' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { key: 'doacoes', href: '/doacoes', label: 'Doações' },
      { key: 'entregas', href: '/entregas', label: 'Entregas' },
      { key: 'estoque', href: '/estoque', label: 'Estoque' },
    ],
  },
  {
    label: 'Acompanhamento',
    items: [{ key: 'historico', href: '/historico', label: 'Histórico' }],
  },
];

function renderNav(active) {
  return NAV_GROUPS.map(
    (group) => `<div class="nav-group">
      <p class="nav-label">${escapeHtml(group.label)}</p>
      ${group.items
        .map(
          (item) =>
            `<a class="nav-link${item.key === active ? ' is-active' : ''}" href="${item.href}"${
              item.key === active ? ' aria-current="page"' : ''
            }>${escapeHtml(item.label)}</a>`,
        )
        .join('')}
    </div>`,
  ).join('');
}

function renderMessage(message) {
  if (!message) return '';
  const tone = message.type === 'error' ? 'danger' : message.type === 'warning' ? 'attention' : 'ok';
  return `<div class="banner banner-${tone}" role="status">
    <span class="banner-dot" aria-hidden="true"></span>
    <p>${escapeHtml(message.text)}</p>
  </div>`;
}

function renderProfile(currentUser, users, currentPath) {
  const options = users
    .map(
      (user) =>
        `<option value="${user.id}"${user.id === currentUser.id ? ' selected' : ''}>${escapeHtml(
          user.nome,
        )} · ${escapeHtml(user.papel === 'coordenacao' ? 'Coordenação' : 'Voluntário')}</option>`,
    )
    .join('');
  return `<form class="profile-switch" method="post" action="/perfil">
    <input type="hidden" name="redirect" value="${escapeHtml(currentPath)}">
    <label for="perfil-usuario">Atuando como</label>
    <div class="profile-row">
      <select id="perfil-usuario" name="usuario_id">${options}</select>
      <button class="btn btn-quiet btn-small" type="submit">Trocar</button>
    </div>
    <p class="profile-note">Perfil de demonstração, sem autenticação.</p>
  </form>`;
}

export function renderLayout({
  title = 'KODIE',
  active = '',
  currentUser,
  users = [],
  content = '',
  pageTitle = '',
  pageSubtitle = '',
  eyebrow = '',
  actions = '',
  message = null,
  currentPath = '/dashboard',
}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · KODIE</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="/dashboard" aria-label="KODIE — início">
        <span class="brand-mark" aria-hidden="true">K</span>
        <span class="brand-text">
          <strong>KODIE</strong>
          <small>Doações &amp; Estoque</small>
        </span>
      </a>
      <nav class="nav" aria-label="Navegação principal">${renderNav(active)}</nav>
      ${renderProfile(currentUser, users, currentPath)}
      <p class="sidebar-foot"><span class="status-dot" aria-hidden="true"></span> Ambiente de demonstração</p>
    </aside>
    <main id="conteudo" class="main">
      <header class="page-head">
        <div>
          ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
          <h1>${escapeHtml(pageTitle || title)}</h1>
          ${pageSubtitle ? `<p class="page-sub">${escapeHtml(pageSubtitle)}</p>` : ''}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </header>
      ${renderMessage(message)}
      ${content}
    </main>
  </div>
  <script src="/app.js" defer></script>
</body>
</html>`;
}
