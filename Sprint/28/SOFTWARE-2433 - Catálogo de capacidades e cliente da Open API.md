---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2433
clickup: https://app.clickup.com/t/86ajycf0j
titulo: "[Back] Videowall externo: catálogo de capacidades e cliente da Open API"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: Fechado em 17/08 no ClickUp (estava code review, PR #1609 já mergeada desde 14/08). Troca de presumido por confirmado fica para quando o acesso ao H9 real chegar, fora do escopo deste card.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-17
---

# SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API

É o que impede a frente de travar sem o equipamento: tudo funciona, e o que não está confirmado
responde código honesto em vez de inventar resultado.

> [!done] Entregue em 14/08 na PR #1609
> A PR ficou empilhada sobre a do replanejamento (#1592), que por sua vez está sobre a do codec (#1598), no
> primeiro uso da pilha do GitHub nesta frente. O trabalho existia desde 13/08 mas nunca tinha saído do
> disco, e o cliente estava escrito contra uma versão anterior do codec: foi assentado sobre o codec que
> ficou, com o envelope viajando plano no corpo da requisição, o modo de cifra resolvido uma vez na
> construção do cliente para que chave malformada aborte o boot, e os três códigos de erro de detalhe
> ganhando tradução nos quatro locales.
>
> Ajuste de spec no mesmo PR: o teste de `Accept-Language` que a atômica exigia não é possível aqui, porque
> a única superfície HTTP desta entrega é a leitura do catálogo, que não tem caminho de erro. O
> encadeamento já está coberto pelo teste de tradução do 501 na atômica de cenas, e os quatro locales ficam
> travados pelo guard de paridade dos catálogos.

## Escopo (1 PR)

Cliente HTTP da Open API (`http://{ip}:8000/open/api`) dirigido por um catálogo de descriptors: cada
capacidade tem path, payload, se é escrita, procedência, firmware mínimo e status CONFIRMED ou
PRESUMED. Hoje só `screen/writeShowId` é CONFIRMED. Capacidade presumida com o flag de ambiente
desligado responde **501 `VIDEOWALL_CAPABILITY_UNVERIFIED`**, traduzido, e conta na métrica. Escrita
não é retentada (criar fonte e adicionar janela não são idempotentes): zero retries, write-lock por
processador, reconciliação por listagem.

**Fecho quando o acesso chegar**: uma PR que só troca PRESUMED por CONFIRMED e adiciona golden
vectors reais. Se precisar mexer em handler, schema ou tela, o isolamento falhou.

## DoD

Cliente batendo assinatura com o codec, catálogo consultado antes de toda chamada, 501 estável
testado, métrica de capacidade não verificada exposta.

## Dependência

[[SOFTWARE-2441 - Codec NovaStar - assinatura e cifra|2441]] e
[[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]].

## Referências

- [[Videowall externo (NovaStar H9)]], item do catálogo de capacidades do desenho fechado.
- [[Attlas - Sprint 28]], risco 1.
