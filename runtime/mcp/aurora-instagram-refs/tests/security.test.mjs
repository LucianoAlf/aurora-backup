import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeInstagramUrl, TARGET_GROUP, TARGET_HASH, validateContext } from '../src/security.mjs';

const key = 'k'.repeat(64); const now = 1790000000;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-igref-')); const keyFile = path.join(dir, 'key'); fs.writeFileSync(keyFile, key);
function token(hash = TARGET_HASH, ts = now) {
  const base = `AUR1.whatsapp.group.5521999998888.${hash}.${ts}`;
  return `${base}.${crypto.createHmac('sha256', key).update(base).digest('hex').slice(0, 32)}`;
}

test('aceita somente carimbo fresco do grupo alvo', () => {
  assert.equal(validateContext(token(), { keyFile, now }), true);
  assert.equal(validateContext(token(crypto.createHash('sha256').update('outro').digest('hex').slice(0, 16)), { keyFile, now }), false);
  assert.equal(validateContext(token(TARGET_HASH, now - 601), { keyFile, now }), false);
  assert.equal(TARGET_GROUP, '120363431536497281@g.us');
});

test('normaliza só post/reel público do Instagram', () => {
  assert.equal(normalizeInstagramUrl('https://instagram.com/reels/AbC_12/?x=1'), 'https://www.instagram.com/reel/AbC_12/');
  assert.equal(normalizeInstagramUrl('https://example.com/reel/AbC_12/'), null);
  assert.equal(normalizeInstagramUrl('https://instagram.com/direct/inbox/'), null);
});
