# Guia de Campo: Criar um Agente no Hermes

> Aprendizado real da construção dos agentes LAHQ: Fábio, Sol, Lia, Mila, Júlia e Aurora (26/09/2026: atualizado com a Aurora; o passo a passo está no Playbook v1).
> Runtime: Hermes Agent. Cérebro/modelo e canais podem variar por agente.

## 0. Modelo mental do Hermes

Hermes é runtime de agente rodando como gateway/serviço. Ele conversa por canais como Telegram e WhatsApp, pode usar cron, MCPs e tools nativas.

Separe sempre:

- Identidade: `SOUL.md`.
- Operação: `AGENTS.md` no CWD lógico.
- Skills: procedimentos sob demanda.
- Memory: conhecimento episódico.
- MCPs/tools: acesso externo.
- Canais: Telegram/WhatsApp/etc. Cada agente tem o seu; não usar canal de outro agente como atalho.

Casa do Hermes: `~/.hermes/` do usuário do agente.
Config principal: `~/.hermes/config.yaml`.
Credenciais: `~/.hermes/.env` ou paths equivalentes fora do git.

Serviço comum:

```bash
python -m hermes_cli.main gateway run
systemctl restart hermes-gateway-<agente>.service
systemctl status hermes-gateway-<agente>.service --no-pager
```

Restart pode registrar `exit 1` do processo antigo antes de subir o novo. Confirme estabilidade com status/logs/NRestarts, não só com uma linha isolada.

---

## 1. Arquivos de identidade e carregamento

| Arquivo | Onde carrega | Função |
|---|---|---|
| `SOUL.md` | `~/.hermes/SOUL.md` | Identidade, voz, valores, linhas vermelhas existenciais |
| `AGENTS.md` | CWD lógico (`TERMINAL_CWD`) | Operação, ferramentas, canais, fronteiras, permissões e evidência mínima |
| `MEMORY.md` / `USER.md` | memória/runtime do agente | Conhecimento episódico e preferências |

Regras:

- Hermes carrega só um project-context por sessão: `.hermes.md` > `AGENTS.md` > `CLAUDE.md` > `.cursorrules`.
- Não existe slot nativo garantido para `PERMISSOES.md`. Se existir como fonte humana, compile o essencial no `AGENTS.md`.
- Mantenha `AGENTS.md` enxuto; contexto grande pode truncar.
- **Limites de memória do Hermes:** `memories/USER.md` até 1.375 caracteres e `memories/MEMORY.md` até 2.200. Acima disso o agente não consegue anotar (o log avisa "exceeds its char limit"). Manual de pessoas grande vai para `docs/PESSOAS.md`; o essencial vai para o AGENTS.
- Meta: ~10 KB carregados por mensagem no total (Aurora: 35 KB → 10,6 KB, mesma nota).
- Não jogue operação no `SOUL.md` para mascarar `AGENTS.md` que não carregou. Corrija o CWD lógico.

---

## 2. CWD lógico: a pegadinha principal

Sintoma: `AGENTS.md` existe, mas `hermes prompt-size` mostra `context: 0 B`, ou a sessão real age sem regras operacionais.

Causa: Hermes procura `AGENTS.md` no CWD lógico (`TERMINAL_CWD`), não necessariamente em `~/.hermes/` nem no CWD físico do processo.

Validação:

```bash
grep -n -A8 '^terminal:' ~/.hermes/config.yaml
tr '\0' '\n' < /proc/$(pgrep -f 'hermes_cli.main gateway')/environ | grep TERMINAL_CWD
TERMINAL_CWD=/home/<agente> hermes prompt-size --platform telegram
```

Correção recomendada:

```bash
cp AGENTS.md /home/<agente>/AGENTS.md
chown <agente>:<agente> /home/<agente>/AGENTS.md
```

Critério de conclusão: `prompt-size` mostra `context > 0` e a sessão real nova contém strings-chave do `AGENTS.md`.

Aprendizado Fábio: o gateway rodava fisicamente em `/home/fabio/.hermes`, mas o Telegram real buscava o contexto em `/home/fabio`. A correção foi aplicar `/home/fabio/AGENTS.md`, preservar SOUL e reabrir a sessão.

---

## 3. Canais: Telegram e WhatsApp

### Telegram

- Bom canal inicial para teste controlado.
- Sempre validar com sessão nova após alterar `SOUL.md`/`AGENTS.md`, porque prompt pode ficar cacheado por sessão.

### WhatsApp

Regra atual LAHQ (revista com a Aurora, 26/09/2026):

- **Número dedicado ao agente:** preferir o WhatsApp nativo do Hermes.
- **Número que já é do sistema da empresa** (a Central recebe o webhook da UAZAPI, a equipe atende pela tela): **não trocar a porta de entrada.** Usar ponte própria no Hermes (`platforms.whatsapp.extra.bridge_script`) que lê as mensagens do banco por um crachá de ponte e envia pela função do sistema. Precisa de:
  - `package.json` na pasta;
  - `creds.json` marcador;
  - `WHATSAPP_ALLOW_ALL_USERS=true`, com o controle de acesso no banco.
- Detalhes da ponte (sombra, silêncio, modo sugestão, mídia, prazos): Playbook v1, etapas 9–11.
- Nunca usar a instância/canal de outro agente para “só testar”. Isso invalida o teste.

Aprendizado Fábio:

- Fábio é Hermes e teve integração WhatsApp/bridge em fase anterior. O erro foi tentar validar experiência do Fábio usando caminho de Maria/Hugo/UAZAPI errado.
- Regra prática: antes de enviar/testar WhatsApp, identificar o dono do canal, o serviço e a porta/endpoint do agente.
- Se o canal correto não estiver visível, declarar bloqueio em vez de improvisar.

Checklist WhatsApp por agente:

- [ ] Qual agente é dono do número/canal?
- [ ] Hermes tem canal nativo configurado para esse agente?
- [ ] Sessão/número está conectado?
- [ ] Eventos de entrada ignoram mensagens do próprio bot?
- [ ] Grupos/DMs autorizados estão allowlisted?
- [ ] Logs mostram mensagem entrando e resposta saindo pelo mesmo agente?

---

## 4. Skills Hermes

Instalação local:

```bash
mkdir -p ~/.hermes/skills/<categoria>/<nome>
cp SKILL.md ~/.hermes/skills/<categoria>/<nome>/SKILL.md
hermes skills list
```

Frontmatter mínimo:

```yaml
---
name: nome-da-skill
description: Use quando ... gatilhos reais do usuário ...
---
```

Regras:

- Validar YAML antes de instalar.
- Skill `enabled` não significa skill sempre disparada.
- Procedimento detalhado pode ir em skill; regra inegociável deve ir no `AGENTS.md`.

---

## 5. Banco, escrita segura e integrações

Nunca dar escrita aberta ao agente.

Padrão LAHQ:

1. Role/crachá dedicado por agente.
2. Leitura ampla só se necessário.
3. Escrita somente via RPC `SECURITY DEFINER` com validação, idempotência e auditoria.
4. `REVOKE` de `PUBLIC`; `GRANT EXECUTE` só ao crachá.
5. Nenhum `UPDATE/INSERT/DELETE` direto.
6. Teste obrigatório: `SELECT` ok, `UPDATE` direto bloqueado, RPC ok.

Se houver sync externo, usar coluna/campo isolado do agente para não ser sobrescrito.

---

## 6. Latência, persona e bridges

Aprendizados Fábio:

- Não criar fast-path conversacional/admin hardcoded para responder “mais rápido”. Isso algema o agente.
- Não emagrecer prompt a ponto de matar a persona. Melhor um pouco mais lento e vivo do que seco e burro.
- Otimizar por contexto pré-buscado, RPCs boas, cache seguro, índices, logs e runtime.
- Bridges devem ser transporte/roteamento técnico, não cérebro paralelo com frases prontas.
- Exceção: intenções estritamente operacionais e seguras, já validadas, podem ter caminho determinístico técnico.

---

## 7. Operação na VPS

Boas práticas:

- Criar usuário por agente: `/home/<agente>`.
- Manter runtime em `/home/<agente>/.hermes`.
- Manter `AGENTS.md` no CWD lógico, normalmente `/home/<agente>/AGENTS.md`.
- Usar systemd para produção quando possível.
- Usar caminhos absolutos no serviço.
- Fazer backup antes de alterar config/contexto/sessões.
- Não expor tokens em chat, print, logs ou repo.

Comandos úteis:

```bash
systemctl status hermes-gateway-<agente>.service --no-pager
journalctl -u hermes-gateway-<agente>.service -n 100 --no-pager
sudo -u <agente> HOME=/home/<agente> bash -lc 'TERMINAL_CWD=/home/<agente> hermes prompt-size --platform telegram'
```

---

## 8. Validação ponta a ponta

Checklist mínimo:

- [ ] `SOUL.md` em `~/.hermes/SOUL.md`.
- [ ] `AGENTS.md` no CWD lógico.
- [ ] `prompt-size` mostra `context > 0`.
- [ ] Serviço estável após restart.
- [ ] Sessão real nova aberta no canal.
- [ ] Logs confirmam entrada e saída.
- [ ] Skills aparecem em `hermes skills list`.
- [ ] Se houver banco: SELECT ok, escrita direta bloqueada, RPC ok.
- [ ] Se houver WhatsApp: teste pelo canal correto do agente, nunca por outro agente.
- [ ] Documentar paths, user, portas, restart e healthcheck.

---

## 9. Júlia / Master Chef LA

Escopo inicial:

- Nome público: **Júlia** ou **Chef Júlia**.
- Lúcia é a operadora humana do bistrô; não citar como persona pública do agente.

- Usuário sugerido: `julia`.
- VPS: LAHQ, não Alfredo/Maria.
- Canal fase 1: Telegram.
- WhatsApp: fase posterior; preferir nativo Hermes quando número/canal estiver pronto.
- App: `master-chef-la.vercel.app`.
- Funções: chat operacional, compras, entradas/saídas, vendas do dia, cardápios, produtos, imagem de produto, melhoria de imagem com referência.
- Dados: pode ler e organizar dados operacionais/financeiros do bistrô.
- Limite: não executar pagamento, pix, transferência, compra sensível ou alteração financeira irreversível sem aprovação humana.

Skills candidatas:

- `master-chef-cardapios`: montar cardápios por dia, estoque, margem e restrições.
- `compras-e-insumos`: lista de compras, fornecedores, faltas, reposição e conferência.
- `vendas-do-dia`: consolidar vendas, entradas/saídas, sangria/caixa e anomalias.
- `imagem-produtos-bistro`: gerar/melhorar fotos de produtos com prompt e referência.
- `precificacao-operacional`: custo, margem, preço sugerido e alerta de margem baixa.
- `bridge-master-chef-api`: contrato HTTP interno para app chamar Júlia.

Bridge interna opcional:

- `POST /chat`
- `POST /image/generate`
- `POST /image/enhance`
- `GET /health`

Auth/modelo/imagem:

- Preferir Codex OAuth/ChatGPT Max se esse for o padrão decidido.
- API key só fallback explícito por flag/env.
- Tokens em `~/.codex/auth.json` ou equivalente, permissão 0600, fora de git.

---

## 10. Erros que não repetir

- Pôr manual de 10 KB em `memories/USER.md` (limite 1.375) e travar a memória do agente.
- Descrever no AGENTS o que não existe: o agente oferece o que não sabe fazer.
- Deixar o modelo informar o remetente (use carimbo no `pre_tool_call`).
- Nome da equipe nas descrições de ferramenta (o modelo repete).
- Entregar função com IA sem bateria contra a versão publicada.
- Sombra sem régua, prazo e placar (vira abandono).
- Modelo com terminal próprio (CLI) em agente com segredo: o bloqueio de ferramentas do runtime não vale lá.

- Colocar `AGENTS.md` em `~/.hermes` e achar que Telegram/WhatsApp vai ler.
- Diagnosticar só com `cd`; reproduza `TERMINAL_CWD`.
- Perguntar ao agente se ele leu o contexto; valide por `prompt-size`, logs e sessão real.
- Colocar regra dura só em skill.
- Misturar canal WhatsApp de Maria/Fábio/Mila/Sol/Júlia.
- Usar bridge como cérebro com resposta pronta.
- Sacrificar tom/persona para cortar latência.
- Dar permissão aberta de escrita no banco.
- Subir `.env`, tokens, sessões, cookies, logs sensíveis ou media inbound para git.
