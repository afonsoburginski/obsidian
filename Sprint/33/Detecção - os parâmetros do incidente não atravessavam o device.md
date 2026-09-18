---
tags:
  - attlas
  - sprint-33
  - analitico
  - deteccao
  - ms-cameras
aliases:
  - "Parâmetros do incidente em snake_case"
  - "Não informado pelo analítico na Detecção"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "Achado em 16/09 durante a validação da sprint, com a ATMN - EMBEDDED 080 na bancada. Fechado em três commits da branch shared/chore/NO-CARD-sprint33-validation: a16696a4fb (grafia), 32b0c9f190 (silêncio do equipamento) e 1ed0101375 (lista de classes vazia). Provado na tela em 16/09 com o device online no ACAP 0.7.0."
atualizado: 2026-09-16
---

# Detecção - os parâmetros do incidente não atravessavam o device

## O sintoma

Na tela de Detecção da `ATMN - EMBEDDED 080`, com o analítico embarcado **no ar**, todo parâmetro de
toda condição de incidente aparecia como **"Não informado pelo analítico"**: tempo mínimo parado,
velocidade mínima de fluxo, tempo máximo parado, limiar de congestionamento, janela de observação.
Com o analítico **fora do ar**, os mesmos campos apareciam preenchidos (5 s, 5 km/h, 60 s, 40 veíc/km,
360 s).

A diferença não é a tela: é **de onde o dado vem**. `GET /cameras/:id/object-detection-regions` lê o
**device** quando ele responde (`AtmanRegionReader`) e só cai no cache do banco quando ele não
responde (`cachedRegions`).

## A causa tem duas pernas, não uma

> [!warning] Correção desta nota em 16/09 às 16h
> A primeira versão desta nota dizia que a causa era a **grafia** das chaves. A grafia era uma perna
> só. A outra, descoberta depois que o ACAP voltou em 0.7.0, é que **o equipamento não reporta
> parâmetro nenhum**: mesmo com a tradução de grafia no lugar, o campo continuava vazio na leitura,
> porque não há valor nenhum chegando do device para traduzir. Sem essa segunda perna o sintoma não
> some.

### Perna 1 - a grafia nunca era traduzida (commit `a16696a4fb`)

O contrato `IIncidentSettings` (`libs/contracts/src/lib/object-detection/i-incident-settings.ts`) diz,
no próprio docblock, que `params` é camelCase (`minStopTime`, `jamThreshold`, `autoThreshold`) e que
**a tradução do snake_case do equipamento é do backend, nunca do frontend**. O
`atman-region.mapper.ts` não fazia nenhuma das duas pontas:

- **Leitura** - `incidentsByPrefix` copiava a chave do device como veio (`min_stop_time`). A tela pede
  `minStopTime` pelo catálogo (`detection-controls.constant.ts`), não encontra, e renderiza
  "Não informado pelo analítico". O próprio teste do mapper fixava o defeito, esperando
  `params: { min_stop_time: 12 }`.
- **Escrita** - `incidentsToWire` montava o bloco do device com **só** `enable` e `event_classes`.
  Todo limiar ajustado na tela era persistido no nosso banco e **nunca chegava ao equipamento**.

A conversão ficou por **forma**, não por tabela, nas duas direções - `toContractParamKey` na leitura,
`paramsToWire` na escrita - para que parâmetro novo do app chegue nomeado sem esperar uma lista
aprender sobre ele.

### Perna 2 - o device 0.7.0 responde sem parâmetro nenhum (commit `32b0c9f190`)

Verificado no aparelho: o ACAP `atman_traffic_edge_atspm` **0.7.0** responde cada condição de
incidente com **apenas `enable` e `event_classes`**. Nenhum limiar volta na leitura, em condição
nenhuma. Entregar essa resposta crua para a tela é o que fazia todo parâmetro sumir com a câmera
**online** e reaparecer com ela **offline** - offline quem respondia era o cache do banco, que tinha
os valores.

A correção é um merge em `withStoredIncidentParams`, chamado de `withStoredPresentation`
(`camera-regions.controller.ts`):

- **O equipamento manda no que ele reporta**: `enable`, `event_classes` e qualquer parâmetro que ele
  venha a nomear vencem o que está guardado.
- **O que ele não reporta vem da linha guardada**, passando por `toContractParams` também - linha
  cacheada antes da tradução carrega a grafia do device.
- **Condição que o device não reporta não é inventada**: o merge percorre a lista que veio do
  aparelho, então bloco vazio continua significando "este device não tem superfície de incidente", e
  não oito condições desligadas.

## A escrita é segura, e agora isso está provado pelo contrato do próprio app

O `openapi.json` do app (`http://10.1.1.80:2001/openapi.json`, sem auth) declara o campo `incidents`
do schema `RegionCreate` como **objeto livre** (`additionalProperties: true`). Ou seja: os limiares
que a tela escreve **são aceitos** pelo equipamento - ele simplesmente não os devolve na leitura. A
dúvida da versão anterior desta nota ("se o app recusar uma chave que ele não conhece, o bloco vira
tabela explícita") está respondida: não recusa, e a tabela explícita não é necessária.

## Lista de classes vazia não é lacuna (commit `1ed0101375`)

`event_classes` vazio é como o equipamento diz **"esta condição olha todas as classes que a região
detecta"** - é a configuração mais ampla possível, não um campo que ele deixou de reportar. A tela
mostrava "Não informado pelo analítico" justamente no ajuste mais amplo, e o operador lia como buraco
a preencher. Agora lê **"Todas as classes da região"**, por chave nova
`analytics.detection.value.allRegionClasses` nas quatro locales
(`to-detection-blocks.util.ts`, `incidentSubBlock`).

## Provado na tela em 16/09, com o device online

Com o ACAP 0.7.0 no ar e os três commits aplicados, a tela de Detecção da EMBEDDED 080 mostra
Contramão, Veículo parado, Veículo lento e Congestionamento ligados **conforme o device**, e os
parâmetros aparecendo: 5 s, 5 km/h, 60 s, 10 km/h, 40 veíc/km e 360 s.

> [!warning] Divergência registrada: `SLOW_MOVING` ligado no device e desligado no nosso banco
> O device reporta `slow_moving` com `enabled=true`; a linha local em
> `CameraAnalyticRegion.metadata.incidentsSettings` tem `false`. **Isso não é bug do merge** - é o
> desenho funcionando: o equipamento é a autoridade sobre o que ele reporta, e o switch é coisa que
> ele reporta. A tela mostra o estado do aparelho, que é o que decide se a condição abre incidente.

## Pergunta em aberto: quem avalia a condição?

O `config` global do device 0.7.0 (`GET /local/atman_traffic_edge_atspm/api/config`) traz
`stops_threshold_vel`, `sampling_period`, `space_occupancy_interval`, `track_buffer*`, `vloop_*`,
`kafka_broker_ip=vitoria.attlas.atmansystems.com:9094`,
`source_id=1414dde8-b0fa-4a0b-a630-e144ac9f738c` e `analytic_id=ATMAN-JP26CXE9IQ8BCQ6C`. Ou seja: há
limiar **global** no aparelho, e não há limiar **por incidente** voltando dele.

**Se os limiares por incidente não existem no device, quem avalia a condição - o device, com a
config global, ou o Attlas?** A resposta decide se a tela está configurando algo que surte efeito ou
se está ajustando um valor que só o nosso lado lê. Pergunta para a squad de Visão Computacional;
não dá para responder por leitura de código do nosso lado.

## Por que isso importa mais do que parece

A tela é a única superfície onde o operador ajusta quando uma condição abre incidente. Enquanto a
escrita descartava os parâmetros, o ajuste era **teatro**. Agora a escrita chega ao aparelho e a
leitura para de apagar o que ele não repete - mas a pergunta acima ainda decide se o ajuste muda o
comportamento do equipamento. É a mesma classe do achado da #3482 (`cachedRegions` sem filtro por
analítico): duas fontes para o mesmo dado, sem acordo sobre qual manda.

## Ver também

[[Validação - as 34 PRs, uma a uma]] · [[Analítico - Embarcado x Servidor]] ·
[[Detecção do Analítico - gaps para polir]] · [[Analítico]]
