---
id: S35-07
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - neural-labs
titulo: "[Full] Vínculo automático e manual das câmeras com a Neural Labs na tela de Instâncias, e pela lista do equipamento"
frente: Neural Labs
pr: "#5075, #5225, #5409"
status: "Feita. #5075 mergeada em 29/09 às 09h05, #5225 em 30/09 às 08h26 e #5409 em 30/09 às 19h23."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-07 - Analítico - Neural Labs - Vínculo das câmeras pelo nome e pela lista do equipamento

## O que se pediu

Em produção o cliente terá cerca de 800 câmeras, e a Neural Labs vai ler as placas de perto de 700
delas. Uma leitura só valia quando alguém ligava à mão, pela API, cada câmera da Neural Labs à câmera do
Attlas, e nada disso aparecia na tela. Em 29/09 o dono pediu também o vínculo pela lista de câmeras que
o equipamento já tem configurada.

## O que as PRs entregaram

- **#5075**: a Neural Labs aparece em Analítico, Instâncias, como analítico servidor, com a mesma página
  de instância e o mesmo bloco de câmeras vinculadas. Leitura de câmera sem vínculo cujo nome é igual ao
  de uma única câmera do Attlas se vincula sozinha; na página, adicionar associa e remover desfaz o
  vínculo, e a câmera removida não volta a se vincular pelo nome.
- **#5225**: uma rota do `ms-cameras` recebe a lista do equipamento, com o par `ComputerID` e `CamID` e o
  número de série ou o IP da câmera no Attlas. A linha vincula à única câmera do Sistema com aquela chave;
  a que não acha câmera, acha mais de uma ou tem chaves em desacordo volta num relatório com o motivo.
  Na substituição de câmera, o vínculo passa para a câmera nova.
- **#5409**: a página da instância mostra o `ComputerID` e o `CamID` de cada câmera vinculada, como o
  vínculo nasceu, as câmeras que aguardam vínculo com as leituras já recebidas, a atividade de leitura da
  última hora e só os dados gerais que a Neural Labs tem. A instância embarcada órfã volta a abrir.

## Estado

As três mergeadas.

## Relacionado

- [[Analítico - Neural Labs - Vínculo de câmeras]]
- [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]]
