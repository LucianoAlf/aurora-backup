import { AdapterError } from './errors.mjs';

const EXPECTED_LOGIN_ROLE = 'aurora_mcp';

function boundedInteger(raw, name, fallback, min, max) {
  const value = Number.parseInt(raw ?? String(fallback), 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AdapterError('CONFIGURATION_ERROR', `${name} inválido.`);
  }
  return value;
}

function parseDatabaseUrl(raw) {
  if (!raw) throw new AdapterError('CONFIGURATION_ERROR', 'AURORA_DB_READ_URL é obrigatório.');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AdapterError('CONFIGURATION_ERROR', 'A URL da credencial de leitura é inválida.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new AdapterError('CONFIGURATION_ERROR', 'A credencial deve usar PostgreSQL.');
  }
  if (decodeURIComponent(parsed.username) !== EXPECTED_LOGIN_ROLE) {
    throw new AdapterError('CONFIGURATION_ERROR', `A credencial deve usar exclusivamente o login ${EXPECTED_LOGIN_ROLE}.`);
  }
  if (!parsed.password) throw new AdapterError('CONFIGURATION_ERROR', 'A credencial dedicada está incompleta.');
  if (!['require', 'verify-ca', 'verify-full'].includes(parsed.searchParams.get('sslmode'))) {
    throw new AdapterError('CONFIGURATION_ERROR', 'Conexão PostgreSQL remota exige TLS explícito.');
  }
  return raw;
}

export function loadConfig(env = process.env) {
  return Object.freeze({
    databaseUrl: parseDatabaseUrl((env.AURORA_DB_READ_URL || '').trim()),
    expectedLoginRole: EXPECTED_LOGIN_ROLE,
    timeoutMs: boundedInteger(env.AURORA_MCP_TIMEOUT_MS, 'AURORA_MCP_TIMEOUT_MS', 5000, 100, 15000),
    maxPayloadBytes: boundedInteger(env.AURORA_MCP_MAX_PAYLOAD_BYTES, 'AURORA_MCP_MAX_PAYLOAD_BYTES', 32768, 1024, 131072),
  });
}
