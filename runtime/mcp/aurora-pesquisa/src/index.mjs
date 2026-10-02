#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { linkInstagram, linkYoutube, podeMarcar, QUEM_PODE, quemPediu, STATUS, urlPublica } from './security.mjs';

const ENABLED = process.env.PESQUISA_ENABLED_FILE || '/home/aurora/.hermes/pesquisa.enabled';
const SCRIPT = process.env.PESQUISA_SCRIPT || new URL('../scripts/pesquisa.py', import.meta.url).pathname;
const PYTHON = process.env.PYTHON_BIN || '/usr/bin/python3';
const AVISO = 'Conteúdo público. Tema clínico sai marcado "a validar pela Bianca" antes de virar pauta. Nunca envie nome, caso ou dado de paciente para estas ferramentas.';

const PAUTAS = process.env.PAUTAS_SCRIPT || new URL('../scripts/pautas.py', import.meta.url).pathname;
const PONTE = process.env.PONTE_URL || 'http://127.0.0.1:3107';
const DESTINOS = { bianca: '5521997382027@s.whatsapp.net', serjao: '5521964751340@s.whatsapp.net' };

function run(args, timeoutMs, script = SCRIPT) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [script, ...args], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
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

function pautaTool(nome, titulo, descricao, campos, executar) {
  server.registerTool(nome, {
    title: titulo,
    description: descricao,
    inputSchema: z.object({ solicitante: z.string().describe('Preenchido automaticamente pelo sistema. Envie "auto".'), ...campos }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ solicitante, ...args }) => {
    try {
      if (!fs.existsSync(ENABLED)) return responder({ ok: false, erro: 'pausada' });
      const quem = quemPediu(solicitante);
      if (!quem) return responder({ ok: false, erro: 'sem_permissao', explicacao: 'Fluxo de pautas só para Alf, Anne, Bianca e Serjão.' });
      return responder({ quem, ...(await executar(quem, args)) });
    } catch {
      return responder({ ok: false, erro: 'falha_na_ferramenta' });
    }
  });
}

pautaTool('aurora_pauta_registrar', 'Registrar pauta sugerida',
  'Registra uma pauta na planilha "Pautas de Conteúdo — SonoraMente" com status "sugerida", formato, semana e data planejada. Use também para texto da Ponte Sonora que nasceu em conversa livre com a Bianca.',
  { canal: z.enum(['instagram', 'newsletter']), titulo: z.string().min(3).max(200), ideia: z.string().min(3).max(1500),
    publico: z.string().max(200).optional(), fontes: z.string().max(3000).optional(),
    formato: z.enum(['carrossel', 'reel', 'newsletter']).optional(), semana: z.string().max(12).optional(),
    data_publicacao: z.string().max(10).optional(), responsavel_producao: z.string().max(120).optional() },
  (quem, a) => run(['registrar', JSON.stringify({ ...a, pedido_por: quem })], 120000, PAUTAS));

pautaTool('aurora_pauta_atualizar', 'Atualizar status, texto ou ajustes de uma pauta',
  'Muda status, texto, ajustes, formato, data planejada ou responsável. Só a Bianca aprova, reprova ou libera; só Serjão ou Alf marcam publicada. Newsletter aprovada exige o texto final (mande junto) e vai sozinha ao Alfredo. Ponte Sonora em previa_enviada: ajuste da Bianca na página = com_alfredo com o pedido em ajustes; ok dela = liberada.',
  { id: z.string().regex(/^P-\d{6}-\d{6}$/), status: z.enum(STATUS).optional(), texto: z.string().max(20000).optional(),
    ajustes: z.string().max(3000).optional(), formato: z.enum(['carrossel', 'reel', 'newsletter']).optional(),
    semana: z.string().max(12).optional(), data_publicacao: z.string().max(10).optional(),
    responsavel_producao: z.string().max(120).optional() },
  async (quem, a) => {
    if (a.status && !podeMarcar(quem, a.status)) {
      return { ok: false, erro: 'sem_permissao_para_status', explicacao: `Só ${QUEM_PODE[a.status].join(' ou ')} pode marcar "${a.status}".` };
    }
    const r = await run(['atualizar', JSON.stringify(a)], 120000, PAUTAS);
    if (r.ok && a.status === 'aprovada' && r.canal === 'newsletter') {
      const h = await run(['atualizar', JSON.stringify({ id: a.id, status: 'com_alfredo' })], 120000, PAUTAS);
      return { ...r, status: h.ok ? 'com_alfredo' : r.status, handoff: h.ok ? 'Alfredo avisado automaticamente para imagens e página.' : 'falhou_ao_marcar_handoff' };
    }
    return r;
  });

pautaTool('aurora_pauta_listar', 'Listar pautas',
  'Lista pautas da planilha, com filtro opcional por status e canal.',
  { status: z.enum(STATUS).optional(), canal: z.enum(['instagram', 'newsletter']).optional() },
  (quem, a) => run(['listar', JSON.stringify(a)], 120000, PAUTAS));

pautaTool('aurora_conteudo_encaminhar', 'Encaminhar pauta ou texto para Bianca ou Serjão',
  'Envia uma mensagem no WhatsApp privado da Bianca (escolha de pauta e aprovação de texto) ou do Serjão (Instagram aprovado, para arte e publicação). Só esses dois destinos. Ponte Sonora aprovada não passa por aqui: vai ao Alfredo pela planilha.',
  { para: z.enum(['bianca', 'serjao']), mensagem: z.string().min(3).max(4000) },
  async (quem, { para, mensagem }) => {
    const r = await fetch(`${PONTE}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: DESTINOS[para], message: mensagem }), signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({}));
    const enviado = String(j.messageId || '').startsWith('aurora-');
    return { ok: Boolean(j.success) && enviado, para, enviado, erro: enviado ? undefined : 'nao_saiu_ao_vivo' };
  });

serveStdio(() => server, { legacy: 'serve' });
