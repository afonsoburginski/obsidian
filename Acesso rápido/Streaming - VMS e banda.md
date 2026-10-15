---
tags:
  - doc
  - cameras
  - streaming
  - vms
  - dimensionamento
  - explicacao
aliases:
  - "Streaming - VMS e banda"
  - "Dimensionamento de rede e banda do VMS"
  - "Resultado do teste de carga do VMS"
  - "Câmeras - Streaming - Explicação - VMS com muitas câmeras e banda"
atualizado: 2026-10-14
---

# Streaming - VMS e banda
Volta para [[Câmeras - Streaming - Banda e bitrate]]

Referência para dimensionar rede, banda e servidor de vídeo do Attlas em qualquer instalação. Os números vêm de medição real (ver [[#Base da medição]]). As recomendações já incluem margem.

## Resposta curta

| Pergunta | Regra |
|---|---|
| Banda por câmera aberta | 3,2 Mbps em qualidade normal (secondary), 7,5 em alta (primary), 1,5 em baixa (tertiary) |
| Banda do computador do operador | câmeras na tela × valor acima |
| Banda de saída do servidor | soma das câmeras abertas em todos os operadores e videowalls × pico da qualidade (2,6 secondary, 1,3 tertiary, 6,2 primary) |
| Banda de entrada do servidor | câmeras distintas abertas × 2,7 Mbps, por link direto; nunca VPN com relay |
| CPU do servidor de vídeo | 1 core para cada 30 streams (ingestões + visualizações), em nó dedicado |
| Portas | operador até o servidor: TCP 443 e UDP 8189. Servidor até as câmeras: TCP 554 (RTSP) e HTTP da câmera |

## Banda por câmera

Mbps por câmera aberta. Pico = p95 (95% do tempo fica abaixo). Recomendado = maior pico medido × 1,25.

| Qualidade | Uso | Média medida | Pico medido | Recomendado |
|---|---|---|---|---|
| primary | 1 a 4 câmeras na tela, tela cheia | 3,4 a 5,5 | 6,2 | 7,5 |
| secondary | grid de 9 a 25 (padrão do VMS) | 1,2 a 2,4 | 2,7 | 3,2 |
| tertiary | grid de 36 ou mais | 0,3 a 1,2 | 1,3 | 1,5 |

Por modelo:

| Modelo | primary média / pico | secondary média / pico | tertiary média / pico |
|---|---|---|---|
| AXIS M1135 Mk II | 3,4 / 6,2 | 1,2 / 2,0 | 0,3 / 0,4 |
| AXIS P1475-LE | 5,5 / 6,0 | 2,4 / 2,7 | 1,2 / 1,3 |
| AXIS Q6135-LE | não medido | 2,3 / 2,4 | não medido |
| Outras marcas e modelos | usar o recomendado da tabela anterior até medir | | |

> [!warning] O bitrate depende da configuração da câmera
> Os valores valem para câmeras com teto de bitrate perto do medido. Perfil sem teto, ou H.264 onde caberia H.265, gasta o dobro ou mais. Ver [[#Configuração das câmeras]].

## Operador

| Câmeras na tela | Qualidade | Download mínimo |
|---|---|---|
| 1 a 4 | primary | 30 Mbps |
| 9 | secondary | 30 Mbps |
| 16 | secondary | 50 Mbps |
| 25 | secondary | 80 Mbps |
| 36 | tertiary | 55 Mbps |
| 64 | tertiary | 100 Mbps |

Rede do operador:

- UDP 8189 liberado até o servidor de vídeo. Sem UDP o vídeo não abre: o TURN ainda não está ativo ([[Streaming - TURN]]).
- Rede cabeada para grid de 16 ou mais. Wi-Fi compartilhado perde pacote e o vídeo trava.
- A banda é por computador: dois operadores no mesmo link somam.

## Servidor

### Contas

| Recurso | Conta |
|---|---|
| Saída (servidor para operadores e videowalls) | soma das câmeras abertas × pico da qualidade (2,6 secondary, 1,3 tertiary, 6,2 primary). Cada operador recebe a própria cópia. |
| Entrada (câmeras para servidor) | câmeras distintas abertas × 2,7 Mbps (6,2 em primary). A mesma câmera vista por vários operadores entra uma vez. Usa 2,7 também para tertiary, porque câmera sem perfil tertiary entrega a secondary. |
| CPU do mediamtx | (ingestões + visualizações) ÷ 30 = cores |

### Tamanhos de referência

16 câmeras secondary por operador, videowall de 36 câmeras tertiary. Entrada no pior caso: todas as câmeras abertas são distintas.

| Instalação | Câmeras abertas | Saída | Entrada | Cores para o mediamtx |
|---|---|---|---|---|
| 3 operadores | 48 | 125 Mbps | 130 Mbps | 4 |
| 5 operadores + 1 videowall | 116 | 255 Mbps | 315 Mbps | 8 |
| 10 operadores + 1 videowall | 196 | 465 Mbps | 530 Mbps | 14 |
| 20 operadores + 2 videowalls | 392 | 930 Mbps | 1,06 Gbps | 27 |

Acima de ~200 câmeras abertas, dividir o mediamtx em mais de uma instância ([[Câmeras - Streaming - Arquitetura e estratégias]]).

### Rede do servidor

| Item | Requisito |
|---|---|
| Link câmeras e servidor | direto (mesma rede, VPN site a site ou link dedicado) com a entrada calculada livre. Tailscale ou VPN com relay não serve: no teste o relay travou em ~87 Mbps e derrubou o roteador. |
| Nó do mediamtx | dedicado. Dividindo CPU com os serviços e o Kafka, o fps cai a partir de 20 câmeras e um deploy dos serviços corta o vídeo de quem assiste. |
| Portas de entrada | TCP 443 (API e WHEP), UDP 8189 (mídia WebRTC) |
| Portas de saída | TCP 554 (RTSP) e HTTP da câmera (saúde e eventos) |

## Configuração das câmeras

| Perfil | Codec | Resolução | Teto de bitrate |
|---|---|---|---|
| primary | H.265 (H.264 se o modelo não suportar) | nativa | 6 Mbps |
| secondary | H.265 | 1280×720 | 2 Mbps |
| tertiary | H.265 | 640×360 ou 848×480 | 0,5 Mbps |

- Perfil com teto (VBR com máximo ou CBR). Sem teto, o pico explode em cena com movimento.
- Conferir se a câmera entrega H.265 quando o perfil pede H.265. No teste, parte das M1135 entregava H.264.
- Criar perfil tertiary na câmera. Sem ele, o grid grande recebe a secondary e a banda dobra.

## Exemplo do que acontece fora dos requisitos

Ambiente dev: 8 vCPU com todos os serviços, câmeras chegando por Tailscale com relay.

| Câmeras abertas | fps (meta 30) | Não abriram | Situação |
|---|---|---|---|
| 10 | 30 | 0 | bom |
| 20 | 24 | 0 | aceitável |
| 30 | 8 | 13 | trava |
| 40 | 6 | 20, mais recusas 429 | trava |
| 50 | 7 | 29, mais recusas 429 | trava; o roteador do Tailscale caiu |

## Base da medição

| Item | Valor |
|---|---|
| Data | 14/10/2026 |
| Ferramenta | cliente que abre N câmeras como o VMS (API, WHEP, WebRTC) e mede bitrate, fps, perda e tempo até a imagem; não decodifica |
| Câmeras | reais: AXIS M1135 Mk II, P1475-LE, Q6135-LE |
| Etapas | 10 a 50 câmeras simultâneas, 4 min cada; bitrate por qualidade com 10 câmeras |
| CPU do mediamtx | ~1,5% de um core por stream; a regra de 30 por core tem margem de 2× |
| Tempo até a imagem | 2,2 a 3,8 s |

> [!warning] Ainda não medido
> - Hikvision e outras marcas.
> - Vários operadores nas mesmas câmeras e uso contínuo de 8 h.
> - CPU do navegador decodificando o grid.
> - Bitrate com keyframe de 1 s (correção em revisão; deve reduzir os valores).
> - CPU por stream em nó dedicado (medido em servidor compartilhado).

Problemas encontrados no teste e marcas afetadas: [[Câmeras - Streaming - Pendências#Problemas com muitas câmeras]].
