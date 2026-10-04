---
name: pipeline-instagram
description: Use quando Serjão, Bianca, Alf ou Anne falarem de pauta, carrossel, post, copy ou aprovação de conteúdo do Instagram do SonoraMente.
---

# Pipeline de conteúdo do Instagram — SonoraMente

Fluxo definido pelo Alf em 2026-09-30:

**pesquisa (Aurora + Serjão) → Serjão escolhe 3 carrosséis + 1 Reel → Aurora escreve → Bianca aprova ou pede ajuste → Serjão fecha a produção com o Marketing e publica.**

A Aurora **não** faz arte e **não** publica. Controle: planilha "Pautas de Conteúdo — SonoraMente" (`aurora_pauta_*`).

## Passos

1. **Pesquisa.** Use a skill `pesquisa-conteudo`. Toda segunda, monte 5 opções de carrossel e 2 de Reel; cada uma tem título/gancho, ideia em 1 frase, público, formato e fonte com URL. Pronto quando o Serjão receber as opções.
2. **Escolha do Serjão.** Ele escolhe **3 carrosséis e 1 Reel**. Registre cada escolhida com `aurora_pauta_registrar` (`canal: instagram`, `formato`, semana e data planejada) e marque `escolhida`. Calendário-base: carrosséis terça, quinta e sábado; Reel sexta. O Serjão pode mudar os dias usando os Insights.
3. **Texto.** Escreva o carrossel:
   - capa com gancho curto;
   - um texto por slide (de 5 a 8 slides);
   - legenda com convite coerente (salvar, comentar ou chamar no WhatsApp; um só);
   - fontes no fim.

   Use a voz do SonoraMente: acolhedora, clara, sem jargão, sem promessa terapêutica, sem "comprova" quando o estudo não comprova. Sem cara de IA: nada de "não é X, é Y", travessão em excesso, frase de efeito vazia ou três adjetivos seguidos. Guarde a versão com `aurora_pauta_atualizar` (`texto`).
   Para **Reel**, entregue: gancho dos 2 primeiros segundos, cenas/plano de gravação, fala ou narração, texto na tela, legenda, CTA e fontes. Não prometa resultado e não use paciente real.
4. **Bianca.** Envie com `aurora_conteudo_encaminhar` (`para: bianca`) uma mensagem que se sustenta sozinha: o ID da pauta, o tema, o texto por slide e a pergunta "Aprova, ajusta ou reprova?". Marque `com_bianca`.
5. **Resposta da Bianca**, no privado dela:
   - Localize a pauta com `aurora_pauta_listar` (status `com_bianca`).
   - "Aprovado": marque `aprovada`. Só a Bianca consegue; o sistema recusa os outros.
   - Pedido de ajuste: guarde em `ajustes`, reescreva, marque `ajustes` e reenvie. O vai e volta segue até o "aprovado".
   - "Reprovado": marque `reprovada` e avise o Serjão com o motivo.
6. **Entrega ao Serjão.** Com a pauta `aprovada`, envie a ele (`para: serjao`) o pacote final. Carrossel: slides, legenda e fontes. Reel: roteiro, cenas, fala, texto na tela, legenda e fontes. Marque `com_serjao`. Serjão fecha arte/vídeo com o Marketing; quando publicar, marque `publicada`.

## Pautas que chegam pela rotina semanal

As opções da segunda ainda **não** estão na planilha. Quando o Serjão escolher 3+1, registre as quatro, marque `escolhida` e siga o fluxo. Quarta a Aurora cobra só o que faltar; quinta/sexta cobra aprovação da Bianca; sexta fecha com o Serjão o que já estiver aprovado.

## Limites

- Nada vai para o Serjão fazer arte sem o "aprovado" da Bianca.
- Nunca use caso, nome, foto ou dado de paciente. Exemplos são fictícios.
- Tema clínico: a Bianca é quem valida. Não invente fonte.
