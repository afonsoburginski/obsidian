---
tags:
  - attlas
  - sprint-28
  - task
  - vms
card: SOFTWARE-2438
clickup: https://app.clickup.com/t/86ajycdzy
titulo: "[Back] Renome para VMS: fase 1, API e contratos"
frente: Renome para VMS
tamanho: 3 pts
status: Fechado. PR [#1439](https://github.com/atmanadmin/attlas-2026/pull/1439) mergeada em 11/08. ESCOPO CORTADO no dia 10/08 de 98 para 7 arquivos, ver seção "Corte de escopo": só o caminho público muda no backend; pasta, classes e contratos ficam.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-22
---

# SOFTWARE-2438 - Renome para VMS - fase 1 API e contratos

O backend publica o caminho novo do VMS sem que o front nem o Kong precisem parar de falar videowall.

## Escopo (1 PR, 7 arquivos)

`VideoWallController` passa a `@Controller(['vms', 'video-wall'])` e o picker do `CamerasController` a
`@Get(['vms', 'video-wall'])`, mantido antes da rota paramétrica de identificador para que nenhum dos
dois caminhos caia no `ParseUUIDPipe`. Kong com `paths: ['/api/vms', '/api/video-wall']` e nome de rota
`ms-cameras-vms-route`. Os três testes de integração e o e2e apontam para a rota nova e cada um ganha
uma asserção provando que o prefixo legado responde o mesmo payload, porque a janela dual é contrato da
spec. O prefixo antigo sai numa sprint, em card de limpeza de três linhas.

## Corte de escopo (10/08)

A primeira versão movia a pasta para `src/vms/`, renomeava todas as classes e migrava os contratos para
`lib/vms/` com 22 aliases obsoletos: **98 arquivos, 91 sem nada observável**. Cortado por dois motivos:

1. Os models Prisma continuam `VideoWall*`, porque nome de tabela é valor persistido. Renomear as
   classes em volta produzia um `VmsScenesRepository` operando em `prisma.videoWallScene`, ou seja dois
   vocabulários no mesmo arquivo, pior que manter o antigo.
2. Nome de símbolo não é observável. Migrar os contratos exigia a camada de aliases mais um card só
   para removê-la, criando dívida para pagar um renome cosmético.

O caminho público muda porque é a superfície compartilhada com o front e porque o videowall externo H9
vai expor os próprios endpoints nesta mesma sprint; dois caminhos quase idênticos no gateway seria a
confusão que o renome existe para evitar. Se a implementação for renomeada um dia, vai junto da
migration que renomeia as tabelas ([[SOFTWARE-2432 - Cadastro do processador H9|2432]]), num card só.

**Regra dura**: nenhuma alteração em `apps/ms-pmv/**` (lá VMS é Variable Message Sign, cerca de 90
ocorrências em testes) nem em `apps/ms-connector-*/**`. CI verde do `ms-pmv` é a prova.

**Rastro do corte**: a varredura que restaurou o escopo deixou um import de teste apontando para
`src/vms/vms.constants`, pasta revertida, e a suíte de integração parou de resolver o módulo. Corrigido
no commit `f3ad030d`. O detalhe importante é que Lint passou verde e Build ficou `skipping`, então só o
check de integração acusou, e o log dele vem truncado pelo ruído do pino. O relato está na seção
correspondente de [[Attlas - Sprint 28]].

## DoD

Rotas nova e antiga respondendo o mesmo payload, com asserção de teste em cada suíte, e nenhum símbolo
de contrato renomeado, verificável por diff: o `web-attlas` não altera um único import.

## Dependência

[[SOFTWARE-2431 - Renome para VMS - fase 0 terminologia|2431]].

## Referências

- [[VMS]], tabela "Renome para VMS: o que muda" e estratégia das 3 fases.
- [[Attlas - Sprint 28]].
