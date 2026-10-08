---
id: S36-17
tags:
  - attlas
  - task
  - sprint-36
  - analitico
  - neural-labs
titulo: "[Full] Neural Labs de ponta a ponta: socket aceita JSON e o LPR chega no trajeto do painel de operação"
frente: Neural Labs
pr: "#6225"
status: "Aberta em 07/10, aguardando CI e review."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-17 - Analítico - Neural Labs - Leitura de placas de ponta a ponta até o trajeto do painel

## O que estava errado

O backend já pareava as placas da Neural Labs por trecho, mas nada chegava na tela. O trajeto no painel de operação (`#/operations-panel?open=journey:<id>`) mostrava o lado LPR sempre vazio, com "sem produtor", e o comparativo LPR x Google nunca desenhava. O socket também só aceitava XML. O card pedia o socket recebendo JSON para testar a integração até esse componente.

## O que a PR entrega

- **Socket**: aceita JSON com o cabeçalho `NEURAL`, JSON solto (NDJSON) e o XML de antes. Os dois formatos passam pela mesma validação de campos. Uma métrica nova conta os quadros por formato, e o simulador ganha `--format json`.
- **Total do trajeto**: o tempo é a soma das pernas, e uma perna é o conjunto de trechos paralelos entre dois nós. É a regra que os gestores pediram ("suma de tramos").
  - A velocidade é a distância coberta dividida pelo tempo, e a contagem é a da perna mais fraca.
  - Trajeto incompleto responde com o motivo, nunca com zero.
- **Série de 30 min**:
  - uma rota interna no `ms-video-analytics` e uma pública no `ms-traffic-model`;
  - no mesmo eixo da série do Google, para o comparativo funcionar.
- **Tela**:
  - os cards mostram tempo e velocidade das duas fontes, e a contagem de placas vira nota;
  - o comparativo desenha quando as duas fontes respondem;
  - vale no popup do trajeto, na ficha da Área e na página do trajeto.

Regra combinada com o Daniel em 07/10:
- O Google é medido a cada 30 min, só nos trajetos marcados e com chave ativa na organização.
- As duas fontes não dependem uma da outra.
- O cálculo do LPR é em janelas de 5 min, e a tela lê os últimos 15 min.

## Estado

Aberta em 07/10. O `ms-video-analytics` e o `ms-traffic-model` precisam subir juntos no deploy. O formato JSON real do equipamento ainda precisa de captura em campo.

## Relacionado

- [[Analítico - Neural Labs - Payloads e endpoints]]
- [[Analítico - Neural Labs - Tempo de viagem]]
- [[S36-09 - Analítico - Neural Labs - Cadastro pela tela e socket pronto para o equipamento real]]
