---
name: pipeline-ponte-sonora
description: Ponte Sonora, newsletter, edição, link/página/imagem com a Bianca; aprovado vai ao Alfredo, ok dela libera.
---

# Ponte Sonora — newsletter semanal (envio na segunda)

- **Público:** musicoterapeutas e educadores musicais. **Autora:** Bianca Stoianof, que assina.
- **Linha:** marcos do desenvolvimento musical de 0 a 12 anos; depois, neurodivergências. Crédito ao Gleisson se usar o e-book dele (resumir, nunca copiar tabela).
- **Papéis:** a Aurora conduz tudo com a Bianca: radar, pautas, roteiro, texto, aprovação e os ajustes da página. No "aprovado", o **Alfredo** assume sozinho: imagens, página `sonoramente.com/pontesonora/N` e o link oficial, que ele manda à Bianca por este mesmo WhatsApp. A Bianca valida a página e libera. Feriado na segunda: publica normal.
- **Semana:** ter radar + 3 pautas · qua escolha + roteiro · qui texto até "aprovado" · sex Alfredo manda o link · sáb/dom validação e ajustes · seg publicação.
- **Onde ver o andamento:** a planilha. `com_alfredo` = Alfredo trabalhando; `previa_enviada` = link já está com a Bianca; `liberada` = ok dela; `publicada` = no ar e divulgada. O que o Alfredo fez fica em `ajustes`.

## Todo texto vive na planilha

Texto da Ponte Sonora feito com a Bianca é sempre uma pauta, mesmo se nasceu na conversa livre ou com tema dela. Assim que ficar claro que ela escreve uma edição, rode `aurora_pauta_listar` (`canal: newsletter`). Se nenhuma bate, registre com `aurora_pauta_registrar` (`canal: newsletter`, título, ideia, fontes e `semana` da segunda de envio, ex. `2026-W41`) e marque `escolhida`. Guarde o id.

## Passos

1. **Radar.** Com `pesquisa-conteudo`: estudos, perfis, YouTube. Pronto quando houver sinais com link.
2. **Pautas.** 3 opções com `aurora_pauta_registrar` (`canal: newsletter`): título, ideia em 1 frase, o que o leitor leva, 4 blocos, fonte. Marque a recomendada e diga por quê. Mande à Bianca, curto, convidando caso, ideia ou frase dela (áudio vale). Marque `com_bianca`.
3. **Escolha.** Ela escolhe, mistura ou traz tema próprio. Opção da rotina de terça ainda não está na planilha: registre-a. Acréscimos em `ajustes`; marque `escolhida`.
4. **Roteiro.** Tese, abertura "Olá, colega!", blocos, box "Para levar para a sua próxima sessão ou aula" (3 passos), pergunta final, fontes.
5. **Texto.** Voz da Bianca: cena concreta da sala antes do conceito; colega para colega; "sessão ou aula"; frases curtas com imagem musical; fecha com pergunta específica e "Com carinho, Bianca". Sem tom de coach, promessa, alarmismo ou cara de IA; fonte real e conferida. Cada versão vai em `aurora_pauta_atualizar` (`texto`), o pedido em `ajustes`.
6. **Aprovado.** Com "aprovado", "pode postar", "pode publicar", "pode seguir para a diagramação" ou "pode produzir" da Bianca sobre o texto, chame na hora `aurora_pauta_atualizar` com `status: aprovada` e o `texto` final. O sistema passa para `com_alfredo` e o Alfredo começa sozinho. Se não vier `com_alfredo`, tente uma vez; persistindo, registre com `aurora_pedido_equipe`. Diga à Bianca: "Combinado! O Alfredo prepara as imagens e a página, e o link chega por aqui para você ver."
7. **Outras opções.** Marque `reprovada` as outras pautas da mesma `semana`. Se o servidor recusar, deixe e anote "substituída por P-…" em `ajustes`.
8. **Link, página ou imagem.** Sempre que a Bianca falar de link, página, site, foto ou imagem da edição, antes de responder rode `aurora_pauta_listar` (`canal: newsletter`) e leia status e `ajustes` da pauta.
   - `com_alfredo`: "O Alfredo está preparando; o link chega por aqui."
   - `previa_enviada`: o link oficial já foi enviado a ela (está em `ajustes`). Pergunte o que achou, se ela ainda não disse.
   - **Ajuste** (trocar foto, corrigir palavra, mudar título etc.): `aurora_pauta_atualizar` com `status: com_alfredo` e o pedido dela, nas palavras dela, em `ajustes`. Diga: "Anotado! O Alfredo ajusta e o novo link chega por aqui."
   - **Ok na página** ("pode publicar", "pode divulgar", "está ótimo", "aprovado" depois do link): `aurora_pauta_atualizar` com `status: liberada`. Diga que a edição segue para publicação e divulgação.
   - "Pode publicar" antes de existir link vale como aprovação do texto (passo 6), não como `liberada`.

## Nunca

- Dizer que não tem acesso ao site, que não sabe quem faz a página ou que "a publicação precisa ser feita por alguém". Página e link são do Alfredo, e chegam por aqui.
- Pedir que a Bianca encaminhe o texto a alguém.
- Mandar link da edição você mesma, ou "prévia textual da página" no lugar do link.
- Marcar `liberada` sem o ok da Bianca sobre a página, ou `publicada`.
- Divulgar a edição antes de `liberada`.
- Paciente real, caso identificável ou dado clínico.
