---
tags:
  - doc
  - cameras
  - videowall
  - runbook
  - quito
aliases:
  - "Câmeras - Videowall - Runbook - Testar se o H9 tenta buscar o vídeo"
  - "Videowall H9 Quito - Teste ao vivo"
atualizado: 2026-10-15
---

# Câmeras - Videowall - Runbook - Testar se o H9 tenta buscar o vídeo

Volta para [[Câmeras - Videowall]]. Por que o vídeo não chega:
[[Videowall - Vídeo não chega ao H9]]. Senhas em [[Videowall - Credenciais H9]].

## Resumo

O teste mostra ao vivo se a placa de vídeo do H9 tenta buscar o vídeo no servidor do Attlas. Ficam abertos ao
mesmo tempo o log do servidor de vídeo, a captura de rede do servidor e o estado da placa no H9. Um controle com o
`ffplay` prova que o vídeo abre de fora e que a captura enxerga conexões de fora, para que a ausência de linha da
placa queira dizer, de fato, que ela não tentou.

Tudo roda no seu computador: três terminais e o navegador.

- **Terminal 1:** log do servidor de vídeo.
- **Terminal 2:** captura de rede do servidor.
- **Terminal 3:** controle com o `ffplay` e estado da placa.
- **Navegador, aba 1:** Attlas, para mandar o vídeo ao painel.
- **Navegador, aba 2 (opcional):** interface web do H9, para ver o mesmo estado na tela dele.

## 0. Antes de começar

1. Abrir três terminais no seu computador. Em cada um, o prompt tem de ser
   `afonso@afonso-Dell-14-DC14250:~$`.
2. Se algum terminal mostrar `ubuntu@ip-172-31-46-250:~$`, ele está dentro do servidor. Digitar `exit` e Enter
   até voltar ao prompt do seu computador.
3. Em cada passo, copiar só o conteúdo do bloco de código, sem prompt e sem a resposta de comandos anteriores.
4. Ligar a VPN de Quito no terminal 3. O vídeo do videowall fica em `192.168.10.16:554`, o servidor do Attlas
   dentro da VPN, e o passo 4 só alcança esse endereço com ela ligada:

```bash
sudo wg-quick up /home/afonso/.config/wireguard/wg-quito.conf
```

O log e a captura mostram o horário em UTC. O horário de Brasília é 3 horas a menos.

## 1. Abrir o log do servidor de vídeo

**Onde:** terminal 1, no seu computador.

```bash
ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev logs -f --tail=0 deploy/mediamtx' | grep --line-buffered videowall-
```

O terminal fica parado, esperando. Isso é o esperado: as linhas aparecem quando algo acontece. O `grep` deixa só
as linhas do videowall. Sem ele, o log se enche com as câmeras abertas no VMS do navegador (`[WebRTC]`), que não
têm relação com o teste.

O que ler:

- `is publishing to path 'videowall-mirror-<id>'`: o espelho chegou ao servidor de vídeo.
- `[path videowall-projection-<id>] [RTSP source] started on demand`: alguém pediu o vídeo de uma câmera de
  cena. Essa linha só aparece quando um leitor abre o vídeo, e a placa do H9 é esse leitor.
- `is reading from path 'videowall-...'`: alguém está recebendo o vídeo.
- O log mostra todo cliente como `10.244.0.1`, a rede interna do servidor. A origem de cada conexão só aparece
  no terminal 2.

## 2. Abrir a captura de rede

**Onde:** terminal 2, no seu computador.

```bash
ssh ec2-attlas "sudo tcpdump -lni wg0 'tcp dst port 554 and tcp[tcpflags] & tcp-syn != 0'"
```

O terminal mostra `listening on wg0` e fica parado, esperando.

O que cada parte do filtro faz:

- `wg0`: a VPN de Quito no servidor do Attlas, onde o servidor tem o endereço `192.168.10.16`. Tudo o que vem de
  Quito para o vídeo entra por ela.
- `tcp dst port 554`: só a porta RTSP que o H9 recebe no endereço.
- `tcp-syn`: só o primeiro pacote de cada conexão, uma linha por tentativa.

O que ler: cada linha nova é uma tentativa de conexão, na forma
`<IP de quem tentou>.<porta> > 192.168.10.16.554: Flags [S]`. Com a regra do roteador de Quito, a placa aparece
como `192.168.10.10`, o endereço do roteador na VPN. O seu computador aparece como `192.168.10.29`.

## 3. Mandar vídeo ao painel

**Onde:** navegador, aba 1, em `https://dev.v2.attlas.atmansystems.com`. Escolher um dos dois jeitos.

**Espelho da tela:**

1. Abrir a câmera no VMS (menu Câmeras, VMS).
2. Clicar no botão Atalhos do Sistema, depois em Videowall e em Espelhar.
3. Clicar em Enviar ao painel e confirmar no navegador o compartilhamento da aba.

O terminal 1 mostra `is publishing to path 'videowall-mirror-<id>'`. Copiar o `<id>`, que o passo 4 usa. No H9
aparece uma camada `attlas-mirror-...`.

**Cena do VMS:** ativar a cena no painel pelo VMS. No H9 aparece uma camada `attlas-cam-<12 caracteres>`. Os 12
caracteres são o começo do id que o Attlas dá à fonte da cena, nunca o id da câmera, para os operadores do H9
não verem dado da câmera.

**Confirmar no Postman o que o H9 recebeu e se decodificou algo.** Duas chamadas, as duas com
`Content-Type: application/json` e Body > raw > JSON.

1. `POST http://10.200.1.52:8000/open/api/ipc/IPCSourceList`, com o body de
   [[Videowall - Endpoints H9#Fontes cadastradas no H9]]. Achar na resposta a fonte com `sourceName`
   `attlas-mirror-...` ou `attlas-cam-...` e anotar o `sourceId` dela.
2. `POST http://10.200.1.52:8000/open/api/ipc/IPCChannelList`, trocando `<sourceId>` pelo número anotado:

```json
{"body":{"deviceId":0,"sourceId":<sourceId>},"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"}
```

O que ler em `channelList[0].streamList[0]`:

- `protocol.rtsp.rtspUrl`: o endereço exato que o Attlas mandou ao H9, por exemplo
  `rtsp://192.168.10.16:554/videowall-projection-<id>`. É o mesmo endereço que o `ffplay` do passo 4 abre.
- `decodeStatus`: `20` é `Decoder uninitialized`, nenhum dado chegou à placa. Com o vídeo chegando, vira `0`
  (`Decoded`). Os outros códigos estão em [[Câmeras - Videowall - Open API e hardware do H9#Status da fonte IPC]].
- `resolution` em `0` x `0` e `framerate` `0`: nada foi decodificado.
- `layerCount` `1`: a fonte está numa camada do painel.

## 4. Abrir o mesmo vídeo de fora

**Onde:** terminal 3, no seu computador.

Abrir o `rtspUrl` que o H9 recebeu (resposta do `IPCChannelList` no passo 3):

```bash
ffplay -rtsp_transport tcp "<rtspUrl>"
```

No espelho, o endereço pede a Senha RTSP de [[Videowall - Credenciais H9]]:
`rtsp://videowall-h9-reader:<senha>@192.168.10.16:554/videowall-mirror-<id>`.

O que ler:

- Abre uma janela com o vídeo: ele existe e abre de fora, com os mesmos dados que o H9 recebeu.
- Terminal 2: aparece uma linha com o seu IP na VPN, `192.168.10.29`.
- Terminal 1: aparece `is reading from path`.

Fechar a janela do `ffplay` antes de seguir.

## 5. Ler o estado da placa

**Onde:** terminal 3, no seu computador. Três comandos, cada um responde uma pergunta.

**A placa recebeu algum dado?** Lista cada fonte do Attlas no H9 com o endereço que recebeu e o estado do
decodificador. É o mesmo que o Postman do passo 3, sem precisar achar o `sourceId`.

```bash
H9=http://10.200.1.52:8000/open/api; A='"sign":"NmE0YjVkNTFlYTczNDIyZjE5ZGEwZGNlN2ZiOTkxOTI=","pId":"YzFk","timeStamp":"1792004952244"'; for id in $(curl -s -X POST $H9/ipc/IPCSourceList -H 'Content-Type: application/json' -d "{\"body\":{\"deviceId\":0,\"slotId\":0,\"seqPageIndex\":1,\"seqPageSize\":100},$A}" | python3 -c "import sys,json; [print(s['sourceId']) for s in json.load(sys.stdin)['body']['sourceList'] if s['sourceName'].startswith('attlas-')]"); do curl -s -X POST $H9/ipc/IPCChannelList -H 'Content-Type: application/json' -d "{\"body\":{\"deviceId\":0,\"sourceId\":$id},$A}" | python3 -c "import sys,json; c=json.load(sys.stdin)['body']['channelList'][0]; s=c['streamList'][0]; r=s['resolution']; print(c['sourceName'], s['protocol']['rtsp']['rtspUrl'], 'decodeStatus:', s['decodeStatus'], 'video:', r['width'], 'x', r['height'])"; done
```

Resposta com a cena no painel: `attlas-cam-c8738c8b1b14 rtsp://192.168.10.16:554/videowall-projection-... decodeStatus: 20 video: 0 x 0`.
`20` é `Decoder uninitialized`: nenhum dado chegou à placa. Com vídeo chegando, vira `0` e o vídeo mostra a
resolução da câmera.

**Alguém está recebendo esse vídeo do servidor?** Trocar `<caminho>` pelo trecho do endereço depois de `554/`.

```bash
ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev exec deploy/ms-cameras -- wget -qO- "http://mediamtx:9997/v3/paths/get/<caminho>"' | python3 -c "import sys,json; p=json.load(sys.stdin); print('video ligado:', p['ready'], '| leitores:', [r['type'] for r in p['readers']])"
```

Com o vídeo no painel, `video ligado: False | leitores: []`: o servidor nem buscou a câmera, porque ninguém
pediu, nem a placa. Com o `ffplay` do passo 4 aberto, vira `video ligado: True | leitores: ['rtspSession']`.

**A placa está ligada e na rede?**

```bash
ping -c 3 10.200.1.53
```

A placa responde. Ela está ligada e alcançável pela VPN; só não abre conexão para fora das duas redes dela.

O mesmo estado aparece na interface web do H9 (`http://10.200.1.52`, usuário e senha em
[[Videowall - Credenciais H9]]): aba Programming, Status da camada, janela IPC Signal Source, item
Decoding Status. Lá aparecem Connection Status `Other error` e Decoding Status `Decoder uninitialized`, que
é o `20`.

## 6. Concluir

- **Durante o espelho, o terminal 2 só mostra a sua linha e o H9 fica em `Other error`:** a placa nem tentou
  conectar. O vídeo está no servidor e abre de fora com os mesmos dados, então o problema é a rede de Quito,
  que não deixa a placa sair.
- **Aparece no terminal 2 uma linha de outro IP logo que a camada surge no H9, repetindo a cada nova
  tentativa:** é a placa chegando ao servidor. Nesse caso o Status do H9 muda, e o problema passa a ser o que
  ele disser.

## 7. Encerrar

1. **Navegador, aba 1:** botão Atalhos do Sistema, Videowall, Liberar. O Attlas apaga do H9 a camada e a fonte
   do espelho.
2. **Terminais 1 e 2:** `Ctrl+C` em cada um.

## Glossário

- **Servidor de vídeo (MediaMTX):** recebe o espelho do navegador e entrega o vídeo ao H9 por RTSP.
- **Captura de rede (`tcpdump`):** mostra os pacotes que chegam ao servidor. O filtro do passo 2 deixa só o
  primeiro pacote de cada conexão na porta 554.
- **Placa de vídeo (INPUT 7):** a peça do H9 que busca o vídeo. É diferente do controlador `10.200.1.52`, que
  recebe os comandos do Attlas.

## Nota: o H9 busca o vídeo, o Attlas não envia

O Attlas não manda vídeo para a placa. Ele cadastra no H9 uma fonte com o endereço RTSP, o usuário e a senha, e
a placa conecta nesse endereço e busca o vídeo. O manual do H9 confirma, no cadastro de fonte por RTSP: "you
must obtain the URL of the RTSP service and the matched user name and password in advance". Os outros dois modos
do manual também partem do H9: ONVIF entra na câmera pelo IP dela, e GB28181 liga o H9 a um sistema de
monitoramento. Nenhum aceita vídeo empurrado de fora, então a placa precisa de rota até o servidor.

Referências no manual (H Series Video Wall Splicers User Manual V1.12.0):

- [[H-Series-Video-Wall-Splicers-User-Manual-V1.12.0.pdf#page=66|Página 66]]: a frase citada, no modo RTSP do
  cadastro de fonte.
- [[H-Series-Video-Wall-Splicers-User-Manual-V1.12.0.pdf#page=65|Página 65]]: início da seção 6.5.2.1 Add IPC
  Signal, com os três modos (GB28181, RTSP e ONVIF).
- [[H-Series-Video-Wall-Splicers-User-Manual-V1.12.0.pdf#page=57|Página 57]]: seção 6.4.1.2 IP Input Card, onde
  se configura o IP de cada porta da placa.
