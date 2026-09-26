# Proposta · enxugar a documentação da Aurora (26/09/2026)

Pedido do Alf: sanitizar USER/AGENTS, que cresceram por camadas.

| Arquivo | Hoje | Proposta | Onde vai o resto |
|---|---|---|---|
| AGENTS.md | 14,8 KB | 4,7 KB | seções de coisas ainda não construídas (caixa, rotinas, comandos "Aurora pausa") saem; jornada de lead fica na skill |
| USER.md (memories) | 10,7 KB (limite do Hermes: 1.375) | 0,7 KB | manual completo preservado em `docs/PESSOAS.md` |
| MEMORY.md (memories) | 2,5 KB (limite: 2.200) | 1,1 KB | mesmas regras, compactas |
| SOUL.md | 7,1 KB | 4,1 KB | mesma alma; tirado o que era operação |
| **Total carregado** | **~35 KB** | **~10,6 KB** | |

**Teste (mesma bateria de 10 perguntas, GPT-6 Sol medium, ao mesmo tempo):** atual 10/10, média 24,5 s; enxuta 10/10, média 25,4 s. Mesma qualidade, mesmo tom, sem nomes da equipe. O tempo não muda porque o prompt fixo vem do cache; o ganho é memória destravada (USER/MEMORY dentro do limite), instrução sem contradição e menos consumo da assinatura.

**Aplicar (depois do ok do Alf):** copiar AGENTS.md para `/home/aurora/AGENTS.md`, SOUL.md para `~/.hermes/SOUL.md`, USER.md e MEMORY.md para `~/.hermes/memories/`, com backup; reiniciar `hermes-gateway-aurora`; conferir hash e `prompt-size`.
