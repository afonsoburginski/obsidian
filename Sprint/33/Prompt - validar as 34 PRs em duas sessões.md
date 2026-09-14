---
tags:
  - attlas
  - sprint-33
  - prompt
aliases:
  - "Prompt de validação da Sprint 33"
  - "Prompts A e B da validação"
  - "Prompt - validar as 34 PRs em outra sessão"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "Escrito em 14/09 para ser colado em DUAS sessões novas do Claude Code, porque a sessão que abriu as PRs ficou longa demais. Dividido por RECURSO e não por quantidade: as duas rodam na mesma máquina, e só uma pode tocar Docker e navegador."
atualizado: 2026-09-14
---

# Prompt - validar as 34 PRs em duas sessões

Duas sessões, em paralelo. A divisão **não é por quantidade, é por recurso**: os dois chats rodam na
mesma máquina, que travou em 14/09 com 5 processos de teste órfãos segurando 9 GB. Por isso:

| Chat | Ferramenta | Fatia | Recursos que ele PODE usar | PRs |
| --- | --- | --- | --- | --- |
| **A** | Claude CLI | Runtime | Docker (`infra:up`), o front no `:4200`, Playwright, EC2 | 18 |
| **B** | Codex CLI | Estático | Leitura de código, spec, uma suíte jest estreita por vez, SSH de leitura | 16 |

Por que o B no Codex, e não outra sessão do Claude, conferido no `~/.codex/config.toml` em 14/09:

1. `attlas-2026` está `trust_level = "trusted"` - o Codex roda comando sem aprovação a cada passo.
2. O Playwright do Codex tem **perfil próprio e `--headless`**: não disputa o Chrome do Claude, mas
   também **não está logado** no `dev.v2`. Tela continua sendo só do A, agora por um motivo concreto.
3. O repo **não tem `AGENTS.md`**, então o Codex não carrega regra nenhuma sozinho - o prompt dele
   manda ler o `CLAUDE.md`.
4. O Codex **não tem o MCP do obsidian**: lê o vault por caminho, que dá no mesmo (é markdown em disco).

> [!danger] A regra que impede a máquina de travar de novo
> **Só o chat A toca Docker e navegador.** O chat B nunca sobe container, nunca abre Playwright.
> Assim os dois nunca disputam o mesmo recurso, e o pico de carga tem um dono só.

Ganho de lado: o B é leve e termina rápido, então os achados dele chegam antes de o A gastar tempo
subindo ambiente para uma PR que já se sabe quebrada.

## Prompt do Chat A - runtime (Claude CLI)

```
Você vai VALIDAR 18 PRs da Sprint 33 do Attlas. Não escrever feature nova, não mergear.

Você é o CHAT A. Existe um chat B rodando em paralelo, na mesma máquina, com a fatia estática
(leitura de código e suíte). VOCÊ é o dono exclusivo do Docker, do front no :4200, do Playwright e do
EC2. O B não toca em nada disso. Não invada a fatia dele: se uma PR sua só se prova lendo código,
diga isso e siga.

## O que eu quero saber, por PR

Para cada PR, responda EXATAMENTE neste formato, nada além:

PR #NNNN — <título em 5 palavras>
1. Entrega o valor do card? SIM / NÃO / PARCIAL
2. Como provei: <uma linha>
3. Quebrado: <uma linha, ou "nada">
4. Preciso de você: <uma linha, ou "nada">

Nada de parágrafo, nada de tabela, nada de narrar a investigação. Eu tenho Asperger e leio mal texto
corrido: informação curta e numerada é o que funciona comigo.

## Regras duras

1. NUNCA mergear. O merge é meu.
2. PROIBIDO `nx test`, `nx lint`, `nx build` e `tsc`. Meu PC é fraco e já travou hoje. O CI é o gate.
3. NUNCA subir `nx serve web-attlas`. O front JÁ está em modo dev no :4200. Eu subo, você não.
4. Tela se prova com Playwright no :4200. `curl` dá 200 com build quebrado, não vale como prova.
5. O EC2 (`aws-attlas-26`, Tailscale `ubuntu@100.101.165.32`) é SOMENTE LEITURA.
6. UM ambiente por vez. Não deixe container de pé depois que terminar o grupo.
7. Se sobrar processo de teste órfão, mate. Foi o que travou minha máquina hoje.
8. Achado de verdade vira comentário na PR (`gh pr comment`), não nota solta.

## Fonte de verdade

Vault Obsidian em `~/Área de trabalho/obsidian` (MCP `obsidian`, vault `attlas`). Leia ANTES:
- `Sprint/33/index.md` — as 22 tasks e o que cada uma entregava
- `Sprint/33/Validação - as 34 PRs, uma a uma.md` — o checklist

O corpo de cada PR (`gh pr view <n> --json body`) diz o que ela entrega e qual critério fecha. Leia
ANTES de testar: é contra o que ele promete que você mede.

## Como validar

1. `git worktree add .claude/worktrees/val-<n> <branch>`, trabalhe só ali, remova ao terminar.
2. Leia o corpo da PR e a spec citada.
3. Prove na execução: tela no Playwright, rota com request real, comportamento observado.
4. Fase de stack já traz as fases de baixo. É cumulativo, e é assim que se testa.

## Grupo A1 — backend local (`npm run infra:up`), 7

1. #3447 — banco do detector-history no infra:up, Métricas para de dar 502. VALIDE ESTA PRIMEIRO:
   ela é o que faz as outras conseguirem ler.
2. #3441 — cor e nome da região sobrevivem ao reload
3. #3443 — câmera embarcada endereça um detector, e a tela diz quando não há
4. #3449 — contadores OPEN e DETECTED na fila de incidentes
5. #3432 — a inferência cabe num orçamento de CPU
6. #3433 — entrada do modelo medível, primeira caixa da câmera de volta
7. #3480 — sessão por câmera e perfil, encerramento só no último

## Grupo A2 — só tela, no :4200 que já está no ar, 6

8. #3459 — Métricas: face que sai fica montada, lateral abre na lista
9. #3451 — miniatura fora do ar para de ser pedida a cada montagem
10. #3452 — uma lista só de classes de objeto nos quatro idiomas
11. #3438 — a caixa desenha no captureTime do quadro
12. #3462 — overlay compartilhado aceita a geometria e a pintura da ACOM
13. #3478 — ACOM desenha pelo compartilhado, cópia sai do repo

## Grupo A3 — câmera real e EC2, 5

14. #3437 — o YOLO puxa RTSP direto da câmera, em perfil só dele
15. #3465 — o relay vira exceção, o decoder para de esperar
16. #3482 — a PTZ ganha os dois analíticos, uma decodificação por quadro
17. #3439 — o reaper para de derrubar o tile que está entrando
18. #3469 — prova do decoder no cliente, queda automática para H264

## Ao terminar cada grupo

Pare e me mande, em UMA lista numerada:
1. Validadas: #NNNN, #NNNN, ...
2. Parciais: #NNNN — <o que falta, uma linha cada>
3. Reprovadas: #NNNN — <o que quebrou, uma linha cada>
4. Preciso de você: <o que só eu posso fazer, uma linha cada>

Depois espere eu responder antes do grupo seguinte.

## Três coisas que já sei

1. O EC2 está com os quatro blocos de configuração da Detecção desabilitados. O SQL que resolve está
   em `ec2-analytics-enable-all.sql`, na raiz do repo, e NÃO foi aplicado. Não tente aplicar.
2. A fila de CI tem 4 runners para a empresa toda. Check vermelho pode ser fila, ou o testcontainer
   do mediamtx morrendo no Ryuk. Confira antes de reprovar.
3. Várias suítes do `web-attlas` já estavam vermelhas na develop antes desta sprint.

Comece pelo #3447.
```

## Prompt do Chat B - estático (Codex CLI)

```
Você vai VALIDAR 16 PRs da Sprint 33 do Attlas. Não escrever feature nova, não mergear.

Você é o CHAT B. Existe um chat A rodando em paralelo, na mesma máquina, com a fatia de runtime.
O A é o dono exclusivo do Docker, do front no :4200, do Playwright e do EC2 com escrita.
VOCÊ NÃO SOBE CONTAINER E NÃO ABRE NAVEGADOR — nunca, nem "só para conferir". Minha máquina travou
hoje com processos de teste demais; a sua fatia existe para ser leve.

## O que eu quero saber, por PR

Para cada PR, responda EXATAMENTE neste formato, nada além:

PR #NNNN — <título em 5 palavras>
1. Entrega o valor do card? SIM / NÃO / PARCIAL
2. Como provei: <uma linha>
3. Quebrado: <uma linha, ou "nada">
4. Preciso de você: <uma linha, ou "nada">

Nada de parágrafo, nada de tabela, nada de narrar a investigação. Eu tenho Asperger e leio mal texto
corrido: informação curta e numerada é o que funciona comigo.

## Regras duras

1. NUNCA mergear. O merge é meu.
2. PROIBIDO `nx test`, `nx lint`, `nx build` e `tsc`.
3. Você PODE rodar o jest direto, com padrão estreito, UM POR VEZ, nunca dois juntos:
   node --experimental-require-module --disable-warning=ExperimentalWarning \
     node_modules/jest/bin/jest.js --config apps/<proj>/jest.config.cts --rootDir apps/<proj> \
     --runInBand --testPathPatterns "<regex estreito>"
   Confira que o processo morreu antes de rodar o próximo.
4. Nada de Docker, nada de Playwright, nada de `nx serve`. Você TEM um Playwright configurado, e
   ele não serve aqui: perfil separado e headless, ou seja, não está logado no ambiente - e um
   segundo Chrome custa RAM que a máquina não tem.
5. SSH no EC2 só de LEITURA, e só se a PR pedir.
6. Achado de verdade vira comentário na PR (`gh pr comment`), não nota solta.

## Leia isto antes de qualquer coisa

Este repo NÃO tem `AGENTS.md`, então nada é carregado automaticamente. Leia, nesta ordem:

1. `CLAUDE.md` na raiz do repo — as regras do projeto (SDD, padrões de back, guia de comentário).
2. `apps/web-attlas/CLAUDE.md` — só se a PR tocar o frontend.
3. `~/Área de trabalho/obsidian/Sprint/33/index.md` — as 22 tasks e o que cada uma entregava.
4. `~/Área de trabalho/obsidian/Sprint/33/Validação - as 34 PRs, uma a uma.md` — o checklist.

O vault é markdown em disco: leia com `cat` e `rg`, não precisa de MCP.

O corpo de cada PR (`gh pr view <n> --json body`) diz o que ela entrega e qual critério fecha. Leia
ANTES: é contra o que ele promete que você mede.

## O que conta como prova na sua fatia

- **Suíte**: rode a suíte daquele arquivo e diga o número. Se ela é o entregável, confira se ela
  REPROVA quando deveria — quebre a regra de propósito, veja falhar, reverta.
- **Spec e decisão**: confira se o que está escrito bate com o código. Spec que descreve outra coisa
  é reprovação, não detalhe.
- **Contrato e config**: leia o diff e diga se o valor prometido chega onde precisa chegar.
- Se uma PR só se prova rodando, escreva "só se prova rodando - é do chat A" e siga. Não tente.

## Grupo B1 — doc e decisão, 4

1. #3431 — a VM é t3a.2xlarge burstable, não 16 núcleos
2. #3440 — modelo de fan-out, escala e a decisão sobre CDN
3. #3444 — nome da peça e o contrato do relógio na UF-053
4. #3471 — broker certo por ambiente, e o aviso quando a câmera não publica nele

## Grupo B2 — suíte é o entregável, 5

5. #3461 — paridade dos slices de tradução nas quatro locales
6. #3476 — erro da caixa em frenagem e conversão contra o teto de 400 ms
7. #3464 — UF-057, os seis utilitários puros
8. #3474 — UF-058, serviços e estratégias de cabeça
9. #3492 — UF-059, as cinco peças de superfície

## Grupo B3 — regra de backend, 7

10. #3402 — a suíte dos projetos da #3328 verde, com três defeitos de produção
11. #3453 — 503 quando o resolver de permissões não responde
12. #3460 — ler uma unidade de analítico sem compor a frota
13. #3472 — useAbsoluteTimestamp só nos paths do analítico, nunca nos do VMS
14. #3489 — o analítico carimba o quadro com o relógio da câmera
15. #3487 — keyframe por tempo, buffer por transporte, tile dizendo que caiu para HLS
16. #3490 — o consumidor salta o atraso em vez de caminhar por ele

## Ao terminar cada grupo

Pare e me mande, em UMA lista numerada:
1. Validadas: #NNNN, #NNNN, ...
2. Parciais: #NNNN — <o que falta, uma linha cada>
3. Reprovadas: #NNNN — <o que quebrou, uma linha cada>
4. Só se prova rodando: #NNNN — <o que o chat A precisa fazer, uma linha cada>

Depois espere eu responder antes do grupo seguinte.

## Duas coisas que já sei

1. A fila de CI tem 4 runners para a empresa toda. Check vermelho pode ser fila, ou o testcontainer
   do mediamtx morrendo no Ryuk. Confira antes de reprovar.
2. Várias suítes do `web-attlas` já estavam vermelhas na develop antes desta sprint. Antes de culpar
   uma PR, rode a mesma suíte com os arquivos dela revertidos e compare.

Comece pelo #3431.
```

## Ver também

[[Validação - as 34 PRs, uma a uma]] · [[Attlas - Sprint 33]]
