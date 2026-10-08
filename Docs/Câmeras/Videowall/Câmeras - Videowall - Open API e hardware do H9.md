---
tags:
  - doc
  - cameras
  - videowall
  - novastar
  - referência
aliases:
  - "Câmeras - Videowall - Open API e hardware do H9"
  - "Videowall - Referência técnica H9"
  - "H9 Open API reference"
atualizado: 2026-10-08
banner: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200"
---

# Câmeras - Videowall - Open API e hardware do H9

Volta para [[Câmeras - Videowall]].

Referência técnica do processador NovaStar H9: capacidades de hardware, limites de decodificação,
endpoints da Open API e comportamento observado.

Para o funcionamento ponta a ponta: [[Câmeras - Videowall - Como o videowall funciona de ponta a ponta]].

## Fontes oficiais

| Fonte | Local ou URL |
| --- | --- |
| Spec V1.17.0 (mais recente) | `assets/H9-Specifications-V1.17.0.pdf` — [online](https://en-website001.oss-us-east-1.aliyuncs.com/Specification/H9%20Video%20Wall%20Splicer%20Specifications-V1.17.0.pdf) |
| User Manual V1.8.0 | `assets/H-Series-Video-Wall-Splicers-User-Manual-V1.8.0.pdf` — [online](https://oss.novastar.tech/uploads/2023/02/H-Series-Video-Wall-Splicers-User-Manual-V1.8.0.pdf) |
| Open API H Series | [openapi.novastar.tech/en/h/](https://openapi.novastar.tech/en/h/) |
| Guia com screenshots da interface | [ledscreenboard.com](https://www.ledscreenboard.com/novastar-h9-video-wall-splicer-guide/) |
| NovaStar Wiki H Series | [novastar.wiki/h-series](https://novastar.wiki/h-series) |

## Card IP: `H_2xRJ45 IP`

> Spec V1.17.0, página 26.

![[h9-spec-ip-card-decoding.png]]

| Dado | Valor |
| --- | --- |
| Portas | 2x RJ45 Gigabit Ethernet |
| Protocolos | RTSP, GB28181, ONVIF |
| Codecs | H.264 e H.265 (8-bit YUV420, I-frames e P-frames) |
| Fontes máximas por card | 512 (spec V1.15.0+) |
| DHCP | Sim |

### Capacidade de decodificação (por card, não por fonte)

O card decodifica um throughput total fixo. As combinações são mutuamente exclusivas:

| Resolução por fonte | Fontes simultâneas |
| --- | --- |
| 12 MP | 1 (hw V1.0) ou 2 (hw V2.0) |
| 4K×2K (8 MP) | 4 |
| 4K×1K (4 MP) | 8 |
| 2K×1K (2 MP) | 16 |
| D1 (~0.1 MP) | 64 |

> [!info] O que isso significa para o Attlas
> Cena 4×4 (16 câmeras em 2 MP) = um card inteiro. Cena 3×3 (9 câmeras) em 2 MP cabe folgado.
> 40 câmeras em 2 MP = 3 cards IP (o H9 tem 15 slots de entrada).
> Espelho 1080p H.264 = ~5-10 Mbps por stream. 4 espelhos = ~20-40 Mbps, bem abaixo do limite.

## Chassi H9

> Spec V1.17.0, página 8.

![[H9-Specifications-V1.17.0.pdf#page=8]]

| Dado | H9 | H9 Enhanced |
| --- | --- | --- |
| Rack | 9U | 9U |
| Slots de entrada | 15 | 15 |
| Canais de entrada | 60 | 60 |
| Slots de saída (video) | 5 | 10 |
| Canais de saída | 20 | 40 |
| Camadas por sending card | 80 | 160 |
| Presets salvos | 100+ | 100+ |
| Carga máxima (RJ45) | 65M pixels | 65M pixels |
| Carga máxima (fiber enhanced) | 130M pixels | 260M pixels |
| IP padrão | 192.168.0.100 | 192.168.0.100 |
| Login padrão | admin / admin | admin / admin |

### Cards de entrada disponíveis

| Card | Conectores | Tipo |
| --- | --- | --- |
| H_4xHDMI 2.0 | 4× HDMI 2.0 | Físico |
| H_4xDP 1.2 | 4× DisplayPort 1.2 | Físico |
| H_4xDVI | 4× DVI | Físico |
| H_4x3G SDI | 4× SDI | Físico |
| H_2xRJ45 IP | 2× RJ45 GbE | IPC (RTSP/ONVIF) |
| H_1xNDI | 1× NDI | Rede NDI |
| H_4xVGA | 4× VGA | Físico |
| H_4xHDBaseT | 4× HDBaseT | Físico |

> [!warning] O card NDI chegou depois do H9 de Quito
> `H_1xNDI` entrou na linha em setembro de 2024. O H9 de Quito foi entregue em julho de 2024.

## Open API — Endpoints usados pelo Attlas

Referência completa: [openapi.novastar.tech/en/h/](https://openapi.novastar.tech/en/h/)

### Fontes IPC

| Endpoint | Path | O que faz |
| --- | --- | --- |
| [Add IPC Sources](https://openapi.novastar.tech/en/h/api-365455806) | `ipc/IPCSourceCreate` | Cria fonte RTSP. Resposta não devolve id — achar pelo `sourceName` via `IPCSourceList` |
| [IPC Source List](https://openapi.novastar.tech/en/h/api-365455800) | `ipc/IPCSourceList` | Lista fontes paginada. `slotId: 0` lista todas |
| [IPC Channel List](https://openapi.novastar.tech/en/h/api-365455803) | `ipc/IPCChannelList` | Canais e streams de uma fonte. Devolve `channelId`, `streamId`, `rtspUrl` |
| [Change IPC Source Channels](https://openapi.novastar.tech/en/h/api-365455809) | `ipc/IPCChannelEdit` | Atualiza URL RTSP de uma fonte existente |
| [Delete IPC Sources](https://openapi.novastar.tech/en/h/api-365455807) | `ipc/IPCSourceDelete` | Remove fontes por `sourceList[].sourceId` |
| [IPC Slot List](https://openapi.novastar.tech/en/h/api-365455812) | `ipc/IPCSlotList` | Slots com card IP instalado. O de Quito respondeu `slotId: 2` |

### Camadas

| Endpoint | Path | O que faz |
| --- | --- | --- |
| [Add Layers](https://openapi.novastar.tech/en/h/api-365455767) | `layer/create` | Cria camada com source + window no mesmo payload |
| [Read Layer List](https://openapi.novastar.tech/en/h/api-365455769) | `layer/detailList` | Inventário de camadas com fonte, posição e z-order |
| [Set Layer Information](https://openapi.novastar.tech/en/h/api-365455773) | `layer/writeWindow` | Move/redimensiona camada existente |
| [Change Layer Source](https://openapi.novastar.tech/en/h/api-365455777) | `layer/writeSource` | Troca a fonte de uma camada |
| [Stream Rule](https://openapi.novastar.tech/en/h/api-365455766) | `layer/writeStreamRule` | Define qual stream da fonte a camada usa |
| [Delete Layers](https://openapi.novastar.tech/en/h/api-365455768) | `layer/delete` | Remove camada por `layerId` |

### Source types do `layer/create`

| `sourceType` | Significado |
| --- | --- |
| 0 | Sem fonte |
| 1 | Entrada física (HDMI, DVI, DP...) |
| 3 | IPC (fonte RTSP). Usar 255 em firmware < V1.9.9.0 |
| 5 | IPC Mosaic (mosaico nativo) |

### Tela e dispositivo

| Endpoint | Path | O que faz |
| --- | --- | --- |
| [Screen List](https://openapi.novastar.tech/en/h/api-365455726) | `screen/readList` | Lista screens do processador |
| [Screen Detail](https://openapi.novastar.tech/en/h/api-365455725) | `screen/readDetail` | Geometria e brilho da screen |
| [Set Brightness](https://openapi.novastar.tech/en/h/api-413981964) | `screen/writeBrightness` | Ajusta brilho (0-100) |
| [Init Status](https://openapi.novastar.tech/en/h/api-365455720) | `main/initStatus` | Firmware e estado do dispositivo |

### Mosaico nativo (não usado pelo Attlas)

| Endpoint | Path | O que faz |
| --- | --- | --- |
| [Create Mosaic Template](https://openapi.novastar.tech/en/h/api-365455821) | `ipc/IPCMontageTemplateCreate` | Cria template com `row`, `column`, streams posicionados |
| [Apply Mosaic Template](https://openapi.novastar.tech/en/h/api-365455824) | `ipc/IPCMontageTemplateApply` | Aplica template numa chamada |

RF-VW-13 fora do escopo. O Attlas não reconcilia composições nativas do H9.

## Interface web do H9

> User Manual V1.8.0, páginas 14 (camadas), 55-58 (IPC), 60 (mosaico).

![[H-Series-Video-Wall-Splicers-User-Manual-V1.8.0.pdf#page=14]]

A interface web é acessível por HTTP no IP do processador. Tudo que se faz na interface também pode
ser feito pela Open API, e vice-versa. Não há isolamento: fontes e camadas criadas pela API aparecem
na interface, e o contrário também.

> [!info] Páginas do manual para cada operação
> - **Camadas**: página 14 — criar, posicionar, trocar fonte
> - **IPC management**: páginas 55-58 — adicionar câmeras RTSP, GB28181, ONVIF
> - **Mosaico nativo**: página 60 — criar template de mosaico com drag-and-drop

## Comportamento observado (01/10/2026, PR #5584)

Testado contra o H9 de Quito (10.200.0.51, firmware V1.9.7.1, via WireGuard do dev.v2):

| Teste | Resultado |
| --- | --- |
| Envelope `Base64(md5(timeStamp+pId))` | Aceito |
| `pId` de teste, sem cifra | `status 15` (ILLEGAL_ID) — esperado |
| `layer/create` com `sourceType: 3` + IPC source | Camada aberta direto no stream |
| `layer/create` vazia + `layer/writeSource` depois | `writeSource` respondeu 0, camada ficou vazia |
| `layer/writeStreamRule` após `writeSource` | Respondeu 500 |
| `screen/writeBrightness` | Respondeu 500 no firmware 1.9.7.1 |
| `ipc/IPCSlotList` | Respondeu `slotId: 2`, card `H_2xRJ45 IP` |
