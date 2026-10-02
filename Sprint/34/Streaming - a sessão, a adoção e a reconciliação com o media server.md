---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - streaming
titulo: "[Back] Streaming - sessão adotada solta a câmera, e o media server é reconciliado contra o registro"
frente: Streaming
tamanho: 5 pts
pr: "#4075, #4077"
status: "Feita. #4077 mergeada em 23/09, às 15h25, e #4075 em seguida, às 15h33, com as threads de review resolvidas. A expulsão de caminho órfão entrou desligada, em ensaio a seco."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Streaming - a sessão, a adoção e a reconciliação com o media server

## O que estava errado

Quando o serviço adotava uma sessão que já existia, a relay anterior continuava segurando a câmera, e
a adoção que falhasse seguia adiante como se tivesse dado certo. Do outro lado, o registro em memória
e os caminhos do media server divergiam sem que nada os confrontasse: o que existia lá e não existia
aqui ficava puxando vídeo para sempre.

## O que muda

A sessão adotada passa a soltar a câmera, e a adoção falha fechada (#4075). A reconciliação passa a
correr também no sentido media server para registro, com ensaio a seco antes de qualquer expulsão
(#4077).

## Decisão registrada

A expulsão de caminho órfão só é ligada depois de um dia de ensaio a seco com a métrica limpa. Ligar
junto com a varredura seria apostar que os cinco predicados não têm falso positivo em produção, sem
evidência.

## O que tem de valer no fim

Nenhum caminho do media server fica sem sessão correspondente por mais de um ciclo de reconciliação,
e a adoção que não consegue assumir a câmera recusa em vez de fingir.

## Como entrou

A sessão adotada guarda o handle do publicador (`adoptedPublisher`) e o `stopSession` a libera por
kick na control API. O kick é condicional: por padrão só expulsa caminho sem leitor, porque a relay
adotada pode estar servindo outra réplica; a troca de endereço da câmera expulsa sempre, porque ali a
relay em si está errada. A consulta de adoção passou a aceitar como livre só o 404: qualquer outra
resposta ruim do media server recusa com o 502 `EXTERNAL_SERVICE_ERROR`, detalhe
`MEDIAMTX_UNAVAILABLE`.

A reconciliação inversa roda sobre a lista que o reaper já busca a cada tick, sem requisição própria,
com uma réplica só fazendo a passada sob lease Redis. Duas regras que o plano não tinha entraram no
código: caminho sem sessão mas **com** leitor é deixado em paz, e caminho que ficou pronto há menos de
15s não conta, para não expulsar o que outra réplica acabou de abrir.

## O que falta

Ligar a expulsão. `STREAM_ORPHAN_PATH_EVICTION_ENABLED` nasce `false`, e a métrica
`ms_cameras_stream_orphan_paths_evicted_total{mode="dry-run"}` conta o que seria expulso. O critério
continua o da decisão acima: um dia com ela limpa, conferindo que nenhum caminho legítimo aparece.

## Relacionado

- [[Streaming - o ciclo de vida do processo de relay]], a correção que vem antes desta.
- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].
