// Ajustes aprovados pelo Alf em 07/10/2026: rótulo de sugestão, botão evo_* e rajada.
import assert from 'node:assert/strict';
import test from 'node:test';
import { limparResposta, ehBotaoEvolucao, paraHermes } from '../src/mapear.mjs';
import { Rajadas, entraNaRajada, juntar } from '../src/rajada.mjs';

const dm = { mensagem_id: 'u1', wa_message_id: 'W1', chat: '5521900000000@s.whatsapp.net', grupo: false,
  remetente: '5521900000000', tipo: 'texto', texto: 'ok', em: '2026-10-07T15:00:00Z' };

test('rótulo "Sugestão para…" e aspas em volta saem da resposta privada', () => {
  assert.equal(limparResposta('Sugestão para a equipe: “Bom dia! A sessão está confirmada para amanhã.”'),
    'Bom dia! A sessão está confirmada para amanhã.');
  assert.equal(limparResposta('Sugestão para a família: "Oi, tudo bem?"'), 'Oi, tudo bem?');
  assert.equal(limparResposta('**Sugestão de resposta para a família:** Claro, já passei para a equipe.'),
    'Claro, já passei para a equipe.');
  assert.equal(limparResposta('Sugestao pra equipe:\n“Pode deixar.”'), 'Pode deixar.');
  assert.equal(limparResposta('Sugestão para a equipe (tom acolhedor): Entendi, obrigada!'), 'Entendi, obrigada!');
});

test('texto normal fica intacto (aspas no meio, sugestão no meio, grupo)', () => {
  const normal = 'A Consulta de Acolhimento é o primeiro passo. Quer que eu explique como funciona?';
  assert.equal(limparResposta(normal), normal);
  assert.equal(limparResposta('Ele disse "oi" e depois "tchau".'), 'Ele disse "oi" e depois "tchau".');
  assert.equal(limparResposta('Minha sugestão para a família é vir conhecer o espaço.'),
    'Minha sugestão para a família é vir conhecer o espaço.');
  const grupo = 'Sugestão para a família: “Oi!”';
  assert.equal(limparResposta(grupo, true), grupo);
  assert.equal(limparResposta('Sugestão para a equipe:'), 'Sugestão para a equipe:');
  assert.equal(limparResposta(''), '');
});

test('botão do lembrete de evolução é reconhecido; texto comum não', () => {
  assert.ok(ehBotaoEvolucao({ texto: 'evo_presente_3f1c2a9e-0b7d-4c2e-9a51-1d2e3f4a5b6c' }));
  assert.ok(ehBotaoEvolucao({ texto: 'evo_faltou_3f1c2a9e-0b7d-4c2e-9a51-1d2e3f4a5b6c' }));
  assert.ok(!ehBotaoEvolucao({ texto: '✅ Presente' }));
  assert.ok(!ehBotaoEvolucao({ texto: 'a evolução de hoje evo_presente_x foi boa' }));
  assert.ok(!ehBotaoEvolucao({ texto: 'oi' }));
  assert.ok(!ehBotaoEvolucao({}));
});

test('rajada: só privado em modo sugestão, texto ou áudio transcrito', () => {
  const motivo = 'equipe respondeu nas últimas 2 horas';
  assert.ok(entraNaRajada(dm, motivo));
  assert.ok(!entraNaRajada(dm, null));
  assert.ok(!entraNaRajada({ ...dm, grupo: true }, motivo));
  assert.ok(!entraNaRajada({ ...dm, tipo: 'imagem' }, motivo));
  assert.ok(!entraNaRajada({ ...dm, tipo: 'audio', texto: '🎤 Audio' }, motivo));
  assert.ok(entraNaRajada({ ...dm, tipo: 'audio', texto: 'tô pegando ele' }, motivo));
  assert.ok(!entraNaRajada({ ...dm, anexo: '/x' }, motivo));
});

test('rajada: três mensagens curtas viram uma, na ordem, sem perder texto', () => {
  const r = new Rajadas({ janela: 8000, teto: 25000 });
  r.guardar({ ...dm, wa_message_id: 'A', texto: 'ok', respostas_equipe: ['Oi, já vou ver'] }, 0);
  r.guardar({ ...dm, wa_message_id: 'B', texto: 'um instante' }, 2000);
  r.guardar({ ...dm, wa_message_id: 'C', texto: 'tô pegando ele' }, 4000);
  assert.equal(r.vencidas(10000).length, 0);
  assert.equal(r.tamanho, 3);
  const [j] = r.vencidas(12000);
  assert.equal(j.texto, 'ok\num instante\ntô pegando ele');
  assert.equal(j.wa_message_id, 'C');
  assert.equal(j.rajada, 3);
  assert.equal(r.tamanho, 0);
  const h = paraHermes(j);
  assert.equal(h.messageId, 'C');
  assert.match(h.body, /A equipe já respondeu nesta conversa: "Oi, já vou ver"/);
  assert.match(h.body, /ok\num instante\ntô pegando ele$/);
});

test('rajada: teto segura no máximo 25 s mesmo com mensagens seguidas', () => {
  const r = new Rajadas({ janela: 8000, teto: 25000 });
  for (let t = 0; t <= 24000; t += 4000) r.guardar({ ...dm, texto: `m${t}` }, t);
  assert.equal(r.vencidas(24500).length, 0);
  assert.equal(r.vencidas(25000).length, 1);
});

test('rajada: conversas diferentes não se misturam; fechar devolve na hora', () => {
  const r = new Rajadas();
  r.guardar({ ...dm, texto: 'a' }, 0);
  r.guardar({ ...dm, chat: '5521911111111@s.whatsapp.net', texto: 'b' }, 0);
  const j = r.fechar(dm.chat);
  assert.equal(j.texto, 'a');
  assert.equal(r.fechar(dm.chat), null);
  assert.equal(r.vencidas(60000)[0].texto, 'b');
});

test('juntar de uma só devolve a própria mensagem', () => {
  const m = { ...dm };
  assert.equal(juntar([m]), m);
});
