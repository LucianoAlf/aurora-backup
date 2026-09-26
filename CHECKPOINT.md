# CHECKPOINT: onde a Aurora está e para onde vai

**Atualizado:** 2026-09-26 12:45 UTC · Alf e Alfredo
Os números de CP seguem a seção 6 do `PLANO-FUNDACAO-E-ROLLOUT.md`.

## ✅ Feito

| Etapa | Entrega |
|---|---|
| CP0 | Baseline, fontes e acessos |
| CP1 a CP5 | `SOUL`, `USER`, `AGENTS`, `PERMISSOES` e `MEMORY` aprovados, no repo e na VPS com hash conferido |
| CP3.5 | Hermes instalado sem canal (`deepseek-v4.1-flash` via OpenCode Go) |
| CP6 (parte) | 57 skills padrão do Hermes desligadas; prompt de 47 KB para 42 KB |
| CP6 · skills da SonoraMente (1ª leva) ✅ 2026-09-25 | `runtime/skills/sonora-mente`: `atendimento-familias`, `acolhimento-leads`, `consultas-da-equipe` (1,5–2 KB cada; ~90 B no índice). Cada passo aponta a ferramenta certa e o critério de pronto. AGENTS §7 ganhou: só diz que fez o que a ferramenta confirmou; remetente não confirmado não é cadastro errado; erro de ferramenta não vira chute. Faltam: régua de cobrança, caixa, crise/equipe (quando as ferramentas existirem) |
| Memória | Backup do Honcho diário, criptografado, com cópia no Supabase LAHQ Memory e restauração testada a partir da cópia remota |
| Fase 1 · leitura ✅ | MCP `aurora-read` 0.4.0 com 11 ferramentas: quem é, conferir criança, hoje, sessões da criança, agenda do dia, situação do pacote, pacotes em atenção, simular recesso, financeiro da família, lead, follow-ups de hoje. Testadas por papel |
| Fase 2 · escrita 1 e 2 ✅ | MCP `aurora-write` 0.2.0, crachá `aurora_escrita` (ex-`aurora_aviso`, permissão função por função). **Escrita 1:** `aurora_avisar_atendimento` (aviso de falta/remarcação na lista da equipe; não mexe em sessão). **Escrita 2:** `aurora_lead_registrar`, `aurora_lead_mover_etapa` (só triagem ou perdido com motivo; nunca agendado/ativo) e `aurora_lead_followup_feito` (D+1/D+3/D+7 sem repetir). Testadas por papel (15/15) e ponta a ponta |
| Carimbo do remetente ✅ | Plugin `aurora-carimbo` no Hermes sobrescreve o remetente de toda ferramenta com carimbo HMAC; o banco confere e recusa número solto (Sonoramente `20260925233000`). MCP read 0.5.0 / write 0.3.0. 12/12 no banco e 3/3 ponta a ponta. Falta a prova no gateway real, junto com a ponte |
| Ponte WhatsApp · MODO SOMBRA 🟡 (desde 2026-09-25 21:42 UTC) | `aurora-ponte` roda dentro do Hermes da Aurora e lê a entrada da Central pelo crachá `aurora_ponte` (Sonoramente `20260926000000`). **Nada é enviado:** respostas e ações de escrita vão para `aurora_sombra`. Privado: responde tudo; grupo: só quando chamam "Aurora". **Critério de promoção (Alf):** 30 respostas revisadas com zero erro grave (vazar dado, prometer o que não pode, errar criança/pessoa, dizer que fez sem fazer). **Prazo de decisão: 2026-10-02.** Revisão diária às 09:00 SP (automação do Alfredo) com placar X/30. Liberação: Alf → equipe → famílias. Proibido prorrogar em silêncio |
| Sombra · prova real ✅ (2026-09-25 19:08 SP) | Mensagem real do Alf no privado caiu na sombra com resposta coerente (usou quem_e, hoje, sessões e agenda); nada foi enviado. Achados corrigidos na hora: avisos do Hermes (progresso de ferramenta, dica de "interromper", "defina o canal padrão") iam junto; desligados no config e filtrados na ponte 0.1.1 |
| Memória Honcho · preparada 🟡 (2026-09-25) | Workspace `aurora` criado na Honcho da la-hq com token restrito a ele (sem acesso ao da Julia). Isolamento 4/4: Aurora→aurora 200; Aurora→julia 401; Julia→aurora 401; sem token 401. `/home/aurora/.hermes/honcho.json` (600) pronto com gaveta por número (`runtime_`), equipe por apelido e `enabled: false`. **Não liga na sombra:** a Honcho gravaria como "dito" respostas que a família nunca recebeu. Liga no dia da virada para ao vivo |
| Canal ao vivo · montado e DESLIGADO ✅ (2026-09-26) | Chave no banco: `aurora_canal_config` (modo `sombra`/`ao_vivo` + lista `liberados` de conversas; `*` = todas). Ponte 0.3.0 manda toda resposta por `aurora_ponte_enviar`: conversa não liberada → sombra; liberada → `send-whatsapp` por chamada interna (só texto, conversa existente, `enviado_por=aurora`), registrado em `aurora_saida`. Plugin 0.3.0 só executa escrita em conversa liberada. Testes: sem login 401; interna fora do formato 403; interna com número direto 403; envio com chave desligada caiu na sombra. **Ligar = 1 UPDATE**, só com o ok do Alf, começando pelo número dele |
| Incidente 26/09 ✅ | Banco do Sonoramente ERP travou 04:53–08:50 SP (lado Supabase, sem causa nossa). Ponte 0.2.1 ganhou prazos de conexão e `banco_ok` no health. Placar diário virou script (`tools/placares_agentes.py`, 09:00 SP) porque automação com agente não tem terminal |
| **Pré-requisitos para sair da sombra** (além de 30 revisadas / 0 grave) | 1) ✅ **Regra de silêncio** (ponte 0.2.0, Sonoramente `20260926003000`): calada quando a conversa está pausada na Central (`aurora_ativa`), atribuída a humano, ou quando a equipe respondeu nas últimas 2 h; o silêncio fica registrado na sombra (tipo `silencio`). 2) Revisar divergência de cadastro: contato marcado na Central como responsável/paciente sem responsável no ERP com o mesmo número. 3) Grupo: prova chamando "Aurora". 4) Na virada para ao vivo, ligar o **interruptor geral** da Central (`wa_aurora_config.ativa`): hoje desligado desde a aposentadoria do cérebro antigo, e sem ele a equipe não consegue pausar a Aurora por conversa na tela. Conferir antes que nada do cérebro antigo reage a ele 5) Ligar a Honcho (`memory.provider: honcho` + `enabled: true`) na virada, com os apelidos da equipe, e provar gravação e lembrança com a primeira conversa real do Alf. 6) ✅ Ajustes de fala (AGENTS §7, 2026-09-25) |
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
