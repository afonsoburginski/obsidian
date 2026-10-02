---
tags:
  - doc
  - analitico
  - frontend
aliases:
  - "Analítico - Frontend do attlas-design"
  - "Analítico - Tela de Métricas no web-attlas"
  - "Tela de Métricas no web-attlas"
  - "Métricas do Analítico - estado da tela"
  - "Registro - ajustes do módulo em 17 e 18 de setembro"
atualizado: 2026-10-01
---

# Analítico - Frontend

As telas do [[Analítico]] no `web-attlas` e a referência visual de onde elas vêm. Contratos e rotas do
backend estão em [[Analítico - Arquitetura e estratégias]].

## Onde mora

| Peça | Caminho |
| --- | --- |
| Rota e abas | `/analytics`, abas em `modules/analytics/constants/analytics-nav.constant.ts`: `detection`, `instances`, `incidents`, `metrics`, cada uma um módulo lazy |
| Módulos | `modules/analytics-detection/`, `analytics-instances/`, `analytics-incidents/`, `analytics-metrics/`; o compartilhado (painel de câmeras `atspm-camera-panel`) em `modules/analytics/` |
| Desenho sobre o vídeo | Modo `analytics` do player compartilhado, `core/shared/components/camera-stream-player/analytics/`, alimentado pela porta `PLAYER_ANALYTICS_FEED` ligada ao `CameraAnalyticsLiveService` |
| Specs | `apps/web-attlas/docs/modules/analytics/atomic/` (UF-042 a UF-062, UF-722, UF-725 a UF-729). O `spec-id.mjs` tira o namespace do caminho de docs, então spec nova vai nessa pasta |
| Traduções | `libs/contracts/src/lib/i18n/locales/<locale>/analytics.json` |

## As telas

- **Detecção**: o único lugar que escreve região, laço e configuração do embarcado. Sem autoplay: a
  sessão de vídeo abre por gesto do operador (UF-055), e o gate mora na página, não no player. A
  edição congela o quadro do preset ativo. Os blocos de cada região (classificação, laço com a linha
  ativadora, incidentes, métricas de desempenho com a faixa associada e a placa ACOM) aparecem conforme
  o descritor de capacidade do build; caixa só com `FRAME_REPORTING`.
- **Detalhe da câmera**: aba Analítico no card lateral, só leitura, com o estado do analítico e as
  regiões pintadas pelo mesmo modo do player.
- **Instâncias**: unidades embarcadas e Neural Labs na mesma lista e na mesma página de instância.
  Registrar (manual ou descoberta na rede), Vincular o equipamento, editar, remover (só banco),
  sincronizar, câmeras vinculadas e, na Neural Labs, o par `ComputerID` e `CamID` de cada câmera.
- **Incidentes**: fila em Lista ou Tabela com mapa, painel lateral, página do incidente com imagem e
  vídeo do equipamento, ação em massa com resultado por item, chips de filtro, criticidade por tipo, e
  atualização ao vivo pelo canal do Sistema.
- **Métricas**: três faces, ATSPM, Laço Virtual e Incidentes. A face só abre para o analítico que a
  câmera tem (UF-728). Exportar gera XLS ou PDF. Leitura e cartões em [[Analítico - Fluxos#Métricas]].

O player compartilhado expõe o estado da imagem (`none`, `loading`, `live`, `paused`, `failed`) lido do
próprio `<video>`, e o desenho do analítico só aparece em `live`.

## A referência visual

O módulo foi desenhado e codado antes no repositório `atmanadmin/attlas-design`, em
`modulo-analitico/entrega-frontend/`: um Angular 21 por módulo, mock-first (interceptor HTTP local,
sem backend, sem testes, texto pt-BR fixo). Porta-se HTML, CSS e fluxo de interação; serviços e
interfaces são reescritos contra `@attlas/contracts`. As decisões de interface do módulo (fila,
falso positivo, menus de status, paginação, mapas) estão no `decisoes.md` daquele repositório, com IDs
`ANL-*`. Para igualar uma tela, ver a skill `attlas-web-ui`.

## Armadilhas conhecidas

- **Serviço com socket, timer ou polling nunca vai em `providers` de módulo lazy.** O injector de
  módulo lazy não é destruído, então o `DestroyRef` não dispara: a tela de Métricas chegou a ficar
  inscrita na frota inteira depois de sair. `MetricsCacheStore`, `MetricsLiveService` e
  `MetricsCameraCatalog` ficam nos `providers` do `MetricsPageComponent`.
- **O painel de câmeras é compartilhado entre as faces.** Perder um atributo no mount de uma face (o
  `showMap`, por exemplo) não quebra a outra nem acende teste.
- **Porte grande do protótipo pede auditoria própria**, não review de tela: o porte de Instâncias e
  Incidentes trouxe regressão de paginação, rótulos trocados e um defeito no `ModulePage` compartilhado.
- **Veredito de "não portar" vale conferido contra o serviço que serve o dado** e contra o diretório
  que nasceu no produto, nunca deduzido do nome da tela ou da árvore do protótipo.
