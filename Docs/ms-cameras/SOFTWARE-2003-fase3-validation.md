# SOFTWARE-2003 Fase 3 - Relatorio de validacao (EC2 dev)

Validacao de escalabilidade e consumo de banda das Fases 1 e 2 da SOFTWARE-2003
(ciclo de vida de sessoes de stream + telemetria de banda por camera).

- Ambiente: EC2 dev (`aws-attlas-26`, `ip-172-31-46-250`), stack docker-compose. `ms-cameras` e `mediamtx` no ar desde o deploy da PR #649 (Fases 1+2 em `develop`).
- Data: 2026-07-06 (horarios em UTC).
- Metodo: observacao read-only (mediamtx control API `/v3/paths/list`, contagem de processos ffmpeg, `docker stats`, logs do container, tabela `CameraStreamProfile`) + um teste dirigido de viewers via `/dev/tcp`. Sem alterar o ciclo de vida do servico.
- Dataset: 14 cameras cadastradas, 12 OPERATIONAL, 2 STOCK. Cameras 1027-1030 (SNL, RTSP 1080p H264 reais) estao streamando; a camera ATMN DEMO (`...000010`) nao esta transmitindo (ver F4).

## Scorecard

| # | Criterio | Veredito | Evidencia |
|---|----------|----------|-----------|
| 1 | Sem viewer -> 0 relays -> banda ~0 | PASS | Captura passiva de 4 min: FF sustentado em 0, mediamtx 0 paths, NetIO estavel. |
| 1b | Incidente reproduzido e corrigido | PASS | 4 relays com 0 readers puxando 1080p (bytesReceived subindo); reaper matou 3 em ~30s. |
| 2 | Reaper decide pelos readers do mediamtx, nao pelo viewerCount | PASS | Sessao 1029 com viewerCount vazado (2) e 0 readers foi reapada mesmo assim (BR-REAP-001). |
| 3 | Reuso de relay entre viewers (M viewers -> 1 ffmpeg) | PASS | 1029: viewer do browser + 2 GETs anexaram na mesma sessao; FF ficou em 4, nao 6. |
| 4 | Reaper seletivo + O(1) | PASS | 1027 (com reader) preservada; 1028/1029/1030 (0 readers) reapadas. 1 chamada `/v3/paths/list` por tick. |
| 5 | Telemetria device-truth sem puxar video (Fase 2) | PARCIAL | 11/12 PRIMARY com `bitrateSource=ONVIF`, 0 ffmpeg pela telemetria; mas o valor nao chega no card (F1) e ha residuo VBR (F2). |
| 6 | Criterios numericos + observabilidade | PARCIAL | Sem metrica Prometheus do reaper, `/metrics` exige auth (401), sem Prometheus/Grafana/Loki no dev (F3). |
| 7 | Escala 1000+ cameras | NAO TESTADO | So 12 cameras no dev; comportamento e O(1)/O(N) por design, mas 1000+ nao foi medido aqui. |

## Linha do tempo do teste dirigido (camera 1029, foco)

Durante o teste havia um videowall de 4 cameras aberto no browser (WebRTC/WHEP).

- +0s (12:01:29): 4 paths ativos (1027-1030), cada um com 1 reader webRTCSession, 1 relay ffmpeg cada. FF=4.
- +1s: dois GET `/api/cameras/1029/hls?quality=PRIMARY` retornaram ACTIVE e anexaram na sessao existente. FF permaneceu 4 (reuso).
- +11s: readers do browser comecam a cair (1027 e 1029 ficam com readers vazios).
- +16s a +37s: as 4 relays com 0 readers e `bytesReceived` ainda subindo. Cenario do incidente reproduzido. Camera 1029 puxando ~11.8 Mbps sem nenhum espectador.
- ~+43s (12:02:10): reaper encerra 1028, 1029 e 1030 (0 readers por >=20s). itemCount 4->1, FF 4->1. Log: `Reaping orphan session ...001029:PRIMARY: 0 readers no mediamtx por 20s`.
- 1027 sobreviveu porque reganhou um reader em +32s. FF=1 estavel, camera legitimamente assistida.

Bitrate por relay 1080p medido pelo delta de bytesReceived: ~3 a ~12 Mbps por camera (1029 ~11.8 Mbps). Quatro relays orfas juntas drenavam dezenas de Mbps com 0 viewers, que e a magnitude do incidente original.

Orcamento de fechamento: o reaper fechou a room ~30s apos o ultimo viewer sair, dentro do alvo de <=30s da spec (grace 20s + tick 5s + atraso do mediamtx em remover o reader WebRTC apos a queda do ICE).

## Parametros de producao confirmados no ar

- `STREAM_REAPER_INTERVAL_CRON=*/5 * * * * *` (tick 5s), `STREAM_REAPER_ZERO_READER_GRACE_MS=20000`, `STREAM_REAPER_MIN_SESSION_AGE_MS=15000`, `HLS_SESSION_GRACE_MS=10000`. Invariante `ZERO_READER_GRACE (20s) > HLS_SESSION_GRACE (10s)` preservado.
- `FFMPEG_RECONNECT_MAX_RETRIES=10`, backoff exponencial capado em 30s.
- `CAMERA_BITRATE_REFRESH_HOURS=6`.

## Achados

### F1 (alto) - a banda device-truth nao chega no card do Video Wall

O coletor da Fase 2 gravou `bitrateSource=ONVIF` em 11 perfis, todos de role PRIMARY. O card de banda do Video Wall soma o perfil SECONDARY (`dashboard/bandwidth/bandwidth-monitoring.service.ts`, `where role=SECONDARY isActive`). No banco existe apenas 1 perfil SECONDARY, e ele e estatico (`bitrateSource` nulo, 1000 kbps). Consequencia: o objetivo da Fase 2 (device-truth substitui o valor estatico do card) nao se concretiza neste ambiente, o card continua estatico.

Recomendacao: alinhar produtor e consumidor. Ou o coletor popula tambem o SECONDARY, ou o card cai para o PRIMARY quando nao ha SECONDARY, ou o provisionamento/seed cria perfis SECONDARY. Revalidar num dataset com perfis SECONDARY.

### F2 (medio) - residuo VBR envenenando o PRIMARY

10 perfis PRIMARY estao com `bitrateKbps=2147483647` (Int32 max), modo VBR, todos datados de 2026-07-04 20:37, antes do deploy do fix. O fix (`hardware/drivers/onvif/onvif.driver.ts`, rejeita o sentinela int-max de VBR) esta no ar e comprovadamente nao grava mais esse valor, mas VBR retorna null e o coletor mantem o valor anterior, entao as linhas antigas nunca sao corrigidas. Nao infla o card hoje (o card le SECONDARY), mas e dado sujo e envenena qualquer consumo de PRIMARY.

Recomendacao: backfill unico das linhas `bitrateKbps=2147483647` (zerar/nular) e definir um fallback para VBR (target/max do device ou default do perfil).

### F3 (medio) - observabilidade insuficiente para o Criterio 5

- O reaper nao expoe metrica Prometheus. A spec previu `ms_cameras_stream_reaper_reaped_total`, mas o codigo so emite `logger.warn`. Reaps sao observaveis apenas por log.
- `/metrics` do `ms-cameras` responde 401 (auth) mesmo batendo direto na porta do app; o `/metrics` do mediamtx tambem exige auth. Scraping por Prometheus precisa de credencial configurada.
- Nao ha Prometheus/Grafana/Loki no EC2 dev. A observacao hoje e via control API + logs + docker stats.

Recomendacao: adicionar o counter do reaper (e opcional gauge de sessoes ativas), decidir a estrategia de auth do `/metrics` para scraping, e prover uma stack minima de observabilidade no ambiente de validacao.

### F4 (medio) - camera que falha o start entra em respawn thrash fora do registry

A camera ATMN DEMO (`...000010`) nao gera segmentos; os GETs retornam 502 HLS_START_TIMEOUT e o ffmpeg sai com code 143. Comportamento observado:

- O start-timeout deleta a sessao do registry e lanca o 502, mas o handler de exit do ffmpeg agenda reconexao usando o objeto de estado ja destacado, entao o ffmpeg continua respawnando fora do controle do registry (e invisivel ao reaper).
- E limitado a `FFMPEG_RECONNECT_MAX_RETRIES` (10 tentativas, ~3-4 min com o backoff capado em 30s), depois desiste. Nao e leak infinito e nao sustenta pull de video (cada ffmpeg morre em ~3s).
- Dois GETs concorrentes na mesma camera com start falho criaram dois loops de reconexao concorrentes (publisher war).

Recomendacao: cancelar o loop de reconexao quando o start inicial falha e a sessao e deletada; deduplicar tentativas concorrentes por camera/qualidade tambem no caminho de falha de start. Investigar a parte, por que a camera ATMN DEMO nao transmite no dev.

## Veredito e recomendacao de status

- Fase 1 (reaper, lease, ciclo de vida das sessoes) esta validada e solida. O incidente do vazamento de banda nao se reproduz: relays orfas sao encerradas em ~30s, a decisao vem do mediamtx e nao do viewerCount vazado, e o reuso de relay entre viewers funciona. Pode ser considerada concluida.
- Fase 2 (telemetria device-truth) nao entrega o valor de ponta a ponta por causa de F1, com F2 como divida de dados. Nao concluir sem tratar F1/F2.
- Fase 3 (escala 1000+ e observabilidade) validou o mecanismo em N pequeno; a prova de escala e a instrumentacao (Criterio 5) sao follow-up e alimentam a SOFTWARE-2009.

Sugestao: nao fechar a SOFTWARE-2003 inteira como esta. Fechar a parte da Fase 1 e abrir follow-ups para F1, F2, F3, F4 (F1 e F2 pequenas e no proprio ms-cameras; F3 e F4 podem ir junto da escalabilidade em SOFTWARE-2009).
