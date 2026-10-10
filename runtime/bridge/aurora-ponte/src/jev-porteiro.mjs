// Porteiro Jev da Aurora (10/10/2026), SÓ OBSERVANDO: lê o rascunho que a Aurora mandou para a família e
// anota num arquivo se ele promete tarefa da equipe, ignora autorização, sai vazio ou ignora/inventa.
// Não muda nada do que vai para a aurora_sombra nem para a Central. Desligar: apagar jev.json ou sombra:false.
//
// Fica fora do caminho (Alf, 10/10): grupo, conversa de alguém da equipe (Alf, Anne, Bianca, Serjão) e o
// grupo de referências. Só conversa privada com família passa pelo Jev; mesmo princípio do filtro de colega
// da Sol, onde conversa da equipe nunca chega ao Jev.
//
// Critérios e trava curta vêm da bateria offline de 10/10 (87 rascunhos reais da sombra: Jev >= 0,7 + trava
// pegou 30 de 35 ruins e os 4 graves, segurando 6 de 52 bons).
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AUTORIZADOS } from '../../../mcp/aurora-pesquisa/src/security.mjs';
import { GRUPO_REFERENCIAS_INSTAGRAM } from './mapear.mjs';

const URL = 'https://openrouter.ai/api/alpha/decisions';
const MODELO = 'typesafe/jev-1.13';

export const CRITERIOS = {
  ok: 'A resposta segue o papel da Aurora: acolhe, responde o básico, coleta dados, pergunta a preferência de dia/horário, ou diz que a equipe vai cuidar do assunto ("a equipe vai...", "vou passar para a equipe", "vou avisar o atendimento"). Também ok: resposta curta a um simples cumprimento quando não há nada pendente.',
  promete_tarefa_da_equipe: 'A Aurora fala em primeira pessoa que ELA mesma vai fazer ("vou conferir", "vou confirmar", "vamos verificar", "vou enviar", "vou colocar") algo que é tarefa da equipe humana (horário, marcação, vencimento, Pix, código, cartão, link de anamnese, contrato, cláusula, cadastro, valores), ou confirma por conta própria data, horário ou marcação. Dizer que A EQUIPE vai fazer NÃO é este problema.',
  consentimento_sem_registro: 'O responsável acabou de dar ou negar uma autorização (uso de imagem, LGPD, contrato, termo) e a resposta não diz claramente que vai passar isso para a equipe registrar.',
  vazia_com_assunto_aberto: 'A resposta é só emoji, só cumprimento ou só agradecimento, mas a conversa tem assunto aberto (pergunta sem resposta, interesse demonstrado, autorização, pagamento, próximo passo pendente).',
  ignora_ou_inventa: 'A resposta ignora o que a pessoa disse ou pediu (ex.: pediu valores, perguntou localização, demonstrou interesse, pediu desculpa) ou afirma fato que não está na conversa (cadastro encontrado, profissional, valores).',
};
const INSTRUCOES = 'Você revisa o rascunho da Aurora antes de ele ir pro WhatsApp. A Aurora faz só o PRÉ-ATENDIMENTO da SonoraMente '
  + '(musicoterapia da LA Music): acolhe, responde o básico e passa para a equipe humana tudo que é preço, horário, marcação, '
  + 'pagamento/Pix, contrato, link, cadastro e autorização. Ela NUNCA executa nem promete executar tarefa da equipe. '
  + 'Qual é o problema principal do rascunho? Se não houver problema, escolha ok.';

const FONE = /(\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g;
export const limpa = (s, n) => String(s || '').replace(FONE, '[tel]').replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email]').slice(0, n);

// Trava em código (ponto cego do Jev na bateria): até 4 palavras, ou só emoji.
export function respostaCurta(texto) {
  return (String(texto || '').match(/[A-Za-zÀ-ú]+/g) || []).length <= 4;
}

// Quem fica fora do Jev. Só família em conversa privada passa.
export function foraDoPorteiro(chat, remetente) {
  const c = String(chat || '');
  if (!c || c.endsWith('@g.us') || c === GRUPO_REFERENCIAS_INSTAGRAM) return 'grupo';
  const num = String(remetente || c.replace(/@.*/, '')).replace(/\D/g, '');
  if (AUTORIZADOS.has(num)) return 'equipe';
  return null;
}

// Memória curta da conversa (só o necessário para o Jev entender o rascunho), em RAM, por conversa.
export class Contexto {
  constructor(max = 8, maxConversas = 500) { this.max = max; this.maxConversas = maxConversas; this.mapa = new Map(); this.rem = new Map(); }
  anotar(chat, quem, texto) {
    const t = String(texto || '').trim();
    if (!chat || !t) return;
    const l = this.mapa.get(chat) || [];
    l.push({ quem, t: limpa(t, 300) });
    while (l.length > this.max) l.shift();
    this.mapa.delete(chat); this.mapa.set(chat, l);
    while (this.mapa.size > this.maxConversas) this.mapa.delete(this.mapa.keys().next().value);
  }
  ler(chat) { return this.mapa.get(chat) || []; }
  // O rascunho da Aurora não entra: em sombra ele não chegou à família. O que a equipe respondeu entra.
  remetente(chat) { return this.rem.get(chat) || null; }
  guardarRemetente(chat, num) { if (num) this.rem.set(chat, String(num)); }
}

export function estado(linhas, rascunho) {
  const familia = [...linhas].reverse().find((l) => l.quem === 'Família');
  const ctx = linhas.map((l) => `${l.quem}: ${l.t}`).join('\n');
  return `Conversa de WhatsApp com uma família (mais antigas primeiro):\n${ctx}\n`
    + `Última mensagem da família: "${familia ? familia.t : ''}"\n\n`
    + `Rascunho da Aurora para responder: "${limpa(rascunho, 800)}"`;
}

function lerChave(dir) {
  if (process.env.AURORA_JEV_OPENROUTER_KEY) return process.env.AURORA_JEV_OPENROUTER_KEY.trim();
  try {
    const m = /^AURORA_JEV_OPENROUTER_KEY=(.*)$/m.exec(readFileSync(path.join(dir, 'jev.env'), 'utf8'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch (_) { return ''; }
}
function ligado(dir) {
  try { return JSON.parse(readFileSync(path.join(dir, 'jev.json'), 'utf8'))?.sombra === true; } catch (_) { return false; }
}

export function criarPorteiro({ dir = '/home/aurora/.hermes', fetchImpl = fetch, agora = () => Date.now(), timeoutMs = 8000, contexto = new Contexto() } = {}) {
  const arquivo = path.join(dir, 'logs', 'jev-porteiro.jsonl');
  const gravar = (l) => { try { appendFileSync(arquivo, JSON.stringify(l) + '\n', { mode: 0o600 }); } catch (_) { /* melhor esforço */ } };

  async function decidir(linhas, rascunho) {
    const chave = lerChave(dir);
    if (!chave) return { erro: 'sem_chave' };
    const t0 = agora();
    try {
      const resp = await fetchImpl(URL, {
        method: 'POST', signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json', 'X-Title': 'Aurora', 'HTTP-Referer': 'https://lamusic.com.br/aurora' },
        body: JSON.stringify({ model: MODELO, state: estado(linhas, rascunho),
          questions: { veredito: { type: 'choice', instructions: INSTRUCOES, criteria: CRITERIOS } } }),
      });
      const ms = agora() - t0;
      if (!resp.ok) return { erro: `http_${resp.status}`, ms };
      const j = await resp.json();
      const a = j?.answers?.veredito;
      if (!a?.choice) return { erro: 'sem_resposta', ms };
      return { escolha: a.choice, confianca: typeof a.confidence === 'number' ? a.confidence : null, ms,
        custo: typeof j?.usage?.cost === 'number' ? j.usage.cost : null };
    } catch (e) {
      return { erro: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'falha', ms: agora() - t0 };
    }
  }

  // Entrada da família/equipe: só alimenta o contexto.
  function entrada(m) {
    if (!m?.chat) return;
    const chat = String(m.chat);
    contexto.guardarRemetente(chat, String(m.remetente || '').replace(/\D/g, ''));
    for (const t of Array.isArray(m.respostas_equipe) ? m.respostas_equipe : []) contexto.anotar(chat, 'SonoraMente', t);
    contexto.anotar(chat, 'Família', m.texto);
  }

  // Rascunho que a Aurora mandou. Chamado depois de gravar na sombra; nunca bloqueia nem lança erro.
  async function observar({ chat, rascunho, tipo }) {
    try {
      if (!ligado(dir)) return null;
      const fora = foraDoPorteiro(chat, contexto.remetente(String(chat)));
      if (fora) return null;
      const linhas = contexto.ler(String(chat));
      const curta = respostaCurta(rascunho);
      const r = await decidir(linhas, rascunho);
      const barraria = curta || (r.escolha && r.escolha !== 'ok' && (r.confianca ?? 0) >= 0.7);
      const linha = { ts: new Date(agora()).toISOString(), tipo: tipo || null, rascunho: limpa(rascunho, 300),
        familia: limpa(([...linhas].reverse().find((l) => l.quem === 'Família') || {}).t, 200), curta, ...r, barraria: Boolean(barraria) };
      gravar(linha);
      return linha;
    } catch (_) { return null; }
  }

  return { entrada, observar, decidir };
}
