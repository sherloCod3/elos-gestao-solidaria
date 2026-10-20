export const ROLES = Object.freeze({
  COORDENACAO: 'coordenacao',
  VOLUNTARIO: 'voluntario',
});

export const ROLE_LABELS = Object.freeze({
  coordenacao: 'Coordenação',
  voluntario: 'Voluntário(a)',
});

export const RESOURCE_TYPES = Object.freeze({
  BEM: 'bem',
  SERVICO: 'servico',
});

export const RESOURCE_TYPE_LABELS = Object.freeze({
  bem: 'Bem',
  servico: 'Serviço',
});

export const UNITS = Object.freeze(['kg', 'un', 'L', 'h', 'sessao']);

export const UNIT_LABELS = Object.freeze({
  kg: 'kg',
  un: 'un',
  L: 'L',
  h: 'h',
  sessao: 'sessão',
});

export const DONATION_STATUS = Object.freeze({
  RECEBIDA: 'Recebida',
  DISPONIVEL: 'Disponivel',
  CANCELADA: 'Cancelada',
});

export const DELIVERY_STATUS = Object.freeze({
  REGISTRADA: 'Registrada',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
});

export const STATUS_LABELS = Object.freeze({
  Recebida: 'Recebida',
  Disponivel: 'Disponível',
  Registrada: 'Registrada',
  Entregue: 'Entregue',
  Cancelada: 'Cancelada',
});

export const MOVEMENT_TYPES = Object.freeze({
  ENTRADA: 'entrada',
  SAIDA: 'saida',
  AJUSTE_ENTRADA: 'ajuste_entrada',
  AJUSTE_SAIDA: 'ajuste_saida',
});

export const MOVEMENT_LABELS = Object.freeze({
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste_entrada: 'Ajuste de entrada',
  ajuste_saida: 'Ajuste de saída',
});

export const DONATION_TRANSITIONS = Object.freeze({
  Recebida: ['Disponivel', 'Cancelada'],
  Disponivel: ['Cancelada'],
  Cancelada: [],
});

export const DELIVERY_TRANSITIONS = Object.freeze({
  Registrada: ['Entregue', 'Cancelada'],
  Entregue: ['Cancelada'],
  Cancelada: [],
});

export function isCoordination(user) {
  return user?.papel === ROLES.COORDENACAO;
}

export function statusTone(status) {
  if (status === 'Disponivel' || status === 'Entregue') return 'ok';
  if (status === 'Recebida' || status === 'Registrada') return 'attention';
  if (status === 'Cancelada') return 'danger';
  return 'neutral';
}
