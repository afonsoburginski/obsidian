---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - eventos
  - frontend
  - backend
titulo: "[Full] Eventos - reportar ocorrência valida os obrigatórios e limita o tamanho de Nome e Descrição"
frente: Câmeras
tamanho: 3 pts
pr: "#4174"
issues: "#3122"
status: "Feita. PR #4174 mergeada na develop em 22/09, fechando a issue 3122."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Eventos - validação do reportar ocorrência

O modal "Reportar ocorrência", no detalhe de um evento de câmera, não explicava nada: campo
obrigatório vazio não recebia mensagem, e texto acima do limite era recusado pelo serviço com o toast
"Tente novamente em instantes", que sugere falha temporária quando nenhuma nova tentativa passaria.
Fecha a issue 3122.

## O que estava errado

Os limites de 200 caracteres no nome e 2000 na descrição viviam numa constante do `ms-cameras`, fora
do alcance do frontend: a tela não tinha como respeitar um número que só o serviço conhecia. O botão
usava o `disabled` nativo, então o clique nunca chegava ao código que poderia explicar o bloqueio.

## O que muda

Os limites viram contrato em `@attlas/contracts`, lidos pelo DTO do serviço e pelo modal, com os
mesmos valores de antes; as constantes do serviço saíram para não duplicar a fonte. O modal ganha
`maxlength` nos dois campos, contador sempre visível e mensagem por campo, que só aparece depois de
sair do campo ou de tentar enviar, para não abrir o formulário em vermelho. O botão passa ao
desabilitado acessível do componente, que deixa o clique chegar. Recusa de validação do serviço marca
os campos nomeados e troca o toast por "Revise os campos indicados"; o texto de falha temporária fica
só para falha sem envelope, que é quando ele é verdadeiro.

## O que tem de valer no fim

Não é possível enviar a ocorrência com campo vazio ou acima do limite sem saber por quê, e a tela e o
serviço recusam exatamente o mesmo texto.

## O que continua em aberto

A guarda contra report duplicado segue ausente: dois envios no mesmo evento abrem dois incidentes
ligados a ele. A PR mexeu só na validação dos campos, e a lacuna está registrada em
[[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias|Eventos, incidentes e alarmes - Arquitetura e estratégias]].

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
