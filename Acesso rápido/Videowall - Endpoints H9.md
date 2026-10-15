---
tags:
  - doc
  - cameras
  - videowall
  - quito
aliases:
  - "Videowall - Endpoints H9"
  - "Videowall H9 Quito - Teste de streaming"
  - "Videowall H9 Quito - Endpoints"
atualizado: 2026-10-15
---

# Videowall - Endpoints H9
Tudo pronto para colar. Credenciais em [[Videowall - Credenciais H9]]. Por que o vídeo não chega:
[[Videowall - Vídeo não chega ao H9]].

## 1. Ver o vídeo que o videowall entrega

Com a tela espelhando no Attlas, rodar no terminal. O comando acha o espelhamento no ar e abre o vídeo.

Pela internet:

```bash
P=$(ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev exec deploy/ms-cameras -- wget -qO- "http://mediamtx:9997/v3/paths/list?itemsPerPage=1000"' | python3 -c "import sys,json; print(next(i['name'] for i in json.load(sys.stdin)['items'] if i['name'].startswith('videowall-mirror-') and i['ready']))"); ffplay -rtsp_transport tcp "rtsp://videowall-h9-reader:b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw@3.15.199.101:554/$P"
```

Pela VPN de Quito:

```bash
sudo wg-quick up /home/afonso/.config/wireguard/wg-quito.conf
P=$(ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev exec deploy/ms-cameras -- wget -qO- "http://mediamtx:9997/v3/paths/list?itemsPerPage=1000"' | python3 -c "import sys,json; print(next(i['name'] for i in json.load(sys.stdin)['items'] if i['name'].startswith('videowall-mirror-') and i['ready']))"); ffplay -rtsp_transport tcp "rtsp://videowall-h9-reader:b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw@192.168.10.16:554/$P"
```

## 2. H9 direto

No Postman: método **POST**, header `Content-Type: application/json`, Body > raw > JSON. O `sign` e o
`timeStamp` não vencem.

### O H9 responde?

`POST http://10.200.1.52:8000/open/api/main/initStatus`

```json
{"body":{"deviceId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

### Fontes cadastradas no H9

`POST http://10.200.1.52:8000/open/api/ipc/IPCSourceList`

```json
{"body":{"deviceId":0,"slotId":0,"seqPageIndex":1,"seqPageSize":100},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

### Endereço e decodificação de uma fonte

`POST http://10.200.1.52:8000/open/api/ipc/IPCChannelList`, com o `sourceId` da lista acima:

```json
{"body":{"deviceId":0,"sourceId":<sourceId>},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

Em `channelList[0].streamList[0]`, `protocol.rtsp.rtspUrl` é o endereço que o H9 recebeu e `decodeStatus` é o
Decoding Status da interface web: `20` é `Decoder uninitialized` e `0` é `Decoded`.

### Camadas no painel

`POST http://10.200.1.52:8000/open/api/layer/detailList`

```json
{"body":{"deviceId":0,"screenId":0},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

## 3. Testar se a placa do H9 alcança o servidor do Attlas

Não precisa espelhar nada. O teste aponta o H9 para um endereço fixo do servidor do Attlas e mostra no Status
do H9 se a placa chegou lá.

**Passo 1. Criar a fonte de teste.**

`POST http://10.200.1.52:8000/open/api/ipc/IPCSourceCreate`

```json
{"body":{"deviceId":0,"slotId":255,"endIp":"","ipList":[],"sourceName":"attlas-teste-554","createTime":"","ip":"3.15.199.101","ipcType":0,"decodeCapacity":2,"channelList":[{"channelIndex":1,"channelName":"attlas-teste-554","streamList":[{"streamIndex":0,"protocol":{"type":1,"rtsp":{"manufacturer":255,"rtspUrl":"rtsp://3.15.199.101:554/videowall-mirror-teste","rtspIp":"3.15.199.101","rtspPort":554,"rtspUsrName":"videowall-h9-reader","rtspPassWord":"b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw","mode":0}}}]}]},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

A resposta traz `sourceId`, `channelId` e `streamId`. No teste de 14/10 vieram `13`, `13` e `26`, que é o que
o passo 2 usa. Se vierem outros números, troque no passo 2.

**Passo 2. Abrir a camada no painel.**

`POST http://10.200.1.52:8000/open/api/layer/create`

```json
{"body":{"deviceId":0,"screenId":0,"general":{"name":"attlas-teste-554","isBackground":false,"isFreeze":false,"flipType":0},"source":{"slotId":255,"interfaceType":13,"sourceType":3,"inputId":255,"cropId":255,"sourceId":13,"channelId":13,"streamId":26,"streamIndex":0,"name":"attlas-teste-554"},"window":{"x":2290,"y":1075,"width":2496,"height":1404}},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

**Passo 3. Ler o resultado.** Na interface web do H9 (`http://10.200.1.52`), aba Programming, abrir o Status da
fonte `attlas-teste-554`.

- **Connection Status `Other error`:** a placa não alcança o servidor do Attlas. É o estado de hoje.
- **Connection Status `Service not found`:** a placa alcançou o servidor. A rede está resolvida; só falta um
  espelhamento de verdade no ar.

**Passo 4. Limpar.** Apagar a camada e depois a fonte. O `layerId` é o `id` da resposta do passo 2.

`POST http://10.200.1.52:8000/open/api/layer/delete`

```json
{"body":{"deviceId":0,"screenId":0,"layerId":1},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

`POST http://10.200.1.52:8000/open/api/ipc/IPCSourceDelete`

```json
{"body":{"deviceId":0,"sourceList":[{"sourceId":13}]},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

## 4. Attlas

Toda chamada do Attlas precisa do token de login e do System-Id. O token vence em 1 hora; quando a API
responder `401`, é só fazer o login de novo.

### Login (pega o token)

`POST https://dev.v2.attlas.atmansystems.com/api/organization/auth/login`

Header `Content-Type: application/json`, Body > raw > JSON, sem token:

```json
{"email":"admin@atmansystems.com","password":"change-me"}
```

É o usuário master. Na resposta, copiar o valor de `accessToken` (o texto que começa com `eyJ`).

**Colocar o token no Postman, em cada request:**

1. Aba **Authorization**: em **Auth Type**, escolher **Bearer Token** e colar o token no campo **Token**.
2. Aba **Headers**: adicionar a linha com Key `System-Id` e Value `6c277280-b369-49a5-bbb9-72a5d5fcf789`.

Para não colar o token em toda request: clicar no nome da **Collection**, aba **Authorization**, escolher
**Bearer Token** e colar o token ali. Cada request fica com Auth Type **Inherit auth from parent**. O
`System-Id` continua na aba Headers de cada request, porque a Collection não tem aba de headers.

### Estado do painel

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/state`

### Processador cadastrado e endereço que o H9 recebe

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/processors/current`

O campo `streamEndpoint` é o endereço RTSP que o Attlas manda ao H9.

### Trocar o endereço que o H9 recebe

`PATCH https://dev.v2.attlas.atmansystems.com/api/vms/videowall/processors/375be424-47af-449e-a10a-81e156696a3e`

O body leva o cadastro inteiro: só `streamHost` e `streamPort` falham com `VALIDATION_FAILED`, e sem `systemId`
o processador fica desvinculado.

Como está hoje, no host padrão do servidor (`192.168.10.16:554`, pela VPN de Quito):

```json
{"name":"H9 Quito","address":"10.200.1.52","port":8000,"model":"H9","panelWidth":4992,"panelHeight":2808,"streamHost":null,"streamPort":554,"systemId":"6c277280-b369-49a5-bbb9-72a5d5fcf789"}
```

Pelo redirecionamento no roteador de Quito (o que fazer, no diagnóstico):

```json
{"name":"H9 Quito","address":"10.200.1.52","port":8000,"model":"H9","panelWidth":4992,"panelHeight":2808,"streamHost":"10.200.1.1","streamPort":554,"systemId":"6c277280-b369-49a5-bbb9-72a5d5fcf789"}
```

### Quem está no painel

`GET https://dev.v2.attlas.atmansystems.com/api/vms/videowall/occupancy`

### Liberar o painel

`DELETE https://dev.v2.attlas.atmansystems.com/api/vms/videowall/mirror`
