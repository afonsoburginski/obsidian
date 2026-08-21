---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2440
clickup: https://app.clickup.com/t/86ajyce9r
titulo: "[Back] Videowall externo: requisitos em docs/modules (videowall.md)"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: Fechado em 17/08 no ClickUp como absorvido pelo [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]] em 13/08, que passou a carregar o replanejamento inteiro e escreveu os requisitos junto com a revisão do MOD e das atômicas. Não haverá execução separada deste card.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-17
---

# SOFTWARE-2440 - Requisitos do videowall externo em arquivo próprio

O requisito de negócio do videowall externo ganha numeração estável, dentro da seção do VMS.

> [!success] Absorvido pelo 2201 em 13/08
> O replanejamento da regra de negócio do videowall, que trocou projeção de cena por espelhamento de tela,
> reescreveu os requisitos ao mesmo tempo que reescreveu o MOD-016, o MOD-006, a CROSS-045, a SPEC do
> serviço e as atômicas. Separar o card de requisitos do card de especificação deixaria os dois
> incoerentes por um PR de distância, então este foi absorvido em vez de executado. Os requisitos ficaram
> na faixa `RF-VW-07` a `RF-VW-19` da seção 3.2 de `docs/modules/cameras.md`, com `RF-VW-10` e `RF-VW-13`
> registrados como retirados e `RF-VW-14` como não atendido.

> [!warning] Escopo revisado em 10/08: seção, não arquivo próprio
> O card nasceu como "arquivo próprio `docs/modules/videowall.md`", e o título no ClickUp ainda diz
> isso. Com a decisão de o videowall ser **alvo de exibição do VMS** e não módulo irmão, o requisito
> passa a viver na **seção 3.2 de `docs/modules/cameras.md`**, na faixa `RF-VW-07` em diante, no mesmo
> espaço de ID do VMS. O motivo original de separar (o RF-7 de gestão global contradizia o
> enquadramento org e system scoped daquele doc) foi resolvido pela decisão de tenancy: equipamento
> global, tenancy no vínculo entre alvo e sistema. Os pontos não mudam, o trabalho continua sendo
> escrever os RF.

## Escopo (1 PR, docs-only)

Escrever, na seção 3.2 de `docs/modules/cameras.md`, os requisitos do alvo videowall na faixa
`RF-VW-07` em diante, cobrindo os RF-1 a RF-7 do card
[[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]] mais as três lacunas achadas no
confronto com o contrato: página web como fonte no mural, estado observável do processador e
reproduções agendadas. A faixa já está **reservada** no doc e a subseção declaratória já existe,
aplicada em 10/08 na PR [#1438](https://github.com/atmanadmin/attlas-2026/pull/1438); o que falta é o
conteúdo dos requisitos. Os RNF do alvo entram na faixa `RNF-CAM-*` existente, pelo mesmo princípio.

## DoD

RF do alvo numerados e estáveis na faixa `RF-VW-07` em diante, com a tabela da seção 8.2 acompanhando,
e sem contradição entre a gestão global do equipamento e o enquadramento escopado do resto do doc.

## Dependência

[[SOFTWARE-2431 - Renome para VMS - fase 0 terminologia|2431]], que fixa o vocabulário que este
documento usa.

## Referências

- [[Videowall externo (NovaStar H9)]], requisitos e desenho fechado em 31/07.
- [[Attlas - Sprint 28]].
