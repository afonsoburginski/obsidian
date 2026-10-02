---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - vms
  - videowall
  - frontend
titulo: "[Front] Monitoramento - posição da grade sem transmissão passa a dizer o que aconteceu, em vez de ficar em branco"
frente: Câmeras
tamanho: 5 pts
pr: "#4165"
issues: "#3157"
status: "Feita. PR #4165 mergeada na develop em 22/09, fechando a issue 3157, a única crítica do rótulo cameras."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Monitoramento - a posição da grade sem transmissão

A issue 3157 era a âncora da frente: a grade do Monitoramento de Vídeo e o videowall ficavam com
posições em branco. "Monitoramento de Vídeo" é a própria página do videowall, então o relato cobria as
duas telas com a mesma grade e o mesmo player. As PRs da frente de streaming não fechavam esta issue,
porque os critérios de aceite dela são de tela. Esta fecha.

## O que estava errado

Com a grade cheia, a abertura de sessão de algumas câmeras voltava 429, o teto de 40 sessões
simultâneas do `ms-cameras`. A partir daí a falha se perdia em quatro passos. O store de sessão do
videowall engolia o erro e só tirava a câmera da lista de acompanhadas. A página seguia montando o
player com a fonte vazia, e o registro de mídia ignora fonte vazia sem tentar conectar, então o estado
ficava num `offline` sem nada por cima. O videowall era o único dos catorze hosts do player que não
ligava o estado de preparação. E o cartão de "Sem sinal" só aparecia sem miniatura; como o videowall
sempre passa miniatura, o quadro preto do snapshot de uma câmera fora do ar era tudo o que sobrava.

Havia um segundo buraco, independente do primeiro: as duas pernas de HLS declaravam "tocando" sem
prova de quadro, uma ao ler a playlist e a outra no ato de anexar o vídeo. HLS que lia a playlist e
nunca decodificava ficava preto para sempre, com o selo "AO VIVO" e o cronômetro correndo.

## O que muda

A condição da miniatura não saiu, porque é ela que impede o cartão de miniatura, que nunca pediu
transmissão, de anunciar "Sem sinal" por cima de um snapshot perfeito em listas e cards ATSPM. O player
passa a separar "o host pediu transmissão e não houve" de "isto é só um cartão de snapshot", e no
primeiro caso mostra "Sem sinal" sobre a miniatura, com o quadro ainda legível por baixo. Sem fonte
para recarregar, o botão de reconectar devolve a decisão ao host, que abre a sessão do zero.

O store publica, por câmera, se a sessão está abrindo, falhou ou bateu no teto, e as duas grades ligam
o estado de preparação nesse veredito. As pernas de HLS passam a exigir o primeiro quadro decodificado
em 12 segundos, contra os 6 da WHEP, porque o prazo começa antes do primeiro fragmento ser buscado. De
quebra, o modo responsivo deixou de pular a célula de uma câmera que ainda não chegou do diretório.

## O que tem de valer no fim

Nenhuma posição da grade fica em branco: ou toca, ou mostra que está conectando, ou diz "Sem sinal" com
o botão de reconectar, e um tile que bateu no teto de sessões é distinguível de uma câmera fora do ar.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
- [[Plano - Streaming sem vazamento de publicador]], a frente que remove uma das causas de tile sem imagem, sem fechar esta issue.
