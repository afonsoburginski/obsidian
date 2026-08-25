---
tags:
  - attlas
  - sprint-32
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 32"
  - "Sprint 32 - o que entrega"
sprint: Sprint 32 (7/9/26 - 13/9/26)
status: CRIADA em 25/08 pelo user, como a terceira semana da frente do analítico, contra o prazo externo de 18/09 (front + backend). Comprometido só o resíduo que a Sprint 31 já projetava pra cá (2 cards, 4 pts) - SOFTWARE-2398 e SOFTWARE-2200, cards já existentes no ClickUp desde a Sprint 27, mantidos com o mesmo ID, pontos setados em 25/08. O resto da nota é o que falta dimensionar, não escopo fechado - ver "Proposto, sem pontos fechados" abaixo.
atualizado: 2026-08-25
---

# Sprint 32 - o que entrega

Porta de entrada da semana de **07 a 13/09**. É o **último checkpoint de desenvolvimento cheio** antes
do prazo de 18/09 (que cai na Sprint 33). Planejamento detalhado em esta nota.

> [!note] Último checkpoint antes do prazo, e ainda com folga de planejamento
> Só 4 pontos comprometidos hoje. É aqui que a sobra das Sprints 30 e 31 aterrissa - o planejamento
> desta semana se fecha quando o rolo das duas anteriores estiver conhecido, não antes.

## Features (o que o sistema passa a fazer)

| Feature | Onde | Estado |
| --- | --- | --- |
| **Teto medido** de câmeras por instância de analítico, com política de saturação declarada (degradar taxa de quadro, recusar câmera nova, ou escalar) | `ms-virtual-loop` | ⏳ a fazer |
| **Prova de campo ponta a ponta**: câmera comum, detecção em container, ocupação publicada, evento de detector chegando na timeline do histórico com contadores coerentes | cadeia inteira | ⏳ a fazer |

## Telas

**Nenhuma comprometida.** E é justamente o furo: se as telas de métricas (ATSPM e Laço Virtual, prontas
no `attlas-design`) precisam estar no ar em 18/09, esta é a última semana em que elas caberiam - e não
estão planejadas em nenhum lugar hoje. Ver [[Analítico - Frontend do attlas-design]].

## Explicitamente NÃO entrega (hoje)

- **Telas de métricas ATSPM e Laço Virtual** - sem card, sem ponto, em nenhuma sprint.
- **ACOM e ATSPM** (28 pts somados) - seguem em [[00 - Sem prazo (backlog)]], e não está confirmado se
  entram ou não no escopo do prazo de 18/09.
- **Quatro laços virtuais por câmera** - redesenho de contrato, sem prazo.

## Cards da semana

[[SOFTWARE-2398 - Escala do analítico - câmeras por instância]] ·
[[SOFTWARE-2200 - Prova de campo do analítico em container]]

Os dois já existiam no ClickUp desde a Sprint 27 (não foram recriados), com pontos setados em 25/08.

## Ver também

[[Sprint 30 - o que entrega]] ·
[[Sprint 31 - o que entrega]] · [[Analítico]] · [[00 - Sem prazo (backlog)]]

---

# Planejamento detalhado

## Comprometido (4 pts, 2 cards)

Os dois cards que a [[Attlas - Sprint 31]] já projetava para depois dela, porque dependem da cadeia do
analítico servidor estar de pé. Os dois já existiam no ClickUp desde a Sprint 27/29 (não foram recriados),
mantidos com o mesmo `SOFTWARE-*`, com pontos setados em 25/08. Não têm lista "Sprint 32" própria no
ClickUp ainda (por decisão do user - só a Sprint 30 tem lista vigente hoje), então seguem onde estão até
a lista existir.

| # | Card | Pts | Espera o quê |
| --- | --- | --- | --- |
| 1 | [[SOFTWARE-2398 - Escala do analítico - câmeras por instância\|Escala do analítico: câmeras por instância e distribuição]] `[Back]` | 2 | O card 5 da Sprint 31 (detecção por frame), pra medir custo real em vez de estimar |
| 2 | [[SOFTWARE-2200 - Prova de campo do analítico em container\|Prova de campo ponta a ponta até a timeline do detector]] `[Back]` | 2 | Toda a cadeia da Sprint 31 de pé - é o elo que cede primeiro se a Sprint 31 apertar |

## Proposto, sem pontos fechados: o furo de frontend

> [!danger] Nenhuma das três sprints do analítico tem card de implementação de frontend
> Auditado nas notas das três semanas: a [[Attlas - Sprint 30]] e a [[Attlas - Sprint 31]] registram
> explicitamente que "as telas entram como spec `UF-*`, não como implementação da sprint". Nem uma spec
> `UF-*` nova está no comprometido de nenhuma das duas - o que existe hoje é a `UF-033` (aba Analíticos,
> desenho de região), que já está **implementada** desde o PR #766 e só precisa de correção de texto
> (card 2 da Sprint 30, herdado da PR fechada #1355). Fora dela, zero spec de frontend do analítico
> existe: nada para exibir arquitetura/compatibilidade no cadastro (card 4 da Sprint 30), nada pro
> healthcheck do analítico (card 5 da Sprint 30), nada pro preset PTZ com snapshot de região (card 8 da
> Sprint 30). Sem spec aprovada, não há o que implementar - é a própria regra de SDD do repo.
>
> Se o prazo de 18/09 exige tela em produção (não só backend funcionando por baixo), falta pelo menos:
> 1. Escrever as specs `UF-*` das três telas acima, sobre o que a Sprint 30 entrega.
> 2. Dimensionar e agendar a implementação delas - candidata é a Sprint 33, que ainda não existe e não é
>    escopo desta atualização.
>
> **Isso não foi decidido pelo user em 25/08** - fica registrado aqui como o maior risco de todo o
> planejamento contra o prazo, não resolvido silenciosamente.

## Em aberto: ATSPM e ACOM entram no prazo de 18/09?

Mesma pergunta registrada na [[Attlas - Sprint 30]] e na [[Attlas - Sprint 31]], sem resposta ainda.
ACOM (18 pts) e ATSPM (10 pts) seguem em [[00 - Sem prazo (backlog)]], fora das três sprints do analítico.
Se "Analítico de vídeo" no prazo de 18/09 significa só a cadeia de Virtual Loop (embarcado + servidor +
camada de gestão), as três sprints cobrem o prazo, faltando só o furo de frontend acima. Se significa o
domínio inteiro (incluindo ATSPM e ACOM), faltam 28 pontos sem sprint nenhuma antes de 18/09.

## Riscos

1. **Furo de frontend, ver seção própria acima.** É o risco mais concreto: zero ponto orçado em zero
   sprint para telas que o prazo pede.
2. **Escopo ATSPM/ACOM não confirmado**, ver seção acima.
3. **Cards 1 e 2 desta sprint herdam qualquer atraso da Sprint 31.** Se a escada de 5 cards de código da
   Sprint 31 (cards 4 a 8) escorregar, os dois cards daqui escorregam junto - não há margem para absorver
   os dois atrasos antes de 18/09.

## Ver também

[[Attlas - Sprint 30]] · [[Attlas - Sprint 31]] · [[00 - Sem prazo (backlog)]] · [[Analítico]] ·
[[Analítico - Embarcado x Servidor]]
