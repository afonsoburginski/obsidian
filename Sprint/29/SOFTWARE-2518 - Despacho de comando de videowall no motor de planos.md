---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2518
clickup: https://app.clickup.com/t/86ak0tenx
titulo: "[Back] Planos de execução: despacho de comando de videowall"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: code review, reescrita em 19/08. A [PR #1617](https://github.com/atmanadmin/attlas-2026/pull/1617) do igor64BR mergeou em 18/08 às 17:35 e removeu os seis arquivos em que a task se apoiava, 35 minutos antes de a [#1735](https://github.com/atmanadmin/attlas-2026/pull/1735) ser aberta. A implementação foi refeita sobre a tripla de roteamento, com o videowall entrando como dispositivo novo e serviço dono único no registry de ações, no molde do PMV. As três armadilhas que a nota listava deixaram de existir na forma nova, e a descrição do card no ClickUp foi corrigida.
pr: "[#1760](https://github.com/atmanadmin/attlas-2026/pull/1760)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
---

# SOFTWARE-2518 - Despacho de comando de videowall no motor de planos

É o card que atende, no motor de planos, o primeiro parágrafo da cláusula 16.13 do contrato: ação automatizada direto no videowall.

## Escopo (1 PR)

O motor passa a despachar comando para o painel de videowall na mesma forma que já despacha para câmera,
painel de mensagem e controlador: registro no log de comandos antes de publicar, correlação por
identificador de comando, e eco de execução ou recusa de volta.

## As três armadilhas conhecidas

1. **Os dois mapeadores de enum andam juntos.** Declarar o tipo de elemento novo em um e esquecer o outro
   troca a falha de uma tarefa por um plano que não consegue nem começar.
2. **O mapa de templates é total.** Acrescentar o tipo de nó quebra o build até o par de tipo de elemento e
   grupo de ação ser declarado, o que é bom: falha em tempo de compilação, não em runtime.
3. **Sem a linha no seed de templates, a UI não alcança.** O autor de plano não tem bloco para arrastar, e o
   backend inteiro fica inacessível pela tela.

## Relacionados

[[Attlas - Sprint 28]] · [[Cláusula 16.13 do contrato de Quito]]
