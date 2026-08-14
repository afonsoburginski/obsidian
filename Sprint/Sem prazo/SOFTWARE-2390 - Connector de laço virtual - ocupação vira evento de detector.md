---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
  - detectores
card: SOFTWARE-2390
clickup: https://app.clickup.com/t/86aju635n
titulo: "[Back] Connector de laço virtual: ocupação vira evento de detector"
frente: Analítico em container
tamanho: 3 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: fila da Sprint 27 (in progress no ClickUp). Validado contra a develop em 03/08. PR aberta em draft: [#1353](https://github.com/atmanadmin/attlas-2026/pull/1353).
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2390 - Connector de laço virtual - ocupação vira evento de detector

Fazer o `ms-connector-virtual-loop` publicar o evento canônico de detector no tópico da plataforma
a partir da ocupação normalizada por região. É o primeiro produtor do caminho de vídeo.

## Escopo (1 PR)

Consumir a ocupação normalizada e cachear o vínculo entre região e endereço de detector, seguindo o
padrão dos connectors de protocolo já existentes no monorepo (cache local em Redis, recarga por
evento). Montar a janela de amostragem, derivar o identificador do detector e publicar com a
tecnologia e o propósito corretos. Canal sem identidade derivada não é publicado. Health com
`live` diferente de `ready`, métricas, handler idempotente.

## Validação 03/08

Card conferido contra a develop. A correção de premissa que o card já registrava segue valendo: o
`ms-controllers` publica o evento canônico pelo caminho físico desde 31/07, então este connector é
o primeiro produtor por vídeo, não o primeiro produtor do tópico.

A questão em aberto no card, extrair a lógica agnóstica de protocolo do produtor físico para uma
lib compartilhada ou espelhar no connector, fica resolvida por desenho e não precisa de nova
decisão neste card: como o evento de ocupação que o analítico publica já chega normalizado na
mesma unidade de amostragem do domínio de detecção, o connector não reconcilia janela nem faz trim
de amostras. Ele só valida o formato, traduz o endereço pelo vínculo do
[[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector|2389]] e republica. A lógica
de reconciliação que o produtor físico tem resolve um problema de buffer de leitura de equipamento
que este connector não tem.

## DoD

Evento publicado aparece no histórico do stack local, persistido e com o detector correspondente
criado. Forma do evento idêntica à do produtor físico, provada por teste, para o histórico não
precisar saber a origem. Suíte completa do serviço verde no CI.

## Dependências

[[SOFTWARE-2387 - Especificação do connector de laço virtual|2387]] e [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector|2389]].

## Referências

- [[SOFTWARE-2200 - Prova de campo do analítico em container|2200]].
- [[Attlas - Sprint 27]].
