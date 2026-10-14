---
tags:
  - attlas
  - sprint-33
  - prompt
  - analitico
  - incidentes
  - metricas
aliases:
  - "Prompt - 409 do treatment-status"
  - "Handoff de 18 de setembro"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "Escrito em 18/09 para ser colado num terminal novo. Três frentes: o 409 do PATCH de tratamento, o GET que a troca de status dispara e as Métricas vazias no dev2. As causas já estão localizadas por leitura de código — o trabalho é o conserto e a prova."
atualizado: 2026-09-18
---

# Prompt - o 409 do tratamento e as métricas vazias no dev2

---

Trabalho no repo `attlas-2026`, branch `develop` atualizada (HEAD `0d96dc8a35`, PR #3712 mergeada).
Nada commitado ainda para estas três frentes. Merge é decisão minha, nunca sua.

## REGRAS DURAS

1. **NUNCA rode `nx build`, `nx test`, `nx lint`, `tsc`, `jest`, teste de integração ou `docker build`.**
   Esta máquina não aguenta. O CI é o gate.
2. **Commite com `--no-verify`** — o hook do husky dispara eslint/prettier e isso também pesa.
3. **NUNCA mate nem reinicie o `nx serve web-attlas`.** O front é meu, eu subo e eu derrubo.
4. **NUNCA suba/derrube microsserviço ou container por conta própria.** Pergunte.
5. **Tela se prova no navegador (Playwright MCP), não com `curl`.**
6. **Resposta curta.** Primeira frase é a resposta.
7. Regra documentada vence código vizinho (`CLAUDE.md` raiz). Comentário: o padrão é **não** comentar.

## Ambiente

- **EC2 dev / produção do dev2**: `ssh atman` (usuário `ubuntu`, `dev.v2.attlas.atmansystems.com`).
  É onde reproduzir as três coisas. MCP `ssh-atman` também está ativo.
- Tenant do dev2: `6c277280-b369-49a5-bbb9-72a5d5fcf789`.
- Telas: `https://dev.v2.attlas.atmansystems.com/#/analytics/incidents` e
  `.../#/analytics/metrics?subtab=atspm`.
- Deploy sincroniza o compose mas **nunca** os `.env` do servidor.

---

## Frente 1 — PATCH `treatment-status` devolve 409 (a causa está achada)

**Sintoma medido**: `PATCH /api/cameras/events/60600022-0000-4000-8000-000000000000/treatment-status`
→ **409 Conflict**. Uma vez deu 502 (Kong; secundário, ver frente 4).

**O 409 do backend está CERTO — não mexa nele.** O evento `60600022-…` é o **slot 22** do seed
(`apps/ms-cameras/src/database/seed.ts:985`), e o slot 22 nasce com `treatment: 'RESOLVED'`.
`RESOLVED` é terminal: `CameraEventTreatmentCycle.ALLOWED.RESOLVED = []`
(`apps/ms-cameras/src/events/treatment/camera-event-treatment.constants.ts`). O handler levanta
`InvalidTreatmentTransitionException` corretamente (BR-CAM-TRT-002).

**A falha é de frontend: a fila oferece um movimento que o ciclo não permite.**

`INCIDENT_ROW_ACTIONS` é uma constante **estática**
(`apps/web-attlas/src/app/modules/analytics-incidents/constants/incident-table.constants.ts:25`) e o
menu da linha renderiza os três itens para **toda** linha, sem olhar o status:

```html
<!-- incidents-queue.component.html:148 -->
@for (action of rowActions; track action.id) { … }
```

O item `cancel` escreve `DROPPED` (`incidents.page.ts:672-684`). Numa linha `RESOLVED`/`DROPPED`
isso é sempre 409.

**Os outros dois caminhos já estão gateados e servem de modelo — copie a regra deles, não invente outra:**

- `incident-treatment-controls.component.ts:47` → `actions = canTreat() ? INCIDENT_TREATMENT_NEXT[status()] : []`
- `incident-status-editor.component.ts` → `choices()`/`closed()` pela mesma tabela
- `incident-detail.page.ts:399` → `canCancel()`, e o comentário em cima dele **descreve exatamente este bug**:
  *"a menu row that answers with a 409 teaches the rule after the click"*

**Conserto**: as ações da linha passam a ser derivadas por linha —
`INCIDENT_TREATMENT_NEXT[row.status]` + `ANALYTICS_PERMISSIONS.INCIDENTS_TREAT`. `details` e `status`
ficam sempre (são leitura/abrir card); `cancel` só quando `DROPPED` está em
`INCIDENT_TREATMENT_NEXT[row.status]`. Note que `IDataTableRowAction` não tem predicado por linha
(`core/shared/components/data-table/data-table-row-action.interface.ts`) — decida entre passar
`rowActions` já filtrado por linha ou acrescentar um predicado à interface, e **me diga qual escolheu
antes de escrever**, porque a interface é compartilhada com outras tabelas.

Cobrir com spec: linha terminal não mostra `cancel`; linha `ACKNOWLEDGED` mostra.

## Frente 2 — trocar o status dispara um GET da lista inteira

**Onde**: `incidents.page.ts` — `onTreated()` chama `reload()`, que faz
`windowMode='replace'` + `page=1` + `retryToken++`, ou seja, **refaz o GET de `/api/cameras/events`
inteiro**. O mesmo em `reportBulkResult()` (lote) e em `onRowAction('cancel')`.

**A tensão é declarada no código** (*"A transition changes the chips and the pins too, so the whole
read is taken again"*) e o não-otimista é requisito — **UF-040 CA-5: sem optimistic update**. Então
não é simplesmente apagar o reload.

O que me incomoda e o que quero resolvido:

1. o `reload()` **volta para a página 1 e joga fora a janela do "carregar mais"** — quem tratou um
   incidente na terceira janela perde a rolagem;
2. a resposta do PATCH (`ICameraEventTreatmentResponse`) já traz `status`/`updatedAt` do servidor,
   então a **linha** não precisa de GET nenhum para ficar correta — só os **contadores dos chips** e
   os **pins do mapa** precisam.

**Direção a avaliar**: aplicar a resposta do PATCH na linha em memória (não é otimista — é o valor
que o servidor confirmou) e refazer **só** a leitura agregada de contadores/pontos, preservando
`page`/`windowMode`. Se a agregação não tiver endpoint próprio, diga isso e proponha o corte —
**não amplie escopo sem me perguntar**.

## Frente 3 — Métricas não mostram nada no dev2 (aba ATSPM)

`https://dev.v2.attlas.atmansystems.com/#/analytics/metrics?subtab=atspm` abre vazia.

**É a mesma cadeia quebrada que já está documentada em
[[Métricas - por que as telas não mostram nada no dev2]] — leia essa nota ANTES de investigar de novo.**
A aba ATSPM não tem fonte própria: `AtspmMetricsHttpSource`
(`modules/analytics-metrics/services/atspm-metrics.http-source.ts`) compõe duas chamadas —

```
VirtualLoopBindingsService.listByCamera(cameraId)  →  binding
DetectorHistoryService.getDetectorMetrics(binding.detectorId, …)  →  série
```

— e **sem binding devolve `withoutReading()`**, que desenha todos os 38 cards vazios. Ou seja: ATSPM,
Laço Virtual e Incidentes estão vazios pelos mesmos três motivos já levantados em 17/09:

1. `ms-cameras` deixou de servir `GET /api/internal/virtual-loop/sources` (o commit `71d57f274b`, que
   removeu o modo servidor, apagou `virtual-loop-sources.controller.ts` e manteve o consumidor do
   outro lado). O `CameraRegistryService` do `ms-video-analytics` loga 404 de 30 em 30 s, `isLoaded()`
   nunca fica verdadeiro, toda ocupação sai por `discarded_unresolved` e `attlas.detectors.raw` seca.
2. O dev2 tem **um** `VirtualLoopDetectorBinding` e ele aponta para um analítico `ATSPM` em modo
   `SERVER` da PTZ — caminho que não roda mais. As regiões embarcadas (DEMO, EMBEDDED 080) têm zero.
3. `attlas.cameras.event-logged` está com `LOG-END-OFFSET = 0` por causa do `shouldPublish` em
   `record-camera-event.service.ts` (só `isIngest || source === 'analytics'`, e o monitor de saúde
   grava com `source: 'health'`).

**O que eu quero desta sessão, nesta ordem:**

1. **Confirmar no EC2** (`ssh atman`) qual dos três está valendo agora para a aba ATSPM: veja se a
   série do detector do binding ainda está parada e se o 404 do `/api/internal/virtual-loop/sources`
   continua no log do `ms-video-analytics`. Não presuma que o estado de 17/09 se manteve.
2. **`ms-cameras` volta a servir `GET /api/internal/virtual-loop/sources`, somente leitura** — item 1
   do combinado do dia 18. Rota interna, escopo de leitura, sem reviver o modo servidor.
3. **`kind: 'unbound'` ganha estado próprio na tela** (ATSPM e Laço Virtual): hoje "não vinculado" e
   "sem leitura na janela" desenham o mesmo vazio, e é isso que faz a tela parecer quebrada quando é
   só falta de vínculo. Com o atalho para o vínculo do UC-064.
4. **Criar o vínculo da região 0 no dev2** para a aba ter série (trabalho de ambiente, não de código —
   me confirme antes de escrever no banco do dev2).

O `shouldPublish` (item 3 da lista de causas) é frente separada e **não entra neste PR** a menos que
eu peça.

## Frente 4 — o 502 avulso

O 502 apareceu uma vez no mesmo PATCH. Kong só devolve 502 quando o upstream não respondeu — o
provável é o `ms-cameras` ter reiniciado ou ter estourado timeout. **Só investigue se reproduzir**;
se não reproduzir em 3 tentativas, registre e siga. Vale olhar de passagem que
`/health/ready` do `ms-cameras` não checa dependência nenhuma (só heap), dívida já registrada.

## Rastreabilidade

Specs envolvidas: **UC-062** (transição de tratamento), **UC-074** (lote), **UF-040** (tela de
tratamento, CA-5), **UF-042** (seleção/lote), **UF-061** (janela da fila), **UC-064** (vínculo
laço↔detector), **CROSS-077** (`ms-atspm` não nasce). Regra de negócio: **BR-CAM-TRT-002**.
Branch no formato `analytics-incidents/fix/NO-CARD-<slug>`; commit com `Spec: UC-062` no rodapé.

## O que fechou em 18/09

O handoff rodou **nesta máquina mesmo**; o dev2 entrou só por SSH, para medição. As hipóteses acima
se confirmaram, uma a uma. Detalhe commit a commit em
[[Incidentes e Métricas - os cinco consertos de 18 de setembro]] — PR **#3932** (draft), branch
`analytics/fix/NO-CARD-tratamento-409-e-atspm-sem-vinculo`, 5 commits sobre `develop`.

- **Frente 1** — o 409 do backend estava certo (o slot 22 do seed nasce `RESOLVED`, terminal). A
  falha era `INCIDENT_ROW_ACTIONS` estática no menu da linha; virou
  `incidentRowActions(row.status, canTreat)`, derivada por linha.
- **Frente 2** — `onTreated()` passa a aplicar o status confirmado na resposta do PATCH, preservando
  a janela do "carregar mais"; só relê quando a transição tira o incidente do corte de status em
  vigor. UF-040 CA-5 intacta.
- **Frente 3** — a ATSPM ganhou estado `unbound` próprio, com saída para a Detecção, e o
  `RESOURCE_NOT_FOUND` do histórico lê como janela vazia. No dev2,
  `GET /api/internal/virtual-loop/sources` **já responde 200** (restaurada pela #3712) e o deploy
  está na ponta da `develop`: o que sobra é ambiente — nenhuma região embarcada tem vínculo.
- **Fora do roteiro** — o `GET /virtual-loop-bindings` que vinha em polling de 2 s virou cache por
  câmera com TTL de 60 s, e "ir até a câmera" virou navegação do Router (o `target="_blank"` caía no
  login: a sessão não atravessa aba).
- **Pendente** — criar o vínculo da região embarcada no dev2 continua em aberto: a escrita no host
  remoto foi barrada pelo classificador de permissões do Claude Code.

## Ver também

[[Métricas - por que as telas não mostram nada no dev2]] ·
[[Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes]] ·
[[Incidentes - contadores OPEN e DETECTED na fila]] ·
[[Registro - o EC2 dev alinhado com a bancada local em 17 de setembro]] ·
[[Prompt - continuar a validação e os fixes de 16 de setembro]]
