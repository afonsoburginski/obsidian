---
tags:
  - attlas
  - sprint-24
  - moc
sprint: Sprint 24 (13/7/26 - 19/7/26)
status: as 3 tasks da semana estão prontas ou aprovadas. 2134 MERGED (PR #790, 15/7). 2212 APPROVED, mergeable (PR #822). 2226 APPROVED por Hadson (PR #830, 17/7), CI rodando, review resolvido. Falta merge de 2212 e 2226 + deploy manual. Dashboard (2213-2219) planejado pra Sprint 25; eventos (2220-2224) + 2200 + 2201 em sem prazo
atualizado: 2026-07-17
---

# Attlas - Sprint 24

Foco principal: **integração câmera + analítico de vídeo + controlador via laço virtual**. O operador desenha um laço sobre o vídeo, o analítico detecta o veículo cruzando, alimenta o controlador como detector e faz o frontend piscar o laço em tempo real. Vale também para regiões de Detecção de Objetos (DAI), o segundo modo da mesma tela.

O analítico é embarcado na câmera (device real "ATMAN Traffic Edge ATSPM"): configura regiões por REST e publica detecção no Kafka - laço e DAI são o mesmo primitivo (região com `kind`). É o modelo que o attlas 25 já usa no DAI.

Base: em cima do que o **Daniel** já tem no controlador/detector + referência do **attlas 25** (produção).

## Essa semana

- [x] **SOFTWARE-2226 - Robustez do pipeline de câmeras, analítico e infra** (APROVADA) - [[SOFTWARE-2226 - Robustez do pipeline de câmeras, analítico e infra]]: PR #830 APPROVED por Hadson (17/7), review resolvido (B12 + gate de spec), 0 threads abertas, CI rodando. Boot híbrido resiliente, consumer consolidado + groupId único, fan-out multi-câmera, observabilidade do WS/analítico, env fail-fast + broker por env, provisionamento ONVIF no cadastro. Falta CI verde + merge + deploy manual. Infra/ops (kafka-init gerador, aquario, systemIds) seguem como follow-up fora do PR.
- [x] **SOFTWARE-2212 - Fundação do dashboard (SPEC + resolver período/escopo)** (APROVADA) - [[SOFTWARE-2212 - Dashboard câmeras - SPEC ms-cameras + resolver período-escopo]]: PR #822 APPROVED por Hadson, mergeable, 0 threads abertas. Falta só o merge. Destrava os 7 widgets do dashboard (agora na Sprint 25).

## Já entregue

- [x] **1a fatia do analítico ao vivo** - [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]] (PR #790, MERGED 15/7): analítico embarcado → WS → player mostrando regiões acendendo + bounding boxes em tempo real, validado com o device real. Aprovado por rezendelc + danielGuerra e mergeado na develop. Fluxo em [[SOFTWARE-2134 - Decisão técnica e fluxo (analítico ao vivo)]].
- [ ] **Review da PR #764** do Daniel (obrigação ativa, bloqueia ele; ajuda a entender a base do controlador).

## Próxima semana (Sprint 25)

Backend do **Dashboard de câmeras** (2213-2219, 7 cards, 1 PR cada) - specs escritas (UC-033..039) e draft PRs abertos (#856-863), implementação na Sprint 25. Ver [[Attlas - Sprint 25]] e [[Dashboard de câmeras - backend]].

## Sem prazo (backlog - ClickUp Sprint 25 / backlog)

Movido pra pasta `Sprint/sem prazo` - não é dessa semana nem da próxima:

- **Eventos de câmeras** (2220-2224, 5 cards) - [[Eventos de câmeras - backend]].
- **SOFTWARE-2200 - Analítico desacoplado (teste ACOM + controlador)** - [[SOFTWARE-2200 - Analítico desacoplado (teste ACOM + controlador)]]: a contraparte do 2134 (câmera comum sem edge → detecção atuando no controlador via ACOM). É onde as decisões borda-vs-CV-própria e atuação-hardware-vs-software se resolvem.
- **SOFTWARE-2201 - Integração videowall externo (NovaStar H9)** - [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]]: Attlas comanda o mural de LED por Open API (TCP-IP), exigido pelo contrato de Quito. Adaptador `INT-*` novo, provável em `ms-cameras`.

## Fora do foco (não esquecer)

- **PROJ-009 - worker de partições**: P0 com prazo real - o bootstrap só criou 8 semanas de partições, os inserts param no início de setembro. Contexto na [[SOFTWARE-2004 - Particionamento de tabelas de telemetria de câmeras]] (Sprint 23). Sem card ainda.
- **SOFTWARE-2003** - fechar o streaming (F4 + validar em Axis real). Em teste.
- **SOFTWARE-2016** - filtro de topologia (destrava a PR #643 do front).
- **SOFTWARE-2009** - fatia 1 da escalabilidade WS (redis-cameras + adapter). [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes|sem prazo]].
- **SOFTWARE-2005** - permissões (base em `docs/modules/permissions.md`). [[SOFTWARE-2005 - Novas regras de permissões de usuário|sem prazo]].
- **PR #475** (docs de infra, SOFTWARE-1719) - foi mergeada por engano na develop em 17/7 e revertida no mesmo dia (revert PR #877). O trabalho de infra NÃO está na develop; pra entrar de vez é reabrir PR nova ou reverter o revert.

## Processo (SDD + gate)

- 1 atômica = 1 PR; gate completo do serviço tocado (`nx test/lint/build`), não só affected; 0 erros de lint.
- Serviço esqueleto tocado ganha `SPEC.md` mínimo no primeiro PR (bootstrap SDD).
- Branch `<módulo>/<prefix>/<SOFTWARE-id>`. PR base `develop`. Sem `HttpException`/`Error` crus. CI antes do deploy.
