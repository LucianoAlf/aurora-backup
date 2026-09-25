import * as z from 'zod/v4';

// Allowlist da Aurora. Cada ferramenta entra aqui só depois de aprovada pelo Alf e testada no banco.
const identificador = z.string().trim().min(8).max(80).regex(/^[0-9+()\s-]+(@(lid|s\.whatsapp\.net|c\.us))?$/);

const READ_ONLY = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });

export const TOOL_DEFINITIONS = Object.freeze({
  aurora_quem_e: Object.freeze({
    title: 'Quem é esta pessoa',
    description:
      'Identifica quem está falando pelo número de WhatsApp ou pelo código LID: equipe, familia, lead ou desconhecido. ' +
      'Use antes de responder qualquer mensagem. Devolve só o mínimo (nome, papel, crianças, terapeuta, próxima sessão); ' +
      'nunca devolve dado clínico, documento ou valor. Se vier "desconhecido", não fale de criança nem da equipe.',
    inputSchema: z.object({ identificador }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_quem_e($1::text) AS result',
    values: ({ identificador: v }) => [v],
  }),
  aurora_conferir_crianca: Object.freeze({
    title: 'Conferir família pelo nome da criança',
    description:
      'Para contato novo que diz ser da família. Responde só confere, pista ou nao_encontrado, sem devolver dado. ' +
      '"pista" não libera nada: agenda, sessão e cobrança só com "confere" (nome da criança, nome do responsável e data de nascimento) ' +
      'ou com confirmação do Serjão ou da Bianca.',
    inputSchema: z
      .object({
        identificador,
        nome_crianca: z.string().trim().min(3).max(80),
        nome_responsavel: z.string().trim().min(2).max(80).optional(),
        data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_conferir_crianca($1::text, $2::text, $3::text, $4::date) AS result',
    values: (a) => [a.identificador, a.nome_crianca, a.nome_responsavel ?? null, a.data_nascimento ?? null],
  }),
  aurora_sessoes_paciente: Object.freeze({
    title: 'Próximas sessões da criança',
    description:
      'Próximas sessões (até 5) de uma criança: data, dia, hora, terapeuta, status e "sessão X de Y". ' +
      'Responde para o responsável (só as crianças dele), o terapeuta (só os pacientes dele) e o time (Alf, Anne, Bianca, Serjão). ' +
      'solicitante = número ou LID de quem perguntou. Remarcação não é com a Aurora: avise o atendimento (Serjão).',
    inputSchema: z.object({ solicitante: identificador, crianca: z.string().trim().min(2).max(80).optional() }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_sessoes_paciente($1::text, $2::text) AS result',
    values: (a) => [a.solicitante, a.crianca ?? null],
  }),
  aurora_agenda_do_dia: Object.freeze({
    title: 'Agenda do dia',
    description:
      'Sessões de um dia (padrão: hoje) com hora, criança, terapeuta, sala e status, sem dado clínico. ' +
      'Só para a equipe: o time vê tudo, o terapeuta vê a própria agenda. Família recebe sem_permissao.',
    inputSchema: z.object({ solicitante: identificador, data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_agenda_do_dia($1::text, $2::date) AS result',
    values: (a) => [a.solicitante, a.data ?? null],
  }),
  aurora_pacote_status: Object.freeze({
    title: 'Situação do pacote (calendário inteligente)',
    description:
      'Para o time e o terapeuta: sessões do pacote, realizadas, faltas, última sessão prevista, parcelas, mês-alvo e cor ' +
      '(verde = termina no mês da última parcela; amarelo = acaba antes; vermelho = passa do mês). ' +
      'Para a família devolve só "sessão X de Y". Nunca fale de cor, parcelas ou mês-alvo com a família.',
    inputSchema: z.object({ solicitante: identificador, crianca: z.string().trim().min(2).max(80).optional() }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_pacote_status($1::text, $2::text) AS result',
    values: (a) => [a.solicitante, a.crianca ?? null],
  }),
  aurora_pacotes_atencao: Object.freeze({
    title: 'Pacotes em atenção',
    description:
      'Lista de pacientes amarelos e vermelhos no calendário do pacote, para alertar o Serjão e entrar nos relatórios. ' +
      'Só para o time (o terapeuta vê os próprios).',
    inputSchema: z.object({ solicitante: identificador }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_pacotes_atencao($1::text) AS result',
    values: (a) => [a.solicitante],
  }),
  aurora_simular_recesso: Object.freeze({
    title: 'Simular recesso',
    description:
      'Só para a direção (Alf e Anne): simula um recesso ou feriado prolongado e mostra quais pacotes mudariam de cor. Não grava nada.',
    inputSchema: z
      .object({
        solicitante: identificador,
        inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_simular_recesso($1::text, $2::date, $3::date) AS result',
    values: (a) => [a.solicitante, a.inicio, a.fim],
  }),
  aurora_hoje: Object.freeze({
    title: 'Data, hora e expediente de hoje',
    description:
      'Data e hora de São Paulo, dia da semana, feriado ou recesso de hoje e de amanhã, e se a SonoraMente está em expediente ' +
      '(seg–sex 10h–19h, sáb 8h–12h). Use sempre que alguém disser hoje, amanhã, depois ou quando precisar saber se é horário de atendimento.',
    inputSchema: z.object({}).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_hoje() AS result',
    values: () => [],
  }),
  aurora_financeiro_familia: Object.freeze({
    title: 'Financeiro da família',
    description:
      'Parcelas em aberto de uma criança: descrição, valor, vencimento, se está a vencer ou atrasada (e há quantos dias), ' +
      'total em aberto, próxima a vencer e link de pagamento quando houver. Para o próprio responsável (só as crianças dele) ' +
      'e para o grupo financeiro (Alf, Anne, Bianca, Serjão, Rose, Ana). Nunca negocie, dê desconto ou mude valor: isso é com o Serjão.',
    inputSchema: z.object({ solicitante: identificador, crianca: z.string().trim().min(2).max(80).optional() }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_financeiro_familia($1::text, $2::text) AS result',
    values: (a) => [a.solicitante, a.crianca ?? null],
  }),
  aurora_lead: Object.freeze({
    title: 'Situação de um lead',
    description:
      'Busca lead pelo número ou pelo nome do responsável ou da criança: etapa, canal de origem, dias desde o contato, ' +
      'Consulta de Acolhimento marcada e follow-up da vez (D+1, D+3, D+7). Só para o time. Não traz suspeita de diagnóstico nem queixa.',
    inputSchema: z.object({ solicitante: identificador, busca: z.string().trim().min(3).max(80) }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_lead($1::text, $2::text) AS result',
    values: (a) => [a.solicitante, a.busca],
  }),
  aurora_leads_followup: Object.freeze({
    title: 'Follow-ups de lead de hoje',
    description: 'Leads abertos com D+1, D+3 ou D+7 vencendo hoje, para a rotina diária de follow-up. Só para o time.',
    inputSchema: z.object({ solicitante: identificador }).strict(),
    annotations: READ_ONLY,
    sql: 'SELECT public.aurora_leads_followup($1::text) AS result',
    values: (a) => [a.solicitante],
  }),
});
