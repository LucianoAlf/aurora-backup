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
