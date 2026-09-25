# FERRAMENTAS.md: catálogo das ferramentas da Aurora

> Fonte da verdade do que a Aurora consegue fazer no ERP da SonoraMente, ferramenta por ferramenta.
> Cada entrada responde a quatro perguntas: **o que é**, **como funciona**, **como está agora** e **qual habilidade dá à Aurora**.
> Atualizar a cada ferramenta nova, alterada ou aposentada, no mesmo commit do runtime.

**Atualizado:** 2026-09-25 · Repo do app: `LucianoAlf/Sonoramente` · Banco: Supabase `krcuhpwvwilojcpofemw`

## Como a Aurora chega no banco

| Peça | O que é | Onde |
|---|---|---|
| Crachá de leitura `aurora_mcp` | Login do Postgres. Transação só-leitura, timeout de 5 s, até 5 conexões. Sem acesso a tabela nenhuma: só executa as RPCs `aurora_*` concedidas. | Migration `20260925120000` |
| Crachá de escrita `aurora_escrita` | Login separado (ex-`aurora_aviso`, renomeado na escrita 2). Um crachá só, com permissão função por função: `aurora_registrar_aviso_v2`, `aurora_lead_registrar`, `aurora_lead_mover_etapa`, `aurora_lead_followup_registrar`. Não lê tabela nenhuma. | Migrations `20260925220000`, `20260925223000` e `20260925230000` |
| MCP `aurora-read` | Servidor stdio no padrão da Julia. Allowlist fechada, conferência do crachá antes de cada chamada e log sem dado pessoal. | `runtime/mcp/aurora-read` |
| MCP `aurora-write` | Mesmo padrão, 4 ferramentas. Env `AURORA_DB_ESCRITA_URL`. | `runtime/mcp/aurora-write` |
| TLS | `sslmode=verify-full` com a raiz Supabase fixada em `/home/aurora/.hermes/supabase-root-2021.crt`. | `.env` da Aurora (URLs entre aspas) |
| Release | Cada versão vai para `/home/aurora/releases/<sha>/runtime/mcp/…`, com `npm ci` e testes na VPS. O Hermes aponta para o sha. | `runtime/RUNTIME.md` |

**Regra de escopo, igual em todas as ferramentas.** Quem pede é identificado no banco pelo número ou LID (`aurora_ator`):
- **Time** (Alf, Anne, Bianca, Serjão): vê tudo.
- **Terapeuta:** só os próprios pacientes.
- **Família:** só as próprias crianças.
- **Resto** (Rose, Ana e Hugo fora do financeiro, desconhecido): `sem_permissao`.

Nada clínico sai: diagnóstico, CID, alerta, observação, queixa ou suspeita de diagnóstico.

⚠️ **Pendente antes do canal:** hoje o solicitante é informado pela própria Aurora. Antes de ligar o WhatsApp, a ponte carimba o remetente real e as ferramentas passam a aceitar só esse carimbo.

---

## Leitura (MCP `aurora-read` 0.4.0, 11 ferramentas)

### 1. `aurora_quem_e`: quem é esta pessoa
- **O que é:** identificação pelo número de WhatsApp (com ou sem 55, com ou sem o nono dígito) ou pelo LID.
- **Como funciona:** procura nesta ordem: equipe (`aurora_equipe`), família (`responsaveis`), lead e, se nada bater, desconhecido. Resolve LID por `aurora_identificadores` e depois por `wa_lid_map`.
- **Devolve:**
  - equipe: nome e papel;
  - família: responsável e crianças, com status, terapeuta e próxima sessão;
  - lead: responsável, criança, idade, etapa e origem;
  - desconhecido: só isso.
- **Habilidade:** saber com quem está falando antes de responder qualquer coisa.
- **Estado:** no ar. Testado: equipe com e sem 55 e sem o nono dígito, família, LID e desconhecido.

### 2. `aurora_conferir_crianca`: família nova ou número novo
- **O que é:** conferência pelo nome da criança, sem devolver dado nenhum.
- **Como funciona:**
  - `confere` quando nome da criança, nome do responsável e data de nascimento batem com uma única família;
  - `pista` quando só o nome bate;
  - `nao_encontrado` quando nada bate.
- **Habilidade:** acolher quem escreve de um número novo sem vazar nada. Com `pista`, agenda, sessão e cobrança só saem depois da confirmação do Serjão ou da Bianca.
- **Estado:** no ar.

### 3. `aurora_hoje`: data, hora e expediente
- **O que é:** data e hora de São Paulo, dia da semana, feriado ou recesso de hoje e de amanhã, e se está em expediente (seg–sex 10–19, sáb 8–12).
- **Habilidade:** entender "hoje" e "amanhã" e saber se é horário de atendimento.
- **Estado:** no ar.

### 4. `aurora_sessoes_paciente`: próximas sessões da criança
- **Devolve:** até 5 sessões com data, dia, hora, terapeuta, status e "sessão X de Y".
- **Quem:** responsável (só as crianças dele), terapeuta (só os pacientes dele) e time, em DM ou grupo.
- **Habilidade:** responder "tem sessão amanhã?". Remarcação não é com ela: avisa o atendimento.
- **Estado:** no ar.

### 5. `aurora_agenda_do_dia`: agenda do dia
- **Devolve:** hora, criança, terapeuta, sala, status e "sessão X de Y". Sem diagnóstico.
- **Quem:** o time vê tudo; o terapeuta vê a própria agenda; família e resto não veem.
- **Estado:** no ar.

### 6. `aurora_pacote_status`: calendário inteligente do pacote
- **Como funciona:** usa a regra do app (`app_cor_pacote`). Mês-alvo = mês da 1ª sessão + (parcelas − 1).
  - 🟢 **verde:** a última sessão cai no mês-alvo;
  - 🟡 **amarelo:** as sessões acabam antes;
  - 🔴 **vermelho:** passam do mês-alvo.
- **Devolve:**
  - para time e terapeuta: sessões, realizadas, faltas, última prevista, parcelas, mês-alvo e cor;
  - para a família: só "sessão X de Y".
- **Estado:** no ar. Pacote de teste lido verde (20 sessões, 6 parcelas, alvo 02/2027).

### 7. `aurora_pacotes_atencao`: pacotes em atenção
- **Devolve:** todos os amarelos e vermelhos. Vai virar alerta diário para o Serjão e entrar nos relatórios.
- **Quem:** o time (o terapeuta vê os dele).
- **Estado:** no ar.

### 8. `aurora_simular_recesso`: simulador de recesso
- **O que é:** "se fecharmos de X a Y, quais pacotes mudam de cor?". Não grava nada.
- **Quem:** só a direção.
- **Estado:** no ar.

### 9. `aurora_financeiro_familia`: financeiro da família
- **Devolve:** parcelas em aberto (valor, vencimento, a vencer ou atrasada, dias de atraso), próxima a vencer, total em aberto e link de pagamento do Asaas quando houver.
- **Quem:** o responsável (só as crianças dele) e o grupo financeiro (Alf, Anne, Bianca, Serjão, Rose, Ana).
- **Nunca:** negociar, dar desconto ou mudar valor. Isso vai para o Serjão.
- **Estado:** no ar (o ERP ainda não tem cobranças; testado com dado de teste e rollback).

### 10. `aurora_lead` e 11. `aurora_leads_followup`: lead e follow-up
- **Devolve:** etapa, canal de origem, dias desde o contato, Consulta de Acolhimento marcada e follow-up da vez (D+1, D+3, D+7). A segunda lista os follow-ups que vencem hoje.
- **Quem:** o time.
- **Nunca:** suspeita de diagnóstico nem queixa.
- **Estado:** no ar.

---

## Escrita (MCP `aurora-write` 0.2.0, 4 ferramentas)

### E1. `aurora_avisar_atendimento`: avisar falta ou pedido de remarcação
- **O que é:** o primeiro "braço" da Aurora. Registra na lista de avisos da equipe (`aurora_avisos_atendimento`) que a família avisou falta ou pediu remarcação.
- **Como funciona:**
  - Recebe remetente, tipo, nome da criança, data da sessão (opcional; sem data, vale a próxima), resumo, motivo e se é saúde.
  - A função `aurora_registrar_aviso_v2` resolve a criança e a sessão pelo remetente, com a mesma trava das leituras.
  - É idempotente por dia: o mesmo aviso não duplica.
  - Quando o motivo é saúde, marca `pede_atestado`.
- **O que ela NÃO faz:** não marca falta, não cancela e não remarca. Isso continua com o Serjão.
- **Resposta à família:**
  - falta: "Vou avisar o atendimento";
  - remarcação: "Vou encaminhar pra equipe falar com a senhora/o senhor";
  - saúde: pede o atestado, **sem prometer reposição**.
- **Quem pode:** a família (só as próprias crianças) e o time repassando. Desconhecido, Rose e resto são recusados.
- **Quem vê a lista:** admin e recepção. A equipe só muda o status (pendente → visto → resolvido); o texto fica travado.
- **Estado:** no ar. Teste real em 2026-09-25 16:43 (SP), com o Alf repassando um aviso: registrado com sessão, febre e pede atestado. A tela da lista na Central é com o Cursor. Avisar o Serjão no grupo liga quando o canal da Aurora subir.

### E2a. `aurora_lead_registrar`: registrar família nova
- **O que é:** cria o lead de quem chegou pela primeira vez ou completa o que faltava (criança, idade, motivação, origem). Liga o contato do WhatsApp ao lead.
- **Como funciona:**
  - acha o lead pelo número (com ou sem 55, nono dígito, LID); se já existe, só completa campos vazios;
  - origem: indicação, Instagram, Google, LA Music, WhatsApp, site, evento ou outro;
  - a motivação vai com as palavras da família, **sem diagnóstico nem suspeita**;
  - criança com **mais de 12 anos** entra direto como perdido (`fora_faixa_etaria`), para a estatística;
  - número que já é família ou equipe é recusado (`ja_cadastrado`).
- **Habilidade:** nenhuma família nova se perde; o Serjão recebe o lead já com origem e contexto.
- **Estado:** no ar.

### E2b. `aurora_lead_mover_etapa`: triagem ou perdido
- **O que é:** move o lead de novo para triagem (a família respondeu e está conversando) ou para perdido.
- **Perdido exige motivo:** `sem_resposta` (só depois do D+7), `sem_interesse`, `fora_faixa_etaria`, `procurava_aula_musica` (indicar a LA Music) ou `outro`.
- **Nunca:** agendado (a Consulta de Acolhimento quem marca é o Serjão) nem ativo (conversão; dispara as boas-vindas). Lead agendado, ativo ou perdido não muda mais pela Aurora.
- **Estado:** no ar.

### E2c. `aurora_lead_followup_feito`: follow-up feito
- **O que é:** registra que o follow-up da vez (D+1, D+3, D+7) foi feito, com resultado `enviado`, `respondeu` ou `sem_resposta`.
- **Como funciona:** um registro por lead e etapa (repetir só atualiza o resultado). A leitura `aurora_leads_followup` deixa de listar o que já foi feito.
- **Estado:** no ar.

**Testes da escrita 2 (2026-09-25):**
- 15 casos por papel, pelo crachá, em transação com rollback: registrar, repetir, agendado recusado, perdido sem motivo recusado, triagem, follow-up e repetição, perdido, lead encerrado travado, 14 anos vira perdido, número da equipe recusado, origem inválida, lead inexistente, leitura direta da tabela bloqueada.
- O follow-up feito some da lista do dia.
- Ponta a ponta: a Aurora identificou o número, registrou o lead, moveu para triagem, não falou de preço nem de diagnóstico e preparou o resumo para o Serjão. O lead de teste ficou como perdido (`outro`) com a anotação de teste.

⚠️ As ferramentas de lead recebem o número da família. Até a ponte carimbar o remetente, uma pessoa poderia pedir para mexer no lead de outro número; o carimbo fecha isso antes do canal.

---

## Próximas (plano em `CHECKPOINT.md`)
- Carimbo do remetente pela ponte.
- Caixa novo no modelo da Sol.
- Canal WhatsApp e Instagram; social media e scraping.
