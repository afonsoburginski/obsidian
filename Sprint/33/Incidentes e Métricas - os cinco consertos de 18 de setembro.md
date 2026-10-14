---
tags:
  - attlas
  - registro
  - sprint-33
  - analitico
  - incidentes
  - metricas
aliases:
  - "Os cinco consertos de 18/09"
  - "PR #3932"
frente: Analítico
branch: analytics/fix/NO-CARD-tratamento-409-e-atspm-sem-vinculo
pr: "#3932"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "Cinco commits na PR #3932 (draft, base `develop`), todos de frontend. Fecha as frentes 1, 2 e 3 do handoff da manhã: o 409 do tratamento era menu de linha estático, a troca de status relia a fila inteira, o vínculo do laço viajava no polling da métrica, a ATSPM abria vazia sem dizer por quê e \"ir até a câmera\" caía no login. Falta o vínculo da região embarcada no dev2 — bloqueado por permissão de escrita remota."
atualizado: 2026-09-18
---

# Incidentes e Métricas - os cinco consertos de 18 de setembro

Os cinco são de frontend; o backend não foi tocado, e no caso do 409 ele estava **certo**. As
hipóteses de [[Prompt - o 409 do tratamento e as métricas vazias no dev2]] se confirmaram uma a uma.
O que mudou de diagnóstico foi o estado do dev2, medido hoje por SSH.

| Commit | O que consertou |
| --- | --- |
| `0ec7df5362` | menu da fila não oferece transição que o ciclo recusa |
| `58eac24fc5` | tratar um incidente não relê a fila inteira |
| `b49b762e95` | ATSPM separa câmera sem vínculo de janela sem leitura |
| `d73b133d78` | "ir até a câmera" navega na mesma aba, não em guia nova |
| `69d4210bad` | para de reler o vínculo do laço a cada evento da câmera |

## 1. O 409 do `PATCH /events/:id/treatment-status`

- **O backend estava certo.** O evento `60600022-…` é o slot 22 do seed
  (`apps/ms-cameras/src/database/seed.ts:985`) e nasce `RESOLVED`, que é terminal —
  `ALLOWED.RESOLVED = []`, BR-CAM-TRT-002.
- O erro era o menu da linha da fila renderizar `INCIDENT_ROW_ACTIONS`, **constante estática**, em
  toda linha: oferecia "Descartar" onde o ciclo não tem para onde ir.
- Os outros três caminhos já gateavam por `INCIDENT_TREATMENT_NEXT` — `incident-treatment-controls`,
  `incident-status-editor` e `incident-detail.page.ts:399`. Só a linha da fila ficou fora.
- Conserto: `incidentRowActions(row.status, canTreat)`, ação derivada por linha.

## 2. Troca de status disparava GET da fila inteira

- `onTreated()` chamava `reload()` (page 1 + `replace`), **jogando fora a janela do "carregar mais"**.
- Agora aplica o status que o servidor confirmou na resposta do PATCH. Não é optimistic update —
  **UF-040 CA-5 continua valendo**, é o valor que o servidor devolveu.
- Só relê quando a transição tira o incidente do corte de status em vigor.

## 3. `GET /virtual-loop-bindings` em polling

- O `MetricsCacheStore` expira a leitura no sinal vivo a cada 2 s (`METRICS_LIVE_COALESCE_MS`) e o
  loader recompõe `binding + janela do detector` — o vínculo viajava junto da série, a cada ciclo.
- Vínculo é **configuração**: só muda por UC-064. Não tem por que acompanhar a cadência da métrica.
- Agora cacheado por câmera no service, TTL de 60 s, invalidado pelas escritas. Falha **não** fica
  em cache.

## 4. ATSPM abria vazia sem dizer por quê

- Sem binding caía em `withoutReading()` e desenhava 38 cartões vazios: "não vinculado" e "sem
  leitura na janela" com a mesma cara.
- Ganhou estado `unbound` próprio, como a face de Laço Virtual já tinha desde a #3712, com saída
  para a Detecção.
- Junto: `RESOURCE_NOT_FOUND` do histórico passa a ler como **janela vazia**, não como erro com
  botão de tentar de novo.

## 5. "Ir até a câmera" caía no login

- O diálogo de ver ao vivo — inclusive nas sidebars de ATSPM e Laço Virtual — usava
  `<a target="_blank">`, e a sessão do Attlas **não atravessa aba**.
- Virou navegação do Router na mesma aba, fechando o diálogo antes: o `onDestroy` é o que devolve a
  lease de stream.

## O dev2 medido hoje por SSH

É o que muda o diagnóstico de [[Métricas - por que as telas não mostram nada no dev2]], que atribuía
a tela vazia à rota 404 somada à falta de vínculo. A rota voltou; **sobra o vínculo**.

| Medida | Estado em 18/09 |
| --- | --- |
| Deploy | na ponta da `develop`: `attlas-web-attlas:dev` de 21:10 UTC, `ms-cameras:dev` 21:11 UTC; o bundle carrega os marcadores da #3712 |
| `GET /api/internal/virtual-loop/sources` | **200**, com payload real — rota restaurada pela #3712 |
| `fetch failed` no `ms-video-analytics` | ordem de boot (21:18 e 21:36), **não** o 404 de 17/09 |
| `VirtualLoopDetectorBinding` | um só: `detectorIndex=23`, região 0, analítico ATSPM em modo `SERVER` da ATMN – PTZ — caminho removido em `71d57f274b` |
| Regiões embarcadas | nenhuma com vínculo |
| Base de eventos | 1.166.589 sem tratamento contra 7 `RESOLVED`, 4 `INVESTIGATING`, 3 `DROPPED`, 2 `ACKNOWLEDGED` |

A causa que sobra é **ambiente**, não código.

## O que foi escrito no dev2 (18/09, ~23:20 UTC)

Feito depois de o usuário sair do *auto mode* — o classificador recusava toda escrita remota
(`Remote Shell Writes`, `Modify Shared Resources`) e regra em `settings.json` não passa por cima.

| onde | o quê |
|---|---|
| `ms-cameras` · `VirtualLoopDetectorBinding` | DEMO região `…006010` → `f722dd6f` idx **24** `VEHICLE` · EMBEDDED 080 região `…006101` → idx **25** `PEDESTRIAN`. O binding velho (idx 23, PTZ/SERVER) ficou. |
| `ms-detector-history` · `meta_detector` | 2 linhas, ids derivados (`ace5c34e-…`, `19c8d6a9-…`), `label` `[seed 18/09] …` |
| `ms-detector-history` · `detection_record` | **4.559** linhas sintéticas, últimas 6 h, RLE `{1}`/`{0}` em amostras de 100 ms |

Conferido pelo endpoint que as faces leem (`GET /api/detector-history/detectors/:id/metrics`, PERIOD,
janela de 6 h em 36 buckets): DEMO 1.744 veículos, fluxo médio 291/h, ocupação média 12 %;
EMBEDDED 080 336 pedestres, fluxo 56/h. Primeira tentativa semeou `symbols {2}`, copiado das linhas
da PTZ — `2` é `NOT_DETECTED`, não presença; a série lia zero. Corrigido por `UPDATE` para `{1}`.

> [!info] Como desfazer
> `DELETE FROM detection_record WHERE "detectorId" IN ('ace5c34e-f484-5c82-8b53-5af5e6b98c84','19c8d6a9-291e-5ece-b30b-665cceb82f7a');`
> `DELETE FROM meta_detector WHERE label LIKE '[seed 18/09]%';` — e os dois bindings pelos índices 24/25.

O embarcado **não estava publicando** no momento (tópico em 51.234 mensagens, nada em 10 s de escuta,
0 descartes no log): o vínculo conserta o caminho, mas a série real só volta quando o ACAP publicar.

## Ver também

[[Prompt - o 409 do tratamento e as métricas vazias no dev2]] ·
[[Métricas - por que as telas não mostram nada no dev2]] ·
[[Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes]] ·
[[Registro - o EC2 dev alinhado com a bancada local em 17 de setembro]] ·
[[Detecção - ocupação da câmera embarcada sem detector vinculado]] ·
[[Analítico servidor - Vínculo região para endereço de detector]] ·
[[Incidentes - contadores OPEN e DETECTED na fila]]
