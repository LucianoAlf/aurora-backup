#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { normalizeInstagramUrl, validateContext } from './security.mjs';

const ENABLED = process.env.IG_REF_ENABLED_FILE || '/home/aurora/.hermes/referencias-instagram.enabled';
const SCRIPT = process.env.IG_REF_SCRIPT || new URL('../scripts/ig_ref_intake.py', import.meta.url).pathname;
const ENV_FILE = process.env.CONTENT_READERS_ENV || '/home/aurora/.hermes/referencias-instagram.env';
const PYTHON = process.env.PYTHON_BIN || '/usr/bin/python3';

function run(link) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SCRIPT, '--write', link], {
      env: { ...process.env, CONTENT_READERS_ENV: ENV_FILE }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = ''; let err = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('timeout')); }, 240000);
    child.stdout.on('data', (b) => { out += b; if (out.length > 65536) child.kill('SIGTERM'); });
    child.stderr.on('data', (b) => { err += b; if (err.length > 8192) child.kill('SIGTERM'); });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('intake_failed'));
      try { resolve(JSON.parse(out)[0]); } catch { reject(new Error('invalid_output')); }
    });
  });
}

const server = new McpServer({ name: 'aurora-igref', version: '0.1.1' });
server.registerTool('aurora_ig_ref_registrar', {
  title: 'Registrar referência pública do Instagram',
  description: 'Só funciona no grupo Referências Instagram SonoraMente. Lê um post público, classifica e acrescenta uma linha na planilha de referências.',
  inputSchema: z.object({
    contexto: z.string().describe('Preenchido automaticamente pelo sistema. Envie "auto".'),
    link: z.string().max(500),
  }).strict(),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
}, async ({ contexto, link }) => {
  try {
    if (!fs.existsSync(ENABLED)) throw new Error('paused');
    if (!validateContext(contexto)) throw new Error('wrong_context');
    const normalized = normalizeInstagramUrl(link);
    if (!normalized) throw new Error('invalid_link');
    const result = await run(normalized);
    const safe = { ok: result.status === 'gravado' || result.status === 'duplicado', status: result.status, reply: result.reply,
      cost_usd: result.openrouter_cost_usd ?? 0 };
    return { content: [{ type: 'text', text: JSON.stringify(safe) }], structuredContent: safe, isError: !safe.ok };
  } catch (error) {
    const code = ['paused', 'wrong_context', 'invalid_link'].includes(error.message) ? error.message : 'dependency_failed';
    const safe = { ok: false, status: 'bloqueado', error: code, reply: code === 'paused' ? 'A automação está pausada.' : 'Não consegui ler esse link. Confere se o post é público?' };
    return { content: [{ type: 'text', text: JSON.stringify(safe) }], structuredContent: safe, isError: true };
  }
});

serveStdio(() => server, { legacy: 'serve' });
