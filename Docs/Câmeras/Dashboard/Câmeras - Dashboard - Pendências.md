---
tags:
  - doc
  - cameras
  - dashboard
  - pendencias
aliases:
  - "Câmeras - Dashboard - Pendências"
atualizado: 2026-10-07
banner: "dashboard analytics dark"
---

# Câmeras - Dashboard - Pendências

Volta para [[Câmeras - Dashboard]].

## Resumo

Faltam dez itens no Dashboard de câmeras, em duas frentes: partes do requisito do edital (RF-DSH-01 de `docs/modules/cameras.md`) que não aparecem na tela, e correções de backend e de documentação. A parte já entregue (conectividade, operacional e rede) está na seção "Cobertura do requisito do edital" de [[Câmeras - Dashboard - Arquitetura e estratégias]]. Os limites que não mudam estão em "Armadilhas conhecidas" da mesma nota.

## O que falta

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Degradação de vídeo por câmera na tela: card para a rota da tabela de degradação, e um KPI que meça vídeo e não conexão | o `streamDegradation` mede conexão, e `getDegradation` existe em `cameras-dashboard.service.ts` sem chamador | `apps/ms-cameras/src/dashboard/`, `apps/web-attlas/src/app/modules/cameras-dashboard/` |
| Card de incidentes abertos por severidade | a rota `incident-severity` existe sem card, e `getIncidentSeverity` não tem chamador | `apps/web-attlas/src/app/modules/cameras-dashboard/` |
| MTTR e hotspots | não existem no backend, no frontend nem nos contratos | RF-DSH-01 de `docs/modules/cameras.md` |
| Rota de exportação XLSX e CSV | a exportação é só do frontend e cobre apenas a lista de conectividade já carregada | `ConnectivityExportService` |
| Rotas `bandwidth-comparison`, `connectivity/degradation`, `incident-severity` e o snapshot `bandwidth` no push | não têm valor no enum nem `case` em `DashboardWidgetComposer.queryFor`, então não atualizam ao vivo | `DashboardWidgetComposer` |
| Coluna de origem (medido ou provisionado) na janela de banda | o consumo dos períodos em dias (`D7`, `D30`, `CUSTOM`) conta o provisionado das horas sem espectador, e a exclusão por valor é heurística | [[Câmeras - Streaming - Banda e bitrate]] |
| Teste de superfície que barre rota sem `@RequireSystemDuty()` | o `authorization-surface.spec.ts` verifica por rota e não pega rota nova sem decorator | `authorization-surface.spec.ts` |
| Decidir a comparação com rota de trânsito | `comparisonMode` conta só entidades resolvíveis, o que diverge do contrato quando o usuário escolhe uma rota e uma área | spec do módulo |
| Revisão de produto dos limiares de latência (80, 130 e 180 ms) e de degradação (10% e 50%) | os comentários do código declaram a revisão pendente | `latency-severity.ts` |
| Atualizar a spec atômica do push ao vivo | a DR-11 ainda descreve a validação de pertencimento no WebSocket como dívida, e a DR-10 diz que o bitrate é comparado com 3 casas decimais; o código já valida o pertencimento e compara a 0,1 Mbps | spec atômica do push ao vivo em `apps/ms-cameras/docs/atomic/` |
