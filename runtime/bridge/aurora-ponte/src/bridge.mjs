// aurora-ponte: ponte WhatsApp da Aurora para o Hermes (contrato HTTP da ponte Baileys do Hermes).
// Entrada: mensagens novas da Central (wa_mensagens) pelo crachá aurora_ponte, só por RPC.
// Saída: em modo sombra NADA é enviado; a resposta vai para aurora_sombra. O modo "ao_vivo" ainda não existe
// e qualquer outro valor cai em sombra (falha segura).
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { paraHermes, ehAvisoDoSistema, motivoSilencio, geraSugestao, temTranscricao,
  ehReferenciaInstagram, GRUPO_REFERENCIAS_INSTAGRAM, retirarParaEntrega, ehBotaoEvolucao, limparResposta } from './mapear.mjs';
import { Rajadas, entraNaRajada } from './rajada.mjs';
import { ehPdf, prepararPdf } from './midia.mjs';
import { caminhoAnexo, deveGuardar, guardarAnexo } from './anexos.mjs';
import { criarPorteiro } from './jev-porteiro.mjs';

const arg = (nome, padrao) => { const i = process.argv.indexOf(`--${nome}`); return i > 0 ? process.argv[i + 1] : padrao; };
const PORTA = Number(arg('port', '3107'));
const ENV_FILE = process.env.AURORA_ENV_FILE || '/home/aurora/.hermes/.env';
const INTERVALO_MS = 2000;
// O Hermes passa essa pasta para a ponte; ele só aceita documento local de dentro dela.
const PASTA_DOC = process.env.HERMES_DOCUMENT_CACHE_DIR || '';
const IG_REF_ENABLED = process.env.IG_REF_ENABLED_FILE || '/home/aurora/.hermes/referencias-instagram.enabled';

function lerUrl() {
  if (process.env.AURORA_DB_PONTE_URL) return process.env.AURORA_DB_PONTE_URL;
  const m = readFileSync(ENV_FILE, 'utf8').match(/^AURORA_DB_PONTE_URL="?([^"\n]+)"?$/m);
  if (!m) throw new Error('AURORA_DB_PONTE_URL ausente');
  return m[1];
}

const log = (evento, extra = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), evento, ...extra }));
// Prazos: sem eles, uma queda do banco deixa a ponte pendurada para sempre (incidente 26/09/2026).
const pool = new pg.Pool({ connectionString: lerUrl(), max: 2, application_name: 'aurora-ponte', idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000, query_timeout: 15000, statement_timeout: 10000 });
pool.on('error', (e) => log('erro_pool', { codigo: e.code || e.name }));
const fila = [];
let referenciaEmProcessamento = false;
const ultimoDigitando = new Map();
// Conversas em modo sugestão (humano atendendo): a resposta da Aurora vira sugestão na Central, não sai
// para a família, não mostra "digitando" e as ferramentas de escrita ficam travadas. Vale por 5 minutos.
const modoSugestao = new Map();
const SUGESTAO_MS = 5 * 60 * 1000;
const emSugestao = (chat) => (modoSugestao.get(chat) || 0) > Date.now();
const rajadas = new Rajadas();
let ultimoPuxar = null;
let erroSeguido = 0;
// Jev só observando o rascunho (10/10). Liga/desliga pelo arquivo jev.json; nunca muda o que sai.
const porteiro = criarPorteiro({ dir: process.env.AURORA_JEV_DIR || '/home/aurora/.hermes' });
const observarJev = (chat, rascunho, tipo) => { porteiro.observar({ chat, rascunho, tipo }).catch(() => {}); };

async function puxar() {
  try {
    const r = await pool.query('SELECT public.aurora_ponte_puxar(20) AS r');
    const lista = r.rows[0].r || [];
    let calada = 0;
    for (const m of lista) {
      // No grupo de referências a Aurora só recebe links públicos do Instagram. Qualquer outro texto,
      // inclusive uma chamada pelo nome, é ignorado. Remover o arquivo desliga a automação na hora.
      if (String(m.chat || '') === GRUPO_REFERENCIAS_INSTAGRAM) {
        if (!existsSync(IG_REF_ENABLED) || !ehReferenciaInstagram(m)) continue;
      }
      // Botão do lembrete de evolução: não acorda a Aurora (nem resposta, nem sugestão).
      if (ehBotaoEvolucao(m)) { log('botao_evolucao_ignorado'); continue; }
      porteiro.entrada(m);
      const motivo = motivoSilencio(m);
      if (motivo) {
        calada += 1;
        if (!geraSugestao(m, motivo)) {
          await sombra(String(m.chat), 'silencio', motivo).catch((e) => log('erro_silencio', { codigo: e.code || e.name }));
          continue;
        }
        modoSugestao.set(String(m.chat), Date.now() + SUGESTAO_MS);
      } else {
        modoSugestao.delete(String(m.chat));
      }
      // A Central grava a mensagem antes de baixar a mídia: espera a URL por até 20 s (incidente 26/09, foto do Alf).
      if ((m.tipo === 'imagem' || m.tipo === 'documento' || (m.tipo === 'video' && deveGuardar(m))) && !m.midia_url) {
        for (let i = 0; i < 10 && !m.midia_url; i += 1) {
          await new Promise((ok) => setTimeout(ok, 2000));
          const q = await pool.query('SELECT public.aurora_ponte_midia($1::uuid) AS r', [m.mensagem_id]).catch(() => null);
          Object.assign(m, q?.rows?.[0]?.r || {});
        }
        log('midia_espera', { tipo: m.tipo, ok: Boolean(m.midia_url) });
      }
      // Áudio: a Central transcreve depois de gravar. Espera a transcrição por até 30 s.
      if (m.tipo === 'audio' && !temTranscricao(m)) {
        for (let i = 0; i < 15 && !m.transcricao; i += 1) {
          await new Promise((ok) => setTimeout(ok, 2000));
          const q = await pool.query('SELECT public.aurora_ponte_midia($1::uuid) AS r', [m.mensagem_id]).catch(() => null);
          Object.assign(m, q?.rows?.[0]?.r || {});
        }
        if (m.transcricao) m.texto = m.transcricao;
        log('audio_espera', { ok: Boolean(m.transcricao) });
      }
      if (ehPdf(m)) {
        try {
          const { caminho, motivo } = await prepararPdf(m, PASTA_DOC);
          m.doc_txt = caminho; m.doc_motivo = motivo;
          log('pdf', { ok: Boolean(caminho), motivo });
        } catch (e) {
          m.doc_motivo = 'falha ao baixar';
          log('erro_pdf', { codigo: e.code || e.name });
        }
      }
      // Anexo do time: guarda o original para a aurora_ler_arquivo, em segundo plano (não segura a fila).
      if (deveGuardar(m) && m.midia_url) {
        const caminho = caminhoAnexo(m);
        if (caminho) {
          m.anexo = caminho;
          guardarAnexo(m, caminho).then((r) => log('anexo', { tipo: m.tipo, ok: r.ok, motivo: r.motivo })).catch(() => log('anexo', { tipo: m.tipo, ok: false }));
        }
      }
      if (entraNaRajada(m, motivo)) { rajadas.guardar(m); continue; }
      const aberta = rajadas.fechar(m.chat);
      if (aberta) fila.push(paraHermes(aberta));
      fila.push(paraHermes(m));
    }
    if (lista.length) log('entrada', { mensagens: lista.length, calada });
    ultimoPuxar = new Date(); erroSeguido = 0;
  } catch (e) {
    erroSeguido += 1;
    log('erro_puxar', { codigo: e.code || 'desconhecido', seguidos: erroSeguido });
  } finally {
    for (const r of rajadas.vencidas()) {
      fila.push(paraHermes(r));
      if (r.rajada) log('rajada', { mensagens: r.rajada });
    }
    setTimeout(puxar, erroSeguido ? Math.min(30000, INTERVALO_MS * 2 ** erroSeguido) : INTERVALO_MS);
  }
}

async function sombra(chat, tipo, conteudo, ferramenta = null) {
  const r = await pool.query('SELECT public.aurora_ponte_sombra($1, $2, $3, $4) AS r', [chat, tipo, conteudo, ferramenta]);
  return r.rows[0].r;
}

function corpo(req) {
  return new Promise((ok, falha) => {
    let t = ''; req.on('data', (c) => { t += c; if (t.length > 200000) req.destroy(); });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { falha(e); } });
  });
}
const responder = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const servidor = http.createServer(async (req, res) => {
  const rota = new URL(req.url, 'http://x').pathname.replace(/^\//, '');
  try {
    if (req.method === 'GET' && rota === 'health') {
      return responder(res, 200, { status: 'connected', modo: 'chave_no_banco', fila: fila.length, rajadas: rajadas.tamanho, ultimo_puxar: ultimoPuxar, erros_seguidos: erroSeguido,
        banco_ok: Boolean(ultimoPuxar && Date.now() - ultimoPuxar.getTime() < 120000), referencia_em_processamento: referenciaEmProcessamento });
    }
    if (req.method === 'GET' && rota === 'messages') {
      const retirada = retirarParaEntrega(fila, referenciaEmProcessamento);
      if (retirada.referenciaSelecionada) referenciaEmProcessamento = true;
      return responder(res, 200, retirada.mensagens);
    }
    if (req.method === 'GET' && rota === 'liberado') {
      const chat = new URL(req.url, 'http://x').searchParams.get('chat') || '';
      if (emSugestao(chat)) return responder(res, 200, { liberado: false });
      const q = await pool.query('SELECT public.aurora_ponte_liberado($1) AS r', [chat]);
      return responder(res, 200, { liberado: q.rows[0].r === true });
    }
    if (req.method !== 'POST') return responder(res, 404, { error: 'rota' });
    const b = await corpo(req);
    if (rota === 'send' || rota === 'edit') {
      if (ehAvisoDoSistema(b.message)) {
        log('aviso_sistema_descartado', { rota });
        return responder(res, 200, { success: true, messageId: `descartado-${Date.now()}` });
      }
      // Sem rótulo "Sugestão para…" nem aspas em volta: sai só a mensagem (privado; grupo fica como veio).
      const limpa = limparResposta(b.message, String(b.chatId || '').endsWith('@g.us'));
      if (limpa !== String(b.message ?? '')) { log('rotulo_removido', { rota }); b.message = limpa; }
      // A chave é do banco (aurora_canal_config): conversa não liberada vai para a sombra, liberada sai pela Central.
      if (rota === 'edit') {
        const tipo = emSugestao(String(b.chatId || '')) ? 'sugestao' : 'resposta';
        const r = await sombra(String(b.chatId || ''), tipo, String(b.message || ''));
        observarJev(String(b.chatId || ''), String(b.message || ''), tipo);
        if (String(b.chatId || '') === GRUPO_REFERENCIAS_INSTAGRAM && r?.ok) referenciaEmProcessamento = false;
        return responder(res, 200, { success: true, messageId: `sombra-${r?.id || Date.now()}` });
      }
      if (emSugestao(String(b.chatId || ''))) {
        const r = await sombra(String(b.chatId || ''), 'sugestao', String(b.message || ''));
        log('sugestao', { ok: Boolean(r?.ok) });
        observarJev(String(b.chatId || ''), String(b.message || ''), 'sugestao');
        return responder(res, 200, { success: true, messageId: `sugestao-${r?.id || Date.now()}` });
      }
      const q = await pool.query('SELECT public.aurora_ponte_enviar($1, $2) AS r', [String(b.chatId || ''), String(b.message || '')]);
      const r = q.rows[0].r || {};
      log(r.enviado ? 'enviado' : 'sombra_resposta', { ok: Boolean(r.ok), erro: r.erro || null });
      observarJev(String(b.chatId || ''), String(b.message || ''), r.enviado ? 'enviado' : 'resposta');
      if (r.erro && !r.sombra) return responder(res, 500, { success: false, error: r.erro });
      if (String(b.chatId || '') === GRUPO_REFERENCIAS_INSTAGRAM && (r.enviado || r.sombra)) referenciaEmProcessamento = false;
      return responder(res, 200, { success: true, messageId: `${r.enviado ? 'aurora' : 'sombra'}-${r.id || Date.now()}` });
    }
    if (rota === 'send-media' || rota === 'send-poll' || rota === 'poll' || rota === 'send-location' || rota === 'location') {
      const desc = `[${rota}] ${JSON.stringify({ ...b, chatId: undefined }).slice(0, 2000)}`;
      const r = await sombra(String(b.chatId || ''), 'resposta', desc);
      return responder(res, 200, { success: true, messageId: `sombra-${r?.id || Date.now()}` });
    }
    if (rota === 'sombra-acao') {
      const r = await sombra(String(b.chatId || ''), 'acao', JSON.stringify(b.args || {}).slice(0, 8000), String(b.ferramenta || ''));
      log('sombra_acao', { ferramenta: String(b.ferramenta || ''), ok: Boolean(r?.ok) });
      return responder(res, 200, { ok: Boolean(r?.ok) });
    }
    if (rota === 'typing') {
      // "digitando…" só em conversa liberada (o banco decide); no máximo 1 aviso a cada 6 s por conversa.
      const chat = String(b.chatId || '');
      const agora = Date.now();
      if (chat && !emSugestao(chat) && agora - (ultimoDigitando.get(chat) || 0) > 6000) {
        ultimoDigitando.set(chat, agora);
        pool.query('SELECT public.aurora_ponte_digitando($1) AS r', [chat]).catch((e) => log('erro_digitando', { codigo: e.code || e.name }));
      }
      return responder(res, 200, { success: true });
    }
    if (rota === 'read') return responder(res, 200, { success: true });
    return responder(res, 404, { error: 'rota' });
  } catch (e) {
    log('erro_rota', { rota, codigo: e.code || e.name });
    return responder(res, 500, { error: 'falha' });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => { log('pronta', { porta: PORTA, modo: 'sombra' }); puxar(); });
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { servidor.close(); pool.end().finally(() => process.exit(0)); });
