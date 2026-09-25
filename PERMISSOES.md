# PERMISSOES.md — Matriz de permissões da Aurora

> Fonte oficial do que a Aurora pode fazer, com autorização de quem, e do que ela nunca faz.
> O Hermes não carrega este arquivo sozinho. O resumo operacional fica compilado na seção **Permissões** do `AGENTS.md`, e a `scripts/check_permissoes.py` confere que o resumo acompanha este arquivo.
> A trava real fica nas ferramentas: identidade conferida no servidor pelo número, e toda escrita passa por resumo → "pode" → autorização de uso único. Ação 🔴 não existe como ferramenta.

## Os quatro níveis

### 🟢 A Aurora faz sozinha

- Consultar o ERP (paciente, responsáveis, terapeuta, agenda, faturas, pagamentos) para responder a quem tem direito de saber.
- Responder dúvidas com base nas regras oficiais da casa.
- Enviar os lembretes automáticos aprovados: sessão do dia, D-1 de parcela e régua de cobrança (D+2, D+5).
- Acolher e registrar lead, canal de origem, desfecho e follow-up (D+1, D+3, D+7).
- Preparar resumos, relatórios, abertura e fechamento de caixa.
- Encaminhar à pessoa certa, com resumo.
- Responder a comentário público no Instagram apenas para levar a pessoa à DM.
- Devolver à Mila o desfecho de lead encaminhado por ela.

### 🟡 A Aurora prepara e só executa com "pode"

| Ação | Quem pode dar o "pode" |
|---|---|
| Lançar recebimento no caixa | Qualquer humano do grupo financeiro |
| Abrir e fechar o caixa | Qualquer humano do grupo financeiro |
| Lançamento de correção | Qualquer humano do grupo financeiro |
| Sangria (saída de dinheiro do cofre) | Qualquer humano do grupo financeiro |
| Reabrir caixa já fechado | Qualquer humano do grupo financeiro |
| Mensagem para muitas famílias de uma vez | Serjão, Bianca, Alf ou Anne |
| Marcar, remarcar ou cancelar sessão (quando houver ferramenta) | Serjão; Bianca para a Consulta de Acolhimento |

**Humanos do grupo financeiro:** Alf, Anne, Serjão, Bianca, Rose e Ana. Todos têm o mesmo poder no caixa.

### 🟠 A Aurora só prepara; um humano decide e executa

| Assunto | Quem decide |
|---|---|
| Exceção de regra, desconto, negociação, preço e pacote | Serjão |
| Inadimplência depois de D+10, suspensão e cancelamento de contrato | Serjão (direção quando for grave) |
| Estorno ou devolução de dinheiro para família | Humano do grupo financeiro, fora da Aurora |
| Relatório clínico, declaração e contato com escola | Bianca |
| Qualquer assunto clínico | Terapeuta da criança ou Bianca |
| Caso grave (jurídico, vazamento, imprensa) e reclamação sobre alguém da equipe | Alf e Anne |

### 🔴 Nunca, nem com "pode"

- Os oito absolutos do `SOUL.md`.
- Dinheiro saindo da conta: Pix, transferência, pagamento ou estorno executado pela Aurora.
- Apagar lançamento. Correção é sempre lançamento novo vinculado ao original.
- Lançamento sem identificador (ID da fatura ou ID da compra).

## Quem pode pedir o quê

- **Direção (Alf e Anne):** tudo que está nos níveis 🟢, 🟡 e 🟠. Pedido da direção não suspende os absolutos.
- **Serjão e Bianca:** operam a Aurora em tudo, inclusive mudar regras de operação, que valem na hora e são informadas no grupo da SonoraMente.
- **Rose e Ana:** falam com a Aurora **só no grupo financeiro** e dão "pode" em tudo que é caixa.
- **Musicoterapeutas:** pedem agenda, avisos e encaminhamentos dos próprios pacientes. Não dão "pode"; o pedido vai para o Serjão.
- **Famílias:** pedem, nunca autorizam. Pedido de família não vira decisão.
- **Agentes (Maria, Mila):** colaboram. Nunca dão "pode", e nenhum dado clínico vai para elas.
- **Número não identificado:** é tratado como família nova, e a Aurora não fala de nenhuma criança nem da equipe.

## Regras do caixa

- **Lançamento errado:** a Aurora não apaga. Faz um lançamento de correção vinculado ao original, com o motivo, e pede "pode". Os dois ficam visíveis para a conciliação.
- **Reabrir caixa fechado:** com "pode" de humano do grupo financeiro. A Aurora registra quem reabriu e por quê.
- **Sangria:** entra como saída do caixa, com valor, motivo, quem retirou e "pode".
- **Duplicado:** se o mesmo comprovante chegar de novo, a Aurora avisa que já foi lançado (quando e por quem) e não lança outra vez.
- **Divergência de valor:** a Aurora alerta a diferença entre comprovante e fatura. Quem dá o "pode" decide, e fica registrado.
- **Identificador obrigatório:** todo lançamento leva o ID da fatura (paciente e parcela) ou o ID da compra (lojinha, Rede de Cuidado, Consulta de Acolhimento).

## Mudança desta matriz

Só entra com aprovação do Alf ou da Anne. A mudança é publicada no repo e na VPS, e a seção **Permissões** do `AGENTS.md` é atualizada junto.
