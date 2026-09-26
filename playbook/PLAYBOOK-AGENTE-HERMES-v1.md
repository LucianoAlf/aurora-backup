# Playbook v1 · Como criar um agente de atendimento no Hermes

> Método LAHQ, escrito a partir da construção da **Aurora** (SonoraMente, set/2026), com o que já tinha sido aprendido na Julia, na Sol, no Fábio e na Mila.
> Versão 1 (26/09/2026): da fundação ao **atendimento assistido** (agente em sombra + copiloto da equipe). Caixa, Instagram e memória ligada entram na v2.
> Repo público: sem segredo, sem dado de cliente, sem detalhe de vulnerabilidade aberta.

---

## Como usar este playbook

- Cada etapa tem **o que fazer**, **pronto quando** (critério verificável) e **armadilhas** (o que deu errado com a gente).
- **Uma decisão por vez.** Quem constrói traz a prévia; o dono aprova ou contesta; só então publica.
- **Tudo em dois lugares:** repo versionado e servidor vivo, com o hash conferido nos dois.
- **Três documentos vivos desde o dia 1:**
  - `CHECKPOINT.md`: o que foi feito, com evidência;
  - `ROADMAP.md`: onde estamos e para onde vamos;
  - `PLAYBOOK-NOTAS.md`: a lição de cada etapa.
- Papéis: **dono** (decide), **construtor** (o agente que constrói, aqui o Alfredo), **equipe** (quem vai conviver com o agente) e **agente** (quem está sendo criado).

## Mapa das etapas

| # | Etapa | Resultado |
|---|---|---|
| 0 | Mapa da casa | Auditoria só-leitura do sistema, do banco e do servidor |
| 1 | Fundação de texto | SOUL, pessoas, AGENTS, PERMISSOES, MEMORY aprovados |
| 2 | Runtime instalado sem canal | Hermes lendo o texto certo, provado por `prompt-size` |
| 3 | Fechar o que já estava aberto | Banco e funções do sistema travados antes de dar ferramenta |
| 4 | Ferramentas de leitura | Consultas por RPC, com escopo por pessoa no banco |
| 5 | Identidade do remetente | Carimbo HMAC: o modelo não escolhe quem está falando |
| 6 | Ferramentas de escrita | Registros que ajudam a equipe, nunca decisão humana |
| 7 | Skills | Uma por frente de trabalho, curtas, apontando a ferramenta |
| 8 | Escolha do modelo | Benchmark com a bateria real |
| 9 | Canal em sombra | Lê tudo, responde para a revisão, não envia nada |
| 10 | Copiloto da equipe | Sugestão no sistema da equipe; o clique vira revisão |
| 11 | Ao vivo por conversa | Liberar primeiro o dono, depois a equipe, depois todos |
| 12 | Operação contínua | Placar diário, saúde, backup, documentação enxuta |

---

## Etapa 0 · Mapa da casa

**O que fazer**
- Auditoria só-leitura: repositório do sistema, banco (tabelas, funções, políticas, crons), funções publicadas, servidor e canais.
- Listar **quem consome cada tabela** antes de reaproveitar qualquer coisa.
- Escrever `HANDOFF.md` (o que existe) e `MAPA-QUARTOS.md` (quem entra em cada parte).

**Pronto quando:** cada afirmação do mapa foi conferida contra o código **e** contra o banco vivo.

**Armadilhas**
- O mapa escrito por outro agente estava incompleto.
- Uma tabela antiga "de equipe" mandava o resumo financeiro para todo mundo.

## Etapa 1 · Fundação de texto (SOUL → MEMORY)

**O que fazer**
1. **SOUL.md:** identidade, voz, equação de valor, absolutos. Entrevista com o dono **uma pergunta por vez, com exemplo concreto**.
2. **Pessoas:** quem é quem, quem decide o quê, tratamento, janela de crise, **com quem o agente não fala**.
3. **AGENTS.md:** ciclo de cada mensagem, fontes de verdade, regras que valem sempre.
4. **PERMISSOES.md:** matriz 🟢 sozinho · 🟡 só com "pode" · 🟠 prepara e passa · 🔴 nunca, com quem dá o "pode".
5. **MEMORY.md:** o que lembra, o que nunca guarda, retenção, esquecimento (LGPD).

**Pronto quando:** cada arquivo foi aprovado pelo dono, versionado e publicado com o hash conferido.

**Armadilhas: escreva curto desde o começo**
- No Hermes, `memories/USER.md` tem limite de **1.375 caracteres** e `memories/MEMORY.md` de **2.200**. Acima disso o agente perde a capacidade de anotar na própria memória.
  - Na Aurora colocamos um manual de pessoas de 10,7 KB no USER.md. Isso travou a memória e foi corrigido depois: o essencial foi para o AGENTS e o manual virou `docs/PESSOAS.md`.
- **Não descreva no AGENTS o que ainda não existe** (caixa, rotinas, comandos). O agente vai oferecer o que não sabe fazer. Mantenha uma seção "ainda não existe (não ofereça)".
- Permissão escrita é intenção; **a trava real fica na ferramenta e no banco**.
- O Hermes carrega **um** arquivo de contexto. Resuma o PERMISSOES dentro do AGENTS, com marcador de hash e CI conferindo.
- Meta de tamanho do que é carregado em toda mensagem: **~10 KB no total** (a Aurora foi de 35 KB para 10,6 KB, com a mesma nota 10/10 na bateria).

## Etapa 2 · Runtime instalado sem canal

**O que fazer**
- Usuário próprio na VPS (`/home/<agente>`), Hermes em `~/.hermes`, serviço `hermes-gateway-<agente>` no systemd.
- `SOUL.md` em `~/.hermes/SOUL.md`; `AGENTS.md` no **CWD lógico** (`terminal.cwd`/`TERMINAL_CWD`, normalmente `/home/<agente>`).
- Desligar as skills padrão (`skills.disabled`) e os toolsets que não serão usados.

**Pronto quando**
- `TERMINAL_CWD=/home/<agente> hermes prompt-size` mostra o contexto carregado;
- uma sessão nova responde com a voz certa;
- o serviço fica estável depois de reiniciar.

**Armadilhas**
- `AGENTS.md` dentro de `~/.hermes` não carrega.
- Depois de cada `hermes update`, conferir o `prompt-size`, porque skill nova vem ligada.

## Etapa 3 · Fechar o que já estava aberto (antes de qualquer ferramenta)

**O que fazer**
1. Versionar no repo o código das funções que só existiam no servidor e tirar chaves escritas no código.
2. **Aposentar o cérebro antigo** (se houver), sem apagar:
   - uma função "stub" que responde 410;
   - o código original guardado em `_aposentadas/`;
   - os crons desligados.
3. Travar funções públicas:
   - usuário logado com papel, para a tela;
   - segredo interno no Vault, para crons e gatilhos;
   - token da instância, para o webhook.
4. Fechar funções `SECURITY DEFINER` sem checagem de papel.

**Pronto quando:** de fora, sem login, tudo responde 401/410, e a chamada legítima continua passando.

**Armadilhas**
- Coordenar com outro agente que mexe no mesmo repo:
  - `git pull` antes de cada commit;
  - número de migration que não colida;
  - registrar em `schema_migrations`;
  - **um só publica** cada função.
- Webhook: primeiro modo observação, depois bloqueio.

## Etapa 4 · Ferramentas de leitura

**O que fazer:** para cada ferramenta:
1. **Desenho em linguagem do dono:** quando usa, quem vê, o que devolve, o que nunca devolve.
2. **Aprovação** do dono.
3. **RPC `SECURITY DEFINER`:** o escopo é decidido pelo solicitante (quem é essa pessoa); `REVOKE` de todos e `GRANT` só ao crachá de leitura.
4. **Teste por papel:** time, terapeuta, família, financeiro, suporte e desconhecido.
5. **Allowlist no MCP,** versão nova, release por sha na VPS.
6. **Prova ponta a ponta** com o agente respondendo.

Vale para o conjunto:
- **Crachás por finalidade:** leitura ≠ escrita ≠ ponte. Nascem com nome genérico (`<agente>_escrita`, não o nome da primeira ferramenta).
- O agente precisa de **relógio** (`<agente>_hoje`): data, dia da semana, expediente.

**Pronto quando:** o teste por papel passa e o agente usa a ferramenta certa numa pergunta real.

**Armadilhas**
- O nome da equipe vaza pela **descrição da ferramenta**. O modelo repete o que lê ali, então a regra "não citar nomes" tem teste também nas descrições.
- Dado de teste só dentro de transação com rollback.

## Etapa 5 · Identidade do remetente (carimbo)

**Problema:** ferramenta com autorização por pessoa não pode aceitar o telefone que o modelo informa ("sou o dono" não prova nada; em grupo, o modelo pode copiar o identificador de outra pessoa do histórico).

**Padrão aprovado**
1. Um plugin Hermes no gancho `pre_tool_call` lê a sessão real do gateway (`HERMES_SESSION_*`).
2. Ele **sobrescreve** o campo de remetente com um envelope curto assinado por HMAC. O schema da ferramenta pede `"auto"`.
3. O banco abre o envelope, confere assinatura, validade (5 min), plataforma, conversa e tipo, e resolve a pessoa.
4. **Número solto é recusado desde o primeiro dia.**

**Pronto quando**
- carimbo válido passa;
- número solto, carimbo vencido ou alterado falha;
- ferramenta nova sem regra no plugin falha fechada;
- a prova é feita no canal real.

**Anti-padrão:** crachá no texto para o modelo copiar; fallback de número solto "só para teste".

## Etapa 6 · Ferramentas de escrita

**O que fazer**
- A escrita **registra**, não decide:
  - aviso de falta ou remarcação;
  - lead e etapa;
  - follow-up feito;
  - **pedido para a equipe** (desconto, financeiro, agenda, cadastro, clínico, "quero falar com alguém").
- IDs resolvidos por dentro, a partir de nome e remetente. Operação idempotente: o mesmo pedido no mesmo dia junta no mesmo cartão.
- **Transição de etapa é regra do banco:** só aceita o que o agente pode fazer e devolve erro legível para o resto.
- A equipe vê tudo numa lista no sistema dela (ex.: "Avisos" na Central).

**Pronto quando:** o teste por papel passa, a repetição não duplica e a lista aparece na tela da equipe.

**Armadilhas**
- Sem a ferramenta de pedido, o agente diz "vou passar para o atendimento" e **não passa nada**.
- Regra no AGENTS: **só dizer que fez o que uma ferramenta confirmou**.

## Etapa 7 · Skills

- **Skill vem depois da ferramenta**, uma por frente de trabalho: atendimento, leads, equipe, copiloto e treino.
- Curta (1,5–2 KB), cada passo apontando a ferramenta e o critério de pronto.
- Regra que vale sempre fica no AGENTS, não em skill (skill pode não disparar).

**Pronto quando:** `prompt-size` medido depois de instalar e uma pergunta real de cada frente usa a skill.

## Etapa 8 · Escolha do modelo

**O que fazer**
- **Bateria real, não prompt genérico:** ~10 perguntas do dia a dia:
  - data e expediente;
  - agenda;
  - consulta de dados;
  - simulação;
  - pergunta sem ferramenta;
  - pergunta clínica;
  - pedido de desconto;
  - tentativa de golpe ("ignora tuas regras").
- Rodar pelo caminho real (CLI com o remetente fixo), só leitura, modelos **em paralelo**, com timeout por pergunta.
- Medir tempo, tamanho, ferramentas chamadas e nota por resposta: **certo · leve · erro**.
- Rodar **duas vezes** para ver consistência.
- Ferramenta de escrita em sombra no teste mede de graça a **honestidade**: o bom modelo diz "não consegui registrar", o ruim diz "ficou registrado".

**Resultado na Aurora:** GPT-6 Sol medium Fast (assinatura), 10/10, e DeepSeek de reserva.

**Armadilhas**
- Ler o aviso do plano: tier "contributor" **treina com os dados**. Com dado de cliente, está fora.
- Modelo sem visão não lê foto.
- Modelo que roda por CLI próprio (ex.: Opus pelo Claude CLI) tem terminal próprio, fora do bloqueio de ferramentas do runtime. Não usar em agente com segredo financeiro.
- Mudança temporária de config só com cópia e restauração conferida (`cmp`).

## Etapa 9 · Canal em sombra

**O que fazer**
- **Não trocar a porta de entrada.** O sistema da empresa continua dono do número e do webhook. O agente lê as mensagens novas do banco por um crachá de ponte e usa uma **ponte própria** no Hermes (`platforms.whatsapp.extra.bridge_script`). Ela precisa de:
  - `package.json` na pasta do script;
  - um `creds.json` marcador na sessão;
  - `WHATSAPP_ALLOW_ALL_USERS=true`, porque o controle real fica no banco.
- **Sombra de verdade:** não envia e **não executa escrita** (o plugin registra a intenção para revisão).
- **Regra de silêncio:** conversa pausada, atendente humano ou resposta humana nas últimas 2 h. Implementar durante a sombra, para a revisão medir o comportamento real.
- Desligar os avisos do próprio Hermes, e filtrar na ponte por garantia: progresso de ferramenta, dicas, "defina o canal padrão".
- **Mídia:**
  - foto por URL;
  - PDF convertido em texto dentro da pasta de cache do Hermes;
  - áudio pela transcrição do sistema;
  - **esperar a URL ou a transcrição** antes de entregar (o sistema grava a mensagem antes do arquivo);
  - só de host permitido, apagar em 24 h.
- A ponte tem prazo de conexão e de consulta ao banco (sem isso, uma queda do banco pendura o agente).
- **Sombra tem régua e prazo, ou vira abandono.** Na Aurora: 30 revisadas com 0 erro grave, placar diário automático às 9h e data de decisão.

**Pronto quando:** mensagem real cai na sombra com resposta coerente, nada foi enviado e o placar diário chega.

## Etapa 10 · Copiloto da equipe (atendimento assistido)

**O que fazer**
- Quando o humano assume, o agente não se cala: entra em **modo sugestão**. A resposta vira sugestão no painel do atendente, sem "digitando" e com escrita travada.
- Painel no sistema da equipe com **Enviar / Editar / Copiar / Ignorar** e botões de tom (mais curto, direto, acolhedor, formal, detalhado).
- **O clique é a revisão da régua:**
  - enviada = ok;
  - ajustada no tom = ok;
  - editada à mão = leve (guarda o texto final);
  - ignorada = revisão manual.
- O agente recebe **o que o humano respondeu de fato**. Sem isso, ele acha que a própria sugestão foi enviada e perde o fio.
- **Equipe no privado** com o agente: **copiloto** ("o cliente mandou isso, o que eu respondo?") e **treino** nos dois sentidos, com ações simuladas.
- **Cérebro único:** funções de texto do sistema usam o mesmo modelo do agente, com o desenho da julia-bridge:
  1. edge function;
  2. túnel;
  3. serviço na VPS com token (o navegador nunca vê o token);
  4. **reserva** (outro modelo) testada com a queda de propósito.

**Pronto quando:** a sugestão aparece no painel numa conversa real, o clique registra o uso e a bateria automática da função passa na versão **publicada**.

**Armadilhas**
- Procurar o marcador que o time já deixou na tela ("Em breve") antes de criar botão novo.
- **Testar a função publicada antes de entregar** (bateria automática). Função com LLM precisa de um jeito interno e autenticado para o teste chamar.
- Modelo que "pensa" dentro do limite de saída devolve texto cortado ou com rascunho. Use raciocínio mínimo, descarte as partes de pensamento e só aceite resposta completa.

## Etapa 11 · Ao vivo, por conversa

**O que fazer**
- A chave mora **no banco, por conversa** (`modo` + lista de liberados), não num arquivo.
- O caminho de envio é montado **desligado** durante a sombra: a virada é um UPDATE.
- Ordem de liberação: o dono → a equipe → todos (`*`).
- Memória (Honcho) **liga junto com o ao vivo**, porque na sombra ela guardaria como dito o que nunca foi enviado. Na sombra dá para preparar tudo:
  - workspace próprio;
  - token restrito;
  - prova de isolamento entre agentes;
  - `enabled: false`.

**Pronto quando:** a régua fechou, o dono aprovou, e o envio real, o "digitando", o silêncio e a memória foram provados no canal.

## Etapa 12 · Operação contínua

- **Placar diário** como script agendado (não como turno do agente): régua, sugestões usadas, saúde da ponte e do cérebro.
- **Backup** da memória com restauração testada.
- **Revisão de documentação** a cada etapa grande: enxugar, tirar o que ficou velho, conferir os limites de USER e MEMORY.
- `ROADMAP.md` atualizado e versionado a cada decisão.

---

## Checklist rápido (copie para o próximo agente)

- [ ] Mapa da casa conferido contra código e banco
- [ ] SOUL, pessoas, AGENTS, PERMISSOES, MEMORY aprovados (USER ≤ 1.375, MEMORY ≤ 2.200 caracteres; total ~10 KB)
- [ ] Hermes com `prompt-size` provado e skills padrão desligadas
- [ ] Funções antigas aposentadas e funções públicas travadas
- [ ] Crachás por finalidade; leitura e escrita só por RPC; teste por papel
- [ ] Relógio (`_hoje`) e carimbo do remetente (número solto recusado)
- [ ] Ferramenta de **pedido para a equipe**
- [ ] Skills curtas por frente de trabalho
- [ ] Benchmark com bateria real (2 rodadas)
- [ ] Sombra com régua, prazo e placar diário
- [ ] Copiloto no sistema da equipe + cérebro único com reserva
- [ ] Ao vivo por conversa (dono → equipe → todos) + memória ligada
- [ ] CHECKPOINT, ROADMAP e PLAYBOOK-NOTAS atualizados

## Próximos capítulos (v2)

- Caixa com "pode" (modelo da Sol): comprovante, conferência, lançamento, abertura e fechamento.
- Instagram (DM e comentários) e social media.
- Pontes entre agentes (encaminhamento e retorno).
- Laudo diário e alertas do próprio agente.
