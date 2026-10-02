import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { caminhoAnexo, conversaHash, deveGuardar, extensao, guardarAnexo } from '../src/anexos.mjs';
import { paraHermes } from '../src/mapear.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anexos-'));
const BIANCA = '5521997382027';
const base = { mensagem_id: '7f1c2a3b-0000-4000-8000-000000000001', chat: `${BIANCA}@s.whatsapp.net`, grupo: false, remetente: BIANCA,
  midia_url: 'https://lamusic.uazapi.com/files/a.bin', em: '2026-10-02T18:00:00Z' };

test('guarda só anexo do time e só tipos de mídia', () => {
  assert.equal(deveGuardar({ ...base, tipo: 'documento', midia_tipo: 'application/pdf' }), true);
  assert.equal(deveGuardar({ ...base, tipo: 'audio', midia_tipo: 'audio/ogg; codecs=opus' }), true);
  assert.equal(deveGuardar({ ...base, tipo: 'video', midia_tipo: 'video/mp4' }), true);
  assert.equal(deveGuardar({ ...base, tipo: 'texto' }), false);
  assert.equal(deveGuardar({ ...base, tipo: 'sticker' }), false);
  assert.equal(deveGuardar({ ...base, tipo: 'documento', remetente: '5521900000001', midia_tipo: 'application/pdf' }), false, 'família: nada é guardado');
  assert.equal(deveGuardar({ ...base, tipo: 'documento', remetente: '123456789012345', midia_tipo: 'application/pdf' }), false, 'LID: fora');
  assert.equal(deveGuardar({ ...base, tipo: 'documento', midia_tipo: 'application/msword', midia_nome: 'a.doc' }), false, 'Word não é lido');
});

test('nome do arquivo usa o mesmo hash de conversa do carimbo', () => {
  const m = { ...base, tipo: 'documento', midia_tipo: 'application/pdf', midia_nome: 'Agenda.PDF' };
  const esperado = crypto.createHash('sha256').update(m.chat).digest('hex').slice(0, 16);
  assert.equal(conversaHash(m.chat), esperado);
  assert.equal(caminhoAnexo(m, dir), path.join(dir, `aurora-${esperado}-7f1c2a3b-0000-4000-8000-000000000001.pdf`));
  assert.equal(extensao({ tipo: 'audio', midia_tipo: 'audio/ogg; codecs=opus' }), 'ogg');
  assert.equal(extensao({ tipo: 'imagem', midia_nome: 'foto.JPEG' }), 'jpg');
  assert.equal(path.basename(caminhoAnexo({ ...m, mensagem_id: '../../abcdef' }, dir)), `aurora-${esperado}-abcdef.pdf`);
});

test('baixa em .part e renomeia; host fora da UAZAPI não baixa', async () => {
  const m = { ...base, tipo: 'documento', midia_tipo: 'application/pdf' };
  const destino = caminhoAnexo(m, dir);
  const fetchImpl = async () => new Response(Buffer.from('%PDF-1.4 teste'));
  const r = await guardarAnexo(m, destino, { fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(fs.readFileSync(destino, 'utf8'), '%PDF-1.4 teste');
  assert.equal(fs.existsSync(`${destino}.part`), false);
  assert.equal((fs.statSync(destino).mode & 0o777).toString(8), '600');
  assert.equal((await guardarAnexo({ ...m, midia_url: 'https://evil.io/x' }, destino + '2', { fetchImpl })).ok, false);
  const falha = await guardarAnexo(m, destino + '3', { fetchImpl: async () => new Response('x', { status: 404 }) });
  assert.equal(falha.ok, false);
  assert.equal(fs.existsSync(destino + '3'), false);
});

test('o Hermes recebe o caminho do anexo no corpo; sem anexo, nada muda', () => {
  const comAnexo = paraHermes({ ...base, tipo: 'audio', texto: 'oi, segue o áudio da reunião', anexo: '/home/aurora/.hermes/cache/anexos/aurora-0123456789abcdef-x1y2.ogg' });
  assert.match(comAnexo.body, /oi, segue o áudio da reunião\n\[anexo guardado: \/home\/aurora\/\.hermes\/cache\/anexos\/aurora-0123456789abcdef-x1y2\.ogg · para ler, use aurora_ler_arquivo/);
  const sem = paraHermes({ ...base, tipo: 'audio', texto: 'oi' });
  assert.equal(sem.body, 'oi');
});
