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
});
