# Operação — Referências Instagram SonoraMente

## Escopo fechado

- Único canal: grupo **Referências Instagram SonoraMente**.
- Única entrada: link público `instagram.com/p`, `/reel`, `/reels` ou `/tv`.
- Única saída de dados: linha na planilha de referências e recibo curto no mesmo grupo.
- Sem acesso ao ERP, prontuário, Drive clínico, outros chats ou publicação no Instagram.
- Chave própria `aurora-readers`, com teto mensal de US$ 5. Nunca copiar valor para log, Git ou documentação.

## Gates

1. O JID exato do grupo precisa estar em `aurora_canal_config.liberados`.
2. O arquivo `/home/aurora/.hermes/referencias-instagram.enabled` precisa existir.
3. O MCP `aurora-igref` precisa descobrir exatamente uma ferramenta: `aurora_ig_ref_registrar`.
4. A ponte só encaminha URL pública do Instagram nesse grupo. Qualquer outro texto é ignorado.
5. A ponte libera no máximo uma referência por vez e só entrega a próxima depois do recibo anterior voltar por `/send`; isso impede o Hermes de agrupar dois links no mesmo turno.

## Desligar na hora

Mover o arquivo de habilitação para o estado pausado e remover o JID do grupo da allowlist. Confirmar depois que uma URL de teste recebe o aviso de pausa e não chama a ferramenta.

## Retomar

1. Confirmar no provedor que a sessão WhatsApp está conectada e apta a enviar.
2. Restaurar o arquivo `.enabled` e adicionar somente o JID exato do grupo à allowlist.
3. Enviar três links pelo grupo: um duplicado, um novo e outro duplicado.
4. Conferir: três recibos no grupo, uma única linha nova na planilha, nenhuma resposta em outro chat e nenhum acesso clínico.
5. Se qualquer envio falhar, pausar os dois gates novamente.

## Evidência de 2026-09-27

- Release: `440e4cf03adaf68fe2014df59005f17566a4503d`.
- Suítes: ponte 13/13; MCP 2/2.
- Agente + ferramenta: 3/3; dois duplicados e uma linha nova de `@neuroesperanca`.
- Entrega ao grupo: 0/3. UAZAPI respondeu `WhatsApp disconnected: session is not reconnectable`.
- Estado final: pausado e fora da allowlist, aguardando reconexão humana do número.
- Backup pré-rollout: `/home/aurora/backups/igref-before-20260927T2215Z`.

## Evidência de 2026-09-28

- O Alf reconectou o WhatsApp; a ponte voltou saudável, com banco disponível e `NRestarts=0`.
- Primeira rodada: três links processados, todos duplicados, mas o Hermes agrupou os dois últimos em um único recibo. Os dois gates foram fechados imediatamente.
- Correção: release `dd8cbfc08ad54c1b477f8d4a5ad6f55d1bee3788`; fila do grupo serializada por resposta. Testes da ponte: 14/14 local e 14/14 na VPS.
- Rodada final: três entradas e três saídas separadas no grupo; nenhuma saída da Aurora em outro chat na janela.
- Resultado: dois duplicados e uma linha nova única de `@wagnerbrito.mt`, classificada como `Ambos`, `Musicoterapia (pra famílias)`, destino `Carrossel + Newsletter`.
- Readback da planilha: shortcode novo aparece exatamente uma vez.
- Custo medido do OpenRouter na linha nova: US$ 0,000564; duplicados: US$ 0. O recibo atual não expõe o custo exato do Apify, embora a chamada permaneça limitada por `maxTotalChargeUsd=0.1`.
- Estado final: `.enabled` presente e grupo exato na allowlist. Para desligar, executar os dois passos de **Desligar na hora**.
