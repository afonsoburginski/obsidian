---
tags:
  - doc
  - analitico
  - neural-labs
  - tempo-de-viagem
aliases:
  - "Registro - comentários no documento dos gestores sobre o tempo de recorrido (28-09-2026)"
  - "Tempo de recorrido"
  - "Neural Labs - Tempo de viagem"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Tempo de viagem

Volta para [[Analítico - Neural Labs]].

## Resumo

O Attlas calcula o tempo e a velocidade média entre câmeras consecutivas de um Trajeto a partir das
leituras de placa da Neural Labs. A mesma placa lida na câmera de origem e depois na de destino forma um
par; os pares se agrupam em janelas de 5 minutos, e a leitura do Trajeto responde trecho a trecho, com
tempo médio, velocidade espacial e a quantidade de pares. O Modelo de Tráfego diz onde medir e com quais
câmeras (os Trajetos), o módulo Câmeras diz se a câmera lê placa, e o Analítico pareia e calcula. O
documento dos gestores pede regras que o Attlas ainda não segue: mediana, mínimo de 5 veículos, limites
por trecho e filtro de sentido.

## A regra

- **Passagem**: toda leitura válida numa câmera vinculada. A releitura da mesma placa na mesma câmera
  dentro de `LPR_REREAD_WINDOW_SECONDS` (10 s) é a mesma passagem, e a primeira leitura é a que vale.
- **Par**: num trecho, a última passagem não consumida da placa na origem pareia com a primeira passagem
  posterior no destino, dentro de `LPR_PAIRING_WINDOW_SECONDS` (3600 s). Decide o horário do evento, não a
  ordem de chegada, então uma origem atrasada ainda acha o destino que chegou antes. Uma passagem pareia
  uma vez por trecho, como origem e como destino; a mesma passagem pode servir a trechos diferentes.
- **Grandezas do par**: tempo = `t_destino - t_origem`, e zero ou negativo é recusado; velocidade =
  `3,6 x distância em metros / tempo em segundos`, com a distância do trecho definida pelo Trajeto.
- **Grandezas da janela**: tempo médio dos `N` pares e velocidade espacial `3,6 x distância / tempo
  médio`. Não é a média das velocidades dos pares, e nem o `Speed` (velocidade instantânea numa só
  câmera) nem o `ProcTime` do XML entram.
- **Sem par é sem dado**: o trecho responde `NO_DATA` com valores nulos, nunca zero. Todo valor publicado
  leva a quantidade de pares, a janela, a origem, o destino e a distância, para que o número do trecho
  nunca seja lido como o tempo do Trajeto inteiro.
- **Só os trechos dos Trajetos** do `ms-traffic-model` são medidos, nunca todas as combinações de câmeras.

## Como o código calcula

### Trechos

O `ms-video-analytics` lê o feed de Trajetos do `ms-traffic-model` a cada `LPR_JOURNEY_SYNC_INTERVAL_MS`
(5 min). Uma varredura completa é o conjunto vigente: trecho de Trajeto que saiu do feed é desativado, e
uma varredura interrompida por erro não desativa nada.

- Só câmeras de nós consecutivos do Trajeto formam trecho. Cada câmera de um nó pareia com cada câmera
  do nó seguinte, e a distância é a diferença da distância acumulada entre os dois nós.
- Câmeras do mesmo nó dividem a distância e nunca pareiam entre si.
- A versão de medição de um trecho junta a versão da definição do Trajeto e a janela de pareamento:
  mudar qualquer uma das duas cria trechos novos.

### Janelas e leitura

Cada par entra numa janela fixa de 5 minutos em UTC (`SegmentWindow`), atualizada na mesma transação que
grava a leitura. A leitura soma as janelas dos últimos `windowMinutes` minutos, de 1 a 1440, com padrão
de 15.

| Rota | Serviço | O que responde |
| --- | --- | --- |
| `GET /api/traffic-model/journeys/{id}/lpr-measurements?windowMinutes=` | `ms-traffic-model`, permissão `JOURNEY_VIEW` | o Trajeto trecho a trecho; repassa a medição do `ms-video-analytics` sem guardar nada |
| `GET /api/internal/lpr/journeys/{journeyId}/measurement` | `ms-video-analytics`, interna | o mesmo, com `definitionVersion` nulo antes da primeira sincronia |
| `GET /api/internal/lpr/segments/{segmentId}/measurement` | `ms-video-analytics`, interna | um trecho |
| `POST /api/internal/lpr/journeys/{journeyId}/sync` | `ms-video-analytics`, interna | sincroniza na hora os trechos de um Trajeto |

### Status de um trecho

Só `ACTIVE` traz número. A ordem de decisão é a da tabela: a primeira condição que vale define o status.

| Status | Quando |
| --- | --- |
| `UNMAPPED` | uma câmera da ponta não tem vínculo com a Neural Labs |
| `CAPABILITY_NOT_SUPPORTED` | uma câmera da ponta está declarada sem leitura de placa |
| `CAPABILITY_CONFLICT` | declaração e observação discordam numa câmera da ponta; o trecho fica em quarentena |
| `ACTIVE` | há pares na janela |
| `STALE` | o trecho já mediu antes, mas não há par na janela |
| `CAPABILITY_UNKNOWN` | ainda não há evidência de que uma câmera da ponta lê placa |
| `NO_DATA` | nenhum par, sem outro motivo |

### Retenção

O expurgo roda todo dia às 03:00 UTC e apaga as leituras mais velhas que `LPR_RETENTION_DAYS` e também
as janelas calculadas. Os pares saem junto com as leituras.

## O documento dos gestores

O documento-fonte é [[Analítico - Neural Labs - Documento dos gestores sobre tempo de recorrido]], em
espanhol, com o original e os comentários dos gestores no
[Google Docs](https://docs.google.com/document/d/1_48UEFUtBnj__6RmfhIbv2RZeAwqdwfERDuTyzdoJ9U/edit?tab=t.0).
Ele é a regra que o Attlas deve seguir. Onde o Attlas diverge, e a posição registrada nos comentários:

| O documento pede | O Attlas faz | Posição combinada |
| --- | --- | --- |
| Mediana, com descarte dos valores dispersos e recálculo | média | aceita pelos gestores: trocar para mediana |
| Mínimo de 5 veículos no intervalo | publica com qualquer quantidade, desde 1 | proposta da Atman: mínimo como parâmetro por corredor, não condição fixa |
| Tempo de referência e limites mínimo e máximo por trecho | só a espera máxima global de 1 hora | registrado no documento |
| Ponto de leitura é câmera em um sentido; sentido contrário descartado | recebe e guarda o sentido de cada leitura, não filtra | confirmado que a Neural Labs informa o sentido (aproxima ou afasta); falta usar |
| Ponto de leitura definido sobre o mapa | o ponto é a câmera associada à Neural Labs e vinculada ao par `ComputerID` e `CamID` | não existe sentido por ponto |
| Na releitura, ficar com a de maior confiança | fica com a primeira | |
| Descartar leitura de confiança baixa | `LPR_MIN_CONFIDENCE` é opcional e fica desligada: toda leitura conta | o documento deixa o limiar para calibrar em campo |
| Resultado do intervalo guardado para sempre | a retenção apaga também o resultado | registrado no documento |
| Trajeto completo (soma de trechos e ponta a ponta) e porcentagem de emparelhamento | só trecho a trecho | |

## Pendências

Cada linha da tabela acima é uma pendência: alinhar o cálculo do Attlas ao documento dos gestores. Ligar
um servidor de verdade tem as próprias pendências em
[[Analítico - Neural Labs - Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| Trajeto | percurso cadastrado no Modelo de Tráfego, com nós e câmeras em ordem |
| Trecho | par ordenado de câmeras de nós consecutivos de um Trajeto, com a distância entre eles |
| Passagem | leitura que não é releitura da mesma placa na mesma câmera |
| Par | a mesma placa na origem e depois no destino de um trecho, dentro da janela de pareamento |
| Janela | intervalo fixo de 5 minutos em UTC em que os pares de um trecho são somados |
| Velocidade espacial | distância do trecho dividida pelo tempo médio dos pares, em km/h |
| Tempo de recorrido | nome do tempo de viagem no documento dos gestores |
