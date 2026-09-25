export class AdapterError extends Error {
  constructor(code, safeMessage, options = {}) {
    super(safeMessage, options);
    this.name = 'AdapterError';
    this.code = code;
    this.safeMessage = safeMessage;
    this.retryable = Boolean(options.retryable);
  }
}

export function normalizeError(error) {
  if (error instanceof AdapterError) return error;

  if (error?.name === 'ZodError') {
    return new AdapterError('INVALID_ARGUMENT', 'Parâmetros fora do contrato da ferramenta.');
  }

  if (error?.code === '57014' || error?.code === 'QUERY_TIMEOUT') {
    return new AdapterError('TIMEOUT', 'A consulta excedeu o tempo seguro.', { retryable: true });
  }

  if (error?.code === '42501') {
    return new AdapterError('FORBIDDEN', 'A credencial de leitura não possui o privilégio exigido.');
  }

  if (error?.code === 'P0001' && String(error?.message || '').startsWith('PRECONDITION_FAILED:')) {
    return new AdapterError('INVALID_ARGUMENT', 'Parâmetros fora do contrato da ferramenta.');
  }

  if (
    ['28P01', '3D000', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code)
  ) {
    return new AdapterError('DEPENDENCY_UNAVAILABLE', 'O ERP da SonoraMente está indisponível.', {
      retryable: true,
    });
  }

  return new AdapterError('DATABASE_ERROR', 'A leitura não pôde ser concluída.', { retryable: true });
}

export function errorEnvelope(error) {
  const safe = normalizeError(error);
  return {
    ok: false,
    error: {
      code: safe.code,
      message: safe.safeMessage,
      retryable: safe.retryable,
    },
  };
}
