# PLAYBOOK-NOTAS.md: como construímos a Aurora (matéria-prima do playbook de novos agentes)

> O Alf pediu em 2026-09-25 que o método fosse registrado etapa por etapa. A ideia é que, ao fim da Aurora, isto junte com o que foi feito na Julia e vire **playbook e skill de criação de agentes** (principalmente Hermes).
> Cada etapa registra: **o que foi feito**, **como funciona**, **como ficou** e **a lição**. Nada de segredo nem de dado de paciente aqui (o repo é público).

## 0. Princípios que se repetiram
- **Uma decisão por vez.** O Alfredo traz a prévia, o Alf aprova ou contesta, e só então publica.
- **Tudo em dois lugares:** o repo (versionado) e a VPS (vivo), com o hash conferido nos dois (e no GitHub).
- **Pesquisar a comunidade antes de escolher** (memória, backup, identificadores do WhatsApp).
- **Menor privilégio sempre:** crachá por finalidade (leitura ≠ escrita), só RPC e nunca SQL livre, a trava de quem vê o quê fica **no banco**.
- **Testar por papel antes de ligar:** time, terapeuta, família, financeiro, suporte e desconhecido. Dado de teste só dentro de transação com rollback.
- **Nada clínico sai por ferramenta**, e escrita nunca faz o que é decisão humana (a Aurora avisa, o Serjão decide).

## 1. Fundação de texto (CP0–CP5)
| Etapa | O que é | Como fizemos | Lição |
|---|---|---|---|
| CP0 baseline | Fontes, acessos e mapa da casa (`HANDOFF.md`, `MAPA-QUARTOS.md`) | Auditoria só-leitura do app, do banco e da VPS | O mapa escrito por outro agente estava incompleto; auditar contra o código **e** o banco vivo |
| CP1 `SOUL.md` | Identidade, voz, absolutos | Entrevista por blocos (propósito, tom, crise, apresentação) | Fazer uma pergunta de cada vez, com exemplo concreto |
| CP2 `USER.md` | Pessoas, papéis, horários, crise | Rodadas por pessoa (direção, coordenação, administrativo, terapeutas, famílias, agentes) | Registrar também **com quem ela não fala** |
| CP3 `AGENTS.md` | Ciclo de mensagem, fontes, número compartilhado, financeiro, leads, rotinas | Seção por seção | O Hermes só carrega um arquivo de contexto: resumir `PERMISSOES` dentro do `AGENTS`, com marcador de hash + CI |
| CP3.5 Hermes | Instalar sem canal | Modelo, toolsets mínimos, `terminal.cwd`, systemd, `prompt-size` | Instalar cedo para provar que o texto é carregado de verdade |
| CP4 `PERMISSOES.md` | 🟢 🟡 🟠 🔴 por ação e por pessoa | Matriz com quem dá o "pode" | Trava real fica na ferramenta, não no texto |
| CP5 `MEMORY.md` | O que lembra, o que nunca guarda, retenção | Honcho self-hosted, uma gaveta por pessoa; Dreaming desligado; 12 meses para família que saiu | **Backup antes de ligar:** dump criptografado diário, cópia fora do servidor e restauração testada a partir da cópia remota |

## 2. Limpeza do runtime (CP6, parte)
- Desligar as skills padrão do Hermes (`skills.disabled`). O índice caiu de 5,2 KB para 0,3 KB.
- Lição: depois de cada `hermes update`, conferir o `prompt-size` (skill nova vem ligada).

## 3. Segurança do banco e do app (Fase 0 e 0.5)
Antes de dar qualquer ferramenta ao agente, **fechar o que já estava aberto**:
1. Versionar no repo o código das edge functions que só existia no Supabase (`supabase functions download`) e tirar as chaves escritas no código.
2. Aposentar o "cérebro antigo" (stub 410 + código arquivado + crons desligados, sem apagar).
3. Travar funções públicas: usuário ativo com papel (`exigirUsuario`) para as chamadas da tela; senha interna no vault (`x-internal-secret`) para crons e gatilhos; token da instância para o webhook do WhatsApp.
4. Fechar funções `SECURITY DEFINER` sem checagem de papel.
5. Toda publicação é seguida do teste de 401 de fora e de uma chamada legítima que precisa passar.

**Lições:**
- Webhook: primeiro **modo observação** (só registra), depois o bloqueio, com prova em mensagem real.
- Coordenar com o outro agente (Cursor):
  - `git pull` antes de cada commit;
  - timestamps de migration que não colidam;
  - registrar em `schema_migrations`;
  - **um só publica** cada função;
  - ninguém publica cópia antiga (foi assim que uma trava caiu por algumas horas).
- A Management API do Supabase trocou `logs.all` pelo endpoint `logs` (ClickHouse, tabela única `logs`).

## 4. Ferramentas (Fase 1 leitura, Fase 2 escrita)
**Ciclo de cada ferramenta:**
1. Desenho em linguagem do dono: quando usa, quem vê, o que devolve, o que nunca devolve.
2. Aprovação do Alf.
3. RPC `SECURITY DEFINER` com escopo decidido pelo solicitante (`aurora_ator`), `REVOKE` de todos e `GRANT` só ao crachá.
4. Teste por papel (transação com rollback quando precisa de dado).
5. Entrada na allowlist do MCP, versão nova e release imutável por sha na VPS.
6. `hermes mcp test` e teste ponta a ponta com o agente respondendo.
7. Registro em `FERRAMENTAS.md`, `CHECKPOINT.md` e memória do Alfredo.

**Lições:**
- **Identidade ≠ número.** O WhatsApp está migrando para LID, @usuario e BSUID. Cadastro de identificadores por pessoa; o nome da criança é **pista**, não prova.
- Não reaproveitar tabela antiga sem ler quem consome (a `wa_aurora_equipe` mandava o resumo financeiro a todos).
- TLS: o `pg` novo trata `require` como verify-full; fixar a raiz da Supabase.
- `.env` com `&` na URL precisa de aspas.
- A escrita **resolve IDs por dentro**, a partir de nomes e do remetente (o agente não tem IDs), e é idempotente.
- Escrita nunca substitui decisão humana: grava o aviso, não mexe na sessão.
- O agente precisa de relógio (`aurora_hoje`) para entender "hoje" e "amanhã".
- **Um crachá de escrita, permissão por função.** Começamos com um crachá com nome da primeira ferramenta (`aurora_aviso`) e na segunda precisamos renomear (`aurora_escrita`). No playbook, nasce já com nome genérico. Renomear role com senha SCRAM mantém a senha, mas o nome do usuário na URL e o `EXPECTED_LOGIN_ROLE` do MCP precisam mudar **na mesma janela** (a escrita fica fora do ar entre a migration e o `.env`).
- **Transição de etapa é regra do banco, não do prompt:** a função só aceita as transições que o agente pode fazer (novo→triagem, →perdido com motivo) e recusa as decisões humanas (agendado, ativo), com erro legível para o agente.
- **Follow-up precisa de registro do que foi feito**, senão a lista do dia repete a mesma família. Tabela única por (lead, etapa) e a leitura exclui o que já foi feito.
- **Identidade vem do canal, não do modelo (carimbo).** Na Sol, a ponte escreve um crachá no texto e o modelo copia (dá pra copiar o de outra pessoa no histórico do grupo). No Hermes existe o gancho `pre_tool_call` com `action: modify`: um plugin lê a sessão do gateway e **sobrescreve** o campo de remetente com um carimbo HMAC; o banco confere. O schema da ferramenta pede `"auto"`, então o modelo nem tenta adivinhar. Número solto é recusado **desde o primeiro dia** (ninguém depende dele ainda: é mais fácil fechar antes do que depois).
- Plugin do Hermes: `~/.hermes/plugins/<nome>/{plugin.yaml,__init__.py}` e `plugins.enabled` no `config.yaml` (plugins são opt-in). A sessão do gateway fica em `gateway.session_context.get_session_env("HERMES_SESSION_*")`; no terminal dá pra simular um canal pelas mesmas variáveis de ambiente.
- Teste de leitura que depende de dado novo: `DO $$ … RAISE EXCEPTION 'RESULTADO …' $$` pela Management API (a exceção desfaz tudo e devolve o resultado).

### Padrão reutilizável: identidade do remetente presa ao canal

**Problema que resolve:** ferramentas com autorização por pessoa não podem aceitar telefone, LID, usuário ou papel informado pelo modelo. Texto como “sou o Alf” ou um identificador copiado do histórico não prova quem enviou a mensagem.

**Arquitetura aprovada e provada na Aurora:**
1. O gateway recebe a mensagem e cria a sessão com a identidade real do canal, a conversa e o tipo `dm`/`group`.
2. Um plugin Hermes no hook `pre_tool_call` lê esse contexto imediatamente antes da execução da ferramenta.
3. O plugin ignora o identificador produzido pelo modelo e sobrescreve o argumento de identidade com um envelope curto assinado por HMAC.
4. O banco abre o envelope, confere versão, assinatura, idade, plataforma, conversa e identificador, e só então resolve a pessoa e o escopo.
5. A autorização continua na RPC/banco; o plugin prova a origem, mas não decide o que a pessoa pode ver ou fazer.

**Invariantes:**
- número/LID solto é recusado desde o primeiro dia;
- sem contexto real de mensagem, a ferramenta falha fechada;
- segredo nunca entra em prompt, log, Git ou resposta do agente;
- o modelo não vê nem escolhe a identidade usada pela ferramenta;
- grupo e privado são escopos distintos no envelope;
- identificadores múltiplos (`telefone`, `LID`, depois `@usuario`/BSUID) apontam para a mesma pessoa canônica;
- chamadas autônomas futuras usam uma identidade de `sistema` separada, com escopo e ferramentas próprios — nunca fingem ser uma pessoa.

**Anti-padrão que não deve ser repetido:** colocar um crachá assinado no texto e pedir ao modelo para copiá-lo. Em grupo, o histórico contém crachás de outras pessoas; o modelo pode reutilizar o errado. Também não manter fallback de número solto “só para testes”, porque ele vira bypass permanente.

**Provas mínimas antes de considerar pronto:**
- carimbo real e dentro da validade passa;
- número/LID solto falha;
- carimbo vencido falha;
- alterar identidade, conversa, tipo de canal ou qualquer campo assinado falha;
- desconhecido dizendo ser alguém conhecido continua desconhecido;
- pessoa conhecida real recebe apenas o escopo autorizado;
- ferramenta nova sem regra explícita no plugin falha fechada;
- prova no gateway/canal real antes de ativar respostas externas.

**Critério de promoção para outros agentes:** só reutilizar depois de confirmar que o runtime expõe identidade confiável no hook anterior à tool call e que os argumentos modificados são os efetivamente executados. Se isso não for provado, não improvisar crachá no prompt: manter o canal em sombra e criar um adaptador server-bound.

## 4.1 Canal em modo sombra
- **Sombra tem régua e prazo, ou vira abandono** (lição da Sol, que ficou em sombra sem critério). Ao ligar: data de início, critério numérico de promoção, prazo de decisão, placar diário automático e ordem de liberação. No fim do prazo decide-se: promove, ou diz por que não e marca nova data.
- Sombra de verdade não tem efeito colateral: além de não enviar, **as ferramentas de escrita não executam** (o plugin registra a intenção para revisão).
- Não trocar a porta de entrada do canal: a Central continua dona do webhook; o agente lê do banco por um crachá próprio, sem porta pública na VPS.
- Hermes: dá para usar a plataforma WhatsApp com uma ponte própria (`extra.bridge_script`), que precisa de `package.json` na pasta do script e de um `creds.json` marcador na sessão. `dm_policy`/`group_policy: open` exigem `WHATSAPP_ALLOW_ALL_USERS=true` (o controle de acesso real fica no banco).

- Ao ligar um canal de mensagem no Hermes, **desligar os avisos da própria ferramenta** (progresso de ferramenta, dicas de primeira vez, "defina o canal padrão", aviso de interrupção): `display.tool_progress: off`, `display.platforms.<canal>.tool_progress: off`, `display.busy_input_mode: queue`, `onboarding.seen.*`, `<CANAL>_HOME_CHANNEL`. E filtrar na ponte por garantia. Foi a sombra que mostrou isso: sem ela, a família receberia "⚙️ tool_call...".
- Em canal compartilhado com humanos (Central), o agente precisa saber **quando ficar calado**: botão da conversa, atendente humano e resposta humana recente (2 h). Implementar **durante a sombra**, não depois: assim a revisão mede o comportamento real, e o silêncio também fica registrado com motivo.
- Conferir o que cada rótulo da tela significa antes de agir: o "Aurora desligada" da Central era o interruptor geral, não o da conversa.

- **Memória (Honcho) só liga junto com o ao vivo.** Na sombra, a memória guardaria como dito o que nunca foi enviado. Na sombra dá para preparar tudo: workspace próprio, token restrito ao workspace (JWT HS256 com claim `w`), prova de isolamento (o agente não lê o workspace de outro, e vice-versa) e config com `enabled: false`.
- Teste de memória pelo terminal não prova a gaveta por número (o terminal cai no peer padrão). A prova real é pelo canal, na virada.

## 4.2 Skills
- **Skill vem depois da ferramenta**, uma por frente de trabalho (atendimento, leads, equipe), curta (1,5–2 KB), com cada passo apontando a ferramenta e o critério de pronto. Regras que valem sempre (como "só diz que fez o que a ferramenta confirmou") ficam no AGENTS, não em skill.
- Desligar as skills padrão do Hermes e medir o `prompt-size` depois de instalar as da casa (aqui: índice ~90 B por skill).

- **A chave do ao vivo mora no banco, por conversa**, não num arquivo na VPS: liberar o número do dono primeiro, depois a equipe, depois `*`. Monta-se o caminho de envio **desligado** durante a sombra, para a virada ser um UPDATE.
- Ponte que fala com o banco precisa de prazo de conexão e de consulta; sem isso, uma queda do banco pendura o agente mesmo depois que o banco volta.
- Placar e alerta agendados rodam como **script** (automação de comando), não como turno do agente.
- Antes de criar migration, `git pull` e conferir o número de versão: o Cursor usou o mesmo `20260926003000` no mesmo dia.

## 4.3 Escolha do modelo
- **Benchmark com a bateria real, não com prompt genérico:** as mesmas 10 perguntas (data/expediente, agenda, pacote, recesso, lead, financeiro sem ferramenta, diagnóstico, desconto, golpe) pelo CLI com o remetente fixo, só leitura. Medir tempo, tamanho e nota por resposta (certo · leve · erro).
- Rodar modelos **em paralelo** (unidades separadas) com timeout por pergunta; os lentos travam a fila em série.
- Mudança temporária de config (ex.: Fast) só depois que todos os outros terminarem, com cópia e restauração conferida (`cmp`).
- **Ler o aviso do plano**: tier "contributor" treina com os dados. Com dado de família/criança, está fora, por melhor que seja.
- Nome da equipe vaza também pela **descrição da ferramenta**: o modelo repete o que lê ali. Regra de "não citar nomes" vale para AGENTS, skills e descrições (com teste).
- Benchmark com ferramenta de escrita em modo sombra testa de graça a **honestidade**: o bom modelo diz "não consegui registrar"; o ruim diz "ficou registrado". As ações de teste caem na fila da sombra: marcar fora da régua (sem apagar).
- Pedido que o agente não resolve **vira registro** (ferramenta de pedido pra equipe), não só frase "vou passar pro atendimento".

## 4.4 Mídia e equipe
- Ponte própria precisa entregar mídia no formato do Hermes: **foto por URL** (`hasMedia`, `mediaType: image`) e **documento só como arquivo local dentro da pasta de cache** que o Hermes passa à ponte (`HERMES_DOCUMENT_CACHE_DIR`). PDF: converter em texto antes (o Hermes só injeta texto de .txt/.md…).
- Baixar só de host permitido e apagar em 24 h. Áudio: aproveitar a transcrição que o sistema já faz.
- Modelo sem visão não lê foto: a escolha do modelo depende disso.
- Equipe no privado ganha dois usos com uma skill só: **copiloto** (sugere a resposta, não age pelo cliente) e **treino** nos dois sentidos, com ações simuladas.

## 4.5 Copiloto dentro do sistema da equipe
- Em vez de calar quando o humano assume, o agente **sugere** no painel do atendente (Enviar / Editar / Copiar / Ignorar). O humano envia como ele mesmo: seguro mesmo em sombra.
- O clique do atendente é a **revisão da régua de graça**: enviada = ok, editada = leve (guarda a diferença), ignorada = revisão manual.
- Em modo sugestão: nada sai para o cliente, sem "digitando", ferramentas de escrita travadas.
- O agente precisa saber **o que o humano respondeu de fato**; senão acha que a própria sugestão foi enviada e perde o fio.
- Mídia: o sistema pode gravar a mensagem antes do arquivo. A ponte espera a URL antes de entregar.

- Áudio tem a mesma corrida da foto: o sistema grava "🎤 Audio" e transcreve depois. A ponte espera a transcrição antes de entregar.
- Antes de criar botão novo na tela, procurar o marcador que o time já deixou ("Em breve"): usar o lugar planejado.

## 5. Operação contínua
- Backup do Honcho: diário às 03:30 SP, cópia no Supabase LAHQ Memory e restauração testada todo domingo.
- Checkpoint versionado a cada etapa (`CHECKPOINT.md`) e memória do Alfredo com backup no `alfredo-backup`.
- Ainda a formalizar para o playbook: laudo diário do agente, heartbeat e alertas (CP6/CP7).

## 6. Para virar skill (quando a Aurora fechar)
- Juntar com a Julia (MCP read/write, releases por sha, crachás) e com a Sol (caixa V3, "pode", ledger, cards).
- Produzir: `playbook-criacao-agente-hermes` (passo a passo com critério de pronto por etapa) e os templates `SOUL`/`USER`/`AGENTS`/`PERMISSOES`/`MEMORY`/`FERRAMENTAS`/`CHECKPOINT`.
