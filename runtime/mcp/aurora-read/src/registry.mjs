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
});
