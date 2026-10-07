---
id: S34-18
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
  - backend
titulo: "[Full] Videowall - mensagens de erro do painel dizem campo e motivo"
frente: Câmeras
tamanho: 5 pts
pr: "#4169"
issues: "#2990, #3000, #3075"
status: "Feita. PR #4169 mergeada na develop em 23/09, fechando as issues 2990, 3000 e 3075."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Videowall - mensagens de erro com campo e motivo"
---

# S34-18 - Câmeras - Videowall - Mensagens de erro com campo e motivo

Três pontos da tela do painel físico em que uma escrita era recusada sem dizer qual campo nem por quê.
É a mesma classe de defeito que a [[S34-13 - Câmeras - Videowall - Endereço de rede e porta validados|#4152]] resolveu na
etapa de endereço, agora no nome do painel, no nome do grupo e na aplicação de grupo salvo. Fecha as
issues 2990, 3075 e 3000.

## O que estava errado

O "Nome" da aba "Configuração" aceitava só espaços e qualquer tamanho, e a recusa do serviço chegava
como toast genérico. Pior, **todo** PATCH do painel era recusado com `property id should not exist`,
e o `id` não vinha do frontend: o próprio comando do serviço declarava `id!: string`, e com a opção de
compilação que define campos de classe ligada essa forma cria a propriedade em toda instância, que a
validação global recusa por não estar na lista branca. O conflito de endereço e porta também caía no
toast errado, porque a tela lia uma chave do envelope de erro que o filtro global nunca emite.

No diálogo "Grupos de videowall", o "Nome do grupo" não tinha teto no cliente e a recusa de tamanho
virava "Não foi possível salvar o grupo". Na aba "Grupos salvos", aplicar ou remover grupo mostrava
sempre o mesmo texto fixo, mesmo quando a API devolvia o motivo já traduzido.

## O que muda

Os dois nomes ganham, no cliente, o mínimo de um caractere depois de aparar espaços e o máximo de 120,
com mensagem no próprio campo e o `maxlength` parando o teclado antes do envio. A recusa do serviço
para o campo de nome passa a ser lida pelo nome da regra que o envelope traz, e não pela frase em
inglês do class-validator, que nunca chega à tela. No serviço, o comando passa a `declare id`, a mesma
forma que os campos de rota já usam em outros comandos; um corpo que de fato envie `id` continua
recusado. Aplicar e remover grupo mostram o motivo da API, e o texto fixo fica só para falha sem
envelope, como erro de rede.

## O que tem de valer no fim

Salvar a configuração do painel sem mexer em nada responde 200, e toda recusa de nome, na
configuração ou no grupo, nomeia o campo e o motivo nos quatro idiomas.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
- [[Videowall externo (NovaStar H9)]], a nota de domínio da tela.
