---
tags:
  - attlas
  - sprint-23
  - task
  - cameras
  - perfis-de-midia
  - log-de-eventos
card: SOFTWARE-2008
clickup: https://app.clickup.com/t/86ajc6yfr
titulo: "[Back] Cameras: perfis de mídia + log de eventos"
frente: Cameras / Perfis de mídia + Log de eventos
tamanho: a estimar
status: fullstack implementado (perfis de mídia + log de eventos), PR #708 na develop (CI rodando)
branch: cameras/feat/SOFTWARE-2008
pr: https://github.com/atmanadmin/attlas-2026/pull/708
spec: MOD-012 + UC-031 (perfis de mídia); UF-032 + UC-017 (log de eventos)
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-08
---

# Perfis de mídia + Log de eventos (SOFTWARE-2008)

> Tarefa 6. Escopo ampliado (08/07): além dos **endpoints de perfis de mídia** (a tela já existia no mock, faltava só o backend expor a rota), o card passou a abranger também a **evolução do log de eventos** do detalhe da câmera (server-side, severidade, filtro por operador e atualização ao vivo), essa parte com frontend de verdade. Ambas na mesma branch/PR #708.

## Problema
O frontend do módulo de câmeras tem a tela de perfis de mídia construída, mas não há endpoint no `ms-cameras` que ela consuma. Sem rota, a tela fica presa no mock.

## Objetivo
Expor a rota/endpoints de perfis de mídia por câmera para a tela do frontend integrar.

## Contexto
- Perfis de mídia = configurações de encoder da câmera (resolução, codec, bitrate, fps), tipicamente expostas via **ONVIF media profiles** (`GetProfiles`).
- No backend hoje existe o modelo `CameraStreamProfile` (primary/secondary), mas sem endpoint que a tela use.

## A definir no planejamento

- [x] Contrato/endpoint(s) de perfis de mídia por câmera (o que a tela precisa: listar, detalhar, mapear).
- [x] Fonte dos dados: puxar media profiles ao vivo da câmera (ONVIF `GetProfiles`) x servir o `CameraStreamProfile` persistido x descobrir na câmera e persistir.
- [x] Spec `UC-*` (REST) do(s) endpoint(s) — MOD-012 + UC-031 reescritas pra arquitetura final.
- [x] Contratos em `@attlas/contracts` — reusa o `camera-media-profile` existente (sem contrato novo).
- [~] Testes — user valida manualmente no web-attlas (pediu pra ignorar unit/integration agora).

## Definido no planejamento (08/07, Fase 0 concluída)

- **O que a tela precisa.** A tela (UF-019) já está codada contra o contrato que **já existe** em `@attlas/contracts/camera-media-profile`: `GET /api/cameras/:id/media-profiles` devolvendo `IListMediaProfilesResponse` (paginado) de `IGetMediaProfileResponse` (ONVIF denso: videoEncoder, audioSource, audioEncoder, ptzConfig, videoSource, name, tokenName, enabled, isPrimary). Consumo é one-shot, sem realtime na lista em si. Pra sair do mock, o front só troca `useMock = false`.
- **Fonte dos dados: híbrido.** O `CameraStreamProfile` persistido é fino (role/codec/resolução/bitrate/fps do encoder, só PRIMARY/SECONDARY, sem áudio/PTZ/fonte de vídeo/quality/encodingInterval/h264Profile/name). O dado rico ONVIF (todos os perfis, PTZ range, snapshot, encoder por perfil) já é buscado ao vivo pelo `CameraCredentialProbeService`/`OnvifDriver.getEncoderConfig` mas é descartado, nada persiste. Decisão: servir o contrato do front mapeando o persistido + enriquecer com ONVIF ao vivo o que falta. O `ICameraMediaProfile` novo proposto na MOD-012 fica **superado** (reusa o `camera-media-profile` existente).
- **Realtime.** A lista de perfis não é realtime. O que varia ao vivo (bitrate/fps transmitido, connectionStatus) já tem infra própria (2 gateways Socket.IO no ms-cameras: `/cameras` streaming e `/api/cameras/status/realtime`) e contrato `ICameraStatusPayload`, fora do escopo desta lista.

## Implementação final (08/07) — commitada e pushada na #708 (`8524b1c73`)

**Reframe importante (do próprio user):** "perfil de mídia" = o inventário ONVIF **da própria câmera** (device-truth), NÃO a config de streaming da Attlas (`CameraStreamProfile`: PRIMARY/SECONDARY, codec negociado, escada de substream do SOFTWARE-2023). São coisas diferentes; a tela quer o que a câmera TEM.

Arquitetura entregue (tabela + persistência + atualização):
- **Tabela nova `CameraMediaProfile`** (migration `add_camera_media_profile`) guarda o inventário device-truth: colunas-resumo + `payload Json` (o `IGetMediaProfileResponse` completo). `CameraStreamProfile` fica intacto.
- **Descoberta ONVIF** (`camera-onvif-media-profile.reader.ts`): `getProfileList` + `getVideoEncoderConfiguration` (GOP/`GovLength` + h264Profile, que o profile list não dá). Best-effort/timeout; VBR (int-max) clampeado; PTZ só quando o range é não-nulo.
- **Gatilhos automáticos**: `CameraMediaProfileDiscoveryService` chamado na **criação de câmera** (`CreateCamerasHandler`), no **boot** e em **refresh periódico** (`CameraMediaProfileDiscoveryWorker`). Toda câmera nova/existente popula sozinha.
- **Endpoint** `GET /api/cameras/:id/media-profiles` serve **do banco** (payload verbatim), escopado por tenant (MOD-011), paginado/busca/ordenação, PRIMARY primeiro; 404 cross-tenant; página vazia sem inventário.
- **Front** consome o endpoint real (media-profiles `useMock=false` + event-log via HTTP).

**Verificado local (real, não seed):** a DEMO foi repontada pra `10.1.1.80` (uma AXIS P1475-LE achada na rede — a M1135/10.1.1.78 e a PTZ estavam offline). No boot, a descoberta populou **12 câmeras / 34 perfis reais**; DEMO com `profile_1_h264` (GOP 32, H264 Main, do encoder config) e `profile_1_jpeg`; PTZ desligada = vazio (honesto, sem dado fake).

Merge da develop feito na branch (traz o front de cameras atualizado). Testes unit/integration ficam pro user validar manualmente no web-attlas.

Follow-up: PTZ completo (node/spaces/timeouts via `getNode`), áudio (canais), estimar bitrate no VBR, push WS na mudança; corrigir o modelo cosmético da DEMO (aparece M1135, device real é P1475-LE); warning de Redis do cache de status (à parte).

## Log de eventos (ampliação de escopo, 08/07) — commitada e pushada na #708

A aba de Log de Eventos (UF-032) do detalhe da câmera deixou de puxar uma janela fixa e filtrar no cliente: agora filtra, ordena e pagina no backend via `GET /api/cameras/:id/events`.

- **Severidade**: coluna nova + filtro (INFO/WARN/ERROR), com o dot colorido no mesmo padrão do bloco de saúde da câmera.
- **Filtro por operador**: `operatorId` no endpoint (validado como UUID), fim a fim (DTO, controller, filtros, handler).
- **Ao vivo**: consome o WebSocket `camera:event:new` (que o ms-cameras já emitia). Prepende na visão mais recente ou mostra um banner "novos eventos" quando a visão está paginada, buscada ou reordenada.
- **i18n**: rótulos de severidade e "novos eventos" nos 4 locales.
- Sem migration nova (o `severity` e o sort já existiam na develop). O backend só ganhou o filtro por operador e um fix do TTL de Redis do cache de status (caía em NaN quando a env faltava).

Junto foram dois ajustes que apareceram rodando o stack local end-to-end (commit `chore` à parte na mesma branch): `redis-cameras` dedicado + nginx fazendo proxy de `/api` no compose local, e um guard no CI que reinstala `node_modules` quando o cache do runner está corrompido.

## Fontes de verdade

- Edital + `docs/modules/cameras.md` para o escopo funcional da tela.
- Modelo `CameraStreamProfile` (schema Prisma do `ms-cameras`).
