import crypto from 'node:crypto';
import fs from 'node:fs';

export const TARGET_GROUP = '120363431536497281@g.us';
export const TARGET_HASH = crypto.createHash('sha256').update(TARGET_GROUP).digest('hex').slice(0, 16);

export function validateContext(token, { keyFile = process.env.AURORA_CARIMBO_KEY_FILE || '/home/aurora/.hermes/aurora-carimbo.key', now = Math.floor(Date.now() / 1000) } = {}) {
  const match = String(token || '').match(/^(AUR1\.whatsapp\.group\.[0-9]{6,20}(?:@lid)?\.([0-9a-f]{16})\.(\d{10}))\.([0-9a-f]{32})$/);
  if (!match || match[2] !== TARGET_HASH || Math.abs(now - Number(match[3])) > 600) return false;
  const key = fs.readFileSync(keyFile, 'utf8').trim();
  const expected = crypto.createHmac('sha256', key).update(match[1]).digest('hex').slice(0, 32);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(match[4]));
}

export function normalizeInstagramUrl(raw) {
  const match = String(raw || '').trim().match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?(?:\?[^\s]*)?$/i);
  if (!match) return null;
  const kind = ['reel', 'reels'].includes(match[1].toLowerCase()) ? 'reel' : match[1].toLowerCase();
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}
