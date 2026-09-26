---
name: criar-agente-hermes
description: Criar, migrar ou auditar agente no Hermes (LAHQ): novo agente, SOUL/AGENTS, ferramentas, carimbo, canal WhatsApp, sombra, copiloto, modelo. Segue o Playbook v1.
---

# Criar um agente no Hermes (método LAHQ)

Referências:
- `references/PLAYBOOK-AGENTE-HERMES-v1.md`: o porquê e as armadilhas de cada etapa;
- `references/GUIA-CRIAR-AGENTE-HERMES.md`: comandos e detalhes do runtime.

Uma etapa por vez. Prévia → ok do dono → publica (repo + servidor, hash conferido). Atualize `CHECKPOINT.md`, `ROADMAP.md` e `PLAYBOOK-NOTAS.md` ao fechar cada etapa.

## Passos

1. **Mapa da casa.** Audite, só leitura, o repo do sistema, o banco (tabelas, funções, políticas, crons), as funções publicadas, o servidor e os canais. Liste quem consome cada tabela.
   Pronto: `HANDOFF.md` + `MAPA-QUARTOS.md` conferidos contra o código e o banco vivo.

2. **Fundação de texto.** Entreviste o dono uma pergunta por vez e escreva SOUL → pessoas → AGENTS → PERMISSOES → MEMORY.
   - `memories/USER.md` ≤ 1.375 e `memories/MEMORY.md` ≤ 2.200 caracteres; total carregado ~10 KB.
   - Manual de pessoas completo em `docs/PESSOAS.md`.
   - O AGENTS não descreve o que não existe; tem uma seção "ainda não existe (não ofereça)".
   Pronto: cada arquivo aprovado e publicado com hash conferido.

3. **Runtime sem canal.** Crie o usuário `<agente>` e o serviço `hermes-gateway-<agente>`. `SOUL.md` vai em `~/.hermes/`, `AGENTS.md` no CWD lógico (`/home/<agente>`). Desligue as skills e os toolsets padrão.
   Pronto: `TERMINAL_CWD=/home/<agente> hermes prompt-size` mostra o contexto e uma sessão nova fala com a voz certa.

4. **Fechar o que está aberto.**
   - Versione as funções que só existem no servidor.
   - Aposente o cérebro antigo: stub 410 + `_aposentadas/`, sem apagar.
   - Trave funções públicas: login com papel, segredo interno no Vault, token no webhook.
   Pronto: de fora, 401/410; a chamada legítima passa.

5. **Leitura.** Para cada ferramenta:
   1. desenho em linguagem do dono;
   2. ok do dono;
   3. RPC `SECURITY DEFINER` com escopo pelo solicitante, `GRANT` só ao crachá de leitura;
   4. teste por papel;
   5. allowlist no MCP, release por sha;
   6. prova com o agente.
   Inclua `<agente>_hoje`.
   Pronto: teste por papel verde e nenhuma descrição de ferramenta com nome da equipe (teste automatizado).

6. **Carimbo do remetente.** Plugin `pre_tool_call`: lê `HERMES_SESSION_*` e sobrescreve o remetente com HMAC. O schema pede `"auto"` e o banco confere; número solto é recusado desde o início.
   Pronto: válido passa; solto, vencido ou alterado falha; ferramenta sem regra falha fechada.

7. **Escrita.** Só registros:
   - aviso;
   - lead e etapa;
   - follow-up;
   - **pedido para a equipe**.
   Crachá `<agente>_escrita` com permissão por função, IDs resolvidos por dentro e idempotência. Transições são regra do banco.
   Pronto: teste por papel verde e o cartão aparece na lista da equipe.

8. **Skills.** Uma por frente de trabalho, 1,5–2 KB, cada passo apontando a ferramenta. Regras que valem sempre ficam no AGENTS.
   Pronto: uma pergunta real de cada frente usa a skill.

9. **Modelo.** Bateria real de ~10 perguntas pelo CLI com remetente fixo, só leitura, modelos em paralelo, 2 rodadas. Meça tempo, ferramentas, certo/leve/erro e honestidade. Descarte:
   - tier que treina com os dados;
   - modelo sem visão, se o canal tem foto;
   - modelo com terminal próprio em agente com segredo.
   Pronto: tabela em imagem entregue ao dono e escolha dele registrada; reserva configurada e testada.

10. **Sombra.**
    - Ponte própria (`extra.bridge_script`) lendo do banco por crachá, sem trocar o dono do webhook.
    - Sem envio e sem escrita (intenção registrada).
    - Regra de silêncio.
    - Avisos do Hermes desligados e filtrados.
    - Mídia com espera da URL e da transcrição.
    - Prazo na conexão com o banco.
    - Régua, prazo e placar diário (script agendado).
    Pronto: mensagem real registrada na sombra, nada enviado, placar chegando.

11. **Copiloto.**
    - Humano assumiu → modo sugestão.
    - Painel Enviar/Editar/Copiar/Ignorar + botões de tom; o clique vira revisão da régua.
    - O agente recebe o que a equipe respondeu.
    - Skill `copiloto-e-treino` no privado da equipe.
    - Funções de texto do sistema pelo cérebro único (VPS com token + reserva).
    - Bateria automática na função **publicada**.
    Pronto: sugestão real no painel, uso registrado, bateria verde nas rotas principal e reserva (com queda simulada).

12. **Ao vivo.**
    - Chave por conversa no banco: dono → equipe → todos.
    - Caminho de envio já montado desligado.
    - Memória liga junto.
    Pronto: régua fechada + ok do dono + envio, silêncio e memória provados no canal.

## Nunca

- Dar escrita direta no banco ou SQL livre ao agente.
- Deixar o modelo escolher a identidade do remetente.
- Dizer "registrei/passei" sem ferramenta confirmar.
- Entregar função com IA sem bateria contra a versão publicada.
- Usar o canal de outro agente para testar.
- Colocar segredo, dado de cliente ou vulnerabilidade aberta no repo público.
