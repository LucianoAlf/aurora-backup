#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { linkInstagram, linkYoutube, quemPediu, urlPublica } from './security.mjs';

const ENABLED = process.env.PESQUISA_ENABLED_FILE || '/home/aurora/.hermes/pesquisa.enabled';
const SCRIPT = process.env.PESQUISA_SCRIPT || new URL('../scripts/pesquisa.py', import.meta.url).pathname;
const PYTHON = process.env.PYTHON_BIN || '/usr/bin/python3';
const AVISO = 'Conteúdo público. Tema clínico sai marcado "a validar pela Bianca" antes de virar pauta. Nunca envie nome, caso ou dado de paciente para estas ferramentas.';

function run(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SCRIPT, ...args], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('tempo_esgotado')); }, timeoutMs);
    child.stdout.on('data', (b) => { out += b; if (out.length > 262144) child.kill('SIGTERM'); });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(out)); } catch { reject(new Error('saida_invalida')); }
    });
  });
}

function responder(obj) {
  const safe = { ...obj, aviso: AVISO };
  return { content: [{ type: 'text', text: JSON.stringify(safe) }], structuredContent: safe, isError: !safe.ok };
}

function ferramenta(server, nome, titulo, descricao, campos, montar, timeoutMs) {
  server.registerTool(nome, {
    title: titulo,
    description: descricao,
    inputSchema: z.object({ solicitante: z.string().describe('Preenchido automaticamente pelo sistema. Envie "auto".'), ...campos }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ solicitante, ...args }) => {
    try {
      if (!fs.existsSync(ENABLED)) return responder({ ok: false, erro: 'pausada' });
      const quem = quemPediu(solicitante);
      if (!quem) return responder({ ok: false, erro: 'sem_permissao', explicacao: 'Pesquisa só para Alf, Anne, Bianca e Serjão.' });
      const argv = montar(args);
      if (!argv) return responder({ ok: false, erro: 'link_invalido' });
      return responder({ pedido_por: quem, ...(await run(argv, timeoutMs)) });
    } catch (error) {
      return responder({ ok: false, erro: error.message === 'tempo_esgotado' ? 'tempo_esgotado' : 'falha_na_ferramenta' });
    }
  });
}

const server = new McpServer({ name: 'aurora-pesquisa', version: '0.1.0' });

ferramenta(server, 'aurora_pesquisa_web', 'Pesquisar estudos e artigos na web',
  'Busca pública com fontes (Tavily). Use para estudos, artigos, notícias e leis. Devolve títulos, URLs e trechos; cite a URL de cada afirmação.',
  { consulta: z.string().min(3).max(300), max_resultados: z.number().int().min(1).max(8).optional() },
  ({ consulta, max_resultados }) => ['web', consulta, '--max', String(max_resultados || 5)], 280000);

ferramenta(server, 'aurora_pesquisa_ler_pagina', 'Ler uma página pública inteira',
  'Lê o texto principal de um link público (Firecrawl): artigo, blog, estudo, portal.',
  { url: z.string().max(1000) },
  ({ url }) => { const u = urlPublica(url); return u ? ['ler', u] : null; }, 280000);

ferramenta(server, 'aurora_pesquisa_instagram', 'Assistir post ou reel público do Instagram',
  'Lê legenda, páginas do carrossel, vídeo e áudio de um post público (leitor Gemini). Não registra na planilha.',
  { link: z.string().max(500) },
  ({ link }) => { const u = linkInstagram(link); return u ? ['instagram', u] : null; }, 285000);

ferramenta(server, 'aurora_pesquisa_youtube', 'Assistir vídeo público do YouTube',
  'Assiste e resume um vídeo público do YouTube (Gemini). Limite: 10 vídeos por semana e até 20 minutos; acima disso, pedir ao Alf.',
  { link: z.string().max(500) },
  ({ link }) => { const u = linkYoutube(link); return u ? ['youtube', u] : null; }, 285000);

serveStdio(() => server, { legacy: 'serve' });
