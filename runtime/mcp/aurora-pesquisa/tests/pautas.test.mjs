import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Planilha falsa: o "composio" devolve linhas fixas no GET e grava em arquivo o que seria escrito.
const SCRIPT = new URL('../scripts/pautas.py', import.meta.url).pathname;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pautas-test-'));
const fake = path.join(dir, 'composio');
fs.writeFileSync(fake, `#!/usr/bin/env python3
import json, os, sys
if "-X" in sys.argv:
    open(os.environ["FAKE_WRITES"], "a").write(sys.argv[sys.argv.index("-d") + 1] + "\\n")
    print("{}")
else:
    print(json.dumps({"range": "Pautas!A2:P", "values": json.loads(os.environ["FAKE_ROWS"])}))
`, { mode: 0o755 });

function linha(id, canal, status, texto = '') {
  return [id, '01/10/2026 10:00', canal, 'Título', 'Ideia', '', '', 'Bianca', status, texto, '', '01/10/2026 10:00', canal === 'newsletter' ? 'newsletter' : 'carrossel', '2026-W41', '', 'Alfredo'];
}

function atualizar(rows, args) {
  const writes = path.join(dir, `w-${Math.random()}`);
  const r = spawnSync('python3', [SCRIPT, 'atualizar', JSON.stringify(args)], {
    env: { ...process.env, COMPOSIO_BIN: fake, PAUTAS_LOCK: path.join(dir, 'lock'), FAKE_ROWS: JSON.stringify(rows), FAKE_WRITES: writes },
    encoding: 'utf8',
  });
  return { out: JSON.parse(r.stdout), escreveu: fs.existsSync(writes) };
}

test('newsletter sem texto não vira aprovada', () => {
  const { out, escreveu } = atualizar([linha('P-261001-100000', 'newsletter', 'escolhida')], { id: 'P-261001-100000', status: 'aprovada' });
  assert.equal(out.ok, false);
  assert.equal(out.erro, 'falta_texto_final');
  assert.equal(escreveu, false);
});

test('newsletter aprovada com texto mandado junto', () => {
  const { out, escreveu } = atualizar([linha('P-261001-100000', 'newsletter', 'escolhida')], { id: 'P-261001-100000', status: 'aprovada', texto: 'Olá, colega! ...' });
  assert.equal(out.ok, true);
  assert.equal(out.status, 'aprovada');
  assert.equal(out.canal, 'newsletter');
  assert.equal(escreveu, true);
});

test('newsletter aprovada com texto já salvo na planilha', () => {
  const { out } = atualizar([linha('P-261001-100000', 'newsletter', 'ajustes', 'Olá, colega! v3')], { id: 'P-261001-100000', status: 'aprovada' });
  assert.equal(out.ok, true);
});

test('instagram segue sem exigir texto', () => {
  const { out } = atualizar([linha('P-261001-100000', 'instagram', 'escolhida')], { id: 'P-261001-100000', status: 'aprovada' });
  assert.equal(out.ok, true);
});

test('liberada só sai de previa_enviada, e grava', () => {
  const { out, escreveu } = atualizar([linha('P-261002-100000', 'newsletter', 'previa_enviada', 'Olá, colega!')], { id: 'P-261002-100000', status: 'liberada' });
  assert.equal(out.ok, true);
  assert.equal(out.status, 'liberada');
  assert.equal(out.status_anterior, 'previa_enviada');
  assert.equal(escreveu, true);
});

test('liberada antes da prévia é recusada', () => {
  for (const st of ['com_alfredo', 'aprovada', 'escolhida']) {
    const { out, escreveu } = atualizar([linha('P-261002-100000', 'newsletter', st, 'Olá, colega!')], { id: 'P-261002-100000', status: 'liberada' });
    assert.equal(out.erro, 'liberada_sem_previa', st);
    assert.equal(escreveu, false);
  }
});

test('liberada não vale para instagram', () => {
  const { out, escreveu } = atualizar([linha('P-261002-100000', 'instagram', 'previa_enviada')], { id: 'P-261002-100000', status: 'liberada' });
  assert.equal(out.erro, 'liberada_so_newsletter');
  assert.equal(escreveu, false);
});

test('ajuste na página volta para com_alfredo com o pedido em ajustes', () => {
  const { out, escreveu } = atualizar([linha('P-261002-100000', 'newsletter', 'previa_enviada', 'Olá, colega!')],
    { id: 'P-261002-100000', status: 'com_alfredo', ajustes: 'Bianca: trocar a foto do topo' });
  assert.equal(out.ok, true);
  assert.equal(out.status, 'com_alfredo');
  assert.equal(escreveu, true);
});
