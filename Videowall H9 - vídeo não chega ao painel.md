---
tags:
  - videowall
  - novastar
  - quito
  - rede
atualizado: 2026-10-01
---

# Videowall H9 - vídeo não chega ao painel

> [!warning] Ponto de partida para amanhã (01/10/2026, 17:30 em Brasília)
> - O Attlas controla o H9 real de Quito e abre a camada com a câmera na tela; falta o vídeo chegar.
> - A VPN voltou: `192.168.10.10` e o MikroTik `10.200.0.1` respondem do dev.v2 e do PC.
> - **Bloqueio atual: o H9 sumiu da rede de Quito.** O MikroTik responde "host inalcançável" para
>   `10.200.0.51` e `10.200.0.53`, e uma varredura de `10.200.0.0/24` (ping e porta `8000`) só achou o
>   próprio MikroTik. O H9 está desligado, sem cabo ou com outro IP.
> - O vídeo agora vai pelo IP público do dev.v2 (`rtsp://3.15.199.101:8554`), porta já aberta e testada.

## O que fazer amanhã, em ordem

1. **Alguém em Quito: religar o H9 na rede.**
   - Conferir se o H9 está ligado e com o cabo da rede do H9 conectado (porta que fica em `10.200.0.51`).
   - Se mudou de IP, ler o IP novo no painel frontal do H9 e atualizar o cadastro do processador.
   - Para conferir: `ping 10.200.0.51` respondendo, do PC com o túnel ligado.
2. **Testar o vídeo.** Com Quito de volta, projetar uma cena no videowall pelo Attlas, ou rodar no dev.v2
   `python3 /tmp/h9_e2e.py` (recria a fonte da câmera, abre a camada e mostra se a placa conectou).
   - No dev.v2, `sudo tcpdump -ni any tcp port 8554` tem de mostrar a conexão vinda do IP público de Quito.
   - O path `videowall-projection-...` no MediaMTX passa a ter leitor, e a câmera aparece no painel.
3. **Se a placa não conectar:** ela não tem saída para a internet pelo gateway que usa (ver "A placa de
   vídeo do H9"). Saídas possíveis, com quem tem acesso a Quito:
   - regra de NAT no MikroTik `10.200.0.1`:
     `/ip firewall nat add chain=srcnat src-address=10.200.4.0/24 dst-address=192.168.10.0/24 action=masquerade`
     e a fonte voltando a apontar para `rtsp://192.168.10.16:8554`;
   - ou um retransmissor (MediaMTX) numa máquina dentro da rede de Quito.

## Como o vídeo chega ao painel

1. O Attlas (dev.v2) manda comandos para a Open API do H9 em `10.200.0.51:8000`, pela VPN.
2. O H9 recebe uma fonte IPC com o endereço do vídeo, hoje `rtsp://3.15.199.101:8554/<caminho>`.
3. A placa de vídeo IP do H9 abre a conexão RTSP até esse endereço e puxa o vídeo do MediaMTX.
4. A camada na tela mostra o vídeo.

Até 14:40 (Brasília) os passos 1 e 2 funcionavam e o 3 não acontecia. Agora nem o 1 funciona, porque o H9 não responde na rede de Quito.

## A VPN

Concentrador WireGuard `18.216.165.106:51820`, chave pública `/HHq9akJprOvstVC2XTH+0D/YEMeL9Lj3VNRhY6F8kc=`.

| Peer | IP na VPN | AllowedIPs no concentrador | Em 01/10, 17:30 em Brasília |
| --- | --- | --- | --- |
| Servidor do Attlas (dev.v2) | `192.168.10.16` | `192.168.10.16/32` | Conectado |
| PC do Afonso | `192.168.10.29` | `192.168.10.29/32` | Conectado |
| Quito | `192.168.10.10` | `192.168.10.10/32, 10.200.0.0/24, 192.168.8.0/24` | Conectado (voltou depois da queda das 14:40) |

O que aconteceu às 14:40 (Brasília): o `10.200.0.0/24` foi colocado também no peer do Attlas. No WireGuard, `AllowedIPs`
é a tabela de rotas e cada faixa só vale para um peer, então o concentrador passou a devolver ao dev.v2 o
tráfego destinado a Quito. A prova foi um `tcpdump -Q in` no `wg0` do dev.v2: os próprios pings para
`10.200.0.51` voltavam em 0,7 ms. O Gustavo tirou a faixa do peer do Attlas, e o loop sumiu, mas o peer de
Quito não voltou a responder (1371 pings do PC em 23 minutos sem resposta).

Túnel do PC do Afonso: `~/.config/wireguard/wg-quito.conf`, ligado com
`sudo wg-quick up ~/.config/wireguard/wg-quito.conf` (chave pública `2QYdpY7H3EiHpF/zwo3j8OYvXVSKG06kYbaAteza3Uc=`).

## O H9 de Quito

| Item | Valor |
| --- | --- |
| Controlador (Open API e web) | `10.200.0.51`, Open API na `8000`, interface web na `80` |
| Credencial da Open API | `pId` `YzFk`, criada em Settings > OpenAPI Management, sem cifra |
| Login da interface web | usuário `attlas` (não serve como credencial da Open API) |
| Firmware | 1.9.7.1 |
| Tela | screen 0, 4992x2808, na posição (2290, 1075) do canvas do processador |
| Placa de vídeo IP | slot 6, `H_2xRJ45 IP` |

### A placa de vídeo do H9

| Porta | IP | Gateway | Uso |
| --- | --- | --- | --- |
| 0 | `10.200.4.202/24` | `10.200.4.1` | Rede das câmeras de Quito (as 20 fontes Est1 a Est9 e Admin) |
| 1 | `10.200.0.53/24` | `10.200.0.1` | Rede do H9 |

A saída padrão (`wanId`) está em 255, sem porta escolhida. Gravar gateway vazio na porta 0 ou `wanId = 1`
pela API web foi aceito com `status 0`, mas a placa manteve a configuração anterior. Antes da queda da VPN,
a placa nunca abriu conexão para `192.168.10.16:8554`. A captura no túnel não mostrou nenhum pacote dela.

### O que já foi confirmado no H9 real

- Criar, listar, ler o canal e apagar fonte IPC (`ipc/IPCSourceCreate`, `IPCSourceList`, `IPCChannelList`, `IPCSourceDelete`).
- Abrir camada já com a câmera: `layer/create` com `source` = `sourceType 3`, `slotId 6`, `interfaceType 13`,
  `inputId 255` e o `streamId` do stream principal. Mover (`layer/writeWindow`) e apagar (`layer/delete`) funcionam.
- O que **não** funciona: `layer/writeSource` responde 0 e não liga a fonte; `layer/writeStreamRule`,
  `screen/writeBrightness`, `device/readDetail` e `device/readIp` respondem 500 neste firmware.

## Estado do lado do Attlas

- Adaptador do H9 reescrito pela Open API oficial e pelo que o H9 real aceitou: PRs #5584 e #5589, em produção.
- `docker-compose.yml` lê o endereço RTSP do videowall de `VIDEOWALL_RTSP_BASE_URL` (PR #5586).
- dev.v2: `VIDEOWALL_RTSP_BASE_URL=rtsp://3.15.199.101:8554` em `/home/ubuntu/.env`, playground desligado,
  `VIDEOWALL_NOVASTAR_IPC_SLOT_ID=6`, `VIDEOWALL_NOVASTAR_SCREEN_ID=0`. O MediaMTX só entrega RTSP por TCP.
- A porta `8554` do dev.v2 está aberta no Security Group da AWS e responde de fora com o vídeo H.264.
- Processador cadastrado no sistema DMQ: `10.200.0.51:8000`, `pId` `YzFk`. Não salvar o formulário do
  processador com `10.200.0.53` nem com o login web: isso já derrubou o cadastro duas vezes.
- O ajuste temporário no WireGuard do dev.v2 (`10.200.4.0/24`) foi desfeito.
- O espelho de tela, em painel real, não mostra o vídeo no palco da tela do Attlas. É regra do produto
  (RNF-CAM-19): a tela do operador não vai para outros navegadores.

### Pendências de código

- Duas ativações seguidas da mesma cena com o H9 fora respondem `RECORD_NOT_FOUND` (404) em vez de
  `VIDEOWALL_PROCESSOR_TIMEOUT` (408): o desfazer da segunda não acha o registro que a primeira já apagou.
- Testes unitários das portas e dos handlers do videowall e as suítes de integração ainda descrevem o
  adaptador antigo; só os testes de protocolo (assinatura, envelope, cliente e catálogo) foram atualizados.
