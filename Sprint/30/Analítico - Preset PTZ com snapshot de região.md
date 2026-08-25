---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2684
clickup: https://app.clickup.com/t/86ak5dx4e
titulo: "[Back] Preset PTZ com snapshot de região"
frente: Analítico
tamanho: 5 pts
status: comprometido na Sprint 30. Reestimado em 25/08 de 3 para 5 pts como [Back] (vínculo + snapshot por preset + storage); o desenho sobre frame congelado virou card irmão [[Analítico - Desenho de região sobre frame congelado (front)]] (3 pts). PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Preset PTZ com snapshot de região

Requisito: câmera PTZ com mais de um preset guarda **um conjunto de regiões por preset**, e o operador
desenha essas regiões sobre o **frame congelado** daquele preset, em vez de desenhar sobre o vídeo ao vivo.

São duas coisas que precisam andar juntas, porque a segunda é o que torna a primeira operável: sem o frame
do preset, o operador teria que mover a câmera fisicamente para cada preset só para conseguir desenhar.

## O que existe e o que não existe

`CameraPtzPreset` (`apps/ms-cameras/src/database/schema/ptz/camera_ptz_preset.prisma`) tem `panDegrees`,
`tiltDegrees`, `zoomLevel`, `isDefault`, `sortOrder` e relação com `tourSteps`. **Zero relação com região
e zero relação com imagem.**

No frontend, o desenho acontece num `<svg>` posicionado como irmão absoluto sobre o `<video>`
(`apps/web-attlas/src/app/modules/cameras/components/camera-analytics-overlay/`). Não existe `<img>` nem
`<canvas>` no caminho: o fundo do desenho é literalmente o vídeo ao vivo, e nada mais.

## O que barateou o card de 5 para 3 pontos

**A busca do pixel no device já existe.** `apps/ms-cameras/src/cameras/services/camera-thumbnail.service.ts`
faz snapshot JPEG sob demanda, por VAPIX `axis-cgi/jpg/image.cgi?resolution=320x240&compression=35` em
Axis e `/ISAPI/Streaming/channels/<n>/picture` em Hikvision, sempre no substream secundário, servido em
`GET /cameras/:id/thumbnail` com `Cache-Control: max-age=5`.

Ou seja, a metade difícil, que é alcançar o equipamento e arrancar um frame dele sem passar pelo pipeline
de streaming, está pronta e testada. O que falta é o outro lado: **persistir o frame por preset em
resolução útil** (a de preview não serve para desenhar geometria) e **ligar a geometria a ele**.

## A consequência atual que o card fecha

Hoje mover a câmera para outro preset **invalida a geometria em silêncio**: as regiões continuam
cadastradas com os mesmos percentuais, apontando para um enquadramento que não existe mais, e nada no
sistema sinaliza a divergência. A detecção segue rodando sobre coordenadas que deixaram de significar o que
significavam.

## DoD

Conjunto de regiões vinculado ao preset, com o frame daquele preset persistido em resolução adequada ao
desenho e servido para o editor de região. Mudança de preset deixa de invalidar geometria em silêncio.
Teste de integração cobrindo captura do frame por preset e leitura das regiões do preset ativo.

## Encosta em

- [[Analítico - Requisitos e SLA]], seção "Geometria e presets", regra "Presets com snapshot de região".
- [[Analítico - Entidade, persistência de região e unicidade]], que é o pré-requisito duro: sem região em
  banco não há o que pendurar no preset.
- [[Analítico - Fonte da imagem de evidência]], que decide em paralelo quem gera pixel persistido e com
  qual custo de armazenamento. As duas decisões precisam bater.
- [[PTZ e presets - Requisitos e SLA]], [[Attlas - Sprint 30]] e [[ms-cameras]].
