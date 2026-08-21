---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2437
clickup: https://app.clickup.com/t/86ajycf8u
titulo: "[Front] Videowall externo: contratos, serviço e casca da configuração"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: Fechado em 17/08 no ClickUp (estava backlog, entregue desde a PR #1592 de 14/08: contratos, serviço REST do processador, dialog compartilhado, i18n nos quatro idiomas).
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-17
---

# SOFTWARE-2437 - Contratos, serviço e casca da configuração do videowall

> [!warning] Superfície revisada em 13/08: a rota de configuração morreu
> A rota `/cameras/vms/videowall` com abas virou um **dialog compartilhado** aberto pelo lançador radial
> sobre o mosaico, com quatro views: espelhar, processador, brilho e estado. Este card entrega o dialog, o estado compartilhado que as views leem, e a **remoção** da rota, da page e da exceção do guard entregues na PR #1529. As três abas da revisão anterior deixam de existir como abas e viram views abertas pelo arco. Spec: `UF-024`.

Primeira fatia do videowall externo no frontend, e a que fixa a arquitetura das outras sete.

> [!warning] Escopo revisado duas vezes em 10/08
> Primeiro: o card nascia como módulo de frontend novo e separado, e com o videowall passando a ser
> **alvo de exibição do VMS** a tela entrou **dentro da pasta `modules/videowall/`**, que é o feature
> module do mosaico.
> Depois: ao escrever as specs ficou claro que "a tela do processador" é grande demais para um card. Ela
> foi fatiada em 8, e este card passou a ser só a fundação, com o nome trocado no ClickUp. Os pontos não
> mudam.

> [!warning] Seis abas viraram três em 13/08
> Com o replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]], a parede
> passou a espelhar a tela da aplicação em vez de receber a cena. A aba de fontes (era câmeras e página web)
> e as de janelas e presets deixaram de existir, porque compor a parede voltou a ser operação da interface
> do equipamento. Sobram **processador, brilho e estado**. Os cards das abas retiradas são o
> [[SOFTWARE-2474 - Câmeras e página web como fontes no frontend|2474]], reescopado para a captura da tela,
> e o [[SOFTWARE-2475 - Prévia da geometria projetada|2475]], fechado. Os pontos deste card não mudam: a
> fundação é a mesma, com menos abas para montar.

## Escopo (1 PR)

Contratos de comunicação com o equipamento em `@attlas/contracts`, o serviço que fala com a superfície
REST do processador, o dialog compartilhado aberto pelo lançador radial, o estado compartilhado que as
views leem, e o mapa que traduz os códigos de erro do painel no que a tela mostra. Entrega também a
remoção da rota, da page e da exceção do guard que a PR #1529 deixou, reaproveitando o formulário de
cadastro como view sem fork.

Não entrega conteúdo de view. Entrega a estrutura e os dois estados que valem para todas: sem processador
cadastrado, e processador cadastrado mas inalcançável.

## Três coisas que este card fixa e que valem lembrar

1. **Nomenclatura.** No backend `Videowall` de uma palavra é o painel físico e `VideoWall` de duas é o
   mosaico. No frontend isso não serve, porque `Videowall` de uma palavra já é o mosaico
   (`VideowallService`, `VideowallToolbarComponent`). Regra do submódulo: todo símbolo do painel físico
   carrega `Processor` no nome, e a distância entre os dois vocabulários passa a ser uma palavra inteira
   em vez de uma letra maiúscula.
2. **Sem navegação interna no dialog.** A view é definida por quem o abre, e quem o abre é o item do
   arco do lançador. A armadilha da ordem de rota morreu com a rota, e o teste vira o espelho: provar
   que a rota `videowall` não existe mais e que identificador continua abrindo cena.
3. **404 na leitura do processador não é erro.** É a resposta correta para quem não cadastrou
   equipamento, e tratá-la como falha colocaria alerta vermelho na frente de um operador que não tem
   nada a corrigir.

## DoD

Dialog abrindo nas quatro views pelo arco, rota e page removidas com os testes espelho verdes, estado
vazio honesto sem processador, mapa de erros cobrindo os casos do painel, chaves de i18n nos quatro
locales, zero retry e zero varredura periódica no serviço.

## Dependência

[[SOFTWARE-2432 - Cadastro do processador H9|2432]],
[[SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API|2433]] e
[[SOFTWARE-2439 - Renome para VMS - fase 2 rota e i18n|2439]], esta última porque as chaves nascem no
namespace `vms`, que só existe depois dela.

Bloqueia os demais cards da frente de frontend (2471 a 2477, menos o 2475, que foi fechado).

## Referências

- [[Videowall externo (NovaStar H9)]].
- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
