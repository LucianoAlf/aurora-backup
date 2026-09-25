import { AdapterError, normalizeError } from './errors.mjs';
import { TOOL_DEFINITIONS } from './registry.mjs';

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AdapterError('TIMEOUT', 'A consulta excedeu o tempo seguro.', {
          retryable: true,
        }),
      );
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function createToolExecutor({ provider, timeoutMs, maxPayloadBytes, logger }) {
  if (!provider?.call) throw new TypeError('provider.call required');

  return Object.freeze({
    async execute(name, rawArgs = {}) {
      const definition = TOOL_DEFINITIONS[name];
      if (!definition) {
        throw new AdapterError('TOOL_NOT_ALLOWED', 'Ferramenta fora da allowlist da Aurora.');
      }

      const startedAt = Date.now();
      logger.emit('tool_started', { tool: name });
      try {
        const args = definition.inputSchema.parse(rawArgs ?? {});
        const result = await withTimeout(provider.call(definition, args), timeoutMs);
        const serialized = JSON.stringify(result);
        if (Buffer.byteLength(serialized, 'utf8') > maxPayloadBytes) {
          throw new AdapterError('PAYLOAD_TOO_LARGE', 'A resposta excedeu o limite seguro.');
        }
        logger.emit('tool_completed', { tool: name, duration_ms: Date.now() - startedAt });
        return { result, serialized };
      } catch (error) {
        const safe = normalizeError(error);
        logger.emit('tool_failed', {
          tool: name,
          code: safe.code,
          retryable: safe.retryable,
          duration_ms: Date.now() - startedAt,
        });
        throw safe;
      }
    },
  });
}
