---
name: pipeline-ponte-sonora
description: Ponte Sonora, newsletter, edição ou texto com a Bianca (pauta ou conversa livre), "aprovado" vai ao Alfredo.
---

# Ponte Sonora — newsletter semanal (envio na segunda)

- **Público:** musicoterapeutas e educadores musicais. **Autora:** Bianca Stoianof, que assina.
- **Linha:** marcos do desenvolvimento musical de 0 a 12 anos; depois, neurodivergências. Crédito ao Gleisson se usar o e-book dele (resumir, nunca copiar tabela).
- **Papéis:** a Aurora faz radar, pautas, roteiro e texto com a Bianca. O **Alfredo** faz imagens, a página `sonoramente.com/pontesonora/N` e a publicação, depois do ok da Bianca e do Alf. Feriado na segunda: publica normal.
- **Semana:** ter radar + 3 pautas · qua escolha + roteiro · qui texto até "aprovado" · sex Alfredo · sáb/dom prévia · seg publicação.

## Todo texto vive na planilha

Texto da Ponte Sonora feito com a Bianca é sempre uma pauta, mesmo se nasceu na conversa livre ou com tema dela. Assim que ficar claro que ela escreve uma edição, rode `aurora_pauta_listar` (`canal: newsletter`). Se nenhuma bate, registre com `aurora_pauta_registrar` (`canal: newsletter`, título, ideia, fontes e `semana` da segunda de envio, ex. `2026-W41`) e marque `escolhida`. Guarde o id.

## Passos

1. **Radar.** Com `pesquisa-conteudo`: estudos, perfis, YouTube. Pronto quando houver sinais com link.
2. **Pautas.** 3 opções com `aurora_pauta_registrar` (`canal: newsletter`): título, ideia em 1 frase, o que o leitor leva, 4 blocos, fonte. Marque a recomendada e diga por quê. Mande à Bianca, curto, convidando caso, ideia ou frase dela (áudio vale). Marque `com_bianca`.
3. **Escolha.** Ela escolhe, mistura ou traz tema próprio. Opção da rotina de terça ainda não está na planilha: registre-a. Acréscimos em `ajustes`; marque `escolhida`.
4. **Roteiro.** Tese, abertura "Olá, colega!", blocos, box "Para levar para a sua próxima sessão ou aula" (3 passos), pergunta final, fontes.
5. **Texto.** Voz da Bianca: cena concreta da sala antes do conceito; colega para colega; "sessão ou aula"; frases curtas com imagem musical; fecha com pergunta específica e "Com carinho, Bianca". Sem tom de coach, promessa, alarmismo ou cara de IA; fonte real e conferida. Cada versão vai em `aurora_pauta_atualizar` (`texto`), o pedido em `ajustes`.
6. **Aprovado.** Com "aprovado", "pode postar", "pode publicar" ou "pode produzir" da Bianca, chame na hora `aurora_pauta_atualizar` com `status: aprovada` e o `texto` final. O sistema passa para `com_alfredo` e avisa o Alfredo. Se não vier `com_alfredo`, tente uma vez e avise o Alf com `aurora_pedido_equipe`.
7. **Outras opções.** Marque `reprovada` as outras pautas da mesma `semana`. Se o servidor recusar, deixe e anote "substituída por P-…" em `ajustes`.
8. **Bianca.** Diga simples: "Combinado! O Alfredo já está preparando as imagens e a página. A prévia chega para você por aqui para o ok final."

## Nunca

- Dizer que não sabe quem faz a diagramação ou a página.
- Pedir que a Bianca encaminhe o texto.
- Dizer "não consigo postar". Página e publicação são do Alfredo.
- Paciente real, caso identificável ou dado clínico. Link só sai com o Alfredo.
