---
tags:
  - attlas
  - sprint-24
  - moc
sprint: Sprint 24 (13/7/26 - 19/7/26)
status: fechada. 2134 e 2226 mergeados (PRs #790, #830); 2226 concluído (Closed). 2212 (PR #822, ainda em review) movido pra Sprint 25 em 20/07, porque os Eventos dependem dele. Sprint 25 pivotou pra Eventos de câmeras (2220-2223); Dashboard (2213-2219) foi pro backlog
atualizado: 2026-07-17
---

# Attlas - Sprint 24

Foco principal: **integração câmera + analítico de vídeo + controlador via laço virtual**. O operador desenha um laço sobre o vídeo, o analítico detecta o veículo cruzando, alimenta o controlador como detector e faz o frontend piscar o laço em tempo real. Vale também para regiões de Detecção de Objetos (DAI), o segundo modo da mesma tela.

O analítico é embarcado na câmera (device real "ATMAN Traffic Edge ATSPM"): configura regiões por REST e publica detecção no Kafka - laço e DAI são o mesmo primitivo (região com `kind`). É o modelo que o attlas 25 já usa no DAI.

Base: em cima do que o **Daniel** já tem no controlador/detector + referência do **attlas 25** (produção).

## Essa semana

- [x] **SOFTWARE-2226 - Testes do analítico e provisionamento no cadastro** (CONCLUÍDA, Closed) - [[SOFTWARE-2226 - Testes do analítico e provisionamento no cadastro]]: PR #830 mergeada na develop em 17/07 (aguarda deploy manual). Boot híbrido resiliente, consumer consolidado + groupId único, fan-out multi-câmera, observabilidade do WS/analítico, env fail-fast + broker por env, provisionamento ONVIF no cadastro. Infra/ops (kafka-init gerador, aquario, systemIds) seguem como follow-up fora do PR.
- [x] **SOFTWARE-2212 - Fundação do dashboard de câmeras: resolver de período/escopo** (APROVADA, movida pra Sprint 25) - [[SOFTWARE-2212 - Fundação do dashboard de câmeras - resolver de período-escopo]]: PR #822 APPROVED por Hadson, mergeable, 0 threads abertas, falta só o merge. Fundação MOD-013 compartilhada; movida pra Sprint 25 em 20/07 porque os Eventos desta semana reusam o resolver dela.

## Já entregue

- [x] **1a fatia do analítico ao vivo** - [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]] (PR #790, MERGED 15/7): analítico embarcado → WS → player mostrando regiões acendendo + bounding boxes em tempo real, validado com o device real. Aprovado por rezendelc + danielGuerra e mergeado na develop. Fluxo em [[SOFTWARE-2134 - Decisão técnica e fluxo (analítico ao vivo)]].
- [ ] **Review da PR #764** do Daniel (obrigação ativa, bloqueia ele; ajuda a entender a base do controlador).

## Próxima semana (Sprint 25)

Pivotou em 20/07: o foco da Sprint 25 passou a ser o backend da tela de **Eventos de câmeras** (2220-2223) + a fundação 2212 (movida da 24). O **Dashboard de câmeras** (2213-2219) foi pro backlog - specs UC-033..039 e draft PRs #856-863 seguem abertos, retomáveis. Ver [[Attlas - Sprint 25]].

## Sem prazo (backlog - ClickUp Sprint 25 / backlog)

Movido pra pasta `Sprint/sem prazo` - não é dessa semana nem da próxima:

- **Eventos de câmeras**: a base 2220-2223 entrou na Sprint 25 em 20/07; só o 2224 (condicional) segue sem prazo. [[Eventos de câmeras - backend]].
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
