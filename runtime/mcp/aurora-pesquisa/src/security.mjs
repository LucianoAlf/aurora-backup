import crypto from 'node:crypto';
import fs from 'node:fs';

// Quem pode pedir pesquisa (decisão do Alf, 2026-09-30): Alf, Anne, Bianca e Serjão.
export const AUTORIZADOS = new Map([
  ['5521981278047', 'Alf'],
  ['5521966950296', 'Anne'],
  ['5521997382027', 'Bianca'],
  ['5521964751340', 'Serjão'],
  ['552164751340', 'Serjão'],
]);

// Devolve o nome de quem pediu, ou null. Aceita privado e grupo; o carimbo vem do plugin aurora-carimbo.
export function quemPediu(token, { keyFile = process.env.AURORA_CARIMBO_KEY_FILE || '/home/aurora/.hermes/aurora-carimbo.key', now = Math.floor(Date.now() / 1000) } = {}) {
  const m = String(token || '').match(/^(AUR1\.whatsapp\.(?:dm|group)\.([0-9]{6,20})\.[0-9a-f]{16}\.(\d{10}))\.([0-9a-f]{32})$/);
  if (!m || Math.abs(now - Number(m[3])) > 600) return null;
  const key = fs.readFileSync(keyFile, 'utf8').trim();
  const esperado = crypto.createHmac('sha256', key).update(m[1]).digest('hex').slice(0, 32);
  if (!crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(m[4]))) return null;
  return AUTORIZADOS.get(m[2]) || null;
}

export function urlPublica(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol)) return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(h) || h.includes(':')) return null;
  return u.toString();
}

export function linkInstagram(raw) {
  const m = String(raw || '').trim().match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?(?:\?[^\s]*)?$/i);
  if (!m) return null;
  const tipo = ['reel', 'reels'].includes(m[1].toLowerCase()) ? 'reel' : m[1].toLowerCase();
  return `https://www.instagram.com/${tipo}/${m[2]}/`;
}

export function linkYoutube(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : null;
}
