# Porteiro Jev da Aurora

**Ligado em sombra em 10/10/2026** (ponte 0.8.0, release `fb8e93e`, PR #5). Guia comum dos agentes: `sol-openclaw-backup/docs/sol-v2/jev-mordomo/2026-10-10-licoes-jev-para-agentes.md`.

## Papel que o Jev confere (decisão do Alf, 10/10)

A Aurora faz **pré-atendimento**: acolhe, responde o básico e passa para o Serjão/equipe tudo que é preço, horário, marcação, Pix, contrato, link, cadastro e autorização.

- Não passar preço é o **certo**.
- O erro é ela **prometer fazer** tarefa da equipe ("vou conferir o Pix", "vou confirmar o horário").

## Bateria offline (10/10)

- **Amostra:** 87 rascunhos reais da sombra, comparados com a resposta real da equipe. Telefone mascarado.
- **Gabarito corrigido pela regra do Alf:** o juiz gpt-5.5 tinha aprovado 13 "vou conferir/confirmar". Com a correção, ficam 35 ruins e 52 bons.

| Versão | Pegou ruins | Graves | Bons segurados |
|---|---|---|---|
| v1: critério sem fronteira | 16/22 (gabarito antigo) | 4/4 | 33/65 |
| v2: "a equipe vai…" é ok; problema é a 1ª pessoa (Jev ≥ 0,7) | 25/35 | 3/4 | 3/52 |
| **v2 + trava curta (até 4 palavras)** | **30/35** | **4/4** | 6/52 |

- **Reescrita com o motivo e novo julgamento:** 27 de 36 aprovados de primeira.
- **Fraqueza:** o Jev desconfia de "vou passar para a equipe…" mesmo quando está certo.
- **Custo:** US$ 0,0035 nas 87 decisões.

## Como roda

- **Só observa.** Não muda o que vai para `aurora_sombra`, Central ou família. Detalhes técnicos em `runtime/RUNTIME.md`.
- **Fora do Jev:** grupos, grupo de referências e conversa da equipe (`AUTORIZADOS`).
- **Placar diário** na vigia das 19h do Alfredo: "Jev na Aurora".

## Próximo passo

1. Uma semana de sombra.
2. Comparar o que o Jev barraria com o que o Serjão respondeu de verdade.
3. Se fechar, propor ao Alf o fluxo: barrar → reescrever 1x → texto padrão de encaminhamento ou segurar para o humano.
