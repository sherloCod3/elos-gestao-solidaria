import { RESOURCE_TYPES, UNITS } from './constants.js';
import { isIsoDate, todayIso } from './date.js';

export const MAX_TEXT = 500;

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeCheckbox(value) {
  return value === '1' || value === 'on' || value === 'true' || value === true;
}

export function requireText(errors, key, value, label, { min = 2, max = 255 } = {}) {
  const text = normalizeText(value);
  if (!text) {
    errors[key] = `${label} é obrigatório.`;
    return text;
  }
  if (text.length < min) {
    errors[key] = `${label} deve ter pelo menos ${min} caracteres.`;
  } else if (text.length > max) {
    errors[key] = `${label} deve ter no máximo ${max} caracteres.`;
  }
  return text;
}

export function optionalText(errors, key, value, label, { max = MAX_TEXT } = {}) {
  const text = normalizeText(value);
  if (text.length > max) {
    errors[key] = `${label} deve ter no máximo ${max} caracteres.`;
  }
  return text;
}

export function parseInteger(errors, key, value, label, { min = 1, max = 1_000_000, fallback = null } = {}) {
  const text = normalizeText(value);
  if (!text) {
    if (fallback !== null) return fallback;
    errors[key] = `${label} é obrigatório.`;
    return null;
  }
  if (!/^\d+$/.test(text)) {
    errors[key] = `${label} deve ser um número inteiro.`;
    return null;
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number)) {
    errors[key] = `${label} está fora do limite permitido.`;
    return null;
  }
  if (number < min || number > max) {
    errors[key] = `${label} deve estar entre ${min} e ${max}.`;
    return null;
  }
  return number;
}

export function parsePositiveId(errors, key, value, label) {
  return parseInteger(errors, key, value, label, { min: 1, max: Number.MAX_SAFE_INTEGER });
}

export function validateDateField(
  errors,
  key,
  value,
  label,
  { required = true, notFuture = false, notPast = false } = {},
) {
  const text = normalizeText(value);
  if (!text) {
    if (required) errors[key] = `${label} é obrigatório.`;
    return '';
  }
  if (!isIsoDate(text)) {
    errors[key] = `${label} deve ser uma data válida.`;
    return text;
  }
  const today = todayIso();
  if (notFuture && text > today) {
    errors[key] = `${label} não pode estar no futuro.`;
  }
  if (notPast && text < today) {
    errors[key] = `${label} não pode estar no passado.`;
  }
  return text;
}

export function normalizeFamilyCode(value) {
  return normalizeText(value).toUpperCase();
}

export function validateFamilyCode(errors, key, value) {
  const code = normalizeFamilyCode(value);
  if (!code) {
    errors[key] = 'Código da família é obrigatório.';
  } else if (!/^F-\d{3}$/.test(code)) {
    errors[key] = 'Use o formato F-000, com três dígitos.';
  }
  return code;
}

export function validateResourceInput(input = {}) {
  const values = {
    nome: normalizeText(input.nome),
    tipo: normalizeText(input.tipo) || RESOURCE_TYPES.BEM,
    unidade: normalizeText(input.unidade),
    categoria: normalizeText(input.categoria),
    estoque_minimo: normalizeText(input.estoque_minimo),
    ativo: normalizeCheckbox(input.ativo),
    observacoes: normalizeText(input.observacoes),
    controla_estoque: 1,
  };
  const errors = {};

  requireText(errors, 'nome', values.nome, 'Nome', { min: 2, max: 80 });
  if (!Object.values(RESOURCE_TYPES).includes(values.tipo)) {
    errors.tipo = 'Tipo de recurso inválido.';
  }
  if (!UNITS.includes(values.unidade)) {
    errors.unidade = 'Unidade é obrigatória.';
  }
  values.estoque_minimo = parseInteger(errors, 'estoque_minimo', values.estoque_minimo, 'Estoque mínimo', {
    min: 0,
    fallback: 0,
  });
  optionalText(errors, 'categoria', values.categoria, 'Categoria', { max: 60 });
  optionalText(errors, 'observacoes', values.observacoes, 'Observações');
  values.controla_estoque = values.tipo === RESOURCE_TYPES.BEM ? 1 : 0;
  if (values.tipo !== RESOURCE_TYPES.BEM) {
    values.estoque_minimo = 0;
  }

  return { values, errors };
}

export function validateDonorInput(input = {}) {
  const values = {
    nome: normalizeText(input.nome),
    tipo: normalizeText(input.tipo),
    contato: normalizeText(input.contato),
    observacoes: normalizeText(input.observacoes),
  };
  const errors = {};
  requireText(errors, 'nome', values.nome, 'Nome', { min: 2, max: 100 });
  if (values.tipo && !['PF', 'PJ'].includes(values.tipo)) {
    errors.tipo = 'Tipo de doador inválido.';
  }
  optionalText(errors, 'contato', values.contato, 'Contato', { max: 120 });
  optionalText(errors, 'observacoes', values.observacoes, 'Observações');
  return { values, errors };
}

export function validateFamilyInput(input = {}) {
  const values = {
    codigo: normalizeFamilyCode(input.codigo),
    observacoes: normalizeText(input.observacoes),
  };
  const errors = {};
  validateFamilyCode(errors, 'codigo', values.codigo);
  optionalText(errors, 'observacoes', values.observacoes, 'Observações');
  return { values, errors };
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => ({
    recurso_id: normalizeText(item?.recurso_id),
    quantidade: normalizeText(item?.quantidade),
    validade: normalizeText(item?.validade),
    observacoes: normalizeText(item?.observacoes),
  }));
}

export function validateDonationInput(input = {}) {
  const values = {
    doador_id: normalizeText(input.doador_id),
    data: normalizeText(input.data),
    responsavel_id: normalizeText(input.responsavel_id),
    observacoes: normalizeText(input.observacoes),
    items: normalizeItems(input.items),
  };
  const errors = {};

  parsePositiveId(errors, 'doador_id', values.doador_id, 'Doador');
  validateDateField(errors, 'data', values.data, 'Data da doação', { notFuture: true });
  parsePositiveId(errors, 'responsavel_id', values.responsavel_id, 'Responsável');
  optionalText(errors, 'observacoes', values.observacoes, 'Observações');

  if (values.items.length === 0) {
    errors.itens = 'Informe pelo menos um item.';
  }

  const seen = new Set();
  values.items.forEach((item, index) => {
    parsePositiveId(errors, `itens.${index}.recurso_id`, item.recurso_id, 'Recurso');
    parseInteger(errors, `itens.${index}.quantidade`, item.quantidade, 'Quantidade', { min: 1 });
    if (item.validade) {
      validateDateField(errors, `itens.${index}.validade`, item.validade, 'Validade', {
        required: false,
        notPast: true,
      });
    }
    optionalText(errors, `itens.${index}.observacoes`, item.observacoes, 'Observações do item');
    if (item.recurso_id) {
      if (seen.has(item.recurso_id)) {
        errors[`itens.${index}.recurso_id`] = 'Este recurso já foi informado nesta doação.';
      }
      seen.add(item.recurso_id);
    }
  });

  return { values, errors };
}

export function validateDeliveryInput(input = {}) {
  const values = {
    familia_id: normalizeText(input.familia_id),
    data: normalizeText(input.data),
    responsavel_id: normalizeText(input.responsavel_id),
    observacoes: normalizeText(input.observacoes),
    items: normalizeItems(input.items),
  };
  const errors = {};

  parsePositiveId(errors, 'familia_id', values.familia_id, 'Família');
  validateDateField(errors, 'data', values.data, 'Data da entrega', { notFuture: true });
  parsePositiveId(errors, 'responsavel_id', values.responsavel_id, 'Responsável');
  optionalText(errors, 'observacoes', values.observacoes, 'Observações');

  if (values.items.length === 0) {
    errors.itens = 'Informe pelo menos um item.';
  }

  const seen = new Set();
  values.items.forEach((item, index) => {
    parsePositiveId(errors, `itens.${index}.recurso_id`, item.recurso_id, 'Recurso');
    parseInteger(errors, `itens.${index}.quantidade`, item.quantidade, 'Quantidade', { min: 1 });
    optionalText(errors, `itens.${index}.observacoes`, item.observacoes, 'Observações do item');
    if (item.recurso_id) {
      if (seen.has(item.recurso_id)) {
        errors[`itens.${index}.recurso_id`] = 'Este recurso já foi informado nesta entrega.';
      }
      seen.add(item.recurso_id);
    }
  });

  return { values, errors };
}

export function validateAdjustmentInput(input = {}) {
  const values = {
    recurso_id: normalizeText(input.recurso_id),
    tipo_ajuste: normalizeText(input.tipo_ajuste),
    quantidade: normalizeText(input.quantidade),
    motivo: normalizeText(input.motivo),
    data: normalizeText(input.data),
  };
  const errors = {};

  parsePositiveId(errors, 'recurso_id', values.recurso_id, 'Recurso');
  if (!['entrada', 'saida'].includes(values.tipo_ajuste)) {
    errors.tipo_ajuste = 'Escolha o tipo de ajuste.';
  }
  parseInteger(errors, 'quantidade', values.quantidade, 'Quantidade', { min: 1 });
  requireText(errors, 'motivo', values.motivo, 'Motivo', { min: 5, max: 300 });
  validateDateField(errors, 'data', values.data, 'Data do ajuste', { notFuture: true });

  return { values, errors };
}
