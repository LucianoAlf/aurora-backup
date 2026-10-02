import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Leitura de arquivos da Aurora (só leitura), adaptada do mike_ler_arquivo (Mike 0.6.0, 2026-10-02):
// 1) Drive da SonoraMente: a conexão Google da Aurora no Composio é a conta pessoal do Alf, que enxerga o Drive
//    inteiro dele. Por isso a leitura fica presa à árvore da pasta "SonoraMente" e as subpastas com dado de
//    paciente, financeiro e planilhas ficam FORA (não entram na árvore, então nada abaixo delas é lido).
//    Equipe e Reuniões foram liberadas pelo Alf em 2026-10-02. Conta e raiz vêm do env (AURORA_DRIVE_COMPOSIO_ACCOUNT,
//    AURORA_DRIVE_RAIZ) para trocar para a conexão própria da SonoraMente sem release nova.
// 2) Anexo de WhatsApp: a ponte guarda o original (PDF, áudio, imagem, vídeo) que alguém do time mandou em
//    ~/.hermes/cache/anexos/aurora-<hash16 da conversa>-<id>.<ext>. Só lê o anexo da MESMA conversa do carimbo.
// Texto exato sai local (pdftotext / export do Google); o arquivo nativo vai ao Gemini só se não tiver dado de paciente.
export const RAIZ_SONORAMENTE = '1Ic0AcPz-WVssGQXMtRqJ-m9VSWXP7tc3';
export const EXCLUIDAS = new Map([
  ['1htogDSjdY5zk4qF6VUA9T-CI5WAxDpf-', '04 Pacientes'],
  ['1KWLLuACb6sZFOrcb7AArFLi4KuUdblJc', '05 Financeiro'],
  ['1d5cv1CApNJ75dy-MnQOgzp_rB-hNeKBN', '09 Planilhas Sonora'],
]);
const PASTA = 'application/vnd.google-apps.folder';
const ATALHO = 'application/vnd.google-apps.shortcut';
const ID = /^[A-Za-z0-9_-]{10,80}$/;
const ANEXO = /^aurora-([0-9a-f]{16})-[A-Za-z0-9-]{4,80}\.[a-z0-9]{2,5}$/;
const MB = 1024 * 1024;

export const LIMITES = {
  pdf_mb: 40, pdf_visual_mb: 24, imagem_mb: 20, texto_mb: 5, audio_mb: 300, audio_min: 60, video_mb: 600, video_min: 20,
  envio_gemini_mb: 24, texto_por_resposta: 30000, pergunta: 2000,
};

export const EXPORTS = {
  'application/vnd.google-apps.document': { rotulo: 'google_doc', texto: 'text/plain', visual: 'application/pdf' },
  'application/vnd.google-apps.spreadsheet': { rotulo: 'google_planilha', texto: 'text/csv', visual: 'application/pdf', aviso: 'Texto em CSV traz só a primeira aba; a leitura visual (PDF) cobre todas.' },
  'application/vnd.google-apps.presentation': { rotulo: 'google_apresentacao', texto: null, visual: 'application/pdf' },
  'application/vnd.google-apps.drawing': { rotulo: 'google_desenho', texto: null, visual: 'application/pdf' },
};

const EXT = {
  pdf: /\.pdf$/i, imagem: /\.(jpe?g|png|webp|gif|heic|heif)$/i, audio: /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|amr)$/i,
  video: /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i, texto: /\.(txt|md|csv|tsv|json|html?)$/i,
};

export function tipoDe(nome, mime = '') {
  const m = String(mime).toLowerCase();
  if (m === 'application/pdf' || EXT.pdf.test(nome)) return 'pdf';
  if (m.startsWith('image/') || EXT.imagem.test(nome)) return 'imagem';
  if (m.startsWith('audio/') || EXT.audio.test(nome)) return 'audio';
  if (m.startsWith('video/') || EXT.video.test(nome)) return 'video';
  if (m.startsWith('text/') || m === 'application/json' || EXT.texto.test(nome)) return 'texto';
  return null;
}

export function contarPalavras(t) {
  return (String(t || '').match(/[\p{L}\p{N}]{2,}/gu) || []).length;
}

export function urlDownload(d) {
  // O Composio devolve o arquivo em downloaded_file_content.s3url; display_url é só a página de visualização.
  const s3 = d?.downloaded_file_content?.s3url ?? d?.data?.downloaded_file_content?.s3url;
  if (typeof s3 === 'string' && /^https:\/\//.test(s3)) return s3;
  const fila = [d];
  while (fila.length) {
    const x = fila.shift();
    if (!x || typeof x !== 'object') continue;
    for (const [k, v] of Object.entries(x)) {
      if (typeof v === 'string' && /^https:\/\//.test(v) && /url|download|s3/i.test(k) && !/display|view|link/i.test(k)) return v;
      if (v && typeof v === 'object') fila.push(v);
    }
  }
  return null;
}

// Aceita ID do Drive, link do Drive/Docs ou caminho absoluto de anexo.
export function origemDe(origem) {
  const s = String(origem || '').trim();
  if (!s || s.includes('\0')) return { erro: 'origem_vazia' };
  if (s.startsWith('/')) return { local: s };
  if (/^https?:\/\//i.test(s)) {
    let u;
    try { u = new URL(s); } catch { return { erro: 'link_invalido' }; }
    if (!/(^|\.)(drive|docs)\.google\.com$/i.test(u.hostname)) return { erro: 'link_fora_do_drive' };
    if (/\/folders\//.test(u.pathname)) {
      const id = u.pathname.match(/\/folders\/([A-Za-z0-9_-]{10,80})/)?.[1];
      return id ? { pasta: id } : { erro: 'link_invalido' };
    }
    const id = u.pathname.match(/\/d\/([A-Za-z0-9_-]{10,80})/)?.[1] || u.searchParams.get('id');
    return id && ID.test(id) ? { drive: id } : { erro: 'link_invalido' };
  }
  return ID.test(s) ? { drive: s } : { erro: 'origem_invalida', dica: 'Use o ID do Drive, o link do Drive ou o caminho do anexo.' };
}

// Anexo da ponte: dentro da pasta de anexos (realpath, sem ../ nem symlink para fora) e da mesma conversa.
export function anexoPermitido(p, raizAnexos, conversa) {
  if (typeof p !== 'string' || !path.isAbsolute(p) || !raizAnexos) return { erro: 'caminho_nao_permitido' };
  const m = ANEXO.exec(path.basename(p));
  if (!m) return { erro: 'caminho_nao_permitido' };
  if (!conversa || m[1] !== conversa) return { erro: 'anexo_de_outra_conversa', dica: 'Só leio anexo enviado nesta mesma conversa.' };
  let real;
  try { real = fs.realpathSync(p); } catch {
    return fs.existsSync(`${p}.part`) ? { erro: 'anexo_ainda_baixando', dica: 'Tente de novo em alguns segundos.' } : { erro: 'anexo_expirado_ou_inexistente', dica: 'Anexos ficam 72 h; peça para reenviar.' };
  }
  if (path.dirname(real) !== raizAnexos) return { erro: 'caminho_nao_permitido' };
  const st = fs.statSync(real);
  return st.isFile() && st.size > 0 ? { real } : { erro: 'anexo_vazio' };
}

function rodar(bin, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 64 * MB, encoding: 'utf8' }, (e, out) => (e ? reject(new Error(`${path.basename(bin)}_falhou`)) : resolve(out)));
  });
}

async function baixarUrl(url, destino, maxBytes) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('url_invalida');
  const r = await fetch(u, { signal: AbortSignal.timeout(1_800_000) });
  if (!r.ok || !r.body) throw new Error('download_falhou');
  let total = 0;
  const conta = new Transform({ transform(c, _e, cb) { total += c.length; cb(total > maxBytes ? new Error('arquivo_grande_demais') : null, c); } });
  try { await pipeline(Readable.fromWeb(r.body), conta, fs.createWriteStream(destino, { mode: 0o600 })); }
  catch (e) { fs.rmSync(destino, { force: true }); throw e; }
  return destino;
}

function nomeSeguro(nome, fallback) {
  return String(nome || fallback).normalize('NFC').replace(/[^\p{L}\p{N} ._()-]/gu, '').trim().slice(0, 120) || fallback;
}

// Árvore de pastas da SonoraMente, por nível a partir da raiz, sem descer nas pastas excluídas.
// Fica em disco e é servida na hora; passou do prazo, atualiza em segundo plano. Pasta desconhecida força
// uma atualização antes de recusar (pasta nova).
export function createArvore({ composio, raiz = RAIZ_SONORAMENTE, excluidas = EXCLUIDAS, cacheFile, ttlMs = 6 * 3600 * 1000, novaMs = 2 * 60 * 1000, lote = 50, agora = Date.now }) {
  let cache = null;
  let emCurso = null;
  if (cacheFile) {
    try {
      const d = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const mesmas = JSON.stringify([...excluidas.keys()].sort()) === JSON.stringify(d?.excluidas ?? null);
      if (d?.raiz === raiz && mesmas && Array.isArray(d.pastas)) cache = { em: d.em, pastas: new Map(d.pastas) };
    } catch { /* sem cache */ }
  }
  async function varrer() {
    const pastas = new Map([[raiz, { nome: 'SonoraMente', pai: null }]]);
    let nivel = [raiz];
    for (let prof = 0; nivel.length && prof < 15 && pastas.size < 3000; prof += 1) {
      const proximo = [];
      for (let i = 0; i < nivel.length; i += lote) {
        const grupo = nivel.slice(i, i + lote);
        let token;
        for (let pag = 0; pag < 20; pag += 1) {
          const d = await composio.execute('GOOGLEDRIVE_FIND_FILE', {
            q: `mimeType = '${PASTA}' and trashed = false and (${grupo.map((id) => `'${id}' in parents`).join(' or ')})`,
            fields: 'files(id,name,parents),nextPageToken', pageSize: 1000, corpora: 'user', ...(token ? { pageToken: token } : {}),
          });
          for (const f of d?.files ?? []) {
            const pai = (f.parents ?? []).find((x) => grupo.includes(x));
            if (!pai || pastas.has(f.id) || excluidas.has(f.id)) continue;
            pastas.set(f.id, { nome: f.name, pai });
            proximo.push(f.id);
          }
          token = d?.nextPageToken;
          if (!token) break;
        }
      }
      nivel = proximo;
    }
    cache = { em: agora(), pastas };
    if (cacheFile) {
      try { fs.writeFileSync(cacheFile, JSON.stringify({ raiz, excluidas: [...excluidas.keys()].sort(), em: cache.em, pastas: [...pastas] }), { mode: 0o600 }); } catch { /* só memória */ }
    }
    return cache;
  }
  function atualizar() {
    emCurso ??= varrer().finally(() => { emCurso = null; });
    return emCurso;
  }
  function carregar({ forcar = false } = {}) {
    if (!cache || forcar) return atualizar();
    if (agora() - cache.em >= ttlMs) atualizar().catch(() => {});
    return Promise.resolve(cache);
  }
  async function comRetentativa(teste) {
    const c = await carregar();
    const r = teste(c.pastas);
    if (r || agora() - c.em < novaMs) return r;
    return teste((await carregar({ forcar: true })).pastas);
  }
  return {
    carregar,
    contem: (id) => (excluidas.has(id) ? Promise.resolve(false) : comRetentativa((p) => p.has(id))),
    async caminho(id) {
      const { pastas } = await carregar();
      const nomes = [];
      for (let atual = id, i = 0; atual && pastas.has(atual) && i < 20; i += 1) { nomes.unshift(pastas.get(atual).nome); atual = pastas.get(atual).pai; }
      return nomes.join(' / ');
    },
    async descende(id, ancestral) {
      const { pastas } = await carregar();
      for (let atual = id, i = 0; atual && i < 20; i += 1) { if (atual === ancestral) return true; atual = pastas.get(atual)?.pai; }
      return false;
    },
    // Arquivo com vários pais: se algum pai está numa pasta excluída, fica fora (na dúvida, não lê).
    dentro: (parents) => comRetentativa((p) => ((parents ?? []).some((x) => excluidas.has(x)) ? null : (parents ?? []).find((x) => p.has(x)) ?? null)),
  };
}

function item(f, caminho) {
  return { id: f.id, nome: f.name, tipo: f.mimeType === PASTA ? 'pasta' : (EXPORTS[f.mimeType]?.rotulo ?? tipoDe(f.name, f.mimeType) ?? f.mimeType),
    bytes: Number(f.size || 0) || null, modificado_em: f.modifiedTime, pasta: caminho, link: f.webViewLink };
}

const CAMPOS = 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink),nextPageToken';
const CAMPOS_META = 'id,name,mimeType,size,md5Checksum,modifiedTime,parents,webViewLink,trashed,shortcutDetails';
const SEM_GEMINI = 'Com dado de paciente a leitura fica só local: texto exato de PDF, Doc e planilha. Áudio, imagem e vídeo com dado de paciente não saem para leitura externa; peça à equipe o resumo por escrito.';

export function createLeitura({ composio, arvore, gemini, raizAnexos, pastaSaida, bins = {}, rodarCmd = rodar, baixar = baixarUrl }) {
  const b = { pdfinfo: '/usr/bin/pdfinfo', pdftotext: '/usr/bin/pdftotext', ffprobe: '/usr/bin/ffprobe', ffmpeg: '/usr/bin/ffmpeg', ...bins };
  fs.mkdirSync(pastaSaida, { recursive: true, mode: 0o700 });

  function limpar() {
    const limite = Date.now() - 24 * 3600 * 1000;
    for (const f of fs.readdirSync(pastaSaida)) {
      const p = path.join(pastaSaida, f);
      try { const st = fs.statSync(p); if (st.isFile() && !f.endsWith('.jsonl') && !f.endsWith('.json') && st.mtimeMs < limite) fs.rmSync(p, { force: true }); } catch { /* ignora */ }
    }
  }

  async function metadata(id) {
    const m = await composio.execute('GOOGLEDRIVE_GET_FILE_METADATA', { fileId: id, fields: CAMPOS_META, supportsAllDrives: true });
    if (m?.mimeType === ATALHO && m?.shortcutDetails?.targetId && ID.test(m.shortcutDetails.targetId)) {
      const alvo = await composio.execute('GOOGLEDRIVE_GET_FILE_METADATA', { fileId: m.shortcutDetails.targetId, fields: CAMPOS_META, supportsAllDrives: true });
      // Atalho: o alvo também precisa estar dentro da SonoraMente.
      return { ...alvo, parents: m.parents, parentsAlvo: alvo?.parents };
    }
    return m;
  }

  async function baixarDrive(id, nome, mimeExport, maxBytes) {
    const d = await composio.execute('GOOGLEDRIVE_DOWNLOAD_FILE', { fileId: id, ...(mimeExport ? { mime_type: mimeExport } : {}) });
    const url = urlDownload(d);
    if (!url) throw new Error('drive_sem_url');
    const ext = mimeExport === 'application/pdf' ? '.pdf' : mimeExport === 'text/csv' ? '.csv' : mimeExport === 'text/plain' ? '.txt' : '';
    const destino = path.join(pastaSaida, `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${nomeSeguro(nome, id)}${ext}`);
    await baixar(url, destino, maxBytes);
    if (!fs.statSync(destino).size) { fs.rmSync(destino, { force: true }); throw new Error('download_vazio'); }
    return destino;
  }

  async function lerPdf(arquivo) {
    const info = await rodarCmd(b.pdfinfo, [arquivo]);
    if (/^Encrypted:\s+yes/m.test(info) && !/^Pages:/m.test(info)) return { erro: 'pdf_protegido' };
    const paginas = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] || 0);
    let texto = '';
    try { texto = await rodarCmd(b.pdftotext, ['-layout', '-enc', 'UTF-8', arquivo, '-'], 180000); } catch { texto = ''; }
    const blocos = texto.split('\f');
    const palavras = Array.from({ length: paginas }, (_, i) => contarPalavras(blocos[i]));
    return { paginas, paginas_sem_texto: palavras.map((n, i) => (n < 5 ? i + 1 : 0)).filter(Boolean).slice(0, 60),
      texto: blocos.map((t, i) => (t.trim() ? `--- página ${i + 1} ---\n${t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}` : '')).filter(Boolean).join('\n\n') };
  }

  async function duracao(arquivo) {
    const out = await rodarCmd(b.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arquivo], 60000);
    const s = Number(String(out).trim());
    return Number.isFinite(s) && s > 0 ? s : null;
  }

  async function preparar(arquivo, tipo) {
    const base = path.join(pastaSaida, `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-envio`);
    if (tipo === 'pdf') {
      if (fs.statSync(arquivo).size > LIMITES.pdf_visual_mb * MB) return { erro: 'pdf_grande_para_leitura_visual' };
      return { arquivo, mime: 'application/pdf' };
    }
    if (tipo === 'imagem') {
      if (/\.(jpe?g|png|webp)$/i.test(arquivo) && fs.statSync(arquivo).size <= 15 * MB) {
        return { arquivo, mime: /\.png$/i.test(arquivo) ? 'image/png' : /\.webp$/i.test(arquivo) ? 'image/webp' : 'image/jpeg' };
      }
      await rodarCmd(b.ffmpeg, ['-nostdin', '-v', 'error', '-y', '-i', arquivo, '-frames:v', '1', '-vf', "scale='min(2400,iw)':-2", `${base}.jpg`]);
      return { arquivo: `${base}.jpg`, mime: 'image/jpeg', temporario: true };
    }
    const seg = await duracao(arquivo);
    if (!seg) return { erro: 'duracao_nao_medida' };
    if (tipo === 'audio') {
      if (seg > LIMITES.audio_min * 60) return { erro: 'audio_longo_demais', minutos: Math.round(seg / 60) };
      await rodarCmd(b.ffmpeg, ['-nostdin', '-v', 'error', '-y', '-i', arquivo, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', `${base}.mp3`], 600000);
      return { arquivo: `${base}.mp3`, mime: 'audio/mpeg', temporario: true, segundos: Math.round(seg) };
    }
    if (seg > LIMITES.video_min * 60) return { erro: 'video_longo_demais', minutos: Math.round(seg / 60) };
    await rodarCmd(b.ffmpeg, ['-nostdin', '-v', 'error', '-y', '-i', arquivo, '-vf', "scale=-2:'min(480,ih)',fps=2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '32',
      '-c:a', 'aac', '-ac', '1', '-b:a', '48k', '-movflags', '+faststart', `${base}.mp4`], 1_200_000);
    return { arquivo: `${base}.mp4`, mime: 'video/mp4', temporario: true, segundos: Math.round(seg) };
  }

  async function analisar({ arquivo, nome, tipo, pergunta, visual, inicio, avisos, paciente }) {
    const out = { tipo, bytes: fs.statSync(arquivo).size };
    let texto = null;
    if (tipo === 'pdf') {
      const p = await lerPdf(arquivo);
      if (p.erro) return { ok: false, erro: p.erro, dica: 'PDF com senha: peça a versão sem senha.' };
      Object.assign(out, { paginas: p.paginas, paginas_sem_texto: p.paginas_sem_texto.length ? p.paginas_sem_texto : undefined });
      texto = p.texto;
      if (p.paginas_sem_texto.length) avisos.push(paciente ? 'Há páginas sem camada de texto (escaneadas): sem leitura externa por ter dado de paciente, elas ficaram sem leitura.' : 'Há páginas sem camada de texto (imagem ou escaneado): a leitura do Gemini cobre o que o texto não tem.');
    } else if (tipo === 'texto') {
      if (out.bytes > LIMITES.texto_mb * MB) return { ok: false, erro: 'texto_grande_demais' };
      texto = fs.readFileSync(arquivo, 'utf8');
    } else if (paciente) {
      return { ok: false, erro: 'leitura_externa_bloqueada_dado_de_paciente', dica: SEM_GEMINI };
    }
    if (texto !== null) {
      const ini = Math.max(0, Math.min(inicio || 0, texto.length));
      const fim = ini + LIMITES.texto_por_resposta;
      Object.assign(out, { texto: texto.slice(ini, fim), texto_chars: texto.length, texto_inicio: ini,
        texto_truncado: fim < texto.length || undefined, proximo_inicio: fim < texto.length ? fim : undefined });
    }
    const precisaGemini = visual && !paciente && (tipo !== 'texto' || pergunta);
    if (precisaGemini) {
      const prep = tipo === 'texto' ? { texto: texto.slice(0, 400000) } : await preparar(arquivo, tipo);
      if (prep.erro) { out.leitura = { ok: false, ...prep }; } else {
        try {
          if (prep.segundos) out.duracao_segundos = prep.segundos;
          if (prep.arquivo && fs.statSync(prep.arquivo).size > LIMITES.envio_gemini_mb * MB) out.leitura = { ok: false, erro: 'envio_grande_demais', limite_mb: LIMITES.envio_gemini_mb };
          else {
            const base64 = prep.arquivo ? fs.readFileSync(prep.arquivo).toString('base64') : undefined;
            out.leitura = await gemini.ler({ tipo, mime: prep.mime, base64, texto: prep.texto, nome, pergunta });
          }
        } finally { if (prep.temporario) fs.rmSync(prep.arquivo, { force: true }); }
      }
    } else if (paciente) {
      out.leitura = { ok: false, erro: 'so_texto_local', motivo: 'dado_de_paciente' };
    } else if (texto === null) {
      out.leitura = { ok: false, erro: 'leitura_visual_desligada' };
    }
    return out;
  }

  const LIM = { pdf: LIMITES.pdf_mb, imagem: LIMITES.imagem_mb, audio: LIMITES.audio_mb, video: LIMITES.video_mb, texto: LIMITES.texto_mb };

  return {
    async buscar(termo, { pastaId, tipo } = {}) {
      const t = String(termo || '').trim().replace(/['\\]/g, ' ').slice(0, 80);
      if (!t) return { ok: false, erro: 'termo_vazio' };
      if (pastaId && !(await arvore.contem(pastaId))) return { ok: false, erro: 'pasta_fora_da_sonoramente' };
      const filtros = { pdf: "mimeType = 'application/pdf'", imagem: "mimeType contains 'image/'", video: "mimeType contains 'video/'", audio: "mimeType contains 'audio/'",
        documento: "mimeType = 'application/vnd.google-apps.document'", planilha: "mimeType = 'application/vnd.google-apps.spreadsheet'",
        apresentacao: "mimeType = 'application/vnd.google-apps.presentation'", pasta: `mimeType = '${PASTA}'` };
      const q = [`(name contains '${t}' or fullText contains '${t}')`, 'trashed = false', filtros[tipo]].filter(Boolean).join(' and ');
      const d = await composio.execute('GOOGLEDRIVE_FIND_FILE', { q, fields: CAMPOS, pageSize: 200, corpora: 'user', orderBy: 'modifiedTime desc' });
      const itens = [];
      for (const f of d?.files ?? []) {
        if (EXCLUIDAS.has(f.id)) continue;
        const pai = await arvore.dentro(f.parents);
        if (!pai) continue;
        if (pastaId && !(await arvore.descende(pai, pastaId))) continue;
        itens.push(item(f, await arvore.caminho(pai)));
        if (itens.length >= 50) break;
      }
      return { ok: true, termo: t, itens, como_usar: 'Leia qualquer item com aurora_ler_arquivo (origem = id). Busca cobre nome e conteúdo, só dentro do Drive da SonoraMente (sem Pacientes, Financeiro e Planilhas).' };
    },

    async listar(pastaId = RAIZ_SONORAMENTE) {
      if (!(await arvore.contem(pastaId))) return { ok: false, erro: 'pasta_fora_da_sonoramente' };
      const d = await composio.execute('GOOGLEDRIVE_FIND_FILE', { q: `'${pastaId}' in parents and trashed = false`, fields: CAMPOS, pageSize: 200, corpora: 'user', orderBy: 'folder,name' });
      const caminho = await arvore.caminho(pastaId);
      const itens = (d?.files ?? []).filter((f) => !EXCLUIDAS.has(f.id)).map((f) => item(f, caminho));
      return { ok: true, pasta_id: pastaId, pasta: caminho, itens, aviso: d?.nextPageToken ? 'Há mais de 200 itens; use aurora_drive_buscar.' : undefined };
    },

    async ler(origem, { pergunta, visual = true, inicio = 0, conversa, paciente = false } = {}) {
      limpar();
      const o = origemDe(origem);
      if (o.erro) return { ok: false, ...o };
      if (o.pasta) return { ok: false, erro: 'origem_e_pasta', dica: 'É uma pasta: use aurora_drive_listar com esse pasta_id.' };
      const avisos = [];
      if (o.local) {
        const a = anexoPermitido(o.local, raizAnexos, conversa);
        if (a.erro) return { ok: false, ...a, dica: a.dica ?? 'Só leio anexos do WhatsApp guardados pela ponte (caminho em [anexo guardado: …]) e arquivos do Drive da SonoraMente.' };
        const tipo = tipoDe(a.real);
        if (!tipo) return { ok: false, erro: 'tipo_nao_suportado', dica: 'Leio PDF, imagem, áudio, vídeo e texto. Word/Excel/PowerPoint: peça a versão em PDF ou Google Docs.' };
        if (fs.statSync(a.real).size > LIM[tipo] * MB) return { ok: false, erro: 'arquivo_grande_demais', limite_mb: LIM[tipo] };
        const r = await analisar({ arquivo: a.real, nome: `anexo do WhatsApp${path.extname(a.real)}`, tipo, pergunta, visual, inicio, avisos, paciente });
        if (r.ok === false) return r;
        return { ok: true, origem: { anexo_whatsapp: path.basename(a.real) }, md5: crypto.createHash('md5').update(fs.readFileSync(a.real)).digest('hex'), ...r,
          avisos: avisos.length ? avisos : undefined, limites: LIMITES };
      }

      const m = await metadata(o.drive);
      if (!m?.id) return { ok: false, erro: 'arquivo_nao_encontrado' };
      if (m.trashed) return { ok: false, erro: 'arquivo_na_lixeira' };
      if (m.mimeType === PASTA) return { ok: false, erro: 'origem_e_pasta', dica: 'É uma pasta: use aurora_drive_listar com esse pasta_id.' };
      const pai = await arvore.dentro(m.parents);
      const paiAlvo = m.parentsAlvo ? await arvore.dentro(m.parentsAlvo) : pai;
      if (!pai || !paiAlvo) return { ok: false, erro: 'arquivo_fora_da_sonoramente', dica: 'Só leio arquivos da pasta SonoraMente no Drive; Pacientes, Financeiro e Planilhas ficam de fora.' };
      const origemInfo = { drive_id: m.id, nome: m.name, mime: m.mimeType, pasta: await arvore.caminho(pai), modificado_em: m.modifiedTime, link: m.webViewLink };
      const exp = EXPORTS[m.mimeType];
      let r;
      if (exp) {
        const usaVisual = !paciente && (visual || !exp.texto);
        if (!exp.texto && paciente) return { ok: false, erro: 'leitura_externa_bloqueada_dado_de_paciente', dica: SEM_GEMINI, origem: origemInfo };
        let textoExato = null; let textoArq = null;
        if (exp.texto) { textoArq = await baixarDrive(m.id, m.name, exp.texto, LIMITES.texto_mb * MB); textoExato = fs.readFileSync(textoArq, 'utf8'); }
        let pdf = null;
        if (exp.visual && usaVisual) pdf = await baixarDrive(m.id, m.name, exp.visual, LIMITES.pdf_mb * MB);
        if (exp.aviso) avisos.push(exp.aviso);
        if (pdf) {
          r = await analisar({ arquivo: pdf, nome: m.name, tipo: 'pdf', pergunta, visual, inicio, avisos, paciente });
          if (r.ok === false) return r;
          if (textoExato !== null) {
            const ini = Math.max(0, Math.min(inicio || 0, textoExato.length)); const fim = ini + LIMITES.texto_por_resposta;
            Object.assign(r, { texto: textoExato.slice(ini, fim), texto_chars: textoExato.length, texto_inicio: ini,
              texto_truncado: fim < textoExato.length || undefined, proximo_inicio: fim < textoExato.length ? fim : undefined });
          }
        } else {
          r = await analisar({ arquivo: textoArq, nome: m.name, tipo: 'texto', pergunta, visual: visual && !paciente, inicio, avisos, paciente });
        }
        r.tipo = exp.rotulo;
      } else {
        const tipo = tipoDe(m.name, m.mimeType);
        if (!tipo) return { ok: false, erro: 'tipo_nao_suportado', origem: origemInfo, dica: 'Leio PDF, imagem, áudio, vídeo, texto e Google Docs/Planilhas/Apresentações. Word/Excel/PowerPoint: peça a versão em PDF ou Google.' };
        if (paciente && tipo !== 'pdf' && tipo !== 'texto') return { ok: false, erro: 'leitura_externa_bloqueada_dado_de_paciente', dica: SEM_GEMINI, origem: origemInfo };
        const bytes = Number(m.size || 0);
        if (bytes > LIM[tipo] * MB) return { ok: false, erro: 'arquivo_grande_demais', limite_mb: LIM[tipo], bytes, origem: origemInfo };
        const arquivo = await baixarDrive(m.id, m.name, null, LIM[tipo] * MB);
        if (bytes && fs.statSync(arquivo).size !== bytes) { fs.rmSync(arquivo, { force: true }); throw new Error('download_incompleto'); }
        const md5 = crypto.createHash('md5').update(fs.readFileSync(arquivo)).digest('hex');
        if (m.md5Checksum && String(m.md5Checksum).toLowerCase() !== md5) { fs.rmSync(arquivo, { force: true }); throw new Error('md5_diferente_do_drive'); }
        r = await analisar({ arquivo, nome: m.name, tipo, pergunta, visual, inicio, avisos, paciente });
        if (r.ok === false) return r;
        Object.assign(r, { md5, md5_igual_drive: m.md5Checksum ? true : undefined });
      }
      return { ok: true, origem: origemInfo, ...r, avisos: avisos.length ? avisos : undefined, limites: LIMITES,
        como_usar: 'texto = conteúdo exato extraído; leitura = leitura do Gemini sobre o arquivo nativo. Texto cortado: chame de novo com inicio = proximo_inicio. Só leitura: nada foi alterado no Drive.' };
    },
  };
}
