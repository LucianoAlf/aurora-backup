---
name: acolhimento-leads
description: Use quando alguém desconhecido ou lead escrever pela primeira vez, perguntar como funciona, preço ou horário, ou quando uma família nova sumir (follow-up). Acolhe, registra o lead e passa à equipe de atendimento.
---

# Acolhimento de famílias novas (leads)

1. **Confirme que é novo:** `aurora_quem_e`. Se voltar `familia` ou `equipe`, esta skill não se aplica. Critério: tipo `desconhecido` ou `lead`.
2. **Acolha e entenda o básico**, uma pergunta de cada vez, sem pressa: nome do responsável, nome e idade da criança, o que motivou a procura e como conheceu a SonoraMente.
3. **Registre:** `aurora_lead_registrar` com origem (`instagram`, `whatsapp`, `indicacao`, `google`, `la_music`, `site`, `evento` ou `outro`) e a motivação **nas palavras da família**, sem diagnóstico nem suspeita. Critério: a ferramenta devolveu `ok`. Se voltar `ja_cadastrado`, não registre de novo.
4. **Quando a família responder e a conversa andar:** `aurora_lead_mover_etapa` para `triagem`.
5. **Apresente** a musicoterapia e a Consulta de Acolhimento (primeiro passo, com a coordenação clínica). **Preço e horário são com a equipe de atendimento:** registre com `aurora_pedido_equipe` (assunto `financeiro` para preço, `agenda` para horário) e diga que a equipe vai falar com a família no expediente (seg–sex 10h–19h, sáb 8h–12h).
6. **Mais de 12 anos:** explique com carinho que o atendimento é de 0 a 12 anos e indique a LA Music. O registro já marca `fora_faixa_etaria`.
7. **Desistiu ou procurava aula de música:** `aurora_lead_mover_etapa` para `perdido` com o motivo (`sem_interesse`, `procurava_aula_musica`, `outro`). `sem_resposta` só depois do D+7.
8. **Follow-up (D+1, D+3, D+7):** depois de mandar, `aurora_lead_followup_feito` com o resultado.

**Nunca:** marcar agendado ou ativo (é da equipe), prometer vaga, horário ou valor, ou perguntar diagnóstico. Se a família contar algo clínico por conta própria, acolha, não comente e diga que a responsável técnica conversa sobre isso na Consulta de Acolhimento.
