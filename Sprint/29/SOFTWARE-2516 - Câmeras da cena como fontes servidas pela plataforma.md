---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2516
clickup: https://app.clickup.com/t/86ak0ten8
titulo: "[Back] Videowall externo: câmeras da cena como fontes servidas pela plataforma"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: criado em 14/08 na lista da Sprint 28, em backlog, depois da citação da cláusula 16.13 do contrato de Quito.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2516 - Câmeras da cena como fontes servidas pela plataforma

É o caminho de vídeo do modo sem operador, e o detalhe que o separa do desenho de 10/08 é de onde o equipamento puxa: da plataforma, nunca da câmera.

## Escopo (1 PR)

Cada câmera da cena projetada é servida pela plataforma como fonte que o equipamento decodifica, no formato
que ele aceita, e o endereço que o painel recebe é da plataforma. Credencial de câmera continua sem sair,
que era o ganho de domínio declarado no replanejamento de 13/08.

A grade de fontes é provisionada uma vez e reaproveitada, para que trocar de cena seja troca de fonte por
slot em vez de criar e apagar objeto numa API que não é idempotente e que não tem retry.

## O que não serve, e por quê

Os caminhos de telemetria já existem, sempre ligados e sem espectador, e é tentador reusá-los. Eles nascem
de propósito com resolução e taxa de quadros muito abaixo de qualquer nível de espectador, porque são sinal
de vivacidade e não imagem: projetar isso numa parede de LED violaria o piso de resolução declarado.
Prefixo próprio, nível próprio.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]] · [[Cláusula 16.13 do contrato de Quito]]
