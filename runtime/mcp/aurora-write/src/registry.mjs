import * as z from 'zod/v4';

// Allowlist de escrita da Aurora. Cada ferramenta entra aqui só depois de aprovada pelo Alf.
const identificador = z.string().trim().min(8).max(80).regex(/^[0-9+()\s-]+(@(lid|s\.whatsapp\.net|c\.us))?$/);

const WRITE_SAFE = Object.freeze({ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });

export const TOOL_DEFINITIONS = Object.freeze({
  aurora_avisar_atendimento: Object.freeze({
    title: 'Avisar o atendimento (falta ou remarcação)',
    description:
      'Registra na lista de avisos da equipe que a família avisou falta ou pediu remarcação. NÃO marca falta, NÃO cancela e NÃO remarca: ' +
      'isso é com o Serjão. remetente = número ou LID de quem mandou a mensagem. data_sessao = data da sessão de que a família fala ' +
      '(use aurora_hoje para saber o que é "hoje" e "amanhã"); sem data, vale a próxima sessão. saude = true quando o motivo for doença: ' +
      'aí peça o atestado e não prometa reposição. Depois de registrar, diga à família: "Vou avisar o atendimento" (falta) ou ' +
      '"Vou encaminhar pra equipe falar com a senhora/o senhor" (remarcação). Se voltar erro, não diga que avisou.',
    inputSchema: z
      .object({
        remetente: identificador,
        tipo: z.enum(['falta_avisada', 'remarcacao']),
        crianca: z.string().trim().min(2).max(80),
        data_sessao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        resumo: z.string().trim().min(3).max(300),
        motivo: z.string().trim().max(200).optional(),
        saude: z.boolean().default(false),
      })
      .strict(),
    annotations: WRITE_SAFE,
    sql: 'SELECT public.aurora_registrar_aviso_v2($1::text, $2::text, $3::text, $4::date, $5::text, $6::text, $7::boolean) AS result',
    values: (a) => [a.remetente, a.tipo, a.crianca, a.data_sessao ?? null, a.resumo, a.motivo ?? null, a.saude],
  }),
  aurora_lead_registrar: Object.freeze({
    title: 'Registrar família nova (lead)',
    description:
      'Registra ou completa o lead de uma família que chegou pela primeira vez. numero = número ou LID da família (não da equipe). ' +
      'origem = por onde chegou (pergunte "como conheceu a SonoraMente?"). motivacao = o que a família contou que busca, com as palavras ' +
      'dela; NUNCA escreva diagnóstico nem suspeita. Criança com mais de 12 anos entra como perdido (fora da faixa etária): diga com ' +
      'carinho que o atendimento é até 12 anos. Se o número já for família ou equipe, volta erro ja_cadastrado: não registre de novo. ' +
      'Nunca marca agendado: a Consulta de Acolhimento quem marca é o Serjão.',
    inputSchema: z
      .object({
        numero: identificador,
        origem: z.enum(['indicacao', 'instagram', 'google', 'la_music', 'whatsapp', 'site', 'evento', 'outro']),
        responsavel_nome: z.string().trim().min(2).max(120),
        crianca_nome: z.string().trim().min(2).max(120).optional(),
        crianca_idade: z.number().int().min(0).max(25).optional(),
        motivacao: z.string().trim().max(500).optional(),
      })
      .strict(),
    annotations: WRITE_SAFE,
    sql: 'SELECT public.aurora_lead_registrar($1::text, $2::text, $3::text, $4::text, $5::int, $6::text) AS result',
    values: (a) => [a.numero, a.origem, a.responsavel_nome, a.crianca_nome ?? null, a.crianca_idade ?? null, a.motivacao ?? null],
  }),

  aurora_lead_mover_etapa: Object.freeze({
    title: 'Mover etapa do lead (triagem ou perdido)',
    description:
      'Move o lead de novo para triagem (a família respondeu e está conversando) ou para perdido, com motivo obrigatório: ' +
      'sem_resposta (só depois do D+7), sem_interesse, fora_faixa_etaria (mais de 12 anos), procurava_aula_musica (indique a LA Music) ' +
      'ou outro. NUNCA agendado nem ativo: isso é com a equipe. Lead que já está agendado ou ativo não muda.',
    inputSchema: z
      .object({
        numero: identificador,
        etapa: z.enum(['triagem', 'perdido']),
        motivo_perda: z.enum(['sem_resposta', 'sem_interesse', 'fora_faixa_etaria', 'procurava_aula_musica', 'outro']).optional(),
      })
      .strict()
      .refine((a) => a.etapa !== 'perdido' || a.motivo_perda, { message: 'perdido exige motivo_perda' }),
    annotations: WRITE_SAFE,
    sql: 'SELECT public.aurora_lead_mover_etapa($1::text, $2::text, $3::text) AS result',
    values: (a) => [a.numero, a.etapa, a.motivo_perda ?? null],
  }),

  aurora_lead_followup_feito: Object.freeze({
    title: 'Registrar follow-up feito',
    description:
      'Registra que o follow-up da vez (D+1, D+3 ou D+7, veja aurora_leads_followup) foi feito, para não repetir. ' +
      'resultado: enviado (mandou e ainda não teve resposta), respondeu ou sem_resposta. Depois do D+7 sem resposta, mova para perdido ' +
      'com motivo sem_resposta.',
    inputSchema: z
      .object({
        numero: identificador,
        etapa: z.enum(['D+1', 'D+3', 'D+7']),
        resultado: z.enum(['enviado', 'respondeu', 'sem_resposta']),
      })
      .strict(),
    annotations: WRITE_SAFE,
    sql: 'SELECT public.aurora_lead_followup_registrar($1::text, $2::text, $3::text) AS result',
    values: (a) => [a.numero, a.etapa, a.resultado],
  }),
});
