---
tags:
  - attlas
  - sprint-25
  - moc
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: em andamento - troca de escopo em 20/07: Dashboard (2213-2219) voltou pro backlog; foco = backend da tela de Eventos de câmeras. Em 22/07 (fim do dia): os 5 cards de eventos (2220-2224) + fundação 2212 + 2134 TODOS MERGEADOS na develop. Em 23/07: #951 (2289) mergeada depois de mais uma rodada de review + conflito com a develop resolvido. Em 24/07: infra de CI fechada - runners escalados (3 sumo heavy + 1 EC2), #964 (2293) mergeada, e a auditoria de cache achou o problema sistêmico (client Prisma stale servido pelo cache remoto compartilhado, quebrava vários serviços) - #1017 (cache-correctness + serialização da integração + fix de memória do ms-pmv) mergeada; develop e #951 verdes de ponta a ponta. ClickUp: 2289/2294/2295 (as 3 fases da tela de Eventos, todas entregues na #951) Closed, card novo do #1017 criado. Cards restantes: dashboard backend (2213-2219) com as 7 PRs #856-863 abertas em code review, 2200/2201 no backlog. Em 24/07 (tarde): as 7 PRs do dashboard atualizadas com a develop e com os fixes do review interno pushados (inclui o índice Camera(systemId, lifecycleState) na #856); a correção órfã do detalhe de evento por câmera (ficou fora da #951 já mergeada) virou card novo 2313 + PR #1033.
atualizado: 2026-07-24
---

# Attlas - Sprint 25

Foco: **backend da tela de Eventos de câmeras** (`/api/cameras/events/*`). Mudança de plano em 20/07 - o Dashboard de câmeras (2213-2219) saiu do foco da semana (hoje está em code review, com as 7 PRs abertas - ver Status atual acima). A **lista e o detalhe cross-câmera já foram entregues** pelo UC-032 (SOFTWARE-1914, PR #803, lucas) e o front consome sem mock; a semana é o que sobra: stats, timeline, recurrence e os campos/filtros reais da lista/detalhe. Backend-only, 1 card = 1 PR.

A fundação **2212** (MOD-013, PR #822) foi movida da Sprint 24 pra cá em 20/07 - os endpoints de eventos reusam o resolver de período/escopo e o `SPEC-ms-cameras` que ele bootou. **Mergeada em 22/07**, destravou a semana.

## Status atual (24/07, fim da Sprint 25)

O núcleo da sprint é **dashboard de câmeras + eventos de câmeras**. Eventos (tela, timeline, side card, campos/stats/recorrência/observações): **entregue e Closed**. Dashboard backend (2213-2219): **em code review** (7 PRs abertas, prontas pra merge). Infra de CI entrou como apoio e está **fechada**. Snapshot batendo com o ClickUp:

| Card | Status | PR |
| --- | --- | --- |
| 2212 fundação do dashboard (resolver período/escopo) | Closed | #822 |
| 2220 / 2221 / 2222 / 2223 / 2224 eventos (campos, stats, timeline, recorrência, observações) | Closed | #899 / #895 / #896 / #897 / #903 |
| 2289 tela de Eventos (integração front-back) | Closed | #951 |
| 2294 timeline pela cadeia do incidente | Closed | #951 |
| 2295 side card / drawer (Geral + Histórico) | Closed | #951 |
| 2293 cache remoto self-hosted no CI | Closed | #964 |
| 2312 cache-correctness + serialização + fix ms-pmv | Closed | #1017 |
| 2271 / 2272 / 2283 fixes | Closed | #885 / #888 / #912 |
| 2213-2219 dashboard backend (atualizadas com develop + fixes de review) | **code review** | #856 / #857 / #858 / #860 / #861 / #862 / #863 |
| 2313 detalhe de evento por câmera (area/subarea + ações disparadas) | Closed (mergeada 24/07) | #1033 |
| 2321 / 2322 fila da integração + higiene automática do CI (docker-gc + hooks pós-job + rotação) | Closed (mergeada 24/07) | #1038 (a #1040 foi consolidada nela e fechada) |
| 2323 governor fair-share de RAM + reciclagem de swap | Closed (mergeada 24/07) | #1045 |
| 2200 analítico desacoplado, 2201 videowall externo | backlog | - |

O resto desta nota é o registro cronológico da semana.

## Cards (1 PR cada) - esta semana

Base lista+detalhe já entregue pelo UC-032 (#803). O que sobra:

| Card | Escopo | Existe / falta | Pts |
| --- | --- | --- | --- |
| [[SOFTWARE-2220 - Eventos câmeras - campos reais + filtros\|2220]] | campos reais + filtros da lista/detalhe | area/subarea via topologia, honrar filtros ignorados (area/subarea/origin/state/status), status/triggerCount reais | 5 |
| [[SOFTWARE-2221 - Eventos câmeras - stats\|2221]] | `/events/stats` (total/critical/warning/info + trend) | nada existe; `COUNT GROUP BY severity` no mesmo `where` da lista + trend | 3 |
| [[SOFTWARE-2222 - Eventos câmeras - timeline + acionamentos\|2222]] | `/events/:id/timeline` + `triggeredActions` INCIDENT | timeline do evento não existe; `triggeredActions` devolve `[]` (só INCIDENT viável) | 5 |
| [[SOFTWARE-2223 - Eventos câmeras - recorrência\|2223]] | `/events/:id/recurrence?period=` | nada; agregação bucketizada por período | 3 |
| [[SOFTWARE-2224 - Eventos câmeras - observações + reportar (condicional)\|2224]] | observações do evento + reportar ocorrência | model `CameraEventObservation` novo + migration; report cria `CameraIncident` | 3 |
| **Total** | | | **19** |

PRs (base develop), estado no fim de 22/07 - **as 5 mergeadas**:
- 2220 [#899](https://github.com/atmanadmin/attlas-2026/pull/899) (UC-043) - **MERGEADA**.
- 2221 [#895](https://github.com/atmanadmin/attlas-2026/pull/895) (UC-040) - **MERGEADA**.
- 2222 [#896](https://github.com/atmanadmin/attlas-2026/pull/896) (UC-041) - **MERGEADA**.
- 2223 [#897](https://github.com/atmanadmin/attlas-2026/pull/897) (UC-042) - **MERGEADA**.
- 2224 [#903](https://github.com/atmanadmin/attlas-2026/pull/903) (UC-044) - **MERGEADA**.

Backend da tela de Eventos 100% na develop. ClickUp: os 5 cards Closed.

**Conflitos + quebra de CI (22/07)**: ao mergear a develop nas 3 branches restantes, os 3 conflitaram no mesmo ponto (bloco de imports/rotas do `cameras.controller.ts`, resolvido por união). O CI então pegou uma quebra que já estava latente na develop: a interface `ITopologyNodeIdsClient` ganhou `resolveNodeTopology` (feature de eventos), mas o `CachedTopologyNodeIdsClient` do dashboard nunca foi atualizado pra implementá-lo - passou batido porque nenhum grafo de afetados recompilou o ms-cameras inteiro. Corrigido implementando o método como pass-through pro delegate (o resolver do dashboard só usa `resolveNodeIds`, então esse caminho nunca é exercido). Mesmo fix nas 3 branches.

**Integração front ↔ back**: [[SOFTWARE-2289 - Eventos câmeras - integração front-back|SOFTWARE-2289]] ([#951](https://github.com/atmanadmin/attlas-2026/pull/951), **mergeada 24/07**; Closed). Removeu o mock da tela de Eventos (serviço HTTP puro) e, ao longo do dia, acumulou o resto do fechamento da tela: escrita real de observação (POST comentar/responder), date picker de range no padrão shadcn (z-calendar), filtro `cameraId` na lista (corrige o 400 do card de últimos eventos do dispositivo, que pedia pageSize 200 > teto 100 e filtrava no client), coordenadas reais das 14 câmeras no seed+banco (geocodadas via Nominatim depois que as estimadas à mão caíram no mar), fix do crash do drawer (closeButton via ElementRef), consolidação das specs (CROSS-039) e saneamento de 9 specs quebrados herdados da develop. Dependências (2221/2222/2223) todas mergeadas - a PR está destravada, aguardando CI + review. **23/07**: 2º review veio com 3 bloqueantes (stats com where inline divergindo da lista, CROSS-039 draft vs POST ligado, DTO sem implements) + 7 ajustes - tudo corrigido e pushado (0a4f5bc71), threads respondidas/resolvidas. Fechamento do dia: cache com expiração no serviço da tela (mantém dado visível durante revalidação em segundo plano, mesmo voltando de outra tela), mapa do drawer sempre visível, timeline de histórico corrigida, filtro de Status removido do painel (rótulo duplicado do de Severidade). Mais uma rodada de review (2 bloqueantes) e o conflito de merge com a develop resolvidos - **PR mergeada**. Pós-aprovação: dividido em 3 fases/cards, todas entregues dentro da #951 - tela principal (2289), side card/drawer (2295, abas Geral/Histórico + handler get-camera-event-detail no ms-cameras), página de detalhes (2294). Os três Closed no ClickUp.

**Timeline funcional**: [[SOFTWARE-2294 - Timeline pela cadeia do incidente|SOFTWARE-2294]] (entregue DENTRO da #951, a pedido). A timeline lia `CameraEventLog.correlationId`, que é chave de idempotência e nunca é populada como cadeia - todo evento mostrava só ele mesmo. Passou a montar a cadeia pelos eventos do(s) incidente(s) do âncora (`CameraIncidentEvent`, cross-câmera) com fallback de contexto da câmera (±30min, cap 50) para eventos de rotina. Destravou a correlação (UC-021) adicionando `VAPIX_TAMPERING` e `PUSH_DISCONNECT` aos pares correlacionáveis (nenhum causeCode real estava na lista, por isso 0 incidentes no banco) e incluiu backfill idempotente - rodado no dev: 108 incidentes, 527 eventos em cadeia. Smoke: evento em cadeia = 49 itens; rotina = 22 via contexto. Specs UC-041/UC-021 corrigidas.

2224 saiu do condicional em 20/07: o "reportar" passou a criar um `CameraIncident` (que já existe no ms-cameras), então a dependência de Incidents deixou de bloquear. Model `CameraEventObservation` novo + migration. Evidências multipart e alvos ALARM/OS ficam como follow-up.

Frente e mapa de reuso: [[Eventos de câmeras - backend]].

## Dashboard (code review) e backlog

- **Dashboard de câmeras (2213-2219)** - saiu do foco em 20/07, mas as 7 PRs (uma por card) estão **abertas e em code review** no ClickUp: #856 (2213 KPIs/gauge), #857 (2214 donuts), #858 (2215 uptime), #860 (2216 heatmap), #861 (2217 marcadores), #862 (2218 banda), #863 (2219 conectividade). Specs UC-033..039. Frente: [[Dashboard de câmeras - backend]].
- **Review interno + fixes (24/07)**: rodei review interno nas 8 PRs abertas (nenhum bloqueante) e apliquei os ajustes, um commit por PR: índice `Camera(systemId, lifecycleState)` para o scan network-wide (migration única na #856, herdada pelo lote); teto de leitura de eventos no mapa (#861) e desempate estável no top-N do heatmap (#860); `ClockToken` registrado no dashboard e testes de propagação de 502 (#857, #863); campo morto e rotas em comentário corrigidos (#862, #863); rota do teste de uptime (#858). Antes disso, cada branch foi atualizada com a develop (só a #951 tinha 1 conflito, resolvido a favor do fix de cache do prisma).
- **[[SOFTWARE-2313 - Detalhe de evento por câmera - area-subarea e ações disparadas|SOFTWARE-2313]]** ([#1033](https://github.com/atmanadmin/attlas-2026/pull/1033), code review) - card novo. A rota de detalhe de evento por câmera devolvia area/subarea em branco e limitava as ações disparadas a uma só (`take: 1`), divergindo da rota cross-camera. Como a #951 já mergeou, o fix virou card + PR próprios (1 card = 1 PR). Reusa a mesma resolução de topologia da rota cross-camera.
- SOFTWARE-2200 (analítico desacoplado) e SOFTWARE-2201 (videowall externo) - backlog, sem prazo.

## Fixes da semana

- SOFTWARE-2271 (#885, mergeado) - guarda de sistema selecionado nas rotas system-scoped (fecha o 400 de system-id ausente). Destravei o build de produção que quebrava por import órfão no videowall antes de mergear.
- SOFTWARE-2272 (#888, mergeado) - semeia os 3 tópicos Kafka faltantes no seed do deploy (AD do ms-audit + analytics do ms-cameras).
- SOFTWARE-2283 ([#912](https://github.com/atmanadmin/attlas-2026/pull/912), mergeada) - URLs internas de serviço fixadas no `docker-compose.yml` via `environment:` (imune a drift do `.env.docker`). O `environment:` sobrepõe o `env_file:` e é sincronizado a cada deploy, então mesmo com o `.env.docker` do host errado (derrapando pra `localhost`) ou com chave ausente, as chamadas entre serviços (Traffic Model e Organization pro ms-cameras) continuam corretas. 7 serviços tocados. Raiz: o deploy não sincroniza os `.env.docker`, mantidos à mão no host. Validado pós-deploy: Traffic Model alcançou o ms-cameras (`/health/ready` ok) após a janela de boot.
- SOFTWARE-2134 ([#919](https://github.com/atmanadmin/attlas-2026/pull/919), mergeada em 22/07; não está no board da Sprint 25 squad 2 - épico do analítico ao vivo, rastreio à parte) - analítico ao vivo (bounding boxes) parava sozinho a cada reboot do device, porque o edge sobe com o producer Kafka desligado e nada religava. Worker agendado no ms-cameras (`AnalyticsProducerReconcilerService`, a cada minuto) que garante o producer ligado sozinho, recuperação em até 1 min sem entrar no servidor. Spec PROJ-014, fan-out da MOD-014. No diagnóstico o `deviceAnalyticId` estava velho no banco, mas o binding é por `source_id`, então o problema real era o `GET /api/producer` = `{enabled:false}` no device após reboot.

## Infra / CI

- [[SOFTWARE-2293 - Cache remoto self-hosted no CI|SOFTWARE-2293]] ([#964](https://github.com/atmanadmin/attlas-2026/pull/964), **mergeada 23/07**) - CI lento por cache local isolado por runner (regressão do commit `da6ec19b0`, que tirou o offload pro ubuntu-latest e o actions/cache). Fix: cofre de cache remoto self-hosted na sumo (MinIO + nx-cache-server, `:8388`), sem Nx Cloud, custo zero. **24/07 - runners escalados** (tokens chegaram): 3 na sumo (label `heavy`, integração roda só lá) + 1 no EC2 (só lint/build). Governador de CPU/RAM (systemd timer) nas duas máquinas, corrigido pra não se auto-estrangular (teto fixo em vez de calcular por `load1`, que cortava o próprio job); reaper que mata job travado (>75min) e testcontainer órfão; 8 GB de swap na VM da sumo. ClickUp Closed.

- **Cache-correctness ([#1017](https://github.com/atmanadmin/attlas-2026/pull/1017), mergeada 24/07)** - card novo, follow-up do 2293. Com o cache remoto ligado, os artefatos passaram a ser servidos defasados: `prisma:generate` e `build` rodam como comando (opacos ao NX), então a versão das ferramentas não entrava na chave de cache. Com o drift Prisma `^7.7.0` no lockfile vs `7.8.0` instalado, o cofre servia client Prisma velho pra vários serviços (o ms-audit foi só o primeiro a explodir, o problema era sistêmico). Fix: `externalDependencies` (prisma/@prisma/client) nas inputs dos 10 `prisma:generate` + `package-lock.json`/`.nvmrc` no `sharedGlobals` do `nx.json` + node-version-file fixo. Segunda classe de falha: os 3 runners heavy numa VM só rodavam integrações concorrentes que estouravam os testcontainers (`ECONNREFUSED` no `provisionWorkerDatabase` de pmv/traffic-model) - resolvido serializando a integração (concurrency group `attlas-integration-sumo`, 1 por vez). Terceira: o ms-pmv morria por memória (`runInBand` acumulando heap nas ~50 suites num processo só) - troquei por 1 worker com `workerIdleMemoryLimit` (recicla sem race de DB), somado ao tuning de footprint do Postgres que outro dev fez em paralelo. develop e #951 verdes de ponta a ponta depois disso. Diagnóstico com fan-out de agentes de auditoria; runbook em `docs/architecture/ci-remote-cache.md`.

- **Fila da integração + higiene automática dos runners ([#1038](https://github.com/atmanadmin/attlas-2026/pull/1038), mergeada 24/07 18:19, card 86ajpq18k Closed; a #1040 foi consolidada nela e fechada)** - a #1038 também tira o concurrency group da integração (cancelava pending antigo na fila; agora a fila é no nível dos 3 runners heavy, cancelamento só da mesma PR) e, por causa disso, a limpeza de testcontainers (workflow e hook) passou a remover só container PARADO; rodando, só ao fim de integração com um único worker vivo. Incidente 24/07: disco da VM de CI em 100% por 357 volumes anônimos de testcontainers vazados (remoção sem `-v` não leva o volume do Postgres junto). Fix em camadas: workflow e reaper com `docker rm -fv`, docker-gc periódico (VM poda volume dangling sempre; EC2 nunca toca em volume da app) e, depois de replanejar sem Kubernetes (vetado pra isso), **limpeza pós-cada-job via hook nativo do runner** (`ACTIONS_RUNNER_HOOK_JOB_COMPLETED`, sem tocar em YAML de workflow) + rotação semanal dos runners (domingo 03:00, só se ocioso). Deployado e validado nas duas máquinas; guard de ociosidade provado com job real rodando. Observabilidade estilo Nx Cloud (Prometheus/Grafana/poller do GitHub) ficou só documentada pra depois em [[Observabilidade CI - plano (stack completa)]]; runners efêmeros (precisam de PAT admin do gestor) registrados como evolução futura no mesmo doc.

- **Governor fair-share + reciclagem de swap ([#1045](https://github.com/atmanadmin/attlas-2026/pull/1045), mergeada 24/07, card SOFTWARE-2323 Closed; fase 2 da #1038)** - achado da auditoria pós-merge da #1038: o swap da VM de CI reencheu (8/8 GB) em minutos depois de reciclado, com 18 GB de RAM livre. Causa: o governor dividia a RAM pelos 3 listeners sempre, então um job de integração de ~10 GB sozinho era espremido num MemoryHigh de 9 GB e o kernel empurrava as páginas dele pro swap (swap esgotado = precursor do zumbi). Fix: divide pelos runners ocupados (job sozinho ~27 GB, 3 concorrentes ~9 GB, reavaliado por minuto) e a rotação semanal recicla o swap quando a RAM absorve. Deployado e validado ao vivo (MemoryHigh foi de 9 pra 27 GB no tick seguinte).

## Processo (SDD + gate)

- 1 atômica = 1 PR; gate completo do serviço (`nx test/lint/build`), não só affected; 0 erros de lint.
- PR base `develop`. Sem `HttpException`/`Error` crus. CI antes do deploy.
- Specs em `apps/ms-cameras/docs/atomic/`; fundação compartilhada MOD-013 (2212).
