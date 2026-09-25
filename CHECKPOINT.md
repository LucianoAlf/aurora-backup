# CHECKPOINT: onde a Aurora está e para onde vai

**Atualizado:** 2026-09-25 21:15 UTC · Alf e Alfredo
Os números de CP seguem a seção 6 do `PLANO-FUNDACAO-E-ROLLOUT.md`.

## ✅ Feito

| Etapa | Entrega |
|---|---|
| CP0 | Baseline, fontes e acessos |
| CP1 a CP5 | `SOUL`, `USER`, `AGENTS`, `PERMISSOES` e `MEMORY` aprovados, no repo e na VPS com hash conferido |
| CP3.5 | Hermes instalado sem canal (`deepseek-v4.1-flash` via OpenCode Go) |
| CP6 (parte) | 57 skills padrão do Hermes desligadas; prompt de 47 KB para 42 KB |
| Memória | Backup do Honcho diário, criptografado, com cópia no Supabase LAHQ Memory e restauração testada a partir da cópia remota |
| Fase 1 · leitura ✅ | MCP `aurora-read` 0.4.0 com 11 ferramentas: quem é, conferir criança, hoje, sessões da criança, agenda do dia, situação do pacote, pacotes em atenção, simular recesso, financeiro da família, lead, follow-ups de hoje. Testadas por papel |
| Fase 2 · escrita 1 e 2 ✅ | MCP `aurora-write` 0.2.0, crachá `aurora_escrita` (ex-`aurora_aviso`, permissão função por função). **Escrita 1:** `aurora_avisar_atendimento` (aviso de falta/remarcação na lista da equipe; não mexe em sessão). **Escrita 2:** `aurora_lead_registrar`, `aurora_lead_mover_etapa` (só triagem ou perdido com motivo; nunca agendado/ativo) e `aurora_lead_followup_feito` (D+1/D+3/D+7 sem repetir). Testadas por papel (15/15) e ponta a ponta |
| Carimbo do remetente ✅ | Plugin `aurora-carimbo` no Hermes sobrescreve o remetente de toda ferramenta com carimbo HMAC; o banco confere e recusa número solto (Sonoramente `20260925233000`). MCP read 0.5.0 / write 0.3.0. 12/12 no banco e 3/3 ponta a ponta. Falta a prova no gateway real, junto com a ponte |
| CP7 (parte) · Fase 0 | Edge functions do app versionadas no repo `Sonoramente` e trancadas; cérebro antigo da Aurora (Gemini) aposentado; funções do banco sem trava fechadas; teste real pela Central aprovado |

## ▶️ Ferramentas (agora)

Cada ferramenta passa por: desenho → aprovação do Alf → RPC com teste por papel → entrada na allowlist do MCP → teste da Aurora.

1. **CP7 · Fechar a fachada do banco:** crachá `aurora_mcp` com login próprio e sem `service_role`, dois MCPs separados (leitura e escrita, padrão Julia) e trilha de auditoria.
2. **Fase 1 · MCP de leitura** (CP8, CP12 e partes de CP11 e CP13):
   1. quem é esta pessoa (família, equipe ou lead, crianças e terapeuta);
   2. agenda (próximas sessões e horários livres);
   3. situação financeira da família (em aberto e vencimentos);
   4. lead (situação, origem, follow-up);
   5. resumo do dia para a equipe.
3. **Fase 2 · Escrita controlada** (CP10 e CP11):
   - ~~registrar e atualizar lead, com canal de origem e desfecho~~ ✅ escrita 2 (2026-09-25);
   - pedido de agendamento para o Serjão;
   - marcar, remarcar e cancelar, quando aprovado.

   Cada escrita tem idempotência, recibo e "pode" onde o `PERMISSOES` exige.
4. **Fase 3 · Caixa novo:**
   - abertura e fechamento com "pode";
   - lançamento com ID da fatura ou da compra;
   - sangria;
   - edição e exclusão lógica com carimbo;
   - reabertura.
5. **CP6 · Fechamento:** `TOOLS.md`, skills da SonoraMente (atendimento às famílias, SDR, régua de cobrança, caixa, equipe e crise) e alertas.

## ⏭️ Depois das ferramentas

6. **CP8/CP9 · WhatsApp:**
   - bridge Hermes ↔ UAZAPI gravando em `wa_*`;
   - escuta silenciosa;
   - grupos, quoted e LID.
7. **Honcho ligado na Aurora:** workspace e token próprios, uma gaveta por pessoa.
8. **Migração dos avisos:** a cada aviso que a Aurora assume, o cron antigo correspondente é desligado.
9. **CP13 a CP15:** relatórios e dashboard, prontuário com trava clínica, convênios e configurações.
10. **Canais e integrações:**
    - Instagram (DM e comentários);
    - skills de social media, scraping e conteúdo;
    - ponte com a Mila (encaminhamento e retorno) e com a Maria (conciliação).
11. **CP16 · Rollout:** shadow, troca do webhook com o Alf, rollback de um passo e soak.

## Pendências do Alf

- Corrigir o nome antigo da instância UAZAPI que aparece na Central.
- Gerar a nova chave Asaas quando a cobrança começar.
