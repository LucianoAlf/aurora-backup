// Anexos originais do time para a aurora_ler_arquivo (2026-10-02).
// Só para quem pode pedir leitura (Alf, Anne, Bianca, Serjão): a ponte guarda o arquivo original (PDF, áudio,
// imagem, vídeo, texto) em ~/.hermes/cache/anexos/aurora-<hash16 da conversa>-<id>.<ext> e avisa o Hermes do
// caminho no corpo da mensagem. O hash é o mesmo do carimbo, então a ferramenta só lê o anexo da própria
// conversa. Família e desconhecido: nada muda (nenhum arquivo novo é guardado). Download em segundo plano,
// em .part e renomeado no fim; nunca segura a fila. Arquivos somem em 72 h.
import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AUTORIZADOS } from '../../../mcp/aurora-pesquisa/src/security.mjs';
import { midiaPermitida } from './midia.mjs';

export const PASTA_ANEXOS = process.env.ANEXOS_DIR || '/home/aurora/.hermes/cache/anexos';
const LIMITE_BYTES = 200 * 1024 * 1024;
const VIDA_MS = 72 * 3600 * 1000;
const TIPOS = new Set(['documento', 'audio', 'imagem', 'video']);

const POR_MIME = [
  [/^application\/pdf/i, 'pdf'], [/^image\/jpe?g/i, 'jpg'], [/^image\/png/i, 'png'], [/^image\/webp/i, 'webp'], [/^image\/(heic|heif)/i, 'heic'],
  [/^audio\/(ogg|opus)/i, 'ogg'], [/^audio\/(mpeg|mp3)/i, 'mp3'], [/^audio\/(mp4|m4a|aac|x-m4a)/i, 'm4a'], [/^audio\/(wav|x-wav)/i, 'wav'], [/^audio\/amr/i, 'amr'],
  [/^video\/mp4/i, 'mp4'], [/^video\/quicktime/i, 'mov'], [/^video\/3gpp/i, '3gp'], [/^video\/webm/i, 'webm'],
  [/^text\/plain/i, 'txt'], [/^text\/csv/i, 'csv'],
];
const EXT_OK = /^(pdf|jpe?g|png|webp|heic|ogg|oga|opus|mp3|m4a|aac|wav|amr|mp4|mov|m4v|3gp|webm|txt|csv|md)$/;

export function conversaHash(chat) {
  return crypto.createHash('sha256').update(String(chat || '')).digest('hex').slice(0, 16);
}

export function extensao(m) {
  const nome = String(m.midia_nome || '').toLowerCase();
  const porNome = nome.includes('.') ? nome.split('.').pop() : '';
  if (EXT_OK.test(porNome)) return porNome === 'jpeg' ? 'jpg' : porNome;
  for (const [re, ext] of POR_MIME) if (re.test(String(m.midia_tipo || ''))) return ext;
  if (m.tipo === 'audio') return 'ogg';
  if (m.tipo === 'imagem') return 'jpg';
  if (m.tipo === 'video') return 'mp4';
  return null;
}

// Só time autorizado, só tipos de mídia, só número de telefone (LID não tem carimbo de leitura).
export function deveGuardar(m) {
  if (!TIPOS.has(m?.tipo)) return false;
  const numero = String(m.remetente || '').replace(/\D/g, '');
  return AUTORIZADOS.has(numero) && Boolean(extensao(m));
}

export function caminhoAnexo(m, dir = PASTA_ANEXOS) {
  const id = String(m.mensagem_id || m.wa_message_id || '').replace(/[^0-9a-zA-Z-]/g, '').slice(0, 80);
  const ext = extensao(m);
  if (!id || id.length < 4 || !ext || !m.chat) return null;
  return path.join(dir, `aurora-${conversaHash(m.chat)}-${id}.${ext}`);
}

export function rotuloAnexo(caminho) {
  return `[anexo guardado: ${caminho} · para ler, use aurora_ler_arquivo com esse caminho]`;
}

async function limparVelhos(dir) {
  const agora = Date.now();
  for (const nome of await readdir(dir).catch(() => [])) {
    if (!nome.startsWith('aurora-')) continue;
    const p = path.join(dir, nome);
    const s = await stat(p).catch(() => null);
    if (s && agora - s.mtimeMs > VIDA_MS) await rm(p, { force: true });
  }
}

// Baixa em segundo plano. Devolve a promessa (para teste); quem chama não espera.
export async function guardarAnexo(m, caminho, { fetchImpl = fetch } = {}) {
  if (!caminho || !midiaPermitida(m.midia_url)) return { ok: false, motivo: 'sem_url_permitida' };
  const dir = path.dirname(caminho);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await limparVelhos(dir);
  const parte = `${caminho}.part`;
  try {
    const r = await fetchImpl(m.midia_url, { signal: AbortSignal.timeout(600000) });
    if (!r.ok || !r.body) return { ok: false, motivo: `download_${r.status}` };
    let total = 0;
    const conta = new Transform({ transform(c, _e, cb) { total += c.length; cb(total > LIMITE_BYTES ? new Error('grande_demais') : null, c); } });
    await pipeline(Readable.fromWeb(r.body), conta, createWriteStream(parte, { mode: 0o600 }));
    if (!total) { await rm(parte, { force: true }); return { ok: false, motivo: 'vazio' }; }
    await rename(parte, caminho);
    return { ok: true, bytes: total };
  } catch (e) {
    await rm(parte, { force: true });
    return { ok: false, motivo: e?.message === 'grande_demais' ? 'grande_demais' : 'falha_download' };
  }
}
