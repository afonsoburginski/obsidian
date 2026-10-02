---
tags:
  - doc
  - analitico
  - fluxos
aliases:
  - "Plano - o vínculo da região do analítico com o detector"
  - "Vínculo região-detector"
  - "Região associada continua sem vínculo"
  - "Sem faixa vinculada"
  - "Sem detector na ACOM"
atualizado: 2026-10-01
---

# Analítico - Fluxos

A ordem dos passos no [[Analítico]]. Onde cada peça mora está em
[[Analítico - Arquitetura e estratégias]]; a placa ACOM, em [[Analítico - Vínculo com a ACOM]]; a
leitura de placas, em [[Analítico - Neural Labs - Arquitetura e estratégias]].

## Pôr uma câmera para funcionar com o embarcado

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Cadastrar a câmera. A sonda de credencial identifica a arquitetura ARTPEC e lê o `source_id` que o app já reporta | Cadastro de câmeras |
| 2 | O cadastro oferece só os tipos que a matriz permite para aquela arquitetura | `analytics-compatibility.matrix.ts` |
| 3 | Registrar a unidade em Instâncias, à mão ou pela descoberta na rede, que só lê o equipamento | Analítico > Instâncias |
| 4 | **Vincular**: grava no app o `source_id` e o broker de destino, liga o producer, relê e só então guarda o `deviceSourceId`. Se o app publica com a identidade de outra instalação, pede confirmação (`confirmTakeover`) | Cartão do equipamento na página da instância |
| 5 | Desenhar região e laço sobre o quadro congelado do preset, e salvar. Salvar é a única escrita de configuração no equipamento | Analítico > Detecção |
| 6 | Escolher a faixa da região, que cria o vínculo região-detector | Bloco "Métricas de desempenho" da Detecção |

## Os caminhos do dado

```mermaid
flowchart LR
    APP["App embarcado<br/>Kafka do equipamento"] --> C["ms-cameras<br/>DeviceStreamConsumer"]
    C -->|"caixas e presença"| WS["Socket cameras-analytics<br/>overlay ao vivo"]
    C -->|"incidente"| LOG["CameraEventLog ANALYTICS<br/>com dedup"]
    LOG --> FILA["Fila de incidentes<br/>Alarmes, Notificações"]
    C -->|"objetos por região"| MIN["CameraRegionMinuteMetric"]
    C -->|"ocupação na transição"| OCC["attlas.virtual-loop.region-occupancy"]
    TCP["App de laço<br/>TCP 3091"] --> CON["ms-connector-virtual-loop"] --> OCC
    OCC --> VA["ms-video-analytics<br/>tradução pelo vínculo"]
    VA --> RAW["attlas.detectors.raw"] --> DH["ms-detector-history"]
    OCC --> SP["ms-selective-priority"]
```

### Tela ao vivo

O consumidor casa o `source_id` do quadro com as câmeras vinculadas e emite na sala `camera:<id>`.
Caixas só saem de build que as reporta (`FRAME_REPORTING`); o SDCT e o app de laço só acendem a região,
pela ocupação. A presença ao vivo sai no primeiro quadro ocupado, sem esperar a histerese da ocupação
do Kafka, e apaga quando o silêncio passa de 1,5 vez o maior intervalo recente entre quadros (de 250 ms
a 2 s). O player compartilhado desenha região e caixa só com a imagem em `live`. Nada é gravado.

### Incidente

1. O quadro traz incidente (`obj_incidents` ou `region_incidents`), e o build declara que reporta
   incidente.
2. Vira linha em `CameraEventLog` com categoria `ANALYTICS`, uma por câmera, região, tipo e janela de
   dedup.
3. A fila e a página do incidente recebem `camera:incidents:changed` pela sala do Sistema.
4. Tipo com código no catálogo de alarmes (congestionamento severo, contramão, veículo parado) vira
   alarme no domínio `analytics`. A mudança de tratamento notifica.
5. Ao abrir o incidente, a imagem do app e a gravação da câmera são lidas do equipamento. A lista fica
   no Redis e os arquivos no object storage do `ms-cameras`, com prazo; mídia que o equipamento já
   descartou aparece como ausente.

### Ocupação até o detector

1. O `ms-cameras` (build HTTP) ou o `ms-connector-virtual-loop` (app de laço) publica a ocupação na
   transição.
2. O `ms-video-analytics` acha o detector da região em `/internal/virtual-loop/sources` e publica em
   `attlas.detectors.raw`. **Sem vínculo, descarta e nunca inventa endereço.**
3. O `ms-detector-history` guarda a série igual à do laço físico.

> [!warning] O caminho do app de laço por TCP não fecha sozinho
> O conector atende o app e publica a ocupação, mas o `ms-cameras` nunca grava o `deviceId` que o
> equipamento anuncia no handshake, então o adaptador `virtual-loop-tcp` não passa da sonda e o
> endereçamento do conector (`PUT /internal/devices/:deviceId/addressing`) só é escrito à mão.

### Métricas

- **Laço Virtual**: as janelas do detector vinculado no `ms-detector-history` e as métricas por região
  gravadas pelo `ms-cameras`.
- **ATSPM**: as medidas que o app ATSPM calcula (`device-metrics`, só build `atspm-http`), as métricas
  por região e os leitores de detector. Cartão sem fonte aparece vazio, nunca com zero.
- A tela relê quando chega `camera:analytics:metrics` (janela gravada) ou ocupação da câmera em foco;
  não há polling.

## Vínculo região-detector

O vínculo (`VirtualLoopDetectorBinding`, no `ms-cameras`) diz qual detector de faixa uma região
alimenta. Um endereço de detector nunca é referenciado por duas regiões.

| Quem escreve | Como |
| --- | --- |
| Detecção | Select "Faixa associada" com os detectores da interseção da câmera (UF-722) |
| Fiação da ACOM | Salvar a fiação no `ms-controllers` cria ou solta o vínculo depois do commit (UC-183). Endereço ocupado é 409 `DETECTOR_ADDRESS_ALREADY_BOUND`; `ms-cameras` fora é 503 `ACOM_BINDING_PROVIDER_UNAVAILABLE`; nos dois casos nada é gravado |
| Métricas | Diálogo "Vincular laço a um detector" |
| O próprio sistema | Detector que muda de slot ou canal no mesmo controlador leva o vínculo; detector que sai do controlador ou deixa de existir o desfaz (CROSS-146) |

Quem lê: o bloco "Métricas de desempenho" da Detecção ("Sem faixa vinculada"), a aba ACOM do
controlador ("Sem detector", que é o comportamento contratado pela UC-173 para laço sem vínculo) e as
duas faces de Métricas.
