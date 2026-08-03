---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
  - cameras
card: SOFTWARE-2391
clickup: https://app.clickup.com/t/86aju63bv
titulo: "[Back] Fechar as pendências do analítico ao vivo embarcado"
frente: Analítico em container
tamanho: 2 pts
status: fila da Sprint 27 (in progress no ClickUp). Validado contra a develop em 03/08, quantificado. PR aberta em draft: [#1355](https://github.com/atmanadmin/attlas-2026/pull/1355).
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-08-03
---

# SOFTWARE-2391 - Pendências do analítico embarcado

Fechar o resíduo do analítico embarcado, entregue e validado ao vivo em 15/07. O card não tem
construção pendente, tem higiene, e o analítico embarcado é a base de reuso do em container.

## Itens

Derivação de tipo invertida no consumer: região ocupada sem incidente é reportada como laço
virtual mesmo em câmera que só tem detecção de objeto. Ou vem da capacidade configurada da câmera,
ou o contrato declara que o campo é informativo. Hoje é ambíguo e o front descarta o campo.

Documentos desatualizados: o comentário de um serviço do frontend ainda diz que o backend não
emite os eventos, uma spec de fluxo declara o overlay ao vivo fora de escopo com critério
desmarcado, e os módulos e atômicas do domínio embarcado seguem em revisão com dezenas de critérios
de aceite abertos sobre código já implementado.

Limitação a registrar: o equipamento de campo sobe com o produtor desligado, e religar é ação de
operador. O reconciliador que mantinha isso automático foi revertido por manter o equipamento
reiniciando em loop entre instâncias diferentes.

## Verificação sem depender do device de campo

Capturar um payload real do tópico de detecção e replicá-lo contra o Kafka local. Exercita todo o
caminho menos o firmware. Não reintroduzir o laço periódico que escreve no device.

## Validação 03/08

Card conferido contra a develop e quantificado. São 27 critérios de aceite abertos, espalhados pelo
módulo de resiliência do pipeline de analítico e por seis atômicas relacionadas. A maioria é débito
documental, não de implementação: o código das quatro fases foi entregue em 16/07 e os critérios
simplesmente nunca foram marcados.

A derivação de tipo invertida foi localizada no consumer do stream do device: o tipo do evento vem
só de existir incidente, sem olhar a capacidade configurada da câmera. Hoje é cosmético, porque o
front ignora esse campo e acende a região da mesma forma nos dois casos, mas qualquer consumidor
novo herda o erro se ele não for corrigido antes.

A terminologia usada nas specs para o identificador de binding do device está morta: o código
abandonou esse caminho de amarração em favor do identificador de origem gravado no cadastro da
câmera, e as specs precisam ser atualizadas para refletir isso.

## Fora

O item de front puro, o serviço abrindo dois sockets por câmera para o mesmo canal e sala, é
follow-up do dono do módulo Angular.

## Referências

- [[SOFTWARE-2388 - Analítico embarcado no mesmo contrato de ocupação|2388]], que depende deste domínio ficar coerente.
- [[Attlas - Sprint 27]].
