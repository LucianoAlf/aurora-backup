#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { loadConfig } from './config.mjs';
import { createDatabaseProvider } from './database-provider.mjs';
import { normalizeError } from './errors.mjs';
import { createToolExecutor } from './executor.mjs';
import { logger } from './logger.mjs';
import { createMcpServer } from './server.mjs';

let provider;

async function shutdown() {
  if (provider) await provider.close();
}

try {
  const config = loadConfig();
  provider = createDatabaseProvider(config);
  const executor = createToolExecutor({
    provider,
    timeoutMs: config.timeoutMs,
    maxPayloadBytes: config.maxPayloadBytes,
    logger,
  });

  serveStdio(() => createMcpServer(executor), { legacy: 'serve' });
  logger.emit('server_ready');

  process.once('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
  process.once('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });
} catch (error) {
  const safe = normalizeError(error);
  logger.emit('startup_failed', { code: safe.code, retryable: safe.retryable });
  process.exitCode = 1;
}
