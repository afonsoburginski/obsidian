---
tags:
  - doc
  - ms-cameras
  - cameras
  - attlas
  - incidente
  - streaming
atualizado: 2026-08-24
frente: Streaming
ambiente: EC2 dev (dev.v2.attlas.atmansystems.com)
host: ip-172-31-46-250
aliases:
  - "Incidente - vazamento de sessões de stream (banda das câmeras)"
  - "Incidente - câmeras instáveis por perda de pacote RTP no caminho até a EC2"
---

# Incidentes - Streaming (ms-cameras)

> Registro histórico consolidado dos incidentes já investigados no pipeline de streaming do `ms-cameras` em EC2 dev. Separado por **responsabilidade**: bug/dívida técnica do ciclo de vida da sessão de stream (`ms-cameras`, corrigível no código) versus capacidade de banda de infraestrutura sob carga concorrente (compartilhado entre a configuração do `mediamtx`/`ms-cameras` e o dimensionamento do host).

## Responsabilidade: ms-cameras (backend) - ciclo de vida da sessão de stream

**Status:** mitigado (`ms-cameras` parado) · **Data:** 03/07/2026 · **Gancho:** [[SOFTWARE-1923 - Bitrate histórico + TTFF]]

### Incidente - vazamento de sessões de stream drenando a banda das câmeras

> Achado ao validar o ambiente em dev (03/07). As relays ffmpeg ficavam puxando vídeo full-rate das câmeras 24/7 sem entregar para ninguém, saturando o uplink das câmeras. Mitigado parando o `ms-cameras`. A causa raiz é o ciclo de vida das sessões de stream, área da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

#### TL;DR

- Havia **11 processos ffmpeg** puxando RTSP 1080p H264 contínuo das câmeras SNL (`10.11.x.x`) e republicando em `rtsp://mediamtx:8554/<cameraId>-primary`.
- Ao mesmo tempo o **mediamtx reportava 0 paths ativos** (`/v3/paths/list` = `itemCount:0`). Ou seja: as relays sugavam banda das câmeras e **não entregavam stream para ninguém**. Sessões órfãs.
- O culpado **não** é o healthcheck (ping WS/ONVIF é leve). É **vazamento de contagem de viewer** no `StreamSessionRegistry`.
- Mitigação aplicada: `docker stop attlas-ms-cameras`. Fica **parado** por decisão do dono até termos o fix.

#### Estado atual (03/07)

- `attlas-ms-cameras`: **PARADO** (`Exited 137`). Deixar assim.
- Verificado pós-parada: 0 processos ffmpeg, 0 conexões TCP para qualquer câmera (`10.11.x.x` e `10.0.0.79`), health worker ONVIF encerrado junto.
- Religar quando houver fix: `ssh aws-attlas-26 'docker start attlas-ms-cameras'`.

#### Sintomas observados

- Load average alto no host (média de 15 min em torno de 8).
- 11 relays ffmpeg de longa duração (algumas de 11:37, outras reiniciadas em bloco às 14:20-14:21 = churn de reconexão).
- Logs do `ms-cameras`: `GET`/`DELETE /api/cameras/<id>/hls?quality=secondary` repetidos (abre/fecha de viewer), mais `DELETE` do que `GET` na janela, indicando contagem dessincronizada.
- `NetIO` do `ms-cameras` em 22 GB recebidos ao longo do uptime (puxando vídeo das câmeras).

#### Investigação (o que foi verificado)

1. `docker ps`: `attlas-ms-cameras` e `attlas-mediamtx` no ar há 17h.
2. `ps aux | grep ffmpeg`: 11 relays, cada uma com `-i rtsp://root:***@10.11.x.x:554/axis-media/... -c copy -f rtsp rtsp://mediamtx:8554/<id>-primary`.
3. `curl http://localhost:9997/v3/paths/list`: **0 paths** (API respondendo, porta mapeada). Incoerência com 11 publishers ativos.
4. DB `attlas_cameras`: 11 câmeras SNL `OPERATIONAL` em `10.11.x.x` + `ATMN – DEMO` (`10.0.0.79`) + 2 STOCK de teste.
5. Câmera do loop de reconexão: `ATMN – DEMO` (`10.0.0.79`, id `...000010`), `EHOSTUNREACH` do EC2 mas marcada `OPERATIONAL`, então o health worker ONVIF retentava para sempre (attempt 854, backoff no teto ~73s). Ruído, não a causa da banda.

#### Causa raiz

Vazamento de **contagem de viewer** no `StreamSessionRegistry` (`apps/ms-cameras/src/streaming/services/stream-session-registry.service.ts`).

- A relay ffmpeg só encerra quando `viewerCount` chega a 0: `decrementViewers` agenda o grace de 60s (`HLS_SESSION_GRACE_MS`) e só então o `FfmpegSessionService` para o processo.
- O contador depende de o front chamar `GET /hls` (abre e incrementa) **e** `DELETE /hls` (decrementa) em par.
- Quando o `DELETE` não chega (aba fechada, refresh, queda de rede, videowall recarregando as câmeras), o `viewerCount` fica preso acima de 0. O grace nunca arma, a sessão nunca encerra e o ffmpeg fica **puxando 1080p da câmera para sempre**.
- O `exit handler` do ffmpeg só respawna se `viewerCount > 0`, então o viewer fantasma também explica o churn de reconexão das 14:20-14:21.
- O registry confia 100% no teardown do cliente e não tem reconciliação com a realidade do mediamtx. É best-effort sem rede de segurança.

#### O que NÃO era o problema

- **Healthcheck**: `CameraHealthWorker` abre WS Axis / ONVIF PullPoint por câmera e faz ping a cada 5s. Tráfego leve, não é banda de vídeo.
- **Redis**: `redis-cameras` não existe no EC2, então writes de status de câmera falham (best-effort, DB é fonte de verdade). Já conhecido, não é a causa. Ver [[SOFTWARE-1889 - WebRTC travamento (dívidas técnicas)]].

#### Correção proposta (backlog)

Desacoplar o encerramento da sessão do `DELETE` do cliente:

- [ ] **Reaper de reconciliação**: worker periódico que encerra sessão cujo path no mediamtx está com **0 readers** há N minutos. Fonte de verdade = mediamtx, não o contador em memória. Resolve os dois sintomas (relay órfã + path fantasma) de uma vez.
- [ ] e/ou **lease com heartbeat de viewer**: o viewer renova um lease periódico; expirou, decrementa sozinho. Refresh e queda de rede deixam o lease morrer sem depender de um `DELETE` limpo.
- Escopo: `streaming/stream-session-registry.service.ts` + `streaming/services/ffmpeg-session.service.ts`. Cai na frente Streaming, próxima da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

#### Ligado a

- [[SOFTWARE-1923 - Bitrate histórico + TTFF]] (área do ciclo de vida das sessões e do sampler de bitrate).
- [[Attlas - Sprint 23]].
- [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]] - decisão de arquitetura (03/07): medir banda por bitrate **configurado** do device (ONVIF/VAPIX) 24/7 + real oportunístico, em vez de puxar vídeo.
- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] - o fix do ciclo de vida (reaper/lease) que este incidente exige.
- Candidatos para a próxima sprint saíram deste incidente (sem nota própria no vault).

---

## Responsabilidade: Infraestrutura + ms-cameras (Streaming) - saturação de banda sob carga concorrente de visualização

**Status:** causa raiz confirmada via dados de healthcheck persistidos no banco + métricas do host · **Data:** 24/08/2026, 11:50-12:15 UTC · **Gancho:** [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] (Fase 3 - validação de escalabilidade e banda)

### Incidente - saturação de banda de saída da EC2 sob carga concorrente de visualização

> Investigação de instabilidade relatada em várias câmeras na manhã de 24/08. O dado do próprio healthcheck do `ms-cameras`, persistido em `CameraAvailabilityWindow` (a tabela por trás do card "Tendência de Disponibilidade" do dashboard), confirma objetivamente: das 11:50 às 12:15 UTC, TODAS as câmeras da rede viraram `DEGRADED` ao mesmo tempo - latência de ping saltando de ~145ms para 800-1300ms - e voltaram a `ONLINE` (149ms) exatamente às 12:20. No mesmo intervalo, o tráfego de saída do host EC2 saltou ~150x acima do normal. Causa raiz: banda de saída da EC2 saturada por um pico de visualização concorrente de múltiplas câmeras (padrão videowall), que empurra o tráfego "fino" do healthcheck (pings ONVIF/VAPIX/WS) pra fila atrás do vídeo na mesma interface de rede.

#### TL;DR

- **Fonte de verdade**: a tabela `CameraAvailabilityWindow` (dado gravado pelo próprio `CameraHealthWorker`, granularidade de 5 min, é o que alimenta o card "Tendência de Disponibilidade" / "Uptime médio da rede" do dashboard) mostra: de **11:50 a 12:15 UTC**, TODAS as câmeras da rede (SNL, ATM-PTZ, Atman, camera 1 - excluindo os OFFLINE crônicos já conhecidos) viraram `DEGRADED` simultaneamente, com `avgLatencyMs` saltando do baseline (~145-150ms) para **800-1300ms**. Recuperação total e imediata às 12:20 UTC (de volta a 149ms, `ONLINE`).
- Esse estado `DEGRADED` é literalmente o enum `CameraConnectionStatus.PARTIALLY_UNSTABLE`/`UNSTABLE` mapeado por `ConnectivityHealthEvaluator` - a mesma palavra que o usuário usou para descrever o problema.
- `sar` do host EC2 no mesmo intervalo: tráfego de saída (`tx`) em `ens5` saltou de ~17-49 kB/s (baseline) para **~2.800-3.150 kB/s** (~150x), pacotes/s de ~200-350 para **2.400-5.800 pkt/s**. `%steal` de CPU também subiu de ~4% para 8-14%.
- Nos logs do `mediamtx` no mesmo intervalo: **1062 eventos de sessão** (criação/fechamento/publish/read) em 35 minutos - muito acima do normal. Cada câmera de telemetria (IDs `...1020` a `...1030`) publicando **múltiplas variantes de qualidade ao mesmo tempo** (`-secondary`, `-tertiary`, `-tertiary-h265`, ABR).
- **130 das sessões WebRTC** nesse intervalo vieram do IP `179.234.233.244` (a mesma rede de desenvolvimento desta investigação) - muito mais que 1 viewer normal, consistente com alguém abrindo uma visualização com várias câmeras ao mesmo tempo (um videowall).
- O episódio termina com um fechamento em massa: 9 sessões WebRTC fecham em ~1s (12:19:21-22), seguidas por 11 conexões RTSP fechando por `EOF` às 12:19:45, todas do mesmo publisher interno (`172.18.0.45`, o próprio `ms-cameras`). O `ms-cameras` **não reiniciou** (uptime contínuo confirmado, `StartedAt` sem mudança) - foi o fim natural da carga, não um crash.
- O runner de CI compartilhado nesse mesmo host **não rodou nenhum job** nesse intervalo (primeiro `Worker_*` log do dia é às 12:20:56, já depois da recuperação) - descarta contenção de CI como causa desta vez.
- Achados complementares da mesma manhã, ~1h antes deste episódio (não explicam sozinhos "várias câmeras", mas reforçam o padrão de rede instável) - ver seção própria abaixo.

#### Estado atual (24/08)

- `attlas-ms-cameras` rodando normalmente. Latência de healthcheck de volta ao baseline (~149ms, `ONLINE`) desde as 12:20 UTC.
- Nenhuma mitigação foi aplicada nem é necessária no momento - o episódio se resolveu sozinho quando a carga de visualização caiu.
- Nenhum limite de streams/qualidades concorrentes existe hoje no `mediamtx`/`ms-cameras` para evitar a repetição deste padrão sob carga maior.

#### Sintomas observados

- Usuário relatou "várias câmeras parcialmente instáveis" na manhã de 24/08.
- Card "Tendência de Disponibilidade" do dashboard mostrando quedas de uptime recorrentes nas últimas semanas, incluindo picos de `DEGRADED` crescentes de 17 a 23/08 (ver "Achados complementares").
- No banco: todas as câmeras da rede saindo de `ONLINE` para `DEGRADED` ao mesmo tempo, por ~25 minutos, com latência 5-9x acima do normal.
- No host: pico de tráfego de rede de saída ~150x acima do baseline, coincidente exato com a janela `DEGRADED`.

#### Investigação (o que foi verificado)

1. **Descoberta da tabela certa**: `CameraAvailabilityWindow` (janela de 5 min, retenção de 7 dias) e `CameraAvailabilityDailyRollup` (rollup diário, retenção de 90 dias) em `apps/ms-cameras/src/database/schema/availability/`, alimentadas por `CameraHeartbeatHistory` via `ConnectivityHealthEvaluator`. Endpoint que expõe isso pro dashboard: `GET /dashboard/uptime`.
2. Query no `CameraAvailabilityWindow` para hoje, 10:45-11:35 UTC, por câmera: **zero `DEGRADED`** nessa janela - todas ONLINE (só os OFFLINE crônicos de sempre). Ou seja, a janela citada de cabeça pelo usuário ("11h até 11:22") não tem sinal de instabilidade real no healthcheck.
3. Rollup diário dos últimos 30 dias: dois dias de colapso total (07-30 e 08-14, uptime ~45-49%, provável parada de serviço/infra, fora do escopo desta nota) e um padrão distinto e crescente de `DEGRADED` de 17 a 23/08 (152 a 2863 janelas degradadas por dia), que bate com os mergulhos visíveis no gráfico de "Tendência de Disponibilidade".
4. Query agregada por câmera e dia (17-24/08) filtrando `DEGRADED`: o padrão afeta **todas as câmeras reais ao mesmo tempo** (ATM-PTZ, todas as SNL, Atman, camera 1) com latência elevada (330-560ms nos dias 17-23, chegando a **800-1300ms hoje**) - não é uma câmera específica, é rede-wide.
5. Query específica em hoje (08-24) sem limite de horário: achou o episódio real, **11:50-12:15 UTC**, com `MIN`/`MAX` de `windowStart` confirmando o início e fim exatos.
6. `sar -f /var/log/sysstat/sa24 -s 11:40:00 -e 12:30:00` (CPU) e `sar -n DEV` (rede) no host: CPU com `%steal` subindo de ~4% para 8-14%; rede (`ens5`) com `tx` saltando de ~17-49 kB/s para **2.800-3.150 kB/s** e pacotes/s de ~200-350 para **2.400-5.800**, exatamente na janela `DEGRADED`.
7. `docker logs attlas-mediamtx --since 11:45:00 --until 12:20:00`: 1062 eventos de sessão; múltiplas variantes de qualidade (`-secondary`/`-tertiary`/`-tertiary-h265`) publicando por câmera de telemetria; 130 `remote candidate` do IP `179.234.233.244` (contra 9 de outro IP); fechamento em massa às 12:19:21-45.
8. `docker inspect attlas-ms-cameras`: `StartedAt` sem mudança - confirma que o `ms-cameras` não reiniciou durante nem depois do episódio.
9. `find .../actions-runner/_diag -name "Worker_*"`: nenhum log de job de CI com timestamp entre 11:50 e 12:15 - o primeiro job do dia começa às 12:20:56, já na recuperação. Descarta contenção de CI como causa deste episódio específico.

#### Causa raiz

Saturação de banda de **saída** (egress) da interface de rede do host EC2 (`ens5`) quando várias câmeras são visualizadas ao mesmo tempo (padrão de tela tipo videowall, com múltiplas sessões WebRTC concorrentes). Cada câmera publica múltiplas variantes de qualidade (ABR: secondary/tertiary/tertiary-h265) e cada viewer abre sua própria sessão WebRTC de leitura; a soma disso, concentrada numa janela curta, consome banda suficiente para também enfileirar o tráfego "fino" de healthcheck (pings ONVIF/VAPIX/WS - pequenos, mas sensíveis a latência) que compete pela **mesma interface de rede**. É por isso que TODAS as câmeras - de sub-redes de cliente completamente diferentes (`10.11.x.x`, `10.0.0.x`, `192.168.x.x`) - degradam ao mesmo tempo: não é cada câmera individualmente tendo problema de rede, é o cano de saída da própria EC2 engarrafando.

Isso é exatamente o risco que a **Fase 3** da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] ("validação de escalabilidade e consumo de banda... 1000+ câmeras e muitos usuários concorrentes **sem saturar banda**") foi desenhada para testar - e ainda não tem critério de aceite comprovado. Este incidente é evidência ao vivo, com números reais, de que o risco é real mesmo numa escala pequena (14 câmeras, poucos viewers).

#### Diagramas

##### Topologia e ponto de saturação

```mermaid
flowchart TD
    subgraph cliente["Rede de desenvolvimento - IP 179.234.233.244"]
        browser["Browser: view com várias câmeras<br/>(~130 sessões WebRTC em 35 min)"]
    end

    subgraph ec2["EC2 dev - ip-172-31-46-250"]
        kong["Kong :443"]
        mediamtx["mediamtx<br/>publica ABR: secondary/tertiary/tertiary-h265<br/>por câmera (1062 eventos de sessão em 35 min)"]
        egress{{"ens5 (saída): 17-49 kB/s → 2.800-3.150 kB/s (~150x)<br/>PONTO DE SATURAÇÃO"}}
        mscameras["ms-cameras<br/>CameraHealthWorker (pings ONVIF/VAPIX/WS)"]
    end

    subgraph cameras["14 câmeras (sub-redes distintas: 10.11.x.x, 10.0.0.x, 192.168.x.x)"]
        cams["Todas ficam DEGRADED juntas<br/>145ms → 800-1300ms de latência"]
    end

    browser -->|"abre N sessões WebRTC de uma vez"| kong --> mediamtx
    mediamtx --> egress
    mscameras -->|"healthcheck (pings pequenos, sensíveis a latência)"| egress
    egress -->|"fila / latência quando saturado"| cams

    classDef fault fill:#ffdddd,stroke:#cc0000,stroke-width:2px,color:#660000;
    classDef healthy fill:#ddffdd,stroke:#009900,stroke-width:1px,color:#004d00;

    class egress fault;
    class kong,mediamtx,mscameras healthy;
```

##### Linha do tempo do episódio confirmado (11:50-12:15 UTC)

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser (rede dev, 179.234.233.244)
    participant Mtx as mediamtx (EC2)
    participant Net as ens5 (saída da EC2)
    participant HC as CameraHealthWorker (DB)

    Note over B,Mtx: 11:50 UTC - início do episódio
    B->>Mtx: abre view com várias câmeras (WebRTC, várias sessões)
    Mtx->>Net: publica ABR (secondary/tertiary/tertiary-h265) por câmera
    Note over Net: tx salta de ~30 kB/s para ~3.000 kB/s (~150x)
    Net--xHC: pings de healthcheck enfileiram atrás do tráfego de vídeo
    HC->>HC: latência 145ms → 800-1300ms em TODAS as câmeras (grava DEGRADED)
    loop 11:50-12:15 UTC (25 min, a cada 5 min)
        Note over HC: CameraAvailabilityWindow grava DEGRADED em todas as câmeras
    end
    Mtx--xB: 9 sessões WebRTC fecham em ~1s (12:19:21)
    Mtx--xMtx: 11 conexões RTSP fecham por EOF (12:19:45)
    Note over HC: 12:20 UTC - latência volta a 149ms, tudo ONLINE de novo
```

#### Achados complementares (mesma manhã, não explicam sozinhos o padrão principal)

- **~10:58-11:22 UTC** (antes do episódio confirmado acima): uma sessão WebRTC do `videowall-mirror` (`5c26eb2f`, mesmo IP `179.234.233.244`) acumulou perda de pacote RTP crescente (até 35 pacotes num evento) e fechou às 11:03:20; uma segunda sessão do mesmo cliente fechou de forma limpa às 11:21:55. Pode ser o início do mesmo padrão de carga (alguém já testando visualização de câmeras) antes de escalar para o episódio de 11:50-12:15, ou um evento menor e independente - a única sessão do dia com perda de pacote registrada além do episódio principal.
- **~14h, durante a própria investigação**: SSH e ping para a EC2 falharam de forma intermitente 3 vezes em ~35 min (uma queda de até 8 min) enquanto HTTPS ao Kong respondia normal - mesma assinatura de "tráfego fino/novo sofre, tráfego já estabelecido não", consistente com a mesma classe de problema (saturação de banda/fila), mas sem confirmação de que houve pico de visualização concorrente nesse horário específico.
- Achado crônico e não relacionado: a câmera `6c378050-1fda-410a-8887-00095eeea0de` falha o WebSocket Axis a cada ~60-77s, ininterruptamente, há pelo menos 45h (~2000 tentativas) - provável dispositivo offline, sem ligação com a saturação de banda.

#### O que NÃO era o problema

- Crash, restart ou OOM do `ms-cameras` - `StartedAt` sem mudança, uptime contínuo.
- Contenção de CPU pelo runner de CI - nenhum job rodou entre 11:50 e 12:15 (primeiro `Worker_*` log é 12:20:56).
- Esgotamento de conntrack, erro 5xx no Kong, erro de conexão no Postgres/Redis - nada disso apareceu nos logs do intervalo.
- Uma câmera específica com defeito - o padrão afeta TODAS as câmeras reais simultaneamente, de sub-redes diferentes; não é um dispositivo isolado.

#### Correção proposta (backlog)

- [ ] **Limitar variantes de qualidade concorrentes por câmera** (ou publicar sob demanda): hoje o `mediamtx` publica `-secondary`/`-tertiary`/`-tertiary-h265` mesmo sem viewer para todas elas - candidato a otimização dentro do escopo da Fase 1/3 da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]].
- [ ] **Priorizar/isolar o tráfego de healthcheck** do tráfego de vídeo (QoS/traffic shaping na interface, ou mover o ping de healthcheck para uma rota/porta com prioridade), para que um pico de banda de vídeo não derrube a detecção de saúde de todas as câmeras junto.
- [ ] **Rodar a Fase 3 da SOFTWARE-2003** (validação de escalabilidade e banda) com este episódio como caso de teste real: reproduzir N viewers abrindo M câmeras de uma vez e medir o ponto de saturação de `ens5`.
- [ ] Adicionar um alerta/threshold sobre `avgLatencyMs` agregado da rede (o mesmo dado que já é gravado em `CameraAvailabilityWindow`) para detectar esse padrão automaticamente, em vez de depender de relato manual.
- [ ] Investigar separadamente o padrão crescente de `DEGRADED` de 17 a 23/08 (152 a 2863 janelas/dia) - pode ser o mesmo fenômeno em menor escala, recorrente há mais de uma semana.
- [ ] Investigar separadamente a câmera `6c378050-1fda-410a-8887-00095eeea0de` (falha crônica de WebSocket Axis) - achado à parte, sem ligação com este episódio.

#### Ligado a

- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] - Fase 3 (validação de escalabilidade e banda) é exatamente o que este incidente evidencia como risco real.
- [[Streaming - Diagnóstico de travamento no WebRTC]] - diagnóstico existente de travamento no caminho WebRTC; conferir sobreposição.
- [[Streaming - Arquitetura]] - mapa de portas do mediamtx e pipeline ABR.


---

## Atualização (mesmo dia, 24/08) - achado relacionado + task sem prazo

Ao investigar mais a fundo (o usuário trouxe um print do videowall com o player oscilando entre WebRTC e HLS), achamos e reproduzimos ao vivo no mesmo EC2 dev um segundo problema que provavelmente agrava a saturação de banda acima: ver [[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] - o player entra num loop de reconexão WebRTC sem back-off quando o relay é reapado, gerando tráfego de sessão extra continuamente.

Os dois achados (saturação de banda + oscilação WHEP↔HLS) foram consolidados numa única task sem prazo: [[Streaming - Saturação de banda de saída sob carga concorrente]], listada em [[00 - Sem prazo (backlog)]].
