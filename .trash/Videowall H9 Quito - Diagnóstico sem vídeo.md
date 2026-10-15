---
tags: [cameras, videowall, h9, quito, diagnostico]
aliases: [H9 Quito No Signal, Videowall sem vídeo]
atualizado: 2026-10-14
---

# Videowall H9 Quito - Diagnóstico sem vídeo

Volta para [[Videowall H9 Quito - Referência]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Sintoma | Layer no H9 com `Connection Status: Other error`, `Decoder uninitialized` |
| O Attlas controla o H9? | Sim. Open API na porta 8000 responde |
| O payload do Attlas está certo? | Sim. Fonte criada igual às câmeras que funcionam, decoder alocado (`decodeId 0`) |
| O MediaMTX tem o stream? | Sim. Path `ready: true` |
| O relay funciona? | Sim. `192.168.10.11:554` entrega no MediaMTX do dev.v2, validado ponta a ponta |
| Causa | A VPN de Quito não deixa passar conexão que nasce em Quito para 192.168.10.0/24 |
| Correção | Rota ou port forward no roteador de Quito (ver [[#Correção de rede]]) |
| Código | Corrigido e mergeado em `develop` (ver [[#Bugs corrigidos]] e [[#Interface]]) |

## Topologia

| Nó | Endereço | Papel |
| --- | --- | --- |
| H9 Quito | 10.200.1.52 (Open API 8000) | Processador do videowall |
| Placa IP do H9 (slot I-7) | porta 1 `10.200.4.202` gw `10.200.4.1`, porta 2 `10.200.1.53` gw `10.200.1.1` | Puxa o RTSP. Modo de decodificação 16x 200W |
| Câmeras Quito | 10.200.4.x:554 | IPC sources que funcionam (mesma LAN da placa) |
| Servidor WireGuard | 18.216.165.106:51820 | Hub da VPN. Liga Quito (10.200.x) aos clientes 192.168.10.x |
| `aws-attlas-develop` | wg0 `192.168.10.11`, Tailscale `100.95.150.89`, AWS `172.31.41.55` | Cliente WG. Subnet router Tailscale das redes 10.200.x. Hospeda o relay RTSP |
| EC2 dev.v2 | wg0 `192.168.10.16`, Tailscale `100.101.165.32`, público `3.15.199.101` | ms-cameras + MediaMTX (kind, NodePort RTSP 30554) |

O 10.200.1.53 é a porta 2 da placa IP do H9, não um servidor. Por isso não tem SSH.

Conexões abertas da AWS para Quito funcionam: o Attlas fala com o H9 e puxa as câmeras. Conexões que nascem em Quito para 192.168.10.0/24 não atravessam a VPN. O vídeo depende desse sentido, porque a placa do H9 é cliente RTSP (pull).

## Evidência

| Teste | Resultado |
| --- | --- |
| H9 apontado para `3.15.199.101:554` e `:8554` | Zero pacotes no EC2 dev.v2 |
| H9 apontado para `100.101.165.32:554` (Tailscale) | Zero pacotes |
| H9 apontado para `192.168.10.16:554` (wg0 do dev.v2) | Zero pacotes |
| H9 apontado para o relay `192.168.10.11:554` | Zero pacotes no wg0 do `aws-attlas-develop` vindos de 10.200.4.202, 10.200.1.53 ou 10.200.1.52 |
| Conexão de teste do dev.v2 para `192.168.10.11:554` | Caminho completo até o MediaMTX, `RTSP/1.0 200 OK` |

Captura completa em [[Videowall H9 Quito - tcpdump espelhamento]].

## Correção de rede

Fora do Attlas. Quem administra o roteador de Quito ou o servidor WireGuard aplica uma das duas:

1. Rota no roteador de Quito (`10.200.4.1` e `10.200.1.1`) para `192.168.10.0/24` pelo túnel WireGuard, com o servidor `18.216.165.106` encaminhando até `192.168.10.11`.
2. Port forward no roteador de Quito: TCP 554 de um IP local (ex.: `10.200.4.1:554`) para `192.168.10.11:554`.

Depois disso, o endereço do streaming é configurado pela tela do processador:

| Opção aplicada | Streaming RTSP no processador |
| --- | --- |
| 1 | `192.168.10.11` porta `554` |
| 2 | IP e porta do port forward (ex.: `10.200.4.1` porta `554`) |

Validação: `nc -zv <ip> 554` a partir de uma máquina da rede 10.200.4.x tem que conectar.

## Relay no aws-attlas-develop

Aplicado e persistido. Acesso: `ssh -i ~/.ssh/id_ed25519_aws_attlas ubuntu@100.95.150.89`.

```bash
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A PREROUTING -i wg0 -d 192.168.10.11 -p tcp --dport 554 -j DNAT --to-destination 100.101.165.32:8554
iptables -t nat -A POSTROUTING -d 100.101.165.32 -p tcp --dport 8554 -j MASQUERADE
```

Desfazer: as mesmas regras com `-D` no lugar de `-A`, depois `netfilter-persistent save`.

No EC2 dev.v2, o serviço systemd `rtsp-forward.service` (`/usr/local/bin/rtsp-forward.sh`) faz DNAT das portas 554 e 8554 do host para `172.19.0.2:30554` (MediaMTX no kind). Security Group com 554/TCP e 8554/TCP abertas. MediaMTX aceita só TCP (`rtspTransports: [tcp]` em `docker/mediamtx.yml`).

## Bugs corrigidos

Comparação com uma IPC source que funciona (`Est6_izq`), lida por `ipc/IPCSourceList` e `ipc/IPCChannelList`:

| Campo do `ipc/IPCSourceCreate` | Câmera que funciona | Attlas enviava | Efeito do erro |
| --- | --- | --- | --- |
| `slotId` | 255 | slot da placa (6) | Fonte sem decoder |
| `ipcType` | 0 | ausente (H9 grava 255) | Fonte sem decoder |
| `decodeCapacity` | 2 (200W) | ausente (H9 grava 255) | Fonte sem decoder |
| `protocol.rtsp.manufacturer` | 255 (Other) | 0 (perfil de fabricante) | Perfil errado |
| `protocol.rtsp.rtspPort` | número | string | H9 descarta e assume 554 |

Valores em `apps/ms-cameras/src/video-wall/targets/novastar-h9/novastar-protocol.constants.ts`, payload em `apps/ms-cameras/src/video-wall/targets/novastar-h9/ipc/novastar-ipc-source.registry.ts`. O layer continua aberto no slot da placa; o H9 aloca o decoder (`decodeId 0`).

`IPC Specification` (200W, 400W) na interface do H9 é o `decodeCapacity`. Precisa caber no modo de decodificação da placa (16x 200W).

## Interface

| Tela | Campos |
| --- | --- |
| Cadastro do processador | nome, endereço e porta da API, pId, secretKey, modelo, endereço do streaming RTSP (host e porta) |
| Edição do processador | todos os campos do cadastro. Credenciais sempre visíveis (`Project ID (pId)`); vazias mantêm as atuais |
| Resumo do processador | `API do processador: <ip>:<porta>` e `Streaming RTSP: <host>:<porta>` com a origem (padrão do servidor ou definido no processador) |

Streaming vazio usa `MEDIAMTX_RTSP_URL`. O endereço por processador vale para espelhamento e para projeção de câmeras.

> [!warning] O tamanho do painel editado à mão é sobrescrito na próxima leitura do H9, que grava o tamanho informado pelo equipamento.

## Pendências

- Rota ou port forward no roteador de Quito ([[#Correção de rede]]).
- Configurar o streaming RTSP do processador com o endereço resultante.
- Remover a IPC source e o layer `attlas-mirror-hermestest` do H9 e o pod `vw-testsrc` do namespace `attlas-dev`.

## Glossário

| Termo | Significado |
| --- | --- |
| IPC source | Fonte de vídeo IP cadastrada no H9. A placa IP puxa o RTSP dela |
| Relay | DNAT que recebe na porta 554 e entrega no MediaMTX do dev.v2 |
| Pull RTSP | O cliente (placa do H9) abre a conexão até o servidor (MediaMTX) |
