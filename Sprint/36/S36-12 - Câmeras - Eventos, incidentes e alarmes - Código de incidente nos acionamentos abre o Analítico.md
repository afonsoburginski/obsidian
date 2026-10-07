---
id: S36-12
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - eventos
  - frontend
titulo: "[Front] Código de incidente nos acionamentos do evento abre o incidente no Analítico"
frente: Eventos, incidentes e alarmes
pr: "#6003"
status: "Feita. #6003 mergeada em 06/10 às 15h01."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-12 - Câmeras - Eventos, incidentes e alarmes - Código de incidente nos acionamentos abre o Analítico

## O que estava errado

Em Câmeras, Eventos, todo código em "Acionamentos relacionados", no drawer e na página interna do evento,
mostrava "Módulo indisponível". O componente tinha sido feito como placeholder e só navegava se recebesse
o destino, que nenhuma tela passava. O código do incidente também não abre tela nenhuma sozinho, porque a
página de incidentes do Analítico é chaveada pelo evento de analítico.

## O que a PR entregou

Quando o evento é de analítico, o código do incidente abre a página do próprio evento em Analítico,
Incidentes. Os códigos que ainda não têm tela de destino continuam no aviso informativo.

## Estado

Mergeada em 06/10.

## Relacionado

- [[Câmeras - Eventos, incidentes e alarmes - Fluxos]]
