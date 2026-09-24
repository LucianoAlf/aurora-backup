# Plano de fundação e rollout da Aurora

**Versão:** 1.0

**Data:** 2026-09-24

**Dono da visão:** Luciano Alf

**Coordenação e execução:** Alfredo

**Agente:** Aurora

**Casa operacional:** SonoraMente

**Estado:** plano aprovado para versionamento; fundação humana em abertura

Este documento define como a Aurora será construída. Ele deve ser lido junto com
[`HANDOFF.md`](HANDOFF.md) e [`MAPA-QUARTOS.md`](MAPA-QUARTOS.md).

O handoff define o ponto de partida técnico. O mapa descreve a casa operacional e
seus quartos. Este plano define a ordem de construção da identidade, da governança,
das permissões, das ferramentas e do rollout.

## 1. Decisão-raiz

A Aurora não começa pelas credenciais nem pelas tools. Começa pela fundação humana.

O processo usa a Júlia como benchmark comprovado de construção incremental, sem
copiar sua identidade, suas pessoas, suas permissões ou seu domínio. A Aurora é mais
complexa porque conversa com equipe interna e público externo, opera numa clínica e
pode encontrar dados pessoais, financeiros e clínicos sensíveis.

Credenciais entram somente quando forem necessárias para versionar, validar ou
implantar um corte já aprovado. A captura será feita pelo OpenClaw Desktop ou por
cofre mascarado, nunca por Telegram, documento, commit, memória ou transcript.

## 2. Benchmark comprovado: Júlia

A fundação da Júlia foi construída e fechada nesta ordem:

1. `SOUL.md` — entrevista, aprovação, PR #5, CI, rollout e readback;
2. `USER.md` — nova entrevista, aprovação, PR #6, CI, rollout e readback;
3. contrato completo da casa e do sistema;
4. `AGENTS.md` — PR #8;
5. `PERMISSOES.md` — PR #9;
6. contexto Hermes compilado — PR #10;
7. `MEMORY.md` — PR #11;
8. `TOOLS.md` e skills — PR #12;
9. banco, roles, RPCs, adapters e rollout em checkpoints técnicos.

Referências vivas verificadas em 2026-09-24:

- agente: `julia-backup/origin/main@a4114e3`;
- sistema: `master-chef-la/origin/main@a4cfcea`;
- catálogo: 70/70 tools, sendo 26 leituras e 44 efeitos;
- cinco serviços e drift 88/88 documentados;
- fechamento técnico e CIs finais verdes.

Restaram na Júlia somente gates naturais de primeiro uso real e a rotação separada
de credenciais históricas nos provedores. Os clones locais antigos não são fonte de
verdade; qualquer nova mudança deve partir de checkout limpo do `origin/main`.

## 3. Método de entrevista e ratificação

Cada arquivo da fundação terá sua própria entrevista. O método de cada rodada é:

1. Alfredo apresenta uma pergunta decisiva e uma **prévia concreta** do que entende
   como resposta;
2. Alf aprova, refuta, corrige ou acrescenta seu olhar;
3. Alfredo devolve a síntese já incorporando os contrapontos;
4. Alf aprova semanticamente o corte;
5. somente a síntese sanitizada entra no repositório;
6. o texto bruto da entrevista não é versionado;
7. o corte passa por branch/PR, CI e testes shadow;
8. quando houver runtime, ocorre rollout mínimo autorizado e readback por hash;
9. o próximo arquivo só abre depois do fechamento do atual.

Uma pergunta por rodada e uma decisão humana por vez. A prévia do Alfredo é hipótese
de trabalho, não fato sobre pessoas nem regra já aprovada.

## 4. Pessoas e classes de relacionamento

A entrevista de `USER/pessoas` validará individualmente papel, autoridade, relação,
rotina, autonomia e tom para cada pessoa. A hipótese inicial separa dois grupos:

### Autoridades e equipe

- Alf;
- Anne;
- Bianca;
- Sergião;
- profissionais musicoterapeutas.

### Público externo

- paciente;
- responsável;
- família;
- lead.

Público externo pode pedir informação e atendimento, mas não recebe autoridade
clínica, financeira, administrativa ou técnica. A identidade autenticada no canal,
e não o nome alegado numa mensagem, determinará autoridade.

A Aurora continuará sendo uma única identidade. Ela poderá ajustar vocabulário,
profundidade e postura ao interlocutor sem virar múltiplas Auroras.

## 5. Complexidade e guardrails próprios da Aurora

Os seguintes pontos precisam aparecer explicitamente na fundação e nos testes:

- LGPD, privacidade e minimização de dados;
- separação entre conversa com família e conversa interna da equipe;
- identidade e consentimento antes de revelar informação protegida;
- crise, risco, urgência e escalonamento humano;
- diagnóstico, medicação e conduta clínica fora da autonomia da Aurora;
- prontuário, anamnese e evolução sob trava clínica;
- dinheiro, cobrança, desconto e conflito financeiro sob autoridade definida;
- WhatsApp como transporte e inbox compartilhada, não como prova automática de
  identidade ou autorização;
- tools estreitas, determinísticas, auditáveis e com menor privilégio;
- nenhum SQL livre ou `service_role` dentro do Hermes;
- efeitos sensíveis com preview, aprovação atual, execução, readback e recibo.

## 6. Checkpoints CP0 a CP16

São 17 checkpoints, numerados de CP0 a CP16.

### CP0 — Baseline, fontes e acessos

- Fixar repos, branches, SHAs, banco, runtime, serviços e fontes canônicas.
- Inventariar o que existe, o que é semente e o que ainda não existe.
- Separar leitura, escrita, deploy e segredo em gates distintos.
- Capturar credenciais apenas quando o corte aprovado realmente precisar delas.
- Não alterar banco, runtime, webhook, UAZAPI ou produção nesta fase.

**Saída:** baseline reproduzível, drifts declarados e matriz de acessos.

### CP1 — `SOUL.md`

- Definir quem a Aurora é, por que existe e para quem existe.
- Fechar frase-raiz, equação de valor, tom, atitudes e absolutos.
- Manter procedimentos técnicos fora da identidade.

**Saída:** identidade capaz de orientar respostas e recusas sem depender de tools.

### CP2 — `USER.md` e pessoas

- Uma rodada por pessoa ou papel central.
- Validar responsabilidades, autoridade, autonomia, preferência e relação.
- Separar equipe, profissionais, paciente, responsável, família e lead.

**Saída:** mapa humano sem pessoas reduzidas a rótulos técnicos e sem suposições.

### CP3 — `AGENTS.md`

- Definir ciclo operacional, fontes de verdade, roteamento e conclusão.
- Fixar fronteiras com SonoraMente, Hermes, central, UAZAPI e outros agentes.
- Manter regras econômicas mutáveis na fonte viva do negócio.

**Saída:** mapa de decisão operacional sem duplicar permissões.

### CP4 — `PERMISSOES.md`

- Separar consultar, preparar, propor, aprovar e executar.
- Definir autoridade por identidade autenticada e por domínio.
- Tratar financeiro, comunicação externa, produção, banco, segredo, prontuário e
  exclusão como efeitos materiais específicos.

**Saída:** matriz de autoridade, iniciativa, confirmação, efeito e recibo.

### CP5 — `MEMORY.md` e arquitetura de memória

- Separar sessão, memória curada, estado vivo do negócio e histórico operacional.
- Definir captura, validação, promoção, supersessão e retirada.
- Proibir transcript bruto, segredo e dado clínico desnecessário na memória.

**Saída:** fluxo testável de memória com origem, retenção, dono e correção.

### CP6 — `TOOLS.md`, skills e heartbeat

- Mapear intenção → skill → tool → fonte → efeito → recibo → falha.
- Definir alertas técnicos e de negócio com condição, deduplicação e dono.
- Congelar o primeiro catálogo antes de abrir capacidades.

**Saída:** contratos de capacidade versionados, ainda sem concessão ampla.

### CP7 — Censo do banco e envelope de segurança

- Inventariar RPCs, grants, policies, `SECURITY DEFINER`, `search_path` e consumers.
- Definir role dedicada, ator validado, auditoria, idempotência e rollback.
- Criar a allowlist por capacidade, nunca por acesso irrestrito ao banco.

**Saída:** fachada de banco revisável, testável e de menor privilégio.

### CP8 — Escuta do WhatsApp e agenda em leitura

- Gravar inbound nas mesmas tabelas `wa_*` usadas pela central.
- Manter `wa_aurora_config.ativa=false` como gate efetivo de saída.
- Abrir somente consultas mínimas de agenda e contexto autorizado.
- Provar que nenhum payload de teste produz envio real.

**Saída:** central continua enxergando; Aurora ouve e não fala.

### CP9 — Grupos, contexto, quoted e LID

- Tratar os dois grupos autorizados.
- Responder somente quando chamada conforme regra aprovada.
- Reconstruir contexto histórico mínimo e suficiente.
- Preservar quoted/reply e resolver LID sem perder mensagens.

**Saída:** testes shadow e negativos cobrindo menção, silêncio e contexto.

### CP10 — Agenda com escrita controlada

- Disponibilidade, marcação, cancelamento e remarcação em fatias separadas.
- Preview e confirmação proporcional ao efeito.
- Idempotência, readback, conflito de horário e recibo.

**Saída:** primeira escrita operacional estreita e reversível.

### CP11 — Leads e pacientes

- Triagem e evolução do lead antes da conversão.
- Cadastro mínimo, identidade e consentimento.
- Separar ficha cadastral de prontuário clínico.

**Saída:** fluxo lead → paciente sem inventar nem expor dado clínico.

### CP12 — Financeiro em leitura

- Consultar situação, vencimento e resumo somente no escopo autorizado.
- Não negociar, descontar, cobrar ou alterar valores nesta fase.

**Saída:** leitura financeira minimizada, auditada e testada por papel.

### CP13 — Dashboard, relatórios e profissionais

- Abrir consultas operacionais por necessidade e por público.
- Impedir inferência ou vazamento entre profissional, paciente e gestão.

**Saída:** visão operacional útil com escopo mínimo.

### CP14 — Prontuário com trava clínica

- Começar por resumos seguros e pendências autorizadas.
- Escrita de evolução somente pela autoridade clínica reconhecida.
- Diagnóstico, medicação e conduta permanecem fora da autonomia da Aurora.

**Saída:** capacidade clínica validada com consentimento, autoria e trilha de auditoria.

### CP15 — Convênios, automações e configurações

- Abrir por último, em cortes independentes.
- Inventariar crons e consumers antes de substituir ou desativar legado.
- Ambiente, chave, webhook, template ativo e configuração crítica ficam sob admin.

**Saída:** capacidades administrativas sem duplicação de disparos ou perda de consumer.

### CP16 — Rollout, corte, rollback e soak

- Provar repo → release imutável → VPS → prompt/contexto vivo.
- Subir bridge e Hermes em shadow antes de qualquer corte de webhook.
- Trocar o webhook somente com Luciano, após gravação em `wa_*` e silêncio provados.
- Manter rollback de um passo e observar logs, central, banco e mensagens.

**Saída:** operação estável, readback por hash, rollback testado e soak encerrado.

## 7. Gate obrigatório de cada corte

Todo checkpoint ou fatia vertical segue:

`entrevista → prévia do Alfredo → contraponto do Alf → síntese → aprovação semântica → branch/PR → CI/shadow → rollout mínimo autorizado → readback por hash → próximo corte`

Um corte só fecha com:

- decisões aprovadas e pendências explícitas;
- diff pequeno e revisável;
- scanner de segredo limpo;
- testes proporcionais ao risco;
- nenhum efeito externo não autorizado;
- hash do repo igual ao artefato implantado, quando houver rollout;
- rollback documentado e restaurável;
- evidência do conteúdo realmente carregado pelo runtime;
- registro do que ficou aprovado, aberto e fora de escopo.

## 8. Estado inicial deste plano

- `HANDOFF.md` e `MAPA-QUARTOS.md` são as fontes de entrada já versionadas.
- O benchmark da Júlia foi validado read-only.
- A fundação humana precede a entrega de credenciais técnicas.
- O primeiro arquivo a abrir é `SOUL.md`.
- `USER/pessoas` permanece fechado até o `SOUL.md` concluir seu próprio gate.
- Nenhuma soul, permissão, tool ou capacidade descrita aqui está automaticamente
  aprovada por constar no plano.

## 9. Próxima decisão

Abrir a entrevista do `SOUL.md` com uma pergunta por rodada. Alfredo deve trazer sua
prévia concreta em cada pergunta; Alf deve aprovar, refutar ou aprofundar antes da
síntese canônica.
