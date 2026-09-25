// Tradução entre a mensagem gravada pela Central (aurora_ponte_puxar) e o contrato da ponte WhatsApp do Hermes.
const ROTULO = { imagem: '[imagem recebida]', audio: '[áudio recebido, sem transcrição]', video: '[vídeo recebido]',
  sticker: '[figurinha]', documento: '[documento recebido]' };

export function paraHermes(m) {
  const remetente = String(m.remetente || '').replace(/\D/g, '');
  let body = String(m.texto || '').trim();
  if (!body) body = ROTULO[m.tipo] || '[mensagem sem texto]';
  else if (m.tipo !== 'texto' && m.tipo !== 'audio' && ROTULO[m.tipo]) body = `${ROTULO[m.tipo]} ${body}`;
  return {
    messageId: String(m.wa_message_id || m.mensagem_id),
    chatId: String(m.chat),
    chatName: null,
    isGroup: Boolean(m.grupo),
    senderId: remetente ? `${remetente}@s.whatsapp.net` : '',
    senderName: m.remetente_nome || null,
    body,
    hasMedia: false,
    mediaType: '',
    mediaUrls: [],
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
export function motivoSilencio(m) {
  if (m.grupo && !CHAMA_AURORA.test(String(m.texto || ''))) return null;
  if (m.aurora_ativa === false) return 'conversa pausada na Central';
  if (m.atendente_humano) return 'conversa atribuída a atendente humano';
  if (m.humano_recente) return 'equipe respondeu nas últimas 2 horas';
  return null;
}
