# Handoff — Alfredo assume a Aurora (Hermes)

**Data:** 2026-09-23
**Para:** Alfredo
**De:** Luciano Alf
**Frente Alfredo:** agente Aurora (Hermes, soul, skills, MCP, VPS, repo de backup)
**Frente Luciano:** central de WhatsApp no SonoraMente (inbox, UAZAPI, testes de atendimento)

Não tem senha, token, service role nem instance token. Pedir credenciais ao Luciano.

Mapa dos quartos e dos utensílios para as tools MCP: [MAPA-QUARTOS.md](MAPA-QUARTOS.md).

Ordem de construção da fundação, das capacidades e do rollout:
[PLANO-FUNDACAO-E-ROLLOUT.md](PLANO-FUNDACAO-E-ROLLOUT.md).

---

## 1. Como as casas se dividem

A Aurora mora em três lugares. Não misturar com o Fábio (LA Music) nem com a Julia (bistrô).

| Casa | O que é | Onde |
|---|---|---|
| Sistema | SonoraMente é a casa operacional da Aurora. Banco, agenda, pacientes, central de WhatsApp. | Repo [LucianoAlf/Sonoramente](https://github.com/LucianoAlf/Sonoramente). Prod: https://sonoramente-la.vercel.app |
| Banco | Um projeto só: **Sonoramente ERP** `krcuhpwvwilojcpofemw` | Supabase. Não é LA Report, LA Journey, Super Folha, nem o projeto da Julia. |
| Agente | Repo da Aurora, no mesmo padrão dos outros agentes: repo e VPS sempre juntos. | [LucianoAlf/aurora-backup](https://github.com/LucianoAlf/aurora-backup), privado. Este handoff é o primeiro arquivo. Alma, skills e bridge ainda não foram copiadas. |
| VPS | `la-hq` `89.116.73.186`, usuário Linux **`aurora`** | Home separada da do Fábio. Linger ligado. Hermes **ainda não instalado**. |

O código de soul, skills, bridge e MCP que existe hoje está no Sonoramente, em `hermes/skills/sonora-mente/`, `hermes/mcp/aurora_rpc_mcp/` e `services/aurora-chat-bridge/`. Isso é semente. O repo vivo do agente passa a ser o `aurora-backup`. O Sonoramente continua dono da central, do schema e das tabelas `wa_*`.

---

## 2. O que você pega

1. Encher o `aurora-backup` (soul, skills, MCP, bridge, systemd, docs de operação) e manter esse repo igual à VPS.
2. Instalar o Hermes **só** no usuário `aurora`. Gateway em `127.0.0.1:8656`. Bridge em `0.0.0.0:8655`.
3. MCP com allowlist. Leitura e escrita no SonoraMente, acesso controlado. Você desenha a allowlist. Sem `postgres-mcp` unrestricted e sem `service_role` dentro do Hermes.
4. Modo escuta primeiro. A Aurora não fala com paciente. Quem atende no WhatsApp, no início, é o Sergião, pela central.
5. Quando o Luciano chamar ela nos grupos, ela responde com o contexto do que já rolou ali.

A central de WhatsApp (UI, inbox, envio humano, teste com o Sergião) fica com o Luciano. O corte de conversa da edge `aurora-responder` para o Hermes é seu, em conjunto com ele, para a central não ficar cega.

---

## 3. VPS hoje (23/09/2026, fim da tarde)

Usuário `aurora` criado hoje. Não existia antes.

| Item | Estado |
|---|---|
| uid | `aurora` (uid 1009), shell bash, linger **yes** |
| Pastas | `/home/aurora/.hermes/skills/sonora-mente`, `/home/aurora/.hermes/logs`, `/home/aurora/aurora-chat-bridge`, `/home/aurora/.config/systemd/user` — criadas, vazias |
| Porta 8656 | livre (Hermes API, só loopback) |
| Porta 8655 | livre (bridge UAZAPI) |
| Porta 8654 | livre (webhook nativo Hermes, não usar no caminho UAZAPI) |
| Fábio | **não mexer**: gateway `0.0.0.0:8644`, bridge `0.0.0.0:8645`, API `127.0.0.1:8652`, user `fabio`, home `/home/fabio` |

SSH de auditoria antiga (`fabio` + `fabio-inspect`) só enxerga o Fábio. O user `aurora` foi criado por root. Acesso de deploy para o Alfredo: pedir ao Luciano.

Referência de portas no Sonoramente: `docs/ops/aurora-ports.env.example`.

---

## 4. WhatsApp — número, webhook, teste

Instância UAZAPI **Aurora - SonoraMente** em `https://lamusic.uazapi.com`.

| Campo | Valor |
|---|---|
| Número | `552134008890` (21 3400-8890) |
| Perfil | Sonoramente |
| Status | connected |
| Webhook | ligado, um só, `POST` em `https://krcuhpwvwilojcpofemw.supabase.co/functions/v1/webhook-whatsapp` |
| Eventos | `messages` |
| Filtro | `excludeMessages: ["wasSentByApi"]` |
| Grupos | entram. Não está excluindo `isGroupYes`. |

O segredo `UAZAPI_TOKEN` do projeto clínica aponta para essa instância. Antes apontava para o número antigo `5521998250178`. A tela de status também tinha esse número cravado no código; passou a ler o telefone ao vivo da instância.

**Teste de entrada, 23/09/2026 20:13 UTC.** Luciano mandou `Oi, Aurora` do celular final 8047. Caiu em `wa_mensagens` como `entrada`, contato Luciano Alf, chat privado. Não houve `saida`. A Aurora ficou muda. É o comportamento certo até o Hermes assumir.

**Não apontar** o webhook da clínica para `http://89.116.73.186:8655/...` enquanto a bridge não existir e não gravar em `wa_mensagens`. Se apontar antes, a central para de receber.

---

## 5. Modo escuta — contrato

`wa_aurora_config.ativa = false`. Enquanto isso for falso, a edge não responde (privado nem grupo).

Os dois grupos em que a instância está:

| Grupo | JID | Papel |
|---|---|---|
| SonoraMente | `120363406890743565@g.us` | gestão. Já estava na config. |
| Referências Instagram SonoraMente | `120363431536497281@g.us` | escuta / referência. Registrado hoje. |

Comportamento que o Hermes tem que cumprir:

- Ouvir **tudo** nos dois grupos e no privado, e gravar na central (`wa_mensagens` / conversa).
- Ficar em silêncio no atendimento de paciente. O Sergião conduz. A Aurora só observa.
- Nos dois grupos, silêncio enquanto a equipe fala e enquanto o Luciano cola post de Instagram.
- Se o Luciano chamar ela (nome Aurora, ou o gatilho que você fechar), ela responde **sabendo o que já foi postado naquele grupo**. Contexto não pode ser só a última frase.
- Referências de Instagram postadas no grupo de referências precisam ficar gravadas (lugar a definir com o Luciano). Num segundo momento, tool para ela ir nesses perfis, ver o que está rolando e devolver material para o contexto do SonoraMente. Isso não está feito. Não improvisar scrape fora de allowlist.

Gatilhos que a edge antiga usava: `aurora`, `aurorra`, `aurra`, `aurrora`. Pode rever.

Limite conhecido da edge atual: mensagem de grupo cujo remetente vem só como LID, e o LID não está em `wa_lid_map`, é descartada antes de gravar. O Hermes precisa tratar isso, senão o grupo de Instagram fica furado.

---

## 6. Quem é a equipe

| Pessoa | Papel | Em `wa_aurora_equipe` |
|---|---|---|
| Luciano Alf | direção | sim, perfil `admin` |
| Anne | sócia, psicóloga | sim, perfil `gestao` |
| Bianca | musicoterapeuta responsável | **não** |
| Sergião | atendimento / administrativo | **não** |

Bianca e Sergião entram quando o Luciano passar o WhatsApp de cada um. Sem isso a Aurora não separa terapeuta de atendimento.

Soul atual (no Sonoramente): `hermes/skills/sonora-mente/SOUL.md`. Travas já escritas: não diagnostica, não passa conduta clínica, escala humano em crise, remédio, diagnóstico, conflito jurídico ou financeiro.

Skills no mesmo diretório: `chat-aurora-sonoramente`, `consulta-agenda`, `confirmar-sessao`, `lembrete-sessao`, `triagem-lead`, `cobranca-amigavel`, `escalar-humano`.

MCP hoje: uma tool, `contexto_contato` → RPC `aurora_contexto_contato`. Sem SQL livre. Agenda ainda não é tool própria. O alvo é trânsito real no sistema (ler e escrever), com allowlist sua. O Luciano foi explícito: acesso controlado, e quem desenha isso é você.

---

## 7. O que deixa de ser o cérebro

Estas edge functions **existem e estão ativas**, e a conversa ainda passa por elas se alguém ligar `wa_aurora_config.ativa`:

- `webhook-whatsapp` — ingressão. Grava a mensagem e, se `ativa`, chama a Aurora. Versão no ar já respeita `ativa = false` também no atalho de grupo (antes o grupo respondia "Fala, fulano" mesmo com a Aurora desligada).
- `aurora-responder` — Gemini (`gemini-3-flash-preview`, fallback `gemini-2.5-flash`). É o cérebro antigo. **Não é o caminho.** Quem conversa passa a ser o Hermes.
- `send-whatsapp` — envio da central e dos crons. Continua. A central humana precisa dele.
- `uazapi-status` — status / QR. Continua.

Crons no `cron.job` que batem em functions e podem falar pelo mesmo número (lembrete de sessão, cobrança, aniversário, confirmação, `aurora-notificacoes`, resumos): seguem agendados. Não desligar no escuro. Quando o Hermes assumir aviso ativo, combinar com o Luciano qual cron migra e qual fica.

Ingressão desejada, quando a bridge estiver de pé:

`UAZAPI → bridge :8655 → grava wa_* (a central continua vendo) → Hermes API :8656 → resposta só se a regra de escuta permitir → UAZAPI send`

Até lá o webhook permanece na edge `webhook-whatsapp`.

---

## 8. Primeiro dia sugerido

1. Clonar este repo e o Sonoramente. Ler este arquivo, no Sonoramente o `docs/ops/aurora-rollback.md` (inventário de julho; o número e o webhook de lá estão superados por este handoff) e `docs/superpowers/specs/2026-07-14-aurora-hermes-architecture-design.md`.
2. Pedir ao Luciano: acesso de escrita no projeto `krcuhpwvwilojcpofemw`, SSH de deploy no user `aurora` em `la-hq`, e convite de escrita no `aurora-backup`.
3. Copiar soul, skills, bridge e MCP do Sonoramente para o `aurora-backup` e subir o primeiro commit. Não deixar skill só na VPS.
4. Instalar Hermes no user `aurora`. Não copiar `.env` do Fábio. Não usar porta 8644, 8645 ou 8652.
5. Subir gateway e bridge em escuta, ainda **sem** trocar o webhook, e provar que um payload de teste grava em `wa_mensagens` e não envia texto.
6. Só então, com o Luciano, trocar o webhook da instância para a bridge, com rollback de um passo: voltar a URL para `https://krcuhpwvwilojcpofemw.supabase.co/functions/v1/webhook-whatsapp`.
7. Allowlist MCP: começar pelo que a soul já pede (agenda, contato, escalar humano) e abrir escrita clínica com critério. Paciente, evolução e anamnese não entram soltos no prompt.

---

## 9. Fora deste handoff

- Central de WhatsApp no app (inbox, Sergião atendendo, teste fim a fim na UI): Luciano.
- Julia / bistrô: encerrada do seu lado; não misturar projeto Supabase.
- Fábio / LA Music: não auditar e não reiniciar.
- Scrape de Instagram: requisito registrado na §5, implementação depois da escuta estável.
