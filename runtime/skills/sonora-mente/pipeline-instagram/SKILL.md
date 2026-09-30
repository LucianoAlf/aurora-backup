---
name: pipeline-instagram
description: Use quando Serjão, Bianca, Alf ou Anne falarem de pauta, carrossel, post, copy ou aprovação de conteúdo do Instagram da SonoraMente.
---

# Pipeline de conteúdo do Instagram — SonoraMente

Fluxo definido pelo Alf em 2026-09-30:

**pesquisa (Aurora + Serjão) → Serjão escolhe → Aurora escreve → Bianca aprova ou pede ajuste → Serjão faz a arte e publica.**

A Aurora **não** faz arte e **não** publica. Controle: planilha "Pautas de Conteúdo — SonoraMente" (`aurora_pauta_*`).

## Passos

1. **Pesquisa.** Use a skill `pesquisa-conteudo`. Monte de 3 a 5 pautas; cada uma tem título, ideia em 1 frase, pra quem é (famílias ou profissionais) e fonte com URL. Registre cada uma com `aurora_pauta_registrar` (canal `instagram`). Pronto quando o Serjão receber a lista com os IDs.
2. **Escolha do Serjão.** Quando ele escolher, marque `escolhida`. Uma pauta pode juntar ideias.
3. **Texto.** Escreva o carrossel:
   - capa com gancho curto;
   - um texto por slide (de 5 a 8 slides);
   - legenda com convite coerente (salvar, comentar ou chamar no WhatsApp; um só);
   - fontes no fim.

   Use a voz da SonoraMente: acolhedora, clara, sem jargão, sem promessa terapêutica, sem "comprova" quando o estudo não comprova. Sem cara de IA: nada de "não é X, é Y", travessão em excesso, frase de efeito vazia ou três adjetivos seguidos. Guarde a versão com `aurora_pauta_atualizar` (`texto`).
4. **Bianca.** Envie com `aurora_conteudo_encaminhar` (`para: bianca`) uma mensagem que se sustenta sozinha: o ID da pauta, o tema, o texto por slide e a pergunta "Aprova, ajusta ou reprova?". Marque `com_bianca`.
5. **Resposta da Bianca**, no privado dela:
   - Localize a pauta com `aurora_pauta_listar` (status `com_bianca`).
   - "Aprovado": marque `aprovada`. Só a Bianca consegue; o sistema recusa os outros.
   - Pedido de ajuste: guarde em `ajustes`, reescreva, marque `ajustes` e reenvie. O vai e volta segue até o "aprovado".
   - "Reprovado": marque `reprovada` e avise o Serjão com o motivo.
6. **Entrega ao Serjão.** Com a pauta `aprovada`, envie a ele (`para: serjao`) o texto final por slide, a legenda e as fontes. Marque `com_serjao`. Quando ele disser que publicou, marque `publicada`.

## Pautas que chegam pela rotina semanal

As rotinas automáticas (terça para a Bianca, segunda para o Serjão) mandam pautas que ainda **não** estão na planilha. Quando a pessoa escolher uma delas, registre com `aurora_pauta_registrar` e já marque `escolhida`. Depois siga os passos normalmente.

## Limites

- Nada vai para o Serjão fazer arte sem o "aprovado" da Bianca.
- Nunca use caso, nome, foto ou dado de paciente. Exemplos são fictícios.
- Tema clínico: a Bianca é quem valida. Não invente fonte.
