---
tags:
  - doc
  - cameras
  - eventos
  - ms-cameras
  - pendencias
aliases:
  - "Câmeras - Eventos, incidentes e alarmes - Pendências"
atualizado: 2026-10-07
banner: "alarm alert notification"
---

# Câmeras - Eventos, incidentes e alarmes - Pendências

Volta para [[Câmeras - Eventos, incidentes e alarmes]].

## Resumo

Cinco itens faltam neste subdomínio: um defeito de exportação, duas lacunas de consistência (report duplicado e corridas sem índice), a fila-morta da ingestão e da correlação, e comentários de código que contradizem o comportamento. O comportamento atual que não está em correção fica em "Armadilhas conhecidas" de [[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]]. O estado de cada requisito do edital está em [[Câmeras - Eventos, incidentes e alarmes - Requisitos e SLA]].

## O que falta

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Corrigir a exportação que para nas primeiras 100 linhas: o handler pede lotes de `INCIDENTS_EXPORT_BATCH_SIZE` (500) e encerra quando um lote volta menor que 500, mas o `ListCameraEventsHandler` limita `pageSize` a `CameraEventLogConfig.MAX_LIMIT` (100) | com mais de 100 incidentes no filtro o arquivo sai com 100 linhas, enquanto o teto de 20 000 é conferido contra o total real | `apps/ms-cameras/src/events/`, fluxo de exportação em [[Câmeras - Eventos, incidentes e alarmes - Fluxos]] |
| Impedir report duplicado: conferir se o evento já tem incidente em `ReportCameraEventOccurrenceHandler` e desabilitar o botão "Reportar ocorrência" depois do primeiro uso | `createReportedIncident` sempre insere, e o botão de `camera-event-detail.page.html` fica sempre clicável, então um segundo clique abre dois incidentes | `ReportCameraEventOccurrenceHandler`, `camera-event-detail.page.html` |
| Índice parcial único em `(cameraId, correlationId)` e `UNIQUE` parcial por `correlationKey` com `resolvedAt IS NULL` | sem eles a deduplicação do ingest e a unicidade do `TENTATIVE` da mesma chave dependem só do código e perdem para duas escritas simultâneas | schema Prisma do `ms-cameras` |
| Publicar na fila-morta `attlas.dlq.cameras` o que a ingestão e a correlação descartam | hoje a mensagem descartada só deixa uma linha de log, enquanto outros consumidores do serviço já usam a fila-morta | consumidores de ingestão e correlação em `apps/ms-cameras/src/events/` |
| Corrigir comentários que contradizem o comportamento: `area` "not yet enforced" em `reading/dtos/list-camera-events.dto.ts` (o filtro é aplicado e testado), o docblock de `safeAppendEvent` em `health/workers/camera-health.worker.ts` (o par correlacionável publica) e o comentário em `record-camera-event.service.ts` sobre `ANALYTICS_INCIDENT` (o emissor alarma os três tipos mapeados) | quem lê o comentário conclui o contrário do que o código faz | os três arquivos citados |
