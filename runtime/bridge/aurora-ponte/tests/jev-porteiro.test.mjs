// Porteiro Jev da Aurora (10/10/2026): só observa, só conversa privada com família.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { criarPorteiro, foraDoPorteiro, respostaCurta, limpa, estado } from '../src/jev-porteiro.mjs';
import { GRUPO_REFERENCIAS_INSTAGRAM } from '../src/mapear.mjs';

const FAMILIA = '5521911112222@s.whatsapp.net';
function pasta({ ligado = true, chave = true } = {}) {
  const d = mkdtempSync(path.join(tmpdir(), 'jev-aurora-'));
  mkdirSync(path.join(d, 'logs'));
  if (ligado) writeFileSync(path.join(d, 'jev.json'), JSON.stringify({ sombra: true }));
  if (chave) writeFileSync(path.join(d, 'jev.env'), 'AURORA_JEV_OPENROUTER_KEY=teste\n');
  return d;
}
function fetchFalso(escolha, confidence, chamadas = []) {
  return async (url, op) => { chamadas.push(JSON.parse(op.body)); return { ok: true, json: async () => ({ answers: { veredito: { choice: escolha, confidence } }, usage: { cost: 0.00003 } }) }; };
}
const linhas = (d) => { const f = path.join(d, 'logs', 'jev-porteiro.jsonl'); return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []; };

test('equipe, grupo e grupo de referências ficam fora do porteiro', () => {
  assert.equal(foraDoPorteiro('120363000000000000@g.us', '5521911112222'), 'grupo');
  assert.equal(foraDoPorteiro(GRUPO_REFERENCIAS_INSTAGRAM, ''), 'grupo');
  assert.equal(foraDoPorteiro('5521997382027@s.whatsapp.net', null), 'equipe'); // Bianca
  assert.equal(foraDoPorteiro('123456789012345@lid', '5521964751340'), 'equipe'); // Serjão por LID
  assert.equal(foraDoPorteiro(FAMILIA, '5521911112222'), null);
  assert.equal(foraDoPorteiro('', ''), 'grupo');
});

test('trava de resposta curta pega emoji e cortesia, não resposta normal', () => {
  assert.ok(respostaCurta('💜'));
  assert.ok(respostaCurta('Por nada, senhor Alex!'));
  assert.ok(!respostaCurta('Obrigada, Selma. Vou passar para a equipe e eles confirmam o horário com a senhora.'));
});

test('telefone e e-mail saem do texto mandado ao Jev', () => {
  assert.equal(limpa('me liga 21 96464-9916 ou a@b.com', 200), 'me liga [tel] ou [email]');
});

test('rascunho para família passa pelo Jev e fica anotado, com o contexto da conversa', async () => {
  const d = pasta(); const chamadas = [];
  const p = criarPorteiro({ dir: d, fetchImpl: fetchFalso('promete_tarefa_da_equipe', 0.98, chamadas) });
  p.entrada({ chat: FAMILIA, remetente: '5521911112222', texto: 'Pode ser 16:30', respostas_equipe: ['Temos terça às 16h'] });
  const r = await p.observar({ chat: FAMILIA, rascunho: 'Combinado. Vou confirmar o horário de terça às 16h30 no sistema.', tipo: 'sugestao' });
  assert.equal(r.escolha, 'promete_tarefa_da_equipe');
  assert.equal(r.barraria, true);
  assert.equal(chamadas.length, 1);
  assert.match(chamadas[0].state, /SonoraMente: Temos terça às 16h/);
  assert.match(chamadas[0].state, /Última mensagem da família: "Pode ser 16:30"/);
  assert.equal(chamadas[0].model, 'typesafe/jev-1.13');
  assert.equal(linhas(d).length, 1);
});

test('conversa da equipe nunca chama o Jev', async () => {
  const d = pasta(); const chamadas = [];
  const p = criarPorteiro({ dir: d, fetchImpl: fetchFalso('ok', 1, chamadas) });
  p.entrada({ chat: '5521997382027@s.whatsapp.net', remetente: '5521997382027', texto: 'Aurora, separa as pautas' });
  assert.equal(await p.observar({ chat: '5521997382027@s.whatsapp.net', rascunho: 'Vou colocar na planilha agora.' }), null);
  assert.equal(await p.observar({ chat: '120363000000000000@g.us', rascunho: 'Vou conferir.' }), null);
  assert.equal(chamadas.length, 0);
  assert.equal(linhas(d).length, 0);
});

test('desligado (sem jev.json) não chama nada; sem chave anota o erro e não quebra', async () => {
  const chamadas = [];
  const off = criarPorteiro({ dir: pasta({ ligado: false }), fetchImpl: fetchFalso('ok', 1, chamadas) });
  assert.equal(await off.observar({ chat: FAMILIA, rascunho: 'Oi' }), null);
  assert.equal(chamadas.length, 0);
  const d = pasta({ chave: false });
  const semChave = criarPorteiro({ dir: d, fetchImpl: fetchFalso('ok', 1, chamadas) });
  const r = await semChave.observar({ chat: FAMILIA, rascunho: 'Oi, tudo bem? Como posso ajudar a senhora hoje?' });
  assert.equal(r.erro, 'sem_chave');
  assert.equal(chamadas.length, 0);
});

test('Jev fora do ar ou lento não derruba a ponte', async () => {
  const d = pasta();
  const p = criarPorteiro({ dir: d, fetchImpl: async () => { throw new Error('rede'); } });
  const r = await p.observar({ chat: FAMILIA, rascunho: 'A equipe vai te passar os valores, tá bem?' });
  assert.equal(r.erro, 'falha');
  const p2 = criarPorteiro({ dir: d, fetchImpl: async () => ({ ok: false, status: 429 }) });
  assert.equal((await p2.observar({ chat: FAMILIA, rascunho: 'A equipe vai te passar os valores, tá bem?' })).erro, 'http_429');
});

test('resposta curta é barrada mesmo com o Jev dizendo ok; confiança baixa não barra', async () => {
  const p = criarPorteiro({ dir: pasta(), fetchImpl: fetchFalso('ok', 0.9) });
  assert.equal((await p.observar({ chat: FAMILIA, rascunho: '💜' })).barraria, true);
  const p2 = criarPorteiro({ dir: pasta(), fetchImpl: fetchFalso('ignora_ou_inventa', 0.4) });
  assert.equal((await p2.observar({ chat: FAMILIA, rascunho: 'Entendi. A equipe de atendimento vai falar com a senhora sobre isso.' })).barraria, false);
});

test('estado sem histórico ainda é válido', () => {
  assert.match(estado([], 'Oi!'), /Rascunho da Aurora para responder: "Oi!"/);
});
