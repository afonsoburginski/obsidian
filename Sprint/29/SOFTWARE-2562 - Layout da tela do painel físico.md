---
tags:
  - attlas
  - sprint-29
  - task
  - videowall
  - frontend
card: SOFTWARE-2562
clickup: https://app.clickup.com/t/86ak23q73
titulo: "[Front] Videowall externo: layout da tela do painel físico"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: Closed em 18/08 pela [#1678](https://github.com/atmanadmin/attlas-2026/pull/1678) (commit f31b4b0799). É a base da pilha de PRs do videowall.
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
---

# SOFTWARE-2562 - Layout da tela do painel físico

A tela `/cameras/videowall-panel` não sustentava o conteúdo: coluna estreita à esquerda, e sem
processador cadastrado era só um formulário solto. Pior, "processador" aparecia sem explicação
nenhuma; nem quem escreveu o card entendia o conceito na tela.

## Decisões de design (validadas no canvas em 18/08)

- **Linguagem de produto, sem "processador"**: o painel físico é o telão da sala de controle,
  comandado por um aparelho ligado à rede (NovaStar H9). O gesto do operador é conectar o painel:
  o card chama "Conexão do painel", o botão "Conectar painel", e o jargão do fabricante sumiu da
  interface (decisão do user em 18/08; "controlador" estava vetado por colidir com os
  controladores semafóricos).
- **Mesma estrutura nos dois estados**: grid com o card "Projetar no painel" liderando e a
  conexão na coluna lateral (fluxo guiado quando vazio, resumo quando conectado). Sem painel
  conectado, o palco vira contorno tracejado com a explicação, nunca some, e a altura do palco é
  fixa por token para a tela não pular entre estados.
- **Conexão em 3 passos guiados**: stepper Endereço (IP + porta), Acesso (credencial + chave) e
  Painel (nome + dimensões + sistema), com validação por passo, conflito de endereço devolvendo ao
  passo 1, e o campo Modelo removido do fluxo (opcional no contrato).
- **Player do painel**: o palco ocupa toda a largura do card e os controles do equipamento
  (brilho, estado, rotação de telas) moram sobre ele, como a barra de um player de vídeo, revelados
  por hover ou foco de teclado. Até o back chegar (2436, 2476, 2473), ficam atenuados com o motivo
  visível abaixo do palco. O trilho de brilho fica vazio de propósito: a faixa é dado do
  equipamento, não 0-100 assumido.
- **Geometria descoberta via equipamento (feito em 18/08, acoplado à 2436)**: largura e altura
  saíram do fluxo de conexão (passo Painel = nome + sistema + aviso de leitura automática).
  Contrato de registro com geometria opcional, `IVideowallProcessor` anulável, migration
  `20260818130000_videowall_processor_nullable_geometry` com rollback data-safe e ciclo shadow
  validado. A leitura que preenche a geometria fica na 2436 (screen list do H9).
- **Player com presença**: palco em altura fixa de 480px (token), largura total do card, controles
  em overlay revelados por hover/foco.
- **Telas e rotação consideradas**: o painel pode se dividir em várias telas espelhadas com
  rotação por tela, no modelo do VMS (nota Feature Improvment + APIs NovaStar de screens). O
  layout já reserva esse futuro; o mockup mostra o estado com 3 telas.
- O card "Recursos em desenvolvimento" foi removido; o conteúdo dele virou o player.
- De carona: a ilustração quebrada do `CardEmptyState` compartilhado (SVG inexistente
  `home-systems-empty.svg`) foi trocada pelas ilustrações reais com variante light/dark.

## Rastreio

- Mockup: canvas "Painel Físico do Videowall" (artifact, 2 artboards + tweak de estado).
- Código: PR 1678 (branch cameras/refactor/NO-CARD-videowall-panel-redesign, commit f31b4b0799).
- Validação: screenshot via CDP no :4200 com os dois estados; o estado "com processador" só
  renderiza com backend novo, o container local `attlas-ms-cameras:dev` está defasado e responde
  Cannot GET nos endpoints de videowall.

## Relacionados

[[Attlas - Sprint 29]] · [[SOFTWARE-2436 - Brilho e estado observável]] ·
[[SOFTWARE-2476 - Brilho do painel no frontend]] · [[SOFTWARE-2473 - Capacidades e estado observável no frontend]]
