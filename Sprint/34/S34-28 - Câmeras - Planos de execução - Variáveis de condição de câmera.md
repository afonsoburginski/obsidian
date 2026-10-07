---
id: S34-28
tags:
  - attlas
  - task
  - sprint-34
  - planos-de-execucao
  - ms-cameras
  - backend
titulo: "[Back] Planos - variáveis de condição de câmera no Plano de Execução"
frente: Planos de Execução
tamanho: 5 pts
pr: "#4298"
issues: "#4269, que segue aberta: a PR entrega parte dos critérios dela"
status: "PR #4298 mergeada em 23/09 às 15h30. A issue #4269 não fechou, e não devia: 7 das 13 perguntas têm resposta, e o editor ainda não marca as outras 6 como indisponíveis."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Planos - variáveis de condição de câmera"
---

# S34-28 - Câmeras - Planos de execução - Variáveis de condição de câmera

A spec é a `CROSS-140`. Responde à issue [#4269](https://github.com/atmanadmin/attlas-2026/issues/4269),
aberta em 22/09 pelo time de Planos de Execução, que dependia de o módulo de câmeras expor o estado
da câmera para o motor.

## O que estava errado

O editor de Plano de Execução oferece ao autor, depois de uma tarefa "Apontar e PTZ" ou "Tour de
câmera", 13 perguntas sobre a câmera, como "a câmera está online?" ou "o tour escolhido existe na
câmera?". Nenhuma tinha leitor no motor, então todo plano que usasse uma delas parava naquela
condicional como leitura não legível, sem que o editor tivesse avisado nada durante a autoria.

## O que muda

O `ms-cameras` ganha uma rota interna, protegida pelo token entre serviços e fora do Kong, que
recebe até 200 câmeras e devolve numa consulta só se cada uma está online, quais tours existem, quais
estão ativos e quais presets existem. Câmera de outro cliente ou removida não aparece, e câmera cuja
telemetria parou de chegar lê offline, pela mesma regra que a tela de saúde já usava, agora num ponto
só.

O `ms-execution-plans` ganha o leitor de condição de câmera, ao lado dos que já existiam, e responde 7
das 13 perguntas: câmera online nas duas tarefas, câmera em automação, preset existe, tour existe, tour
já rodando e estado do tour depois da tarefa. Quando a tarefa mira várias câmeras, a resposta é o
valor em que todas concordam, e não há resposta quando discordam. O cliente HTTP nunca lança: serviço
fora do ar, tempo esgotado de 2 s ou resposta fora do formato viram leitura não legível, caminho que o
motor já trata, e o evento Kafka não é desfeito.

As outras 6 ficam sem resposta de propósito, porque o `ms-cameras` não tem de onde tirar o dado: posse
de PTZ com prioridade (nas duas tarefas), gravação, "já está no preset", "assumiu a posição comandada"
e "a automação foi parada". O valor "Online sem sinal de vídeo" também nunca é respondido, porque o
monitor de saúde enxerga o canal de controle e não o vídeo.

## O que falta para a #4269 fechar

- O editor não marca como indisponíveis as 6 perguntas sem fonte nem o valor "Online sem sinal de
  vídeo": o catálogo de variáveis não tem campo de disponibilidade. O critério de aceite pede isso
  como alternativa a distinguir todos os valores.
- O histórico da execução registra variável, valor pedido, valor lido e ramo escolhido, mas não a
  origem da leitura como campo próprio.
- A rota respondeu por lote e por `POST`, e não pelo `GET` por id sugerido na issue. A issue deixava o
  desenho final com o módulo dono, então isso não bloqueia.

## O que tem de valer no fim

Plano com condicional numa das 7 perguntas escolhe o ramo pelo estado real da câmera no instante da
avaliação, e nas outras 6 termina como leitura não legível, sem ramo, sem valor mais próximo e sem
default.

## Relacionado

- [[Attlas - Sprint 34]].
