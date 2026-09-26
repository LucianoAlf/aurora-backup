import assert from 'node:assert/strict';
import test from 'node:test';
import { midiaPermitida, ehPdf } from '../src/midia.mjs';

test('só baixa de https da UAZAPI da clínica', () => {
  assert.ok(midiaPermitida('https://lamusic.uazapi.com/files/x.pdf'));
  assert.ok(!midiaPermitida('http://lamusic.uazapi.com/files/x.pdf'));
  assert.ok(!midiaPermitida('https://lamusic.uazapi.com.evil.io/x'));
  assert.ok(!midiaPermitida('file:///etc/passwd'));
  assert.ok(!midiaPermitida(null));
});

test('reconhece PDF pelo tipo ou pelo nome', () => {
  assert.ok(ehPdf({ tipo: 'documento', midia_tipo: 'application/pdf' }));
  assert.ok(ehPdf({ tipo: 'documento', midia_nome: 'Laudo.PDF' }));
  assert.ok(!ehPdf({ tipo: 'documento', midia_tipo: 'application/msword', midia_nome: 'a.doc' }));
  assert.ok(!ehPdf({ tipo: 'imagem', midia_tipo: 'application/pdf' }));
});
