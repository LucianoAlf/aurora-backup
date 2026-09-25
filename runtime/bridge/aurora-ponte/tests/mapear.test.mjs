import assert from 'node:assert/strict';
import test from 'node:test';
import { paraHermes } from '../src/mapear.mjs';

const base = { mensagem_id: 'u1', wa_message_id: 'W1', chat: '120363000000000000@g.us', grupo: true,
  remetente: '5521999998888', remetente_nome: 'Teste', tipo: 'texto', texto: 'oi Aurora', em: '2026-09-25T21:00:00Z' };

test('grupo: remetente vira JID do participante e o chat é o grupo', () => {
  const h = paraHermes(base);
  assert.equal(h.senderId, '5521999998888@s.whatsapp.net');
  assert.equal(h.chatId, '120363000000000000@g.us');
  assert.equal(h.isGroup, true);
  assert.equal(h.messageId, 'W1');
});

test('sem remetente fica vazio (o carimbo bloqueia as ferramentas)', () => {
  assert.equal(paraHermes({ ...base, remetente: null }).senderId, '');
});

test('áudio usa a transcrição; mídia sem texto ganha rótulo', () => {
  assert.equal(paraHermes({ ...base, tipo: 'audio', texto: 'ele não vai hoje' }).body, 'ele não vai hoje');
  assert.equal(paraHermes({ ...base, tipo: 'imagem', texto: '' }).body, '[imagem recebida]');
  assert.equal(paraHermes({ ...base, tipo: 'imagem', texto: 'comprovante' }).body, '[imagem recebida] comprovante');
});
