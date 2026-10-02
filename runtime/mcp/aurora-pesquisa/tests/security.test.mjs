import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { linkInstagram, linkYoutube, podeMarcar, quemPediu, STATUS, urlPublica } from '../src/security.mjs';

const keyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pesq-')), 'k');
fs.writeFileSync(keyFile, 'chave-de-teste');
const now = 1790000000;
function carimbo(num, canal = 'dm', ts = now) {
  const base = `AUR1.whatsapp.${canal}.${num}.0123456789abcdef.${ts}`;
  return base + '.' + crypto.createHmac('sha256', 'chave-de-teste').update(base).digest('hex').slice(0, 32);
}

test('só os quatro autorizados, em privado ou grupo', () => {
  assert.equal(quemPediu(carimbo('5521964751340'), { keyFile, now }), 'Serjão');
  assert.equal(quemPediu(carimbo('5521997382027', 'group'), { keyFile, now }), 'Bianca');
  assert.equal(quemPediu(carimbo('5521981278047'), { keyFile, now }), 'Alf');
  assert.equal(quemPediu(carimbo('5521966950296'), { keyFile, now }), 'Anne');
  assert.equal(quemPediu(carimbo('5521998421461'), { keyFile, now }), null); // terapeuta: fora
  assert.equal(quemPediu(carimbo('5521900000001'), { keyFile, now }), null); // família: fora
});

test('carimbo falso, vencido ou "auto" é recusado', () => {
  assert.equal(quemPediu('auto', { keyFile, now }), null);
  assert.equal(quemPediu(carimbo('5521964751340', 'dm', now - 3600), { keyFile, now }), null);
  const falso = carimbo('5521964751340').slice(0, -1) + '0';
  assert.equal(quemPediu(falso === carimbo('5521964751340') ? falso.slice(0, -1) + '1' : falso, { keyFile, now }), null);
});

test('links', () => {
  assert.equal(urlPublica('http://127.0.0.1:3107/health'), null);
  assert.equal(urlPublica('file:///etc/passwd'), null);
  assert.ok(urlPublica('https://pubmed.ncbi.nlm.nih.gov/123/'));
  assert.equal(linkInstagram('https://www.instagram.com/reel/Dd2HUxMPevz/?igsh=x'), 'https://www.instagram.com/reel/Dd2HUxMPevz/');
  assert.equal(linkInstagram('https://evil.com/p/abc'), null);
  assert.equal(linkYoutube('https://youtu.be/xJeBtA_Qi-Y?t=3'), 'https://www.youtube.com/watch?v=xJeBtA_Qi-Y');
  assert.equal(linkYoutube('https://vimeo.com/1'), null);
});

test('status novos da Ponte Sonora: só a Bianca libera', () => {
  assert.ok(STATUS.includes('previa_enviada') && STATUS.includes('liberada'));
  assert.equal(podeMarcar('Bianca', 'liberada'), true);
  for (const quem of ['Alf', 'Anne', 'Serjão']) assert.equal(podeMarcar(quem, 'liberada'), false, quem);
  assert.equal(podeMarcar('Bianca', 'previa_enviada'), false);
  assert.equal(podeMarcar('Alf', 'previa_enviada'), true);
  assert.equal(podeMarcar('Bianca', 'com_alfredo'), true); // ajuste pedido pela Bianca
  assert.equal(podeMarcar('Serjão', 'aprovada'), false);
});
