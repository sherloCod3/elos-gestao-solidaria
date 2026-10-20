export class ValidationFailure extends Error {
  constructor(errors, values = {}) {
    super('Dados inválidos');
    this.name = 'ValidationFailure';
    this.errors = errors;
    this.values = values;
  }
}

export class DomainError extends Error {
  constructor(message, code = 'domain') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function assertDomain(condition, message, code = 'domain') {
  if (!condition) {
    throw new DomainError(message, code);
  }
}
