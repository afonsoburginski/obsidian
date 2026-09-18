---
tags:
  - attlas
  - registro
  - sprint-33
  - analitico
  - metricas
  - ec2
frente: Analítico
ambiente: dev.v2.attlas.atmansystems.com (EC2 dev), tenant 6c277280-b369-49a5-bbb9-72a5d5fcf789
atualizado: 2026-09-17
---

# Métricas - por que as telas não mostram nada no dev2

As abas Laço Virtual e Incidentes das Métricas abrem vazias. São três cortes diferentes, nenhum na
tela, e a resposta curta para a dúvida que abriu a investigação é: **o dado está sendo gravado** -
1.146.523 eventos de câmera, 224.634 leituras de detector, 169.873 ciclos de controlador. O que não é
gravado é justamente o que essas duas telas leem.

## O equipamento está entregando

`attlas.virtual-loop.region-occupancy` tem 49.729 mensagens e recebe mais agora, da ATSPM embarcada
da EMBEDDED 080, com a transição e o contador que a série precisa:

```
{"cameraId":"…0101","analyticId":"…5101","regionIndex":0,"purpose":"VEHICLE",
 "symbols":[1],"counters":[44],"sampledAt":"2026-09-17T04:29:34.086Z"}
```

Isso muda o tamanho do conserto: não é frente sem dado, é dado parado num consumidor.

## O registro do tradutor responde 404

O `ms-video-analytics` ficou em standby mas segue consumindo esse tópico pelo
`DetectorTranslationController` - é ele que converte ocupação em evento de detector e republica em
`attlas.detectors.raw`, que alimenta o `ms-detector-history` e, por consequência, o gráfico.

Para resolver o endereço do detector ele depende do `CameraRegistryService`, que lê
`GET /api/internal/virtual-loop/sources` no `ms-cameras` a cada 30 s. O commit `71d57f274b`, o que
removeu o modo servidor, apagou `virtual-loop-sources.controller.ts` e manteve o consumidor do outro
lado. De 30 em 30 segundos, no log:

```
CameraRegistryService: could not refresh the ingestion targets: ms-cameras answered 404
```

`isLoaded()` nunca fica verdadeiro, toda ocupação sai por `discarded_unresolved`, e a série do
detector `bb2b60cb-…-2706` para em `2026-09-17 02:22:16` - o horário exato do deploy. Antes disso ela
tinha 8.524 leituras.

> [!warning] A remoção do modo servidor não é reversível pelo mesmo caminho
> A tradução ocupação → detector só existe no `ms-video-analytics`. Apagar o consumidor junto com o
> resto do modo servidor corta a única fonte de série do laço virtual. O que fica de pé é o
> `ms-cameras` voltar a servir a rota, com escopo de leitura apenas.

## O laço embarcado não tem vínculo com detector nenhum

A cadeia da aba é `binding → detectorId → série`. Sem `VirtualLoopDetectorBinding` o serviço devolve
`kind: 'unbound'`, que desenha vazio - corretamente, porque o laço nunca foi ligado.

Há **um** vínculo em toda a base do dev2, e ele aponta para a região de um analítico `ATSPM` em modo
`SERVER` da PTZ, isto é, para um caminho que não roda mais. As duas regiões do laço embarcado da DEMO
e a região da EMBEDDED 080 têm zero.

Vincular é trabalho de ambiente (UC-064). O que a unidade muda é a tela parar de desenhar o mesmo
vazio para "não vinculado" e para "sem leitura na janela".

## A correlação de incidentes nunca rodou

`attlas.cameras.event-logged` está com `LOG-END-OFFSET = 0`: nunca recebeu uma mensagem. O
`CorrelateEventsListener`, que é quem cria `CameraIncident`, consome exatamente esse tópico. A base
tem um incidente, de 10/09, numa câmera que já saiu do tenant.

Não é falha de broker. Em `record-camera-event.service.ts`:

```ts
const shouldPublish = isIngest || source === 'analytics';
```

e o monitor de saúde grava com `source: 'health'`, documentado como MOD-010 seção 4, opção A. Só que
o catálogo de correlação do UC-021 é composto **inteiramente** de eventos que o monitor de saúde
produz - `HEALTH_EVENT`, `HEALTH_OFFLINE` e `CONNECTIVITY_CHANGED`, dez pares. As duas regras se
anulam, e a correlação nunca rodou em ambiente nenhum.

O dev2 tem o material para provar: 4.907 `CONNECTIVITY_CHANGED:VAPIX_TAMPERING` e 8
`HEALTH_OFFLINE:PUSH_DISCONNECT` nas últimas 24 h, nas três câmeras vivas, e nenhum incidente.

O corte é no `shouldPublish`: o evento de saúde **com `causeCode` correlacionável** passa a publicar,
reusando o `isCorrelatable` que já existe. Sem `causeCode` continua fora - os 19.832
`CONNECTIVITY_CHANGED` sem causa das últimas 24 h são ruído de sondagem e não podem virar tráfego de
tópico.

## Por que o local mostrava e o dev2 não

Medido nos dois em 17/09, e é o que separa conserto de código de conserto de ambiente.

**O laço tem vínculo no local.** A bancada tem dois `VirtualLoopDetectorBinding`, ambos embarcados e
corretos - EMBEDDED 080 no índice 4 e DEMO no índice 5, controlador `…9001`. O dev2 tem um só, e ele
aponta para o analítico `ATSPM` em modo `SERVER` da PTZ. A tradução prova: no local 6.315 ocupações
viraram 2.316 mensagens em `attlas.detectors.raw`; no dev2 a série parou no deploy.

**A rota 404 o local não sentiu** porque o processo dele continuou servindo o build anterior à
remoção do modo servidor. É a mesma quebra, latente - aparece no próximo restart.

**Incidente não aparece em ambiente nenhum.** `CameraIncident` local tem zero linhas, e as 65
mensagens de `attlas.cameras.event-logged` do local são todas do caminho de ingestão, nenhuma do
monitor de saúde. Os 23 `CONNECTIVITY_CHANGED:PUSH_DISCONNECT` e 5 `HEALTH_OFFLINE:PUSH_DISCONNECT`
que o local registrou ficaram de fora pelo mesmo `shouldPublish`. Não há regressão a procurar: o
gatilho nunca foi ligado.

## O que fica combinado para o dia 18

1. `ms-cameras` volta a servir `GET /api/internal/virtual-loop/sources`, somente leitura.
2. `kind: 'unbound'` ganha estado próprio na aba, com o atalho para o vínculo do UC-064.
3. `shouldPublish` passa a incluir o evento de saúde correlacionável, e só ele.
4. No dev2, criar o vínculo da região 0 para a aba ter série.

Está tudo em `UF-061` e na PR #3712, que segue em draft.

## Ver também

[[Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes]] ·
[[Registro - o EC2 dev alinhado com a bancada local em 17 de setembro]] ·
[[Detecção - a caixa desliza a sessenta quadros por segundo]]
