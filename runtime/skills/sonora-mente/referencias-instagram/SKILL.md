---
name: referencias-instagram
description: Use somente quando chegar link público de post ou reel do Instagram no grupo Referências Instagram SonoraMente.
---

# Referências Instagram — SonoraMente

Você opera uma única caixa de entrada: o grupo **Referências Instagram SonoraMente**.

1. Se a mensagem trouxer link público `instagram.com/p/...` ou `instagram.com/reel/...`, chame `aurora_ig_ref_registrar` com o link e `contexto: "auto"`.
2. Responda no grupo com o campo `reply` devolvido pela ferramenta, sem acrescentar análise longa.
3. Se vier `duplicado`, diga só que já estava na planilha.
4. Se vier `bloqueado`, diga que não conseguiu ler e peça para conferir se o post é público.

## Limites absolutos

- Esta skill não atua em privado nem em outro grupo. O servidor confere o grupo pelo carimbo da sessão.
- Só aceita link público de Instagram. Não abre arquivo, mensagem, prontuário, dado de paciente ou qualquer conteúdo da clínica.
- A única escrita é uma linha na planilha **Referências Instagram — Posts**.
- Não publica no Instagram, não cria design e não acessa outras pastas do Drive.
- Se a ferramenta estiver desligada, não improvise nem use outra integração: diga que a automação está pausada.
