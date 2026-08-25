---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2679
clickup: https://app.clickup.com/t/86ak5dx6f
titulo: "[Back] Renumerar a CROSS-032 duplicada"
frente: Analítico
tamanho: 1 pt
status: ENTREGUE em 25/08 na PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Renumerar a CROSS-032 duplicada

Dívida **órfã pelo fechamento da PR #1342**, que levava essa correção de carona. Fechada a PR, a correção
ficou sem dono, e o ID duplicado continua na `develop`. É o card mais barato da semana e pode sair em
qualquer dia.

## O duplicado

Existem **duas** `CROSS-032` em `develop`:

- `docs/specs/cross-service/CROSS-032-operational-visibility-replaces-view-permissions.md`
- `docs/specs/cross-service/CROSS-032-public-webrtc-turn.md`

A de TURN é a que deve mudar de número, e o destino é **`CROSS-044`**, que está livre: a faixa de IDs em
`develop` salta de `CROSS-042` para `CROSS-045`, então nem `043` nem `044` têm arquivo.

## O que a renumeração exige

Não é só renomear o arquivo. Renomear exige reescrever as referências que apontam para o ID antigo, e a
PR fechada também corrigia `CROSS-038` e `docker/coturn-certs/README.md` no mesmo passe. Esse conjunto
precisa ser refeito junto, senão o conserto deixa referência quebrada em documento mergeado.

E antes de alocar o `044`, conferir com `/spec-id`: ele varre a `develop` mais as PRs abertas, e é o único
jeito de garantir que o número não foi reservado por trabalho de outra frente que ainda não mergeou.

## Registro de carona: `CROSS-043` continua referência fantasma

Fechar a #1342 **eliminou a colisão, não a ausência do arquivo**. São coisas diferentes e vale separá-las:

- Três atômicas já em `develop` (`PROJ-012`, `PROJ-016`, `PROJ-017`) citam `CROSS-043`, e a `PROJ-017` o
  nomeia como `CROSS-043-socketio-redis-adapter-unification` na lista de dependências.
- **O arquivo nunca existiu.** O ID sempre foi citação sem documento.
- O que a #1342 ia acrescentar era um segundo significado para o mesmo número, a alimentação de vídeo do
  analítico em container. Com a PR fechada, o `043` volta a significar só o adapter Redis, e é por isso que
  a Sprint 31 pode escrever o ADR de alimentação com número novo, sem herdar essa confusão.

Escrever o arquivo do adapter Redis não é escopo deste card. Fica registrado aqui para não voltar a ser
descoberto como novidade.

## DoD

`CROSS-032-public-webrtc-turn.md` renomeada para `CROSS-044`, com todas as referências ao ID antigo
reescritas, incluindo `CROSS-038` e `docker/coturn-certs/README.md`, e o número conferido com `/spec-id`
antes do commit. A pendência do arquivo ausente de `CROSS-043` registrada como dívida conhecida.

## Encosta em

- [[Attlas - Sprint 30]], seção "Dívida colateral".
- [[Analítico - Arquitetura e estratégias]], onde o histórico da colisão está registrado.
- [[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop]], que precisa de um ID limpo para o
  ADR de alimentação de vídeo.
