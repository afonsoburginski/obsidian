---
id: S36-11
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - cadastro
  - backend
titulo: "[Back] Reprovisiona câmera sem perfil de stream ao salvar o endereço na edição"
frente: Cadastro
pr: "#5997"
status: "Feita. #5997 mergeada em 06/10 às 15h01."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-11 - Câmeras - Cadastro - Câmera sem perfil de stream reprovisionada ao corrigir o endereço

## O que estava errado

Câmera cadastrada num endereço que não respondia ficava presa sem vídeo. No dev.v2, uma Axis foi cadastrada
com um IP que não responde, a sondagem falhou e o provisionamento foi pulado, deixando a câmera com a
credencial gravada e nenhum perfil de stream. Corrigir o IP na edição só reescreve o endereço dos perfis
existentes, então nada foi criado, e o player seguia em "Câmera offline". O único caminho era apagar e
cadastrar de novo.

## O que a PR entregou

Salvar o endereço de uma câmera sem perfil de stream roda de novo, em background, o mesmo provisionamento
do cadastro.

## Estado

Mergeada em 06/10.

## Relacionado

- [[Câmeras - Cadastro - Fluxos]]
