// Rajada (Alf, 07/10/2026): com a equipe atendendo, mensagens curtas seguidas da mesma conversa
// ("ok", "um instante", "tô pegando ele") viram UMA sugestão. A ponte segura o texto por alguns
// segundos e entrega tudo junto, numa mensagem só, ao Hermes. Nenhum texto é descartado.
import { temTranscricao } from './mapear.mjs';

export const JANELA_MS = 8000;   // silêncio da conversa que fecha a rajada
export const TETO_MS = 25000;    // espera máxima desde a primeira mensagem

// Só privado, em modo sugestão, e só texto (ou áudio já transcrito). Mídia, PDF e anexo seguem sozinhos.
export function entraNaRajada(m, motivo) {
  if (!motivo || m.grupo || m.anexo || m.doc_txt) return false;
  if (m.tipo === 'texto') return Boolean(String(m.texto || '').trim());
  return m.tipo === 'audio' && temTranscricao(m);
}

// Junta as mensagens na última (id, hora e remetente da mais recente); textos em ordem, uma por linha.
export function juntar(lista) {
  if (lista.length === 1) return lista[0];
  const ultima = lista[lista.length - 1];
  const equipe = [];
  for (const m of lista) for (const t of (Array.isArray(m.respostas_equipe) ? m.respostas_equipe : [])) {
    if (String(t || '').trim() && !equipe.includes(t)) equipe.push(t);
  }
  return { ...ultima, tipo: 'texto', texto: lista.map((m) => String(m.texto || '').trim()).join('\n'),
    respostas_equipe: equipe, rajada: lista.length };
}

export class Rajadas {
  constructor({ janela = JANELA_MS, teto = TETO_MS } = {}) { this.janela = janela; this.teto = teto; this.abertas = new Map(); }

  guardar(m, agora = Date.now()) {
    const chat = String(m.chat);
    const r = this.abertas.get(chat) || { itens: [], inicio: agora };
    r.itens.push(m); r.ultima = agora;
    this.abertas.set(chat, r);
  }

  // Fecha a rajada de um chat na hora (chegou mídia ou mensagem fora do modo sugestão): preserva a ordem.
  fechar(chat) {
    const r = this.abertas.get(String(chat));
    if (!r) return null;
    this.abertas.delete(String(chat));
    return juntar(r.itens);
  }

  // Devolve as rajadas vencidas (silêncio >= janela ou espera >= teto), já juntadas.
  vencidas(agora = Date.now()) {
    const prontas = [];
    for (const [chat, r] of this.abertas) {
      if (agora - r.ultima >= this.janela || agora - r.inicio >= this.teto) prontas.push(this.fechar(chat));
    }
    return prontas;
  }

  get tamanho() { let n = 0; for (const r of this.abertas.values()) n += r.itens.length; return n; }
}
