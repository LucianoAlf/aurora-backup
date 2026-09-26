// Mídia recebida (foto e PDF) para o Hermes. Só baixa de host permitido (arquivos da UAZAPI da clínica).
// Foto: o Hermes baixa pela URL e mostra ao modelo. PDF: a ponte baixa, extrai o texto e entrega como
// documento de texto na pasta de cache do Hermes (única pasta que ele aceita). Arquivos somem em 24 h.
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const HOSTS_PERMITIDOS = new Set(['lamusic.uazapi.com']);
const LIMITE_BYTES = 20 * 1024 * 1024;
const LIMITE_TEXTO = 60 * 1024;
const PAGINAS_PDF = 10;
const VIDA_MS = 24 * 3600 * 1000;

export function midiaPermitida(url) {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' && HOSTS_PERMITIDOS.has(u.hostname);
  } catch {
    return false;
  }
}

export function ehPdf(m) {
  return m.tipo === 'documento' && (/pdf/i.test(String(m.midia_tipo || '')) || /\.pdf$/i.test(String(m.midia_nome || '')));
}

function pdfParaTexto(arquivo) {
  return new Promise((ok, falha) => {
    execFile('pdftotext', ['-l', String(PAGINAS_PDF), '-enc', 'UTF-8', arquivo, '-'], { timeout: 20000, maxBuffer: 8 * 1024 * 1024 },
      (e, saida) => (e ? falha(e) : ok(saida)));
  });
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

// Baixa o PDF, extrai o texto e devolve o caminho do .txt (ou null com o motivo).
export async function prepararPdf(m, dir) {
  if (!dir) return { caminho: null, motivo: 'sem pasta de cache' };
  if (!midiaPermitida(m.midia_url)) return { caminho: null, motivo: 'host não permitido' };
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await limparVelhos(dir);
  const id = String(m.mensagem_id || Date.now()).replace(/[^0-9a-zA-Z-]/g, '');
  const pdf = path.join(dir, `aurora-${id}.pdf`);
  const txt = path.join(dir, `aurora-${id}.txt`);
  const r = await fetch(m.midia_url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) return { caminho: null, motivo: `download ${r.status}` };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > LIMITE_BYTES) return { caminho: null, motivo: 'arquivo grande demais' };
  await writeFile(pdf, buf, { mode: 0o600 });
  try {
    let texto = (await pdfParaTexto(pdf)).replace(/\f/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!texto) return { caminho: null, motivo: 'PDF sem texto (escaneado)' };
    if (Buffer.byteLength(texto) > LIMITE_TEXTO) texto = `${Buffer.from(texto).subarray(0, LIMITE_TEXTO).toString()}\n[… cortado]`;
    const nome = String(m.midia_nome || 'documento.pdf');
    await writeFile(txt, `Texto extraído do PDF "${nome}" (até ${PAGINAS_PDF} páginas):\n\n${texto}\n`, { mode: 0o600 });
    return { caminho: txt, motivo: null };
  } finally {
    await rm(pdf, { force: true });
  }
}
