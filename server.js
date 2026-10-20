import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { closeDatabase, openDatabase, transaction } from './db.js';
import { DomainError, ValidationFailure } from './lib/errors.js';
import { currentPath, isSafeRedirect, parseCookies, readForm, redirect, sendHtml, sendJson, setCookie } from './lib/http.js';
import { todayIso } from './lib/date.js';
import { APP_NAME } from './lib/constants.js';
import {
  findFamily,
  findDonor,
  findUser,
  firstCoordinator,
  getDashboardData,
  getDelivery,
  getDeliveryItems,
  getDonation,
  getDonationItems,
  getHistory,
  getHistoryFor,
  getResource,
  listDeliveries,
  listDonations,
  listDonors,
  listFamilies,
  listResources,
  listUsers,
} from './lib/repo.js';
import { stockStatus } from './lib/ledger.js';
import {
  adjustStock,
  cancelDelivery,
  cancelDonation,
  confirmDelivery,
  createDelivery,
  createDonation,
  createDonor,
  createFamily,
  createResource,
  updateDonor,
  updateFamily,
  updateResource,
  validateDonation,
} from './lib/services.js';
import { renderLayout } from './views/layout.js';
import { renderDashboard } from './views/dashboard.js';
import {
  renderDonorForm,
  renderDonorList,
  renderFamilyForm,
  renderFamilyList,
  renderResourceForm,
  renderResourceList,
} from './views/catalog.js';
import { renderDonationDetail, renderDonationForm, renderDonationList } from './views/donations.js';
import { renderDeliveryDetail, renderDeliveryForm, renderDeliveryList } from './views/deliveries.js';
import { renderAdjustmentForm, renderStockList } from './views/stock.js';
import { renderHistory } from './views/history.js';
import { renderErrorPage } from './views/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

const OK_MESSAGES = Object.freeze({
  'recurso-criado': 'Recurso cadastrado com sucesso.',
  'recurso-atualizado': 'Recurso atualizado.',
  'doador-criado': 'Doador cadastrado com sucesso.',
  'doador-atualizado': 'Doador atualizado.',
  'familia-criada': 'Família cadastrada com sucesso.',
  'familia-atualizada': 'Família atualizada.',
  'doacao-criada': 'Doação registrada. Ela aguarda validação da coordenação.',
  'doacao-validada': 'Doação validada e entrada de estoque registrada.',
  'doacao-cancelada': 'Doação cancelada.',
  'entrega-criada': 'Entrega registrada. O saldo será validado na confirmação.',
  'entrega-confirmada': 'Entrega confirmada e saída de estoque registrada.',
  'entrega-cancelada': 'Entrega cancelada.',
  'ajuste-registrado': 'Ajuste de estoque registrado.',
  'perfil-alterado': 'Perfil de demonstração alterado.',
});

const ERROR_MESSAGES = Object.freeze({
  'recurso-com-movimentos': 'Não é possível alterar tipo ou unidade de um recurso com movimentos.',
  'perfil-invalido': 'Perfil inválido. Escolha um usuário ativo.',
  'nao-encontrado': 'Registro não encontrado.',
  'saldo-insuficiente': 'Saldo insuficiente para concluir a operação.',
  permissao: 'Seu perfil não tem permissão para esta ação.',
  'transicao-invalida': 'Esta transição de status não é permitida.',
});

function ensureBootstrap(db) {
  const total = Number(db.prepare('SELECT COUNT(*) AS total FROM usuario').get().total);
  if (total > 0) return;
  transaction(db, () => {
    db.prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Coordenação Demo', 'coordenacao', 1)").run();
    db.prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Voluntário Demo', 'voluntario', 1)").run();
  });
}

function resolveActor(req, db) {
  const cookies = parseCookies(req);
  const id = Number(cookies.kodie_usuario);
  if (Number.isInteger(id) && id > 0) {
    const user = findUser(db, id);
    if (user) return user;
  }
  return firstCoordinator(db);
}

function flashFor(url) {
  const ok = url.searchParams.get('ok');
  if (ok && OK_MESSAGES[ok]) return { type: 'success', text: OK_MESSAGES[ok] };
  const erro = url.searchParams.get('erro');
  if (erro && ERROR_MESSAGES[erro]) return { type: 'error', text: ERROR_MESSAGES[erro] };
  return null;
}

function renderPage(ctx, { status = 200, title = APP_NAME, active = '', pageTitle = '', pageSubtitle = '', eyebrow = '', actions = '', content = '' }) {
  const html = renderLayout({
    title,
    active,
    pageTitle,
    pageSubtitle,
    eyebrow,
    actions,
    content,
    currentUser: ctx.actor,
    users: ctx.users,
    currentPath: currentPath(ctx.url),
    message: flashFor(ctx.url),
  });
  sendHtml(ctx.res, status, html);
}

function renderNotFound(ctx, message = 'A página que você procurou não existe.') {
  renderPage(ctx, {
    status: 404,
    title: 'Não encontrado',
    active: '',
    eyebrow: 'Erro 404',
    pageTitle: 'Não encontrado',
    pageSubtitle: message,
    content: renderErrorPage({ status: 404, title: 'Registro não encontrado', message }),
  });
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('Registro não encontrado.', 'nao_encontrado');
  }
  return id;
}

function withOk(pathname, code) {
  const target = new URL(pathname, 'http://local');
  target.searchParams.set('ok', code);
  return `${target.pathname}${target.search}`;
}

function parseItems(form, { withValidity = false } = {}) {
  const resources = form.getAll('recurso_id');
  const quantities = form.getAll('quantidade');
  const validities = withValidity ? form.getAll('validade') : [];
  const observations = form.getAll('item_observacoes');
  const total = Math.max(resources.length, quantities.length, validities.length, observations.length);
  const items = [];
  for (let index = 0; index < total; index += 1) {
    const item = {
      recurso_id: resources[index] ?? '',
      quantidade: quantities[index] ?? '',
      validade: withValidity ? (validities[index] ?? '') : '',
      observacoes: observations[index] ?? '',
    };
    if (item.recurso_id || item.quantidade || item.validade || item.observacoes) {
      items.push(item);
    }
  }
  return items;
}

function actionButton(href, label, primary = false) {
  return `<a class="btn ${primary ? 'btn-primary' : 'btn-quiet'}" href="${href}">${label}</a>`;
}

const routes = [
  {
    method: 'GET',
    pattern: /^\/$/,
    handler: (ctx) => redirect(ctx.res, '/dashboard'),
  },
  {
    method: 'GET',
    pattern: /^\/dashboard$/,
    handler: (ctx) => {
      const data = getDashboardData(ctx.db);
      const actions = `${actionButton('/doacoes/nova', 'Nova doação', true)}${actionButton('/entregas/nova', 'Nova entrega')}`;
      renderPage(ctx, {
        title: 'Dashboard',
        active: 'dashboard',
        eyebrow: 'Visão geral',
        pageTitle: 'Dashboard',
        pageSubtitle: `Operação de doações e estoque · ${data.today.split('-').reverse().join('/')}`,
        actions,
        content: renderDashboard(data),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/recursos$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Recursos',
        active: 'recursos',
        eyebrow: 'Cadastros',
        pageTitle: 'Recursos',
        pageSubtitle: 'Bens recebidos e distribuídos, com saldo derivado dos movimentos.',
        actions: actionButton('/recursos/novo', 'Novo recurso', true),
        content: renderResourceList({ resources: listResources(ctx.db) }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/recursos\/novo$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Novo recurso',
        active: 'recursos',
        eyebrow: 'Cadastros',
        pageTitle: 'Novo recurso',
        pageSubtitle: 'Cadastre um bem que entra e sai do estoque.',
        content: renderResourceForm({
          values: { tipo: 'bem', unidade: '', estoque_minimo: '0', ativo: true, categoria: '', nome: '', observacoes: '' },
          errors: {},
          mode: 'novo',
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/recursos$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = {
        nome: form.get('nome') ?? '',
        tipo: form.get('tipo') ?? 'bem',
        unidade: form.get('unidade') ?? '',
        categoria: form.get('categoria') ?? '',
        estoque_minimo: form.get('estoque_minimo') ?? '0',
        ativo: form.get('ativo') ?? '',
        observacoes: form.get('observacoes') ?? '',
      };
      try {
        const id = createResource(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk(`/recursos/${id}/editar`, 'recurso-criado'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Novo recurso',
            active: 'recursos',
            eyebrow: 'Cadastros',
            pageTitle: 'Novo recurso',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderResourceForm({ values: error.values, errors: error.errors, mode: 'novo' }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/recursos\/(\d+)\/editar$/,
    handler: (ctx, params) => {
      const id = parseId(params[0]);
      const resource = getResource(ctx.db, id);
      if (!resource) {
        renderNotFound(ctx, 'Recurso não encontrado.');
        return;
      }
      renderPage(ctx, {
        title: 'Editar recurso',
        active: 'recursos',
        eyebrow: 'Cadastros',
        pageTitle: `Editar ${resource.nome}`,
        pageSubtitle: 'Alterações de tipo ou unidade são bloqueadas após movimentos.',
        content: renderResourceForm({ values: resource, mode: 'editar' }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/recursos\/(\d+)$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      const resource = getResource(ctx.db, id);
      if (!resource) {
        renderNotFound(ctx, 'Recurso não encontrado.');
        return;
      }
      const form = await readForm(ctx.req);
      const values = {
        nome: form.get('nome') ?? '',
        tipo: form.get('tipo') ?? 'bem',
        unidade: form.get('unidade') ?? '',
        categoria: form.get('categoria') ?? '',
        estoque_minimo: form.get('estoque_minimo') ?? '0',
        ativo: form.get('ativo') ?? '',
        observacoes: form.get('observacoes') ?? '',
      };
      try {
        updateResource(ctx.db, id, values, ctx.actor);
        redirect(ctx.res, withOk('/recursos', 'recurso-atualizado'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Editar recurso',
            active: 'recursos',
            eyebrow: 'Cadastros',
            pageTitle: `Editar ${resource.nome}`,
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderResourceForm({ values: { ...resource, ...error.values }, errors: error.errors, mode: 'editar' }),
          });
          return;
        }
        if (error instanceof DomainError) {
          redirect(ctx.res, `/recursos/${id}/editar?erro=${encodeURIComponent(error.code)}`);
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/doadores$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Doadores',
        active: 'doadores',
        eyebrow: 'Cadastros',
        pageTitle: 'Doadores',
        pageSubtitle: 'Pessoas e organizações que doam para a operação.',
        actions: actionButton('/doadores/novo', 'Novo doador', true),
        content: renderDonorList({ donors: listDonors(ctx.db) }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/doadores\/novo$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Novo doador',
        active: 'doadores',
        eyebrow: 'Cadastros',
        pageTitle: 'Novo doador',
        pageSubtitle: 'Registre quem doou. Dados fictícios são suficientes para a demonstração.',
        content: renderDonorForm({ values: { nome: '', tipo: '', contato: '', observacoes: '' }, errors: {}, mode: 'novo' }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/doadores$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = {
        nome: form.get('nome') ?? '',
        tipo: form.get('tipo') ?? '',
        contato: form.get('contato') ?? '',
        observacoes: form.get('observacoes') ?? '',
      };
      try {
        const id = createDonor(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk(`/doadores/${id}/editar`, 'doador-criado'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Novo doador',
            active: 'doadores',
            eyebrow: 'Cadastros',
            pageTitle: 'Novo doador',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderDonorForm({ values: error.values, errors: error.errors, mode: 'novo' }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/doadores\/(\d+)\/editar$/,
    handler: (ctx, params) => {
      const id = parseId(params[0]);
      const donor = findDonor(ctx.db, id);
      if (!donor) {
        renderNotFound(ctx, 'Doador não encontrado.');
        return;
      }
      renderPage(ctx, {
        title: 'Editar doador',
        active: 'doadores',
        eyebrow: 'Cadastros',
        pageTitle: `Editar ${donor.nome}`,
        content: renderDonorForm({ values: donor, mode: 'editar' }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/doadores\/(\d+)$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      const donor = findDonor(ctx.db, id);
      if (!donor) {
        renderNotFound(ctx, 'Doador não encontrado.');
        return;
      }
      const form = await readForm(ctx.req);
      const values = {
        nome: form.get('nome') ?? '',
        tipo: form.get('tipo') ?? '',
        contato: form.get('contato') ?? '',
        observacoes: form.get('observacoes') ?? '',
      };
      try {
        updateDonor(ctx.db, id, values, ctx.actor);
        redirect(ctx.res, withOk('/doadores', 'doador-atualizado'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Editar doador',
            active: 'doadores',
            eyebrow: 'Cadastros',
            pageTitle: `Editar ${donor.nome}`,
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderDonorForm({ values: { ...donor, ...error.values }, errors: error.errors, mode: 'editar' }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/familias$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Famílias',
        active: 'familias',
        eyebrow: 'Cadastros',
        pageTitle: 'Famílias',
        pageSubtitle: 'Códigos anônimos para registrar entregas sem dados pessoais.',
        actions: actionButton('/familias/novo', 'Nova família', true),
        content: renderFamilyList({ families: listFamilies(ctx.db) }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/familias\/novo$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Nova família',
        active: 'familias',
        eyebrow: 'Cadastros',
        pageTitle: 'Nova família',
        pageSubtitle: 'Use um código como F-001. Não registre nomes ou endereços reais.',
        content: renderFamilyForm({ values: { codigo: '', observacoes: '' }, errors: {}, mode: 'novo' }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/familias$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = { codigo: form.get('codigo') ?? '', observacoes: form.get('observacoes') ?? '' };
      try {
        const id = createFamily(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk(`/familias/${id}/editar`, 'familia-criada'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Nova família',
            active: 'familias',
            eyebrow: 'Cadastros',
            pageTitle: 'Nova família',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderFamilyForm({ values: error.values, errors: error.errors, mode: 'novo' }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/familias\/(\d+)\/editar$/,
    handler: (ctx, params) => {
      const id = parseId(params[0]);
      const family = findFamily(ctx.db, id);
      if (!family) {
        renderNotFound(ctx, 'Família não encontrada.');
        return;
      }
      renderPage(ctx, {
        title: 'Editar família',
        active: 'familias',
        eyebrow: 'Cadastros',
        pageTitle: `Editar ${family.codigo}`,
        content: renderFamilyForm({ values: family, mode: 'editar' }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/familias\/(\d+)$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      const family = findFamily(ctx.db, id);
      if (!family) {
        renderNotFound(ctx, 'Família não encontrada.');
        return;
      }
      const form = await readForm(ctx.req);
      const values = { codigo: form.get('codigo') ?? '', observacoes: form.get('observacoes') ?? '' };
      try {
        updateFamily(ctx.db, id, values, ctx.actor);
        redirect(ctx.res, withOk('/familias', 'familia-atualizada'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Editar família',
            active: 'familias',
            eyebrow: 'Cadastros',
            pageTitle: `Editar ${family.codigo}`,
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderFamilyForm({ values: { ...family, ...error.values }, errors: error.errors, mode: 'editar' }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/doacoes$/,
    handler: (ctx) => {
      const filters = {
        status: ctx.url.searchParams.get('status') ?? '',
        doadorId: ctx.url.searchParams.get('doador_id') ?? '',
        from: ctx.url.searchParams.get('de') ?? '',
        to: ctx.url.searchParams.get('ate') ?? '',
      };
      renderPage(ctx, {
        title: 'Doações',
        active: 'doacoes',
        eyebrow: 'Operação',
        pageTitle: 'Doações',
        pageSubtitle: 'Registro, validação e entrada de estoque.',
        actions: actionButton('/doacoes/nova', 'Registrar doação', true),
        content: renderDonationList({ donations: listDonations(ctx.db, filters), filters, doadores: listDonors(ctx.db) }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/doacoes\/nova$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Nova doação',
        active: 'doacoes',
        eyebrow: 'Operação',
        pageTitle: 'Registrar doação',
        pageSubtitle: 'A doação entra como Recebida e só movimenta o estoque após validação.',
        content: renderDonationForm({
          values: {
            doador_id: '',
            data: todayIso(),
            responsavel_id: String(ctx.actor.id),
            observacoes: '',
            items: [{}, {}, {}],
          },
          errors: {},
          recursos: listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem'),
          doadores: listDonors(ctx.db),
          usuarios: ctx.users,
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/doacoes$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = {
        doador_id: form.get('doador_id') ?? '',
        data: form.get('data') ?? '',
        responsavel_id: form.get('responsavel_id') ?? '',
        observacoes: form.get('observacoes') ?? '',
        items: parseItems(form, { withValidity: true }),
      };
      const recursos = listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem');
      const doadores = listDonors(ctx.db);
      try {
        const id = createDonation(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk(`/doacoes/${id}`, 'doacao-criada'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Nova doação',
            active: 'doacoes',
            eyebrow: 'Operação',
            pageTitle: 'Registrar doação',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderDonationForm({
              values: error.values,
              errors: error.errors,
              recursos,
              doadores,
              usuarios: ctx.users,
            }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/doacoes\/(\d+)$/,
    handler: (ctx, params) => {
      const id = parseId(params[0]);
      const donation = getDonation(ctx.db, id);
      if (!donation) {
        renderNotFound(ctx, 'Doação não encontrada.');
        return;
      }
      renderPage(ctx, {
        title: `Doação #${id}`,
        active: 'doacoes',
        eyebrow: 'Operação · Doação',
        pageTitle: `Doação #${id}`,
        pageSubtitle: 'Itens, status e histórico da doação.',
        content: renderDonationDetail({
          donation,
          items: getDonationItems(ctx.db, id),
          history: getHistoryFor(ctx.db, 'doacao', id),
          currentUser: ctx.actor,
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/doacoes\/(\d+)\/validar$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      try {
        validateDonation(ctx.db, id, ctx.actor);
        redirect(ctx.res, withOk(`/doacoes/${id}`, 'doacao-validada'));
      } catch (error) {
        if (error instanceof DomainError) {
          renderDonationDetailWithError(ctx, id, error.message, 409);
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/doacoes\/(\d+)\/cancelar$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      const form = await readForm(ctx.req);
      try {
        cancelDonation(ctx.db, id, ctx.actor, form.get('motivo') ?? '');
        redirect(ctx.res, withOk(`/doacoes/${id}`, 'doacao-cancelada'));
      } catch (error) {
        if (error instanceof DomainError) {
          renderDonationDetailWithError(ctx, id, error.message, 409);
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/entregas$/,
    handler: (ctx) => {
      const filters = {
        status: ctx.url.searchParams.get('status') ?? '',
        familiaId: ctx.url.searchParams.get('familia_id') ?? '',
        from: ctx.url.searchParams.get('de') ?? '',
        to: ctx.url.searchParams.get('ate') ?? '',
      };
      renderPage(ctx, {
        title: 'Entregas',
        active: 'entregas',
        eyebrow: 'Operação',
        pageTitle: 'Entregas',
        pageSubtitle: 'Registro, conferência de saldo e saída de estoque.',
        actions: actionButton('/entregas/nova', 'Registrar entrega', true),
        content: renderDeliveryList({ deliveries: listDeliveries(ctx.db, filters), filters, familias: listFamilies(ctx.db) }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/entregas\/nova$/,
    handler: (ctx) => {
      renderPage(ctx, {
        title: 'Nova entrega',
        active: 'entregas',
        eyebrow: 'Operação',
        pageTitle: 'Registrar entrega',
        pageSubtitle: 'A entrega fica Registrada até a confirmação validar o saldo.',
        content: renderDeliveryForm({
          values: {
            familia_id: '',
            data: todayIso(),
            responsavel_id: String(ctx.actor.id),
            observacoes: '',
            items: [{}, {}, {}],
          },
          errors: {},
          recursos: listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem'),
          familias: listFamilies(ctx.db),
          usuarios: ctx.users,
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/entregas$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = {
        familia_id: form.get('familia_id') ?? '',
        data: form.get('data') ?? '',
        responsavel_id: form.get('responsavel_id') ?? '',
        observacoes: form.get('observacoes') ?? '',
        items: parseItems(form, { withValidity: false }),
      };
      const recursos = listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem');
      const familias = listFamilies(ctx.db);
      try {
        const id = createDelivery(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk(`/entregas/${id}`, 'entrega-criada'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Nova entrega',
            active: 'entregas',
            eyebrow: 'Operação',
            pageTitle: 'Registrar entrega',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderDeliveryForm({
              values: error.values,
              errors: error.errors,
              recursos,
              familias,
              usuarios: ctx.users,
            }),
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/entregas\/(\d+)$/,
    handler: (ctx, params) => {
      const id = parseId(params[0]);
      const delivery = getDelivery(ctx.db, id);
      if (!delivery) {
        renderNotFound(ctx, 'Entrega não encontrada.');
        return;
      }
      renderPage(ctx, {
        title: `Entrega #${id}`,
        active: 'entregas',
        eyebrow: 'Operação · Entrega',
        pageTitle: `Entrega #${id}`,
        pageSubtitle: 'Itens, saldo, status e histórico da entrega.',
        content: renderDeliveryDetail({
          delivery,
          items: getDeliveryItems(ctx.db, id),
          history: getHistoryFor(ctx.db, 'entrega', id),
          currentUser: ctx.actor,
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/entregas\/(\d+)\/confirmar$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      try {
        confirmDelivery(ctx.db, id, ctx.actor);
        redirect(ctx.res, withOk(`/entregas/${id}`, 'entrega-confirmada'));
      } catch (error) {
        if (error instanceof DomainError) {
          renderDeliveryDetailWithError(ctx, id, error.message, 409);
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/entregas\/(\d+)\/cancelar$/,
    handler: async (ctx, params) => {
      const id = parseId(params[0]);
      const form = await readForm(ctx.req);
      try {
        cancelDelivery(ctx.db, id, ctx.actor, form.get('motivo') ?? '');
        redirect(ctx.res, withOk(`/entregas/${id}`, 'entrega-cancelada'));
      } catch (error) {
        if (error instanceof DomainError) {
          renderDeliveryDetailWithError(ctx, id, error.message, 409);
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/estoque$/,
    handler: (ctx) => {
      const filters = {
        categoria: ctx.url.searchParams.get('categoria') ?? '',
        situacao: ctx.url.searchParams.get('situacao') ?? '',
      };
      let resources = listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem');
      if (filters.categoria) {
        const term = filters.categoria.toLowerCase();
        resources = resources.filter((resource) => String(resource.categoria ?? '').toLowerCase().includes(term));
      }
      if (filters.situacao) {
        resources = resources.filter((resource) => stockStatus(resource.saldo, resource.estoque_minimo) === filters.situacao);
      }
      renderPage(ctx, {
        title: 'Estoque',
        active: 'estoque',
        eyebrow: 'Operação',
        pageTitle: 'Estoque',
        pageSubtitle: 'Saldo atual, mínimo e situação de cada bem.',
        actions: actionButton('/estoque/ajuste', 'Registrar ajuste', true),
        content: renderStockList({ resources, filters }),
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/estoque\/ajuste$/,
    handler: (ctx) => {
      const recursoId = ctx.url.searchParams.get('recurso_id') ?? '';
      renderPage(ctx, {
        title: 'Ajuste de estoque',
        active: 'estoque',
        eyebrow: 'Operação',
        pageTitle: 'Ajuste de estoque',
        pageSubtitle: 'Correção manual com motivo obrigatório e registro no histórico.',
        content: renderAdjustmentForm({
          values: { recurso_id: recursoId, tipo_ajuste: 'entrada', quantidade: '', motivo: '', data: todayIso() },
          errors: {},
          recursos: listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem'),
          currentUser: ctx.actor,
        }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/estoque\/ajuste$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const values = {
        recurso_id: form.get('recurso_id') ?? '',
        tipo_ajuste: form.get('tipo_ajuste') ?? '',
        quantidade: form.get('quantidade') ?? '',
        motivo: form.get('motivo') ?? '',
        data: form.get('data') ?? '',
      };
      const recursos = listResources(ctx.db).filter((resource) => resource.ativo === 1 && resource.tipo === 'bem');
      try {
        adjustStock(ctx.db, values, ctx.actor);
        redirect(ctx.res, withOk('/estoque', 'ajuste-registrado'));
      } catch (error) {
        if (error instanceof ValidationFailure) {
          renderPage(ctx, {
            status: 422,
            title: 'Ajuste de estoque',
            active: 'estoque',
            eyebrow: 'Operação',
            pageTitle: 'Ajuste de estoque',
            pageSubtitle: 'Corrija os campos destacados.',
            content: renderAdjustmentForm({ values: error.values, errors: error.errors, recursos, currentUser: ctx.actor }),
          });
          return;
        }
        if (error instanceof DomainError) {
          renderPage(ctx, {
            status: 409,
            title: 'Ajuste de estoque',
            active: 'estoque',
            eyebrow: 'Operação',
            pageTitle: 'Ajuste de estoque',
            pageSubtitle: 'A operação não pôde ser concluída.',
            content: `<div class="banner banner-danger" role="alert"><p>${error.message}</p></div>${renderAdjustmentForm(
              { values, errors: {}, recursos, currentUser: ctx.actor },
            )}`,
          });
          return;
        }
        throw error;
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/historico$/,
    handler: (ctx) => {
      const filters = {
        entidade: ctx.url.searchParams.get('entidade') ?? '',
        evento: ctx.url.searchParams.get('evento') ?? '',
        from: ctx.url.searchParams.get('de') ?? '',
        to: ctx.url.searchParams.get('ate') ?? '',
      };
      renderPage(ctx, {
        title: 'Histórico',
        active: 'historico',
        eyebrow: 'Acompanhamento',
        pageTitle: 'Histórico',
        pageSubtitle: 'Eventos de cadastro, status, cancelamento e estoque.',
        content: renderHistory({ events: getHistory(ctx.db, filters), filters }),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/perfil$/,
    handler: async (ctx) => {
      const form = await readForm(ctx.req);
      const id = Number(form.get('usuario_id'));
      const user = Number.isInteger(id) ? findUser(ctx.db, id) : null;
      const target = new URL(isSafeRedirect(form.get('redirect'), '/dashboard'), 'http://local');
      target.searchParams.delete('ok');
      target.searchParams.delete('erro');
      if (!user) {
        target.searchParams.set('erro', 'perfil-invalido');
        redirect(ctx.res, `${target.pathname}${target.search}`);
        return;
      }
      setCookie(ctx.res, 'kodie_usuario', String(user.id));
      target.searchParams.set('ok', 'perfil-alterado');
      redirect(ctx.res, `${target.pathname}${target.search}`);
    },
  },
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: (ctx) => {
      const row = ctx.db.prepare('SELECT 1 AS ok').get();
      sendJson(ctx.res, 200, { ok: row.ok === 1, service: 'elos-mvp', users: ctx.users.length });
    },
  },
];

function renderDonationDetailWithError(ctx, id, message, status = 409) {
  const donation = getDonation(ctx.db, id);
  if (!donation) {
    renderNotFound(ctx, 'Doação não encontrada.');
    return;
  }
  renderPage(ctx, {
    status,
    title: `Doação #${id}`,
    active: 'doacoes',
    eyebrow: 'Operação · Doação',
    pageTitle: `Doação #${id}`,
    pageSubtitle: 'Itens, status e histórico da doação.',
    content: renderDonationDetail({
      donation,
      items: getDonationItems(ctx.db, id),
      history: getHistoryFor(ctx.db, 'doacao', id),
      currentUser: ctx.actor,
      error: message,
    }),
  });
}

function renderDeliveryDetailWithError(ctx, id, message, status = 409) {
  const delivery = getDelivery(ctx.db, id);
  if (!delivery) {
    renderNotFound(ctx, 'Entrega não encontrada.');
    return;
  }
  renderPage(ctx, {
    status,
    title: `Entrega #${id}`,
    active: 'entregas',
    eyebrow: 'Operação · Entrega',
    pageTitle: `Entrega #${id}`,
    pageSubtitle: 'Itens, saldo, status e histórico da entrega.',
    content: renderDeliveryDetail({
      delivery,
      items: getDeliveryItems(ctx.db, id),
      history: getHistoryFor(ctx.db, 'entrega', id),
      currentUser: ctx.actor,
      error: message,
    }),
  });
}

function findRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (match) return { route, params: match.slice(1) };
  }
  return null;
}

function serveStatic(pathname, res) {
  const map = {
    '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  };
  const entry = map[pathname];
  if (!entry) return false;
  const [filename, contentType] = entry;
  const content = fs.readFileSync(path.join(publicDir, filename));
  res.writeHead(200, { 'content-type': contentType, 'cache-control': 'public, max-age=3600' });
  res.end(content);
  return true;
}

export function createRequestHandler(db) {
  ensureBootstrap(db);
  return async function requestHandler(req, res) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (serveStatic(url.pathname, res)) return;
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    const actor = resolveActor(req, db);
    const users = listUsers(db);
    const ctx = { req, res, url, db, actor, users };
    const match = findRoute(req.method ?? 'GET', url.pathname);
    if (!match) {
      renderNotFound(ctx);
      return;
    }

    try {
      await match.route.handler(ctx, match.params);
    } catch (error) {
      if (error instanceof DomainError) {
        renderPage(ctx, {
          status: error.code === 'nao_encontrado' ? 404 : 409,
          title: 'Operação não concluída',
          active: '',
          eyebrow: 'Atenção',
          pageTitle: 'Operação não concluída',
          pageSubtitle: error.message,
          content: renderErrorPage({
            status: error.code === 'nao_encontrado' ? 404 : 409,
            title: 'Não foi possível concluir a operação',
            message: error.message,
          }),
        });
        return;
      }
      if (error instanceof ValidationFailure) {
        renderPage(ctx, {
          status: 422,
          title: 'Dados inválidos',
          active: '',
          eyebrow: 'Atenção',
          pageTitle: 'Dados inválidos',
          pageSubtitle: 'Revise os campos e tente novamente.',
          content: renderErrorPage({
            status: 422,
            title: 'Dados inválidos',
            message: Object.values(error.errors).join(' '),
          }),
        });
        return;
      }
      console.error(error);
      renderPage(ctx, {
        status: 500,
        title: 'Erro interno',
        active: '',
        eyebrow: 'Erro 500',
        pageTitle: 'Erro interno',
        pageSubtitle: 'A operação não pôde ser concluída.',
        content: renderErrorPage({
          status: 500,
          title: 'Erro interno',
          message: 'Ocorreu um erro inesperado. Tente novamente ou reinicie a aplicação.',
        }),
      });
    }
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const db = openDatabase();
  const handler = createRequestHandler(db);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = http.createServer(handler);
  server.listen(port, host, () => {
    console.log(`${APP_NAME} MVP em http://${host}:${port}`);
  });
  const shutdown = () => {
    server.close(() => {
      closeDatabase(db);
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
