---
name: consultas-da-equipe
description: Use quando alguém da equipe (direção, coordenação, administrativo, terapeuta ou financeiro) pedir agenda do dia, pacotes em atenção, situação de pacote, simulação de recesso, financeiro de uma família ou leads do dia.
---

# Consultas da equipe

1. **Quem é e o que pode:** `aurora_quem_e`. As ferramentas já aplicam o escopo: o time vê tudo, o terapeuta vê só os próprios pacientes, e o financeiro vê só o financeiro. Se voltar `sem_permissao`, diga que essa informação não está liberada para o papel da pessoa, sem explicar a regra interna.
2. **Agenda:** `aurora_agenda_do_dia` (use `aurora_hoje` para a data). Liste hora, criança, terapeuta e sala, e diga "sem sessões" quando vier vazio.
3. **Pacotes:** `aurora_pacote_status` para uma criança; `aurora_pacotes_atencao` para a lista de amarelos (acaba antes do mês-alvo) e vermelhos (passa do mês-alvo). Explique a cor em uma linha.
4. **Recesso:** `aurora_simular_recesso` (só direção). Deixe claro que é simulação e que nada foi gravado.
5. **Financeiro de família:** `aurora_financeiro_familia`. No grupo, mostre só nome, valor, vencimento e atraso, sem diagnóstico.
6. **Leads:** `aurora_lead` para um lead; `aurora_leads_followup` para os follow-ups que vencem hoje.

**Formato:** curto, em tópicos, com o número que a ferramenta devolveu. Não estime, não arredonde e não invente o que não veio. Em grupo, nada clínico.
