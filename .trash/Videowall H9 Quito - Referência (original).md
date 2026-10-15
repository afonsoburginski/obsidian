# Videowall H9 Quito — Referência Completa

> Tudo em formato Postman. Valores literais, nada de variável, nada de terminal.
> JWT do Attlas expira **16:45 -03**. `sign`/`timeStamp` do H9 gerados 14/10/2026 16:03 -03 (o H9 não valida expiração).

## Acesso

| Item            | Valor                                    |
| --------------- | ---------------------------------------- |
| IP H9           | `10.200.1.52:8000`                       |
| ProjectId (pId) | `YzFk`                                   |
| secrets         | `Y2Y2MmUy`                               |
| usuário web     | `attlas`                                 |
| senha web       | `atman26`                                |
| Canvas          | 4992×2808, offset x=2290 y=1075          |
| Attlas dev.v2   | `https://dev.v2.attlas.atmansystems.com` |

## NovaStar H9 direto — Postman

POST · header `Content-Type: application/json` · Body > raw > JSON.
Par `sign`/`timeStamp` gerado 14/10/2026 16:09 -03.

**http://10.200.1.52:8000/open/api/main/initStatus**

```json
{"body":{"deviceId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/screen/readList**

```json
{"body":{"deviceId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/screen/readDetail**

```json
{"body":{"deviceId":0,"screenId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/layer/detailList**

```json
{"body":{"deviceId":0,"screenId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/ipc/IPCSourceList**

```json
{"body":{"deviceId":0,"slotId":0,"seqPageIndex":1,"seqPageSize":100},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/layer/create**

```json
{"body":{"deviceId":0,"screenId":0,"general":{"name":"teste","isBackground":false,"isFreeze":false,"flipType":0},"source":{"slotId":255,"interfaceType":13,"sourceType":3,"inputId":255,"cropId":255,"sourceId":9,"channelId":1,"streamId":9,"streamIndex":0,"name":"Est6_izq"},"window":{"x":2290,"y":1075,"width":4992,"height":2808}},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**http://10.200.1.52:8000/open/api/layer/delete**

```json
{"body":{"deviceId":0,"screenId":0,"layerId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

## Attlas — Postman

Headers obrigatórios em **todas**:

| Header | Valor |
| ------ | ----- |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTcwZGFjNC1mNTUzLTQ4ZTQtYjM4OC05YTQ5MmUyYTA0YjkiLCJzaWQiOiJmYzI4ZjkxMC1kMDc2LTRlYjktODdkMC1hZTJlZWU1YjRhNDAiLCJvcmdhbml6YXRpb25JZCI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDAwMSIsImR1dHkiOiJDT0xMQUJPUkFUT1IiLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJuYW1lIjoiQWZvbnNvIEtldmluIEJ1cmdpbnNraSIsImlhdCI6MTc5MjAwMzUyNiwiZXhwIjoxNzkyMDA3MTI2LCJpc3MiOiJhdHRsYXMtcGxhdGZvcm0iLCJqdGkiOiIyZGQ4MDNkYy1jNmYwLTRiZjMtYTllMi1lNGNiOTQ5ZWUzYmIifQ.EYRYiVGOG75BAz4I4ouBOqdoMMx9zTl11rxQBiwnifs` |
| `System-Id` | UUID do Sistema — DevTools > Network > request do videowall > Request Headers > `system-id` |

Sem `System-Id` o guard `@RequireSystemDuty()` devolve 403 `FORBIDDEN_ACTION` / `SYSTEM_ID_UNRESOLVED`
(`libs/core-auth/src/lib/guards/jwt-claims.guard.ts:339`, CROSS-021).

### GET estado do painel

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/state`

Sem body.

---

### GET processor cadastrado

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/processors/current`

Sem body.

---

### POST registrar processor

`POST https://dev.v2.attlas.atmansystems.com/api/vms/videowall/processors`

```json
{
  "name": "H9 Quito",
  "address": "10.200.1.52",
  "port": 8000,
  "pId": "YzFk",
  "secretKey": "Y2Y2MmUy",
  "model": "H9",
  "panelWidth": 4992,
  "panelHeight": 2808,
  "systemId": "6c277280-b369-49a5-bbb9-72a5d5fcf789"
}
```

`systemId` = header `System-Id` (mesmo UUID que vai nos headers). Opcional — sem ele o processor fica sem sistema vinculado.

---

### PATCH atualizar processor

`PATCH https://dev.v2.attlas.atmansystems.com/api/vms/videowall/processors/:id`

`:id` = campo `id` da resposta do `GET processors/current` ou do `POST processors`.

```json
{
  "name": "H9 Quito v2",
  "systemId": "6c277280-b369-49a5-bbb9-72a5d5fcf789"
}
```

---

### GET capabilities do H9

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/capabilities`

Sem body.

---

### GET quem está espelhando (occupancy)

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/occupancy`

Sem body.

---

### POST tomar espelho (mirror)

`POST https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror`

Body mínimo (primeira vez, sem ninguém espelhando):

```json
{}
```

Body com takeover (tomar de outro operador) e slot (posição no grid do painel):

```json
{
  "takeover": true,
  "slot": {
    "gridColumn": 1,
    "gridRow": 1,
    "columnSpan": 1,
    "rowSpan": 1
  }
}
```

`shareId` é opcional — UUID retornado no campo `shareId` de um `POST mirror` anterior (reconectar a uma sessão existente).
Resposta retorna `shareId`, `ingestPath` e outros campos necessários para os próximos endpoints.
```

---

### DELETE liberar espelho

`DELETE https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror`

Sem body.

---

### POST anunciar publishing do mirror

`POST https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror/publishing`

Sem body.

---

### PATCH atualizar share do mirror

`PATCH https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror/shares/:shareId`

`:shareId` = campo `shareId` da resposta do `POST mirror`.

```json
{
  "gridColumn": 1,
  "gridRow": 1,
  "columnSpan": 2,
  "rowSpan": 1,
  "isActive": true
}
```

Todos os campos opcionais.

---

### PUT rearranjar mirror (arrangement)

`PUT https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror/arrangement`

```json
{
  "tiles": [
    {
      "shareId": "← shareId da resposta do POST mirror",
      "gridColumn": 1,
      "gridRow": 1,
      "columnSpan": 1,
      "rowSpan": 1
    }
  ],
  "layout": "CUSTOM"
}
```

`shareId` dentro de cada tile = UUID retornado pelo `POST mirror` de cada operador espelhando.
`layout` aceita: `CUSTOM`, `GRID_2X2`, `GRID_3X3`, `GRID_4X4`, `SPLIT_HORIZONTAL`, `SPLIT_VERTICAL`, `MAIN_LEFT`, `MAIN_RIGHT`, `MAIN_TOP`, `MAIN_BOTTOM`.
`tiles` pode ser `[]`. `arrangement` (árvore recursiva de split/cell) é opcional.

---

### GET grupos

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/groups`

Sem body.

---

### POST criar grupo

`POST https://dev.v2.attlas.atmansystems.com/api/vms/videowall/groups`

```json
{
  "name": "Grupo Quito",
  "layout": "GRID_2X2"
}
```

`layout` é opcional (default `CUSTOM`).

---

### POST aplicar grupo

`POST https://dev.v2.attlas.atmansystems.com/api/vms/videowall/groups/:groupId/apply`

```json
{
  "takeover": false
}
```

`takeover` é opcional.

---

### DELETE remover grupo

`DELETE https://dev.v2.attlas.atmansystems.com/api/vms/videowall/groups/:groupId`

Sem body.

---

### GET layouts

`GET https://dev.v2.attlas.atmansystems.com/api/vms/layouts`

Sem body. Sem `System-Id` (escopo org do JWT).

---

### GET cenas

`GET https://dev.v2.attlas.atmansystems.com/api/vms/scenes`

Sem body. Sem `System-Id` (escopo org do JWT).

---

### GET detalhe de cena

`GET https://dev.v2.attlas.atmansystems.com/api/vms/scenes/:id`

`:id` = campo `id` da resposta do `GET scenes`.

Sem body. Sem `System-Id` (escopo org do JWT).

---

### POST criar cena

`POST https://dev.v2.attlas.atmansystems.com/api/vms/scenes`

```json
{
  "name": "Cena Quito",
  "layoutId": "← id da resposta do GET /api/vms/layouts",
  "cells": [
    {
      "cameraId": "← id de uma câmera do GET /api/cameras",
      "position": 0
    },
    {
      "cameraId": "← id de outra câmera",
      "position": 1
    }
  ]
}
```

`layoutId` e `customGrid` são opcionais. `cells` é obrigatório (array, pode ser vazio).
`position` = índice da célula no layout (começa em 0).

---

### PATCH atualizar cena

`PATCH https://dev.v2.attlas.atmansystems.com/api/vms/scenes/:id`

`:id` = campo `id` da resposta do `GET scenes` ou `POST scenes`.

```json
{
  "name": "Cena Quito v2",
  "cells": [
    {
      "cameraId": "← id de uma câmera do GET /api/cameras",
      "position": 0
    }
  ]
}
```

Todos os campos opcionais.

---

### DELETE cena

`DELETE https://dev.v2.attlas.atmansystems.com/api/vms/scenes/:id`

`:id` = campo `id` da resposta do `GET scenes`.

Sem body.

---

### POST ativar cena

`POST https://dev.v2.attlas.atmansystems.com/api/vms/scenes/:id/activate`

`:id` = campo `id` da resposta do `GET scenes`.

```json
{
  "target": "BROWSER_SESSION"
}
```

`target`: `BROWSER_SESSION` (default, mosaico no browser) ou `VIDEOWALL` (painel físico — exige `System-Id`).
`takeover` opcional (`boolean`) — tomar o painel de outro operador.

---

### POST desativar cena

`POST https://dev.v2.attlas.atmansystems.com/api/vms/scenes/:id/deactivate`

`:id` = campo `id` da resposta do `GET scenes`.

```json
{
  "target": "BROWSER_SESSION"
}
```

Mesmo body que ativar.

---

### PATCH brilho do painel

`PATCH https://dev.v2.attlas.atmansystems.com/api/vms/videowall/brightness`

```json
{
  "value": 50
}
```

`value`: inteiro (0–100 no H9). Requer `SYSTEM_ADMIN`.

## Acesso ao cluster

Terminal (único lugar que precisa):

```bash
ssh -i ~/orbit-state/secrets/ssh/id_ed25519 ubuntu@3.15.199.101
kubectl --context kind-attlas -n attlas-dev get pods | grep ms-cameras
kubectl --context kind-attlas -n attlas-dev exec -it deploy/ms-cameras -- sh
```

## IPC Sources (20 câmeras)

| sourceId | sourceName | ip          |
| -------- | ---------- | ----------- |
| 0        | Est4_izq   | 10.200.4.25 |
| 1        | Est4_der   | 10.200.4.25 |
| 2        | Est3_der   | 10.200.4.26 |
| 3        | Est3_izq   | 10.200.4.26 |
| 4        | Est9_der   | 10.200.4.23 |
| 5        | Est9_izq   | 10.200.4.23 |
| 6        | Est1_der   | 10.200.4.27 |
| 7        | Est1_izq   | 10.200.4.27 |
| 8        | Est6_der   | 10.200.4.28 |
| 9        | Est6_izq   | 10.200.4.28 |
| 10       | Est5_der   | 10.200.4.29 |
| 11       | Est5_izq   | 10.200.4.29 |
| 12       | Admin_izq  | 10.200.4.22 |
| 14       | Est7_izq   | 10.200.4.30 |
| 15       | Est7_der   | 10.200.4.30 |
| 16       | Esta8_der  | 10.200.4.24 |
| 17       | Est8_izq   | 10.200.4.24 |
| 18       | Est2_der   | 10.200.4.21 |
| 19       | Est2_izq   | 10.200.4.21 |
| 20       | Admin_der  | 10.200.4.22 |

## Diagnóstico: por que o Attlas retorna reachable=false

1. **Processor não cadastrado** — `GET /vms/videowall/processors/current` retorna vazio → ninguém registrou o H9 no Attlas
2. **Cipher mode** — se `NOVASTAR_CIPHER_ENABLED=true`, o ms-cameras cifra body com DES e assina com secretKey; se a key não bate, H9 devolve `Server_Err`
3. **Ftb ligado** — `Ftb.enable=1` no readDetail = tela preta mesmo com layer projetada; desligar na web do H9 (Programming > Screen > Black Screen)

## PRs relacionados

- https://github.com/atmanadmin/attlas-2026/pull/6642
- https://github.com/atmanadmin/attlas-2026/pull/6925
- https://github.com/atmanadmin/attlas-2026/pull/6932
- https://github.com/atmanadmin/attlas-2026/pull/6947
