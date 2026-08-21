---
tags:
  - attlas
  - sprint-28
  - task
  - frontend
  - design-system
card: SOFTWARE-2471
clickup: https://app.clickup.com/t/86ajyp9j8
titulo: "[Front] Primitivo compartilhado de menu radial"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: Fechado em 17/08 no ClickUp (estava backlog, entregue na PR #1529 de 13/08: z-radial-menu funcional de ponta a ponta em ui-shared).
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-17
---

# SOFTWARE-2471 - Primitivo compartilhado de menu radial

Botão flutuante que abre as ações em arco ao redor de si, como primitivo de `libs/ui-shared`, ao lado do
menu linear que já existe.

Nasce compartilhado e não dentro do módulo do VMS porque a mesma affordance é pedida pelo mapa do Painel
de Operações e pelo mapa do modelo de tráfego, e porque a regra do frontend manda estender a primitiva em
vez de duplicar markup e estado num feature module.

## O que é reuso e o que é novo

Reusa `CdkMenuTrigger`, `CdkMenu` e o gerenciador de menus do Zard, espelhando o gatilho do `z-menu`,
inclusive a abertura por clique ou por ponteiro com carência. Do CDK vêm de graça o `Escape`, os papéis de
acessibilidade, o roving tabindex e a gestão de foco.

O novo é a geometria, e é o que concentra o teste: o arco é deduzido do quadrante que o gatilho ocupa na
viewport, porque um anel completo de 360 graus jogaria metade dos itens fora da tela.

## Três decisões de desenho

1. **Degradação declarada em vez de truncar.** Acima de oito itens, ou quando a colisão com a viewport não
   se resolve rotacionando o arco nem reduzindo o raio, o menu abre como menu linear com todos os itens.
   Anel duplo foi recusado porque com dois anéis ninguém sabe se a distância do centro significa
   prioridade, categoria ou nada.
2. **Hover desligado em ponteiro de toque.** Em toque não existe hover, e manter o gesto ligado engoliria
   o toque destinado ao item.
3. **Item indisponível permanece no arco**, atenuado, focável e com o motivo. Controle que desaparece
   ensina que a ação não existe; controle atenuado ensina o que falta para ela existir. Sair da ordem de
   foco esconderia isso justamente de quem usa leitor de tela.

Detalhe que vale registrar: entre o botão e o anel existe espaço vazio, e sem uma região de captura em
cunha cobrindo esse setor, mover o cursor do botão até um item fecharia o menu no caminho.

## DoD

Família de diretivas exportada pelo módulo compartilhado, geometria em funções puras testadas sem DOM,
tokens novos em `ui-styles` sem nenhum literal no componente, e acessibilidade verde nos dois temas com um
item desabilitado presente.

## Dependência

Nenhuma. É folha, e pode entrar antes de qualquer card do backend do videowall.

Bloqueia [[SOFTWARE-2477 - Lançador radial do alvo de exibição|2477]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
