---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2676
clickup: https://app.clickup.com/t/86ak5dwz4
titulo: "[Back] Fonte da imagem de evidência"
frente: Analítico
tamanho: 5 pts
status: comprometido na Sprint 30. Reestimado em 25/08 de 2 para 5 pts como [Back] - os 2 pts originais eram o custo da decisão, não da implementação (endpoint + object storage + vínculo). A galeria virou card irmão [[Analítico - Galeria de mídia de evidência (front)]] (3 pts). PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Fonte da imagem de evidência

Card de **decisão registrada**, não de implementação. Nenhuma linha de produção sai daqui; o que sai é a
escolha de quem gera o pixel da evidência, com as alternativas rejeitadas justificadas.

## A pergunta mudou depois da auditoria

A pergunta original das notas de alinhamento era: "as imagens de detecção no histórico do Attlas 25 estão
com baixa qualidade, validar se a imagem é gerada pelo lado Attlas ou pela câmera".

A auditoria de 24/08 reformulou, porque a premissa não se sustenta no Attlas 26: **não existe histórico de
detecção com imagem nenhuma.** Não é um problema de qualidade, é ausência de caminho.

- O payload Kafka do device, no tópico `traffic-motion-detection.detections`, carrega só metadado:
  `source_id`, `frame_id`, `regions`, `ids`, `labels`, `bboxes`, `curr_speeds`, `region_incidents`. **Zero
  byte de imagem.**
- O único snapshot que existe é a thumbnail efêmera de preview do
  `apps/ms-cameras/src/cameras/services/camera-thumbnail.service.ts`: 320x240, `compression=35`,
  `Cache-Control: max-age=5`, sem persistência e sem nenhum vínculo com detecção.

Então a decisão não é "corrigir qualidade" nem "partir do zero". É escolher qual das três fontes abaixo
passa a produzir o pixel, sabendo que cada uma tem custo de banda e de armazenamento diferente.

## As três opções a confrontar

### (a) Reusar o caminho do `CameraThumbnailService` em resolução cheia

Captura no instante da detecção, no primário em vez do substream, e persiste. Vantagem: o caminho de
alcançar o device já existe e já lida com Axis e Hikvision. Custo: uma requisição HTTP ao device por
detecção, com o device pagando o encode do JPEG, e o armazenamento inteiro do nosso lado.

### (b) Capturar frame do relay que o `ms-cameras` já mantém no mediamtx

Vantagem: nenhuma requisição extra ao equipamento, porque o stream já está sendo puxado. Custo: decode do
nosso lado para extrair o frame, e o instante capturado é o do relay, não o do frame que gerou a detecção,
o que introduz defasagem a quantificar.

### (c) Pedir ao fornecedor do ACAP que o device passe a mandar a imagem no próprio evento

Vantagem: a imagem é exatamente o frame da detecção, sem defasagem e sem chamada extra. Custo: banda do
device multiplicada por detecção, dependência de terceiro para uma mudança de contrato, e prazo fora do
nosso controle.

## Restrição que atravessa as três

Qualquer opção que persista imagem entra no object storage compartilhado (`@attlas/core-storage`,
`CROSS-038`), nunca em coluna de banco, e precisa de política de retenção decidida junto com a escolha.
Evidência sem retenção definida é crescimento sem teto.

## DoD

ADR, ou seção de spec equivalente, na `develop`, com a opção escolhida, as duas rejeitadas justificadas,
a estimativa de banda e de armazenamento por detecção e a política de retenção. Sem código de produção.

## Encosta em

- [[Analítico - Requisitos e SLA]], seção "Detecção, incidente e evidência", regra "Qualidade da imagem de
  evidência".
- [[Analítico - Preset PTZ com snapshot de região]], que também precisa de pixel persistido e tem de bater
  com a escolha feita aqui.
- [[Analítico - Contagem e dedup de incidente DAI]], que é quem cria o registro onde a evidência se
  penduraria.
- [[Attlas - Sprint 30]], seção de decisões em aberto, ponto 3.
