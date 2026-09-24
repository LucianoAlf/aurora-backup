# Mapa dos quartos — o que a Aurora pode fazer no SonoraMente

**Data:** 2026-09-23
**Para:** Alfredo
**De:** Luciano Alf
**Sistema:** [LucianoAlf/Sonoramente](https://github.com/LucianoAlf/Sonoramente)
**Banco:** Supabase Sonoramente ERP, project id `krcuhpwvwilojcpofemw`
**Produção:** https://sonoramente-la.vercel.app

Este arquivo lista a casa. Cada página do sistema é um quarto. A chave do quarto é o acesso MCP que você vai construir. Os utensílios são as ações que já existem nesse quarto. A Aurora não ganha a casa inteira no primeiro dia. Ela precisa saber que os quartos existem para você preparar a chave certa.

Leia junto com [HANDOFF.md](HANDOFF.md).

---

## Como ler

| Palavra | O que é |
|---|---|
| Quarto | Uma área do SonoraMente (página do menu, ou um canto que existe no código e ainda não está no menu) |
| Chave | Allowlist MCP. Uma tool entra num quarto e só mexe no que a allowlist deixar |
| Utensílio | Uma ação que o sistema já faz hoje, com gente clicando. Vira tool quando você ligar |
| Porta de código | Hook ou RPC no repo Sonoramente. É por onde a ação entra no banco |

Regra da casa: a Aurora lê à vontade o que for operacional. Escreve com critério. Prontuário, diagnóstico e conduta clínica não entram soltos no prompt. A soul já trava isso. No WhatsApp ela está em escuta: grava, não fala com paciente, e nos grupos só responde quando for chamada.

Quem entra em cada quarto hoje, pelo login humano:

| Papel | Quartos |
|---|---|
| Admin | a casa inteira, inclusive Configurações e o interruptor da Aurora |
| Recepção (Sergião, Bianca) | Dashboard, Leads, Pacientes, Agenda, Central WhatsApp. Sem financeiro, sem prontuário, sem configurar a Aurora |
| Profissional | Dashboard, Pacientes, Agenda, Prontuário |
| Financeiro | Dashboard, Pacientes, Financeiro, Relatórios |

A chave da Aurora não copia um desses papéis. Você monta a allowlist em cima desta lista.

---

## 1. Dashboard

Visão do dia. Não é onde se marca nem se cobra. É o quadro na entrada.

Utensílios:

- KPIs do mês
- Agenda de hoje
- Resumo financeiro do mês
- Ocupação dos profissionais na semana

Porta: `src/hooks/useDashboard.ts`. RPCs `get_dashboard_completo`, `get_dashboard_kpis`, `get_agenda_dia`, `get_financeiro_resumo`, `get_ocupacao_profissionais`.

Tool natural: “como está o dia da clínica”. Só leitura.

---

## 2. CRM e leads

Funil de quem ainda não é paciente.

Utensílios:

- Ver o funil e achar um lead
- Criar lead
- Editar dados e anotação
- Mover de etapa: novo, triagem, agendado, ativo, perdido
- Marcar como perdido
- Excluir lead
- Converter lead em paciente
- Origem: indicação, Instagram, Google, LA Music, outro
- Relatório comercial do mês

Porta: `src/hooks/useLeads.ts`, página `src/pages/Leads.tsx`. RPC `get_relatorio_comercial`.

Tools naturais: triar lead, anotar o que a família pediu, marcar que virou paciente, perguntar de onde veio. Converter em paciente escreve no quarto de pacientes. Só depois que a ficha mínima existir.

---

## 3. Pacientes

A ficha da família. Quarto de cadastro, não de evolução clínica longa (isso é o prontuário).

Utensílios:

- Listar pacientes, inclusive arquivados
- Abrir a ficha
- Cadastrar paciente
- Editar cadastro
- Cadastrar e atualizar responsáveis
- Inativar paciente (o histórico fica)
- Ver e editar evolução curta a partir da ficha
- Arquivar evolução
- Documentos do paciente: prever, gerar, marcar assinado, anexar NFS-e, abrir PDF, marcar se emite nota

Portas: `src/hooks/usePacientes.ts`, `src/pages/pacientes/FichaPaciente.tsx`, `src/hooks/useDocumentos.ts`.

RPCs: `get_pacientes_lista`, `get_ficha_paciente`, `atualizar_evolucao`, `arquivar_evolucao`, `app_prever_documento`, `app_gerar_documento`, `app_marcar_documento_assinado`, `app_anexar_nfse`, `app_atualizar_pdf_sha`.

Tools naturais: achar o paciente pelo nome ou pelo WhatsApp, ver responsável, ver se o plano está ativo, gerar contrato ou recibo quando isso já estiver fechado com a equipe. Inativar e gerar documento são escrita. Não inventar dado clínico na ficha.

---

## 4. Agenda

O quarto que a Aurora mais vai usar no começo do atendimento. Marcar, desmarcar, remarcar, ver se cabe, avisar.

Utensílios:

- Ver a semana, o dia e o mês
- Ver ocupação de cada profissional
- Marcar sessão única ou série semanal ou quinzenal (paciente, musicoterapeuta, sala, especialidade, horário, tipo, quantidade, parcelas do pacote)
- Remarcar data e hora. A sessão volta para `agendada`
- Cancelar com motivo. Dá para já deixar a reposição (destino, data, hora)
- Fazer a chamada: presença, com motivo da família ou da casa
- Prever quantas sessões o pacote ainda cobre antes de marcar a série
- Alertar pacote acabando, e uma watchlist de pacotes no fim
- Calendário da clínica: simular um obstáculo (feriado, recesso), confirmar e remarcar a série, importar feriados do ano, criar feriado municipal, desativar feriado

Portas: `src/hooks/useAgenda.ts`, `src/hooks/useCalendarioClinica.ts`, `src/hooks/usePacotesAlerta.ts`, página `src/pages/Agenda.tsx`.

RPCs: `get_agenda_semana`, `get_agenda_dia`, `get_ocupacao_profissionais`, `app_materializar_serie`, `app_cancelar_sessao`, `app_registrar_chamada`, `app_prever_pacote`, `app_alerta_pacote`, `app_watchlist_pacote`, `app_simular_obstaculo`, `app_confirmar_obstaculo`, `app_upsert_feriados`, `app_desativar_feriado`. Remarcar hoje grava direto na tabela `sessoes`.

O aviso ao cliente e a confirmação com a musicoterapeuta não moram neste quarto. Moram na automação (crons de lembrete e de confirmação) e na central de WhatsApp. A tool “avisar a família” marca ou lê a agenda e manda mensagem pelo quarto do WhatsApp. A tool “confirmar com a musicoterapeuta” lê a sessão e fala com o profissional, não decide presença sozinha.

Tools naturais, nesta ordem: ver horário livre, marcar, desmarcar, remarcar, dizer o que tem amanhã, avisar que o pacote está no fim. Chamada e feriado ficam para quando o Sergião e a Bianca já estiverem usando isso na mão.

---

## 5. Prontuário

Quarto clínico. A Aurora pode ler um resumo seguro. Escrever evolução é utensílio de musicoterapeuta, não de pré-atendimento.

Utensílios:

- Abrir o prontuário do paciente
- Salvar evolução (rascunho ou finalizada), com metas trabalhadas na sessão
- Atualizar evolução
- Arquivar evolução (some da lista, não apaga o histórico)
- Salvar anamnese no modelo da clínica
- Criar e atualizar meta terapêutica
- Subir e baixar documento clínico (laudo externo, etc.)
- Ditar evolução: transcrever áudio e reescrever o texto (funções `transcrever-evolucao` e `reescrever-evolucao`)

Portas: `src/hooks/useProntuario.ts`, `src/pages/Clinico.tsx`, `src/hooks/useAnamneseTemplates.ts`, `src/components/NarrativaComMic.tsx`.

RPCs: `get_prontuario_paciente`, `salvar_evolucao`, `atualizar_evolucao`, `arquivar_evolucao`, `salvar_anamnese_modelo`, `salvar_meta`.

Tools naturais mais tarde: “o que está pendente de evolução”, “quais metas estão ativas”, registrar evolução quando a musicoterapeuta ditar. No pré-atendimento a Aurora não diagnostica, não sugere conduta e não despeja anamnese no WhatsApp da família.

---

## 6. Financeiro

Quarto de dinheiro da clínica, não do convênio (convênio é o quarto 7).

Abas da página `src/pages/Financeiro.tsx`:

- A receber
- Recebido
- Planos
- Contas a pagar
- Repasses
- Fluxo de caixa

Utensílios:

- Ver o financeiro do mês, unificado
- Ver fluxo de caixa
- Criar cobrança (PIX, cartão, ou manual sem Asaas). Dá para gerar no Asaas e optar por avisar no WhatsApp
- Cancelar cobrança
- Criar e editar plano (pacote de 8, pacote de 20, mensal, avulso, convênio; mensal, trimestral, semestral, anual)
- Listar contas a pagar, filtrar por categoria e status
- Lançar conta a pagar (recorrente, avulsa, parcelada). Categorias: aluguel, salários, sistema, material, marketing, contabilidade, equipamento, impostos, manutenção, outros
- Marcar conta como paga
- Excluir conta a pagar
- Ver repasse calculado do profissional no mês

Porta: `src/hooks/useFinanceiro.ts`.

RPCs: `get_financeiro_unificado`, `get_fluxo_caixa`, `get_planos`, `criar_plano`, `editar_plano`, `get_contas_pagar_filtrado`, `get_repasse_calculado`. Cobrança e conta a pagar também gravam tabelas pelo hook.

Tools naturais: “quanto esta família deve”, “quando vence”, “manda um lembrete amigável”, “resumo do mês”, “contas a pagar desta semana”, “repasse da musicoterapeuta”. Cobrança amigável já tem skill no rascunho (`cobranca-amigavel`). Não negociar conflito, não prometer desconto, não alterar valor sem um humano.

Asaas (cobrança de verdade, cliente, assinatura, Pix automático, webhook) aparece em Configurações, aba Integrações. RPCs `get_asaas_dashboard`, `get_asaas_clientes`, `asaas_set_ambiente`. A edge `asaas-api` e o `webhook-asaas` são a porta com o Asaas. A Aurora consulta. Quem muda ambiente e chave é admin.

---

## 7. Convênios

Quarto que existe no código (`src/pages/Convenios.tsx`, `src/hooks/useConvenios.ts`) e ainda não está no menu lateral. A página abre se alguém navegar para `convenios`.

Utensílios:

- Listar, criar, editar e excluir ou inativar convênio
- Guias: listar e criar
- Glosas: listar, criar, atualizar status e contestação

RPCs: `get_convenios_lista`, `criar_convenio`, `editar_convenio`, `get_guias_lista`, `criar_guia`, `get_glosas_lista`, `criar_glosa`, `atualizar_glosa`.

Tool natural, mais tarde: “essa guia foi glosada?”. Não é pré-atendimento.

---

## 8. Profissionais

Musicoterapeutas e a equipe clínica.

Utensílios:

- Listar profissionais
- Cadastrar profissional
- Editar profissional
- Ver ocupação (isso a agenda e o dashboard também leem)

Porta: `src/hooks/useProfissionais.ts`. RPCs `get_profissionais_lista`, `criar_profissional`, `editar_profissional`.

Tools naturais: “quem atende musicoterapia nesta sala”, “a Bianca tem horário”, “qual o repasse dela neste mês” (o número mora no financeiro). Cadastrar profissional é admin.

Usuários de login (Sergião, Anne, convite por WhatsApp) moram em Configurações, não aqui. Edge `admin-create-user`.

---

## 9. Automação e crons

Quarto dos avisos que disparam sozinhos. A Aurora não substitui o cron no primeiro dia. Ela precisa saber que eles existem, porque falam pelo mesmo WhatsApp `552134008890`.

Na tela (`src/pages/Automacao.tsx`, `src/hooks/useAutomacao.ts`):

- Ver e editar o texto dos templates
- Ligar e desligar um template
- Ver o histórico do que já foi enviado

RPCs: `get_notificacoes_config`, `update_notificacao`, `get_historico_notificacoes`.

Crons no Postgres (`cron.job`) que batem em edge functions:

| Cron | Ritmo | Edge |
|---|---|---|
| session-reminder-30min | a cada 30 min | `session-reminder` |
| confirm-session-daily | todo dia 12:00 UTC | `confirm-session` |
| billing-reminder-daily | todo dia 12:00 UTC | `billing-reminder` |
| plan-renewal-alert-daily | todo dia 12:05 UTC | `plan-renewal-alert` |
| birthday-message-daily | todo dia 12:10 UTC | `birthday-message` |
| professional-repasse-monthly | dia 1, 12:00 UTC | `professional-repasse` |
| notif-resumo-diario-prof | 10:30 UTC | `aurora-notificacoes` |
| notif-resumo-diario-admin | 11:00 UTC | `aurora-notificacoes` |
| notif-contas-vencimento | 11:00 UTC | `aurora-notificacoes` |
| notif-resumo-semanal-fin | segunda 11:00 UTC | `aurora-notificacoes` |
| notif-contas-resumo-semanal | segunda 11:00 UTC | `aurora-notificacoes` |
| notif-ocupacao-baixa | sexta 11:00 UTC | `aurora-notificacoes` |
| notif-pos-vencimento | 13:00 UTC | `aurora-notificacoes` |
| notif-paciente-inativo | 13:00 UTC | `aurora-notificacoes` |
| notif-pos-sessao | toda hora | `aurora-notificacoes` |
| notif-prontuario-pendente | 17:00 UTC | `aurora-notificacoes` |
| notif-resumo-semanal-prof | domingo 22:00 UTC | `aurora-notificacoes` |
| notif-resumo-mensal | dia 1, 12:00 UTC | `aurora-notificacoes` |
| limpar-contextos-aurora | a cada 15 min | SQL direto |
| gerar-resumos-aurora | a cada 2 h | `aurora-resumos` |
| keepalive-webhook-whatsapp | a cada 4 min | `webhook-whatsapp` |
| keepalive-send-whatsapp | a cada 4 min | `send-whatsapp` |
| keepalive-aurora-resumos | a cada 8 min | `aurora-resumos` |

Também existem, sem cron nesta lista: `absence-followup`, `welcome-patient`, `auto-document`, `relatorio-repasse`, `relatorio-gerencial`, `sync-feriados`.

Tools naturais: ler o que o cron já ia dizer e, quando a Aurora puder falar, mandar ela mesma com o tom da soul. Não desligar cron no escuro. Combinar com o Luciano qual aviso migra para o Hermes.

---

## 10. Central de WhatsApp

A boca da casa. É aqui que a família escreve e o Sergião responde. A Aurora mora neste quarto, em silêncio, até o Hermes assumir a fala.

Número da instância: `552134008890`. Detalhe de webhook e de grupos está no HANDOFF.

Utensílios de inbox:

- Listar conversas e o contador de não lidas
- Abrir o fio, marcar como lida
- Enviar texto, áudio, imagem, documento, figurinha
- Resposta rápida e template com variável
- Editar, apagar e reagir mensagem
- Reenviar se falhou
- Ligar ou desligar a Aurora naquela conversa
- Assumir a conversa (passa para humano)
- Pedir sugestão de resposta (`aurora-assist`). Sugestão não é envio
- Etiquetas e notas no contato
- Ficha do contato ao lado do chat

Portas: `src/pages/WhatsApp.tsx`, `src/hooks/useWhatsApp.ts`, `src/hooks/useChat.ts`, `src/hooks/useSidebarContato.ts`, `src/hooks/useFicha.ts`.

RPCs e tabelas: `wa_conversas`, `wa_mensagens`, `wa_contatos`, `wa_marcar_lida`, `get_sidebar_contato`. Envio pela edge `send-whatsapp`. Entrada pela edge `webhook-whatsapp`.

Deste chat a equipe já consulta outros quartos sem sair da conversa: agenda do dia, repasse, prontuário, evolução pendente (`wa_aurora_sessao_sem_evolucao`, `get_prontuario_paciente`, `salvar_evolucao`). Isso é a prova de que a central é a sala de estar. As tools dos outros quartos têm que funcionar aqui.

Tools naturais:

- Gravar tudo que entrar (já acontece)
- Não responder paciente enquanto `wa_aurora_config.ativa` for falso
- Nos grupos SonoraMente e Referências Instagram, ficar quieta até ser chamada, e responder com o contexto do que já foi postado
- Quando puder falar com a família: confirmar horário, lembrar sessão, cobrar com educação, triar lead, escalar humano
- Escalar para o Sergião, a Bianca ou a Anne. Não fingir que resolveu clínica

O cérebro antigo deste quarto é a edge `aurora-responder` (Gemini). Isso deixa de ser o caminho. Quem conversa passa a ser o Hermes. A central continua lendo `wa_mensagens`. Se a bridge não gravar ali, o Sergião fica cego.

---

## 11. Relatórios

Leitura. Números do mês para a Anne e para o Luciano.

Utensílios:

- Resumo financeiro do mês
- Relatório clínico do mês
- Relatório comercial do mês
- Ocupação dos profissionais no intervalo

Porta: `src/hooks/useRelatorios.ts`, `src/pages/Relatorios.tsx`.

RPCs: `get_financeiro_resumo`, `get_relatorio_clinico`, `get_relatorio_comercial`, `get_ocupacao_profissionais`.

Tool natural: “me dá o fechamento do mês”, “quem está com a agenda frouxa”, “quantos leads viraram paciente”. Só leitura. Relatório clínico devolve agregado, não o texto da evolução.

---

## 12. Configurações

Quarto do admin. A Aurora não mexe em chave, usuário e ambiente. Ela precisa saber que o interruptor dela mora aqui.

Abas (`src/pages/Configuracoes.tsx`, `src/hooks/useConfiguracoes.ts`):

- Clínica: dados da casa
- Salas: onde a sessão acontece
- Usuários: convite, papel (admin, profissional, recepção, financeiro)
- Integrações: status e Asaas
- Notificações: os mesmos slugs da automação
- Anamneses: modelos do prontuário (criar, ligar, desligar, excluir)
- Aurora e WhatsApp: ligar a Aurora, horário, personalidade, grupos, respostas rápidas, status da instância UAZAPI

`wa_aurora_config.ativa = false` é o interruptor mestre. Enquanto estiver falso, ela não fala. Grupo e privado obedecem a isso.

Tool natural: nenhuma de escrita neste quarto no começo. Leitura do próprio modo (estou muda, quais grupos escuto) pode existir.

---

## Ordem sugerida das chaves

Não construir as doze de uma vez. A casa inteira está listada para a allowlist não nascer torta.

1. Agenda, leitura. WhatsApp, gravar sem falar.
2. Agenda, marcar, desmarcar, remarcar. Aviso à família ainda com o Sergião confirmando, ou só quando chamarem a Aurora no grupo.
3. Paciente e lead, leitura e triagem. Converter lead só com a ficha mínima.
4. Financeiro, leitura e lembrete amigável. Sem mudar valor.
5. Relatório e dashboard, leitura.
6. Profissional, leitura de quem atende e da ocupação.
7. Prontuário, leitura segura. Escrita de evolução só quando a musicoterapeuta pedir.
8. Convênio, automação e configuração por último, e quase tudo leitura.

Cada tool nova entra na allowlist do MCP e no repo `aurora-backup` junto com o que subir na VPS. O banco continua sendo `krcuhpwvwilojcpofemw`. Sem `service_role` dentro do Hermes. Sem SQL livre.
