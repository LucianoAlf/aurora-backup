// Tradução entre a mensagem gravada pela Central (aurora_ponte_puxar) e o contrato da ponte WhatsApp do Hermes.
import { midiaPermitida } from './midia.mjs';

const ROTULO = { imagem: '[imagem recebida]', audio: '[áudio recebido, sem transcrição]', video: '[vídeo recebido]',
  sticker: '[figurinha]', documento: '[documento recebido]' };

export function paraHermes(m) {
  const remetente = String(m.remetente || '').replace(/\D/g, '');
  let body = String(m.texto || '').trim();
  if (!body) body = ROTULO[m.tipo] || '[mensagem sem texto]';
  else if (m.tipo !== 'texto' && m.tipo !== 'audio' && ROTULO[m.tipo]) body = `${ROTULO[m.tipo]} ${body}`;
  // Foto de host permitido vai como imagem (o Hermes baixa e mostra ao modelo). PDF chega já convertido em
  // texto pela ponte (m.doc_txt, caminho na pasta de cache do Hermes).
  let midia = { hasMedia: false, mediaType: '', mediaUrls: [] };
  if (m.tipo === 'imagem' && midiaPermitida(m.midia_url)) {
    midia = { hasMedia: true, mediaType: 'image', mediaUrls: [String(m.midia_url)], mime: m.midia_tipo || 'image/jpeg' };
  } else if (m.tipo === 'documento' && m.doc_txt) {
    midia = { hasMedia: true, mediaType: 'document', mediaUrls: [String(m.doc_txt)], mime: 'text/plain' };
    body = `[PDF recebido: ${m.midia_nome || 'documento'}] ${String(m.texto || '').trim()}`.trim();
  } else if (m.tipo === 'documento' && m.doc_motivo) {
    body = `${body} (não consegui abrir: ${m.doc_motivo})`;
  }
  // O que a equipe respondeu desde a última mensagem do cliente: sem isso, a Aurora acha que a sugestão
  // dela foi enviada e perde o fio da conversa real.
  const equipe = Array.isArray(m.respostas_equipe) ? m.respostas_equipe.filter((t) => String(t || '').trim()) : [];
  if (equipe.length) {
    body = `[A equipe já respondeu nesta conversa: ${equipe.map((t) => `"${String(t).trim()}"`).join(' / ')}]\n${body}`;
  }
  return {
    messageId: String(m.wa_message_id || m.mensagem_id),
    chatId: String(m.chat),
    chatName: null,
    isGroup: Boolean(m.grupo),
    senderId: remetente ? `${remetente}@s.whatsapp.net` : '',
    senderName: m.remetente_nome || null,
    body,
    ...midia,
    timestamp: Math.floor(new Date(m.em).getTime() / 1000),
  };
}

// Avisos do próprio Hermes (progresso de ferramenta, dicas, canal padrão) nunca são mensagem para a família.
const CHROME = /^\s*(⚙️|📬|⚡|💡|⏳|🔄|🛠️|✅ Steered|⚠️ Hermes)/u;
export function ehAvisoDoSistema(texto) {
  return CHROME.test(String(texto || ''));
}

// Regra de silêncio (Alf, 2026-09-25): calada quando a conversa está pausada na Central, atribuída a
// humano, ou quando a equipe respondeu nas últimas 2 horas. Só conta mensagem que seria para ela
// (privado, ou grupo chamando "Aurora").
const CHAMA_AURORA = /\baurora\b/i;
// Aurora Assistant (Alf, 2026-09-26): nesses casos ela não fala com a família, mas deixa sugestão na Central.
export function geraSugestao(m, motivo) {
  return Boolean(motivo);
}

export function motivoSilencio(m) {
  if (m.grupo && !CHAMA_AURORA.test(String(m.texto || ''))) return null;
  if (m.aurora_ativa === false) return 'conversa pausada na Central';
  if (m.atendente_humano) return 'conversa atribuída a atendente humano';
  if (m.humano_recente) return 'equipe respondeu nas últimas 2 horas';
  return null;
}
