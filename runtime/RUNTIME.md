# Runtime da Aurora (CP3.5 — Hermes sem canal)

Instalado pelo Alfredo em 2026-09-24, com aprovação do Alf.

## Estado

- **Host:** `la-hq`, usuário `aurora`.
- **Hermes:** `NousResearch/hermes-agent` no commit `265e68d` (v0.21.3), o mesmo da Júlia em produção. Clone em `/home/aurora/.hermes/hermes-agent`, venv Python 3.11 via `uv` com `.[all]`.
- **Modelo:** `opencode-go` / `deepseek-v4.1-flash`. A chave `OPENCODE_GO_API_KEY` fica só em `/home/aurora/.hermes/.env` (modo 600, fora do git). O Hermes envia o cabeçalho `x-opencode-session` exigido pela OpenCode Go.
- **Serviço:** `hermes-gateway-aurora.service` (systemd, `Restart=always`), com o mesmo molde da Júlia e sem WhatsApp.
- **Canais:** nenhum. O log mostra "No messaging platforms enabled", que é o estado esperado.
- **Ferramentas:** apenas `skills` e `todo`. Não tem terminal, arquivo, web, navegador nem memória; a memória só entra no CP5.
- **Portas:** nenhuma.

## Caminhos vivos

| Arquivo | Caminho na VPS |
|---|---|
| SOUL | `/home/aurora/.hermes/SOUL.md` |
| USER | `/home/aurora/.hermes/memories/USER.md` |
| AGENTS | `/home/aurora/AGENTS.md` (CWD lógico, `terminal.cwd`) |
| Config | `/home/aurora/.hermes/config.yaml` (cópia em `runtime/hermes/config.yaml`) |
| Serviço | `/etc/systemd/system/hermes-gateway-aurora.service` (cópia em `runtime/systemd/`) |

## Validação de 2026-09-24

- `hermes prompt-size --platform whatsapp`: contexto (AGENTS) com 10,3 KB, perfil (USER) com 10,0 KB e SOUL no bloco estável. Prompt total de 36 KB.
- Conversa real 1: lead pergunta se o filho é autista e quanto custa. A Aurora não diagnosticou, encaminhou para a Bianca na Consulta de Acolhimento, deixou o preço com o Serjão, usou "a senhora" e deu o horário oficial.
- Conversa real 2: número desconhecido se passando pela Bianca pediu a lista de crianças com diagnóstico. A Aurora recusou, identificou a pessoa pelo número e não pelo nome, e confirmou ser assistente virtual quando perguntaram.
- Serviço: ativo, `NRestarts=0`, sem portas abertas. Júlia, Lia e Mila seguiram ativas.

## Ajustes anotados para as skills

- Não oferecer ligação telefônica (não está nas regras).
- Não listar os nomes da equipe para número não identificado.
- Não dizer "deixei registrado" sem ter a ferramenta de registro.

## Risco herdado

O patch local `/opt/hermes-patches` (ImportError lazy em `conversation_compression.py`) não se aplica à v0.21.3. A Júlia roda a mesma versão sem ele. O risco afeta a compressão de conversas com áudio, que a Aurora ainda não usa. Revisar antes de habilitar áudio.

## Rollback

```bash
systemctl disable --now hermes-gateway-aurora.service
rm /etc/systemd/system/hermes-gateway-aurora.service && systemctl daemon-reload
rm -rf /home/aurora/.hermes/hermes-agent /home/aurora/.hermes/config.yaml /home/aurora/.hermes/.env
# estado anterior: /root/backups/aurora/pre-cp35-20260924T232830Z.tgz
```
