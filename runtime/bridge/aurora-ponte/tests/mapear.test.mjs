import assert from 'node:assert/strict';
import test from 'node:test';
import { paraHermes, ehAvisoDoSistema, motivoSilencio, geraSugestao } from '../src/mapear.mjs';

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

test('avisos do Hermes nunca viram mensagem', () => {
  assert.ok(ehAvisoDoSistema('⚙️ tool_describe...'));
  assert.ok(ehAvisoDoSistema('📬 No home channel is set for Whatsapp.'));
  assert.ok(ehAvisoDoSistema('⚡ Interrupting current task.'));
  assert.ok(!ehAvisoDoSistema('Oi, Alf! Amanhã é sábado.'));
});

test('regra de silêncio', () => {
  const dm = { ...base, grupo: false, texto: 'oi', aurora_ativa: true, atendente_humano: false, humano_recente: false };
  assert.equal(motivoSilencio(dm), null);
  assert.match(motivoSilencio({ ...dm, aurora_ativa: false }), /pausada/);
  assert.match(motivoSilencio({ ...dm, atendente_humano: true }), /humano/);
  assert.match(motivoSilencio({ ...dm, humano_recente: true }), /2 horas/);
  // grupo que não chama a Aurora não gera registro de silêncio
  assert.equal(motivoSilencio({ ...dm, grupo: true, texto: 'bom dia', humano_recente: true }), null);
  assert.match(motivoSilencio({ ...dm, grupo: true, texto: 'Aurora, oi', humano_recente: true }), /2 horas/);
});

test('foto de host permitido vai como imagem; de outro host só o rótulo', () => {
  const ok = paraHermes({ ...base, tipo: 'imagem', texto: '', midia_url: 'https://lamusic.uazapi.com/files/abc.jpg', midia_tipo: 'image/jpeg' });
  assert.equal(ok.hasMedia, true);
  assert.equal(ok.mediaType, 'image');
  assert.deepEqual(ok.mediaUrls, ['https://lamusic.uazapi.com/files/abc.jpg']);
  const fora = paraHermes({ ...base, tipo: 'imagem', texto: '', midia_url: 'https://evil.example/x.jpg' });
  assert.equal(fora.hasMedia, false);
  assert.deepEqual(fora.mediaUrls, []);
  assert.equal(paraHermes({ ...base, tipo: 'imagem', midia_url: 'http://lamusic.uazapi.com/x.jpg' }).hasMedia, false);
});

test('PDF chega como texto extraído; sem texto, avisa o motivo', () => {
  const pdf = paraHermes({ ...base, tipo: 'documento', texto: '', midia_nome: 'laudo.pdf', doc_txt: '/cache/documents/aurora-u1.txt' });
  assert.equal(pdf.mediaType, 'document');
  assert.deepEqual(pdf.mediaUrls, ['/cache/documents/aurora-u1.txt']);
  assert.match(pdf.body, /^\[PDF recebido: laudo\.pdf\]/);
  const falhou = paraHermes({ ...base, tipo: 'documento', texto: '', doc_motivo: 'PDF sem texto (escaneado)' });
  assert.equal(falhou.hasMedia, false);
  assert.match(falhou.body, /não consegui abrir: PDF sem texto/);
});

test('Assistant: com humano atendendo gera sugestão; sem motivo, conversa normal', () => {
  const dm = { ...base, grupo: false, texto: 'oi', aurora_ativa: true, atendente_humano: true, humano_recente: false };
  assert.equal(geraSugestao(dm, motivoSilencio(dm)), true);
  assert.equal(geraSugestao({ ...dm, atendente_humano: false }, null), false);
});

test('respostas da equipe entram no começo da mensagem para a Aurora', () => {
  const h = paraHermes({ ...base, texto: 'e o horário?', respostas_equipe: ['Oi! Temos terça 16h.', ''] });
  assert.equal(h.body, '[A equipe já respondeu nesta conversa: "Oi! Temos terça 16h."]\noi Aurora'.replace('oi Aurora', 'e o horário?'));
  assert.equal(paraHermes({ ...base, respostas_equipe: null }).body, 'oi Aurora');
});
