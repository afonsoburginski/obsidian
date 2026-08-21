---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2520
clickup: https://app.clickup.com/t/86ak0teq5
titulo: "[Front] Videowall externo: fontes de câmera do painel"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: criado em 14/08 na lista da Sprint 28, em backlog, depois da citação da cláusula 16.13 do contrato de Quito.
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-17
---

# SOFTWARE-2520 - Fontes de câmera do painel no frontend

A UF que voltou encolhida em 14/08: leitura do que está projetado, sem nenhum gesto de publicar.

## Escopo (1 PR)

View que mostra quais câmeras da cena estão projetadas no painel e o que o equipamento consegue decodificar.
As fontes são consequência da cena projetada, e quem as escreve no equipamento é o backend, então aqui não
existe gesto de publicar.

O que saiu do desenho original: campo de endereço, credencial de câmera e a seção de página web como fonte,
que o equipamento comprovadamente não renderiza. O que entrou: a câmera recusada por formato aparece com o
motivo, porque câmera que só entrega um formato antigo é espelhável e não é projetável, e essa assimetria
precisa aparecer na tela em vez de virar chamado de suporte.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]] · [[Cláusula 16.13 do contrato de Quito]]
