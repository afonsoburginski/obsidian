---
id: S36-10
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - ptz
titulo: "[Full] Detalhe da câmera alinhado ao Figma e PTZ obedece ao toque"
frente: Detalhe da câmera
pr: "#5920"
status: "Feita. #5920 mergeada em 06/10 às 15h00."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-10 - Câmeras - Detalhe da câmera - Detalhe alinhado ao Figma e PTZ que obedece ao toque

## O que estava errado

- O card lateral do detalhe da câmera escondia as abas que a câmera não tinha (Presets e Automação sem PTZ,
  Analítico sem analítico), e vários detalhes da aba Saúde, do Analítico e do player divergiam do Figma.
- No controle PTZ, o primeiro toque às vezes fazia a câmera andar demais, e a resposta era lenta. Início e
  parada saíam como duas requisições soltas, e num toque rápido a parada chegava antes do início. Cada
  comando ainda abria do zero a conexão ONVIF, com cinco a sete chamadas antes de mover.

## O que a PR entregou

- Saúde, Presets, Automação e Analítico aparecem sempre, habilitadas só quando a câmera tem o recurso.
- Ajustes da aba Saúde, do aviso do Analítico, do ícone do PTZ e do tooltip do gráfico de bitrate e
  latência, no formato do Figma.
- Início e parada do PTZ numa fila única, e a sessão ONVIF de controle mantida aberta entre comandos e
  descartada depois de 2 minutos sem uso. Cada toque passa a custar uma chamada.

Ficou fora a meta de SLA que o Figma da aba Saúde ainda mostra, retirada de propósito antes.

## Estado

Mergeada em 06/10.

## Relacionado

- [[Câmeras - PTZ e presets - Arquitetura e estratégias]]
