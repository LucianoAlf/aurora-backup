# CHECKPOINT — onde a Aurora está e para onde vai

**Atualizado:** 2026-09-25 03:00 UTC · Alf e Alfredo

## Feito

| CP | Entrega | Onde está |
|---|---|---|
| CP1 | `SOUL.md` | repo + `/home/aurora/.hermes/SOUL.md` |
| CP2 | `USER.md` | repo + `/home/aurora/.hermes/memories/USER.md` |
| CP3 | `AGENTS.md` | repo + `/home/aurora/AGENTS.md` |
| CP3.5 | Hermes instalado sem canal (`deepseek-v4.1-flash` via OpenCode Go) | `hermes-gateway-aurora`, ativo e sem portas |
| CP4 | `PERMISSOES.md` + checagem de hash no CI | repo + `/home/aurora/PERMISSOES.md` |
| CP5 | `MEMORY.md` (regras de memória; família que saiu é apagada 12 meses depois do último contato) | repo + `/home/aurora/.hermes/memories/MEMORY.md` |
| CP6 (início) | 57 skills padrão do Hermes desligadas; prompt caiu de 47 para 42 KB | `runtime/hermes/config.yaml` + VPS |

Memória (Honcho):
- Backup diário criptografado na la-hq, com restauração testada (13 tabelas e 319 linhas conferidas, busca vetorial ok).
- A cópia fora do servidor vai para o Supabase **LAHQ Memory** e ainda depende de gravar a chave na la-hq.
- O Honcho **ainda não está ligado na Aurora**. Só liga depois que a cópia externa for provada.

## Auditoria do ERP SonoraMente (2026-09-25)

- O `MAPA-QUARTOS.md` acerta as páginas e os caminhos do código, mas está incompleto:
  - a maior parte das funções do banco e das edge functions não tem código versionado no repo do app;
  - já existem funções `wa_aurora_*` e um MCP inicial que o mapa não cita.
- O ERP ainda tem pouco dado: os pacientes cadastrados são os da Bianca, e não há cobrança nem lead.
- Não existe caixa, sangria, lojinha nem baixa manual de cobrança. Isso vai ser construído do zero, no modelo da Sol.
- Agendar e remarcar gravam direto na tabela `sessoes`. A Aurora vai precisar de funções novas, com trava contra duplicidade.
- Crons antigos já mandam avisos para famílias. Quando a Aurora assumir um aviso, o cron correspondente é desligado.
- Há achados de segurança no ERP, com correção planejada para a Fase 0. Os detalhes ficam fora deste repo público.

## Próximos passos

1. **Fase 0 — fundação do banco:**
   - trazer para o repo do app o código das funções do banco e das edge functions;
   - aplicar as correções de segurança, com SQL e rollback aprovados pelo Alf.
2. **Fase 1 — MCP de leitura**, no padrão da Julia (crachá `aurora_mcp`, só RPC): agenda, paciente e responsável pelo WhatsApp, lead e situação financeira.
3. **Fase 2 — escrita:** lead e agenda por RPC nova, com desligamento do cron equivalente.
4. **Fase 3 — caixa novo**, com ID da fatura, "pode", carimbo e exclusão lógica.
5. Depois: skills de social media, scraping e conteúdo; `TOOLS.md`; canal WhatsApp.

## Pendências do Alf

- Gravar a chave do LAHQ Memory na la-hq (1 minuto no computador).
- Gerar a nova chave Asaas quando a cobrança começar (a antiga já foi cancelada).
