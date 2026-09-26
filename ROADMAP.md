# ROADMAP da Aurora (SonoraMente)

> Estado vivo do projeto, atualizado a cada etapa. Detalhe técnico em `CHECKPOINT.md`, ferramentas em `FERRAMENTAS.md`, método em `PLAYBOOK-NOTAS.md`.
> Última atualização: **2026-09-26 20:15 UTC** (Alfredo, com o Alf).

## Onde estamos

| # | Etapa | Status | Evidência |
|---|---|---|---|
| 1 | Fundação (SOUL, USER, AGENTS, PERMISSOES, MEMORY) | ✅ | CP1–CP5, hash conferido na VPS |
| 2 | Backup da memória (Honcho preparado, restauração testada) | ✅ | Honcho **desligado** até a virada ao vivo |
| 3 | Segurança do banco e do app (crachás por função, RPC, carimbo) | ✅ | `aurora_mcp`, `aurora_escrita`, `aurora_ponte` |
| 4 | Leitura: 11 ferramentas | ✅ | MCP `aurora-read` 0.5.1 |
| 5 | Escrita: aviso de falta/remarcação, leads (3) e **pedido pra equipe** | ✅ | MCP `aurora-write` 0.4.0 |
| 6 | Carimbo do remetente (HMAC; número solto recusado) | ✅ | plugin `aurora-carimbo` 0.4.0 |
| 7 | Modelo: **GPT-6 Sol medium Fast** pela assinatura, reserva DeepSeek | ✅ | benchmark 2 rodadas (`docs/bench/`) |
| 8 | Ponte WhatsApp: sombra, ao vivo por conversa, regra de silêncio, "digitando" | ✅ | ponte 0.5.1; liberados: Alf e Serjão |
| 9 | Mídia: foto (visão), PDF (texto) e áudio (transcrição) | ✅ | testado com o Alf (foto, PDF, áudio) |
| 10 | Skills da SonoraMente (4): famílias, leads, equipe, **copiloto e treino** | ✅ | `runtime/skills/sonora-mente/` |
| 11 | **Aurora Assistant** na Central: sugestão + Enviar/Editar/Copiar/Ignorar + botões de tom | ✅ | Central `763a146`; uso alimenta a régua |
| 12 | **Cérebro único**: funções de texto da Central no GPT-6 Sol (VPS), Gemini de reserva | ✅ | `aurora-cerebro`; baterias 15/15 nas 3 rotas |
| 13 | Régua da sombra (30 revisadas, 0 grave) | 🟡 | **5/30**, 1 grave (antes da correção), prazo **02/10** |
| 14 | Serjão no privado (copiloto e treino) | 🟡 | liberado; aguardando a 1ª mensagem dele |
| 15 | Virada ao vivo para as famílias + interruptor geral na Central | ⏳ | depende da régua |
| 16 | Memória da Aurora (Honcho ligado, uma gaveta por pessoa) | ⏳ | liga junto com a virada |
| 17 | Caixa | ⏳ | |
| 18 | Instagram e social media (+ ponte com Mila e Maria) | ⏳ | |
| 19 | Playbook | 🟡 | **v1 publicada** (`playbook/`) + skill `criar-agente-hermes` instalada no Alfredo, apontando para o repo; v2 com caixa, Instagram e memória |
| 20 | Cérebros antigos (Gemini) aposentados | ✅ | `aurora-assist` e `aurora-responder` respondem 410; código em `_aposentadas/` |
| 21 | Documentação enxuta (35 KB → 11,2 KB) | ✅ | em produção 26/09 (`e208f1d`), hash conferido; USER/MEMORY dentro dos limites; backup em `/home/aurora/backups/` |

## Riscos e oportunidades (26/09)

1. **A régua não fecha até 02/10 no ritmo atual.** Foram 92 mensagens e só 8 respostas em sombra, porque a maioria é grupo que não chama a Aurora. O Aurora Assistant resolve: cada clique do Serjão vira revisão. Ação: o Serjão usar o painel no dia a dia a partir de segunda. Se em 02/10 estiver abaixo de 30, estender o prazo em vez de baixar o critério.
2. **Pouco dado no ERP:** só 3 pacientes cadastrados, então quase toda família real cai como lead. Ação: ampliar o cadastro (texto já entregue ao Alf para Bianca/Serjão).
3. ~~Cérebros antigos (Gemini)~~: aposentados em 26/09 (estavam públicos, sem login).
4. **Cérebro único em mais funções:** modo "família" da reescrita de evolução e resumos.
5. ~~USER.md acima do limite~~: resolvido em 26/09 (documentação enxuta em produção).
6. **Ferramenta geral de parcelas atrasadas:** hoje só existe por criança.
7. **Saúde diária:** o placar das 9h já confere a ponte. Ação: incluir o `aurora-cerebro` e o limite da assinatura.
8. **Teste em grupo chamando "Aurora":** adiado pelo Alf.

## Próximos passos (ordem do Alf, 26/09)

1. O Serjão usar o privado e o Aurora Assistant a partir de segunda.
2. Régua fechada → virada ao vivo + Honcho. Caixa e Instagram depois.
3. **Sol:** revisão pelo playbook e Sol 100% nos três grupos.
4. **Mike:** aplicar o playbook e trazer para o Hermes.
5. **Alfredo no Hermes:** em paralelo até o Alfredo dar o ok, seguindo playbook + skill, com revisão da documentação de instalação do Hermes.
