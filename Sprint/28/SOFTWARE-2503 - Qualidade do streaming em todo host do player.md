---
tags:
  - attlas
  - sprint-28
  - card
card: SOFTWARE-2503
frente: Streaming / player compartilhado
sprint: Sprint 28 (10/8/26 - 16/8/26)
status: "mergeado - PR #1607 em 14/08/2026, conferido no GitHub em 25/08"
atualizado: 2026-08-25
pr: https://github.com/atmanadmin/attlas-2026/pull/1607
---

# SOFTWARE-2503 - Qualidade do streaming, manual e adaptativa, em todo host do player

Imprevisto de 14/08, levantado junto com a queda do `ms-cameras`. O streaming adaptativo não adaptava e
a engrenagem de qualidade do player não mudava nada. A regra que o user estabeleceu é clara: isso tem que
funcionar em qualquer tela que consome aquele player, não só numa.

## Três problemas somados, e nenhum é sabotagem

Vale registrar porque a primeira hipótese foi alguém ter mexido. Não foi. O monitor de saúde entrou no
commit de streaming de baixa latência em 07/07 e não foi tocado por ninguém desde então, e os dois
commits envolvidos na história toda são do próprio user.

**Fiação incompleta nos hosts.** O player não troca qualidade por conta própria: ele emite a resolução
escolhida na engrenagem e as dicas de saúde da reprodução, e quem reabre a sessão no tier novo é a tela
que o hospeda. Só o videowall ligava os três eventos. O detalhe da câmera ligava apenas o manual. O
painel lateral de câmeras e os três componentes do painel de operação não ligavam nenhum, com a sessão
presa numa constante, então a engrenagem abria, o check-mark andava e nada acontecia. Esse é o bug que
o user viu.

**Detector de saúde quase nunca dispara.** O monitor decidia degradação apenas por relógio de mídia
parado, amostrando se `video.currentTime` avançou entre dois ticks. Em WebRTC o relógio continua
avançando enquanto a imagem degrada, porque o receptor acompanha o tempo e descarta frames em vez de
travar. Ou seja, o único caso que disparava downgrade era o travamento total, que é justamente o caso
raro, e a degradação gradual, que é o caso para o qual a adaptação existe, passava invisível. Agora a
taxa de frames descartados por tick entra na decisão junto com o relógio.

**Escada de tier duplicada.** O mapa de resolução para tier estava declarado duas vezes, no videowall e
no detalhe da câmera, com o próprio comentário admitindo a cópia, e a decisão entre AUTO e tier fixo era
refeita em cada tela.

## O desenho

A escada e a decisão viraram um `StreamQualityController` compartilhado, e a escolha que importa ali é o
estado ser **por câmera e não por player**: dois players da mesma câmera dividem a sessão no backend e
cada um roda o próprio monitor de saúde, então um cooldown único é o que impede as dicas dos dois de
fazerem o tier oscilar. O host pede o próximo tier, reabre a sessão e registra o que o backend abriu de
fato, que pode diferir do pedido quando a câmera não tem aquele substream.

Duas decisões conscientes de escopo:

O videowall **não** foi migrado para o controller. O controle de sessão por tile dele carrega supersede
de troca em voo e o tier realmente aberto no backend, que é bookkeeping de transporte e não política de
tier, e reescrever a única tela que já funcionava era risco sem retorno. Ele importa dali só a escada e
o cooldown, que era a duplicação real.

No painel lateral de câmeras só a parte adaptativa foi ligada, porque a variante `thumbnail` não desenha
barra de controles e portanto não existe engrenagem para honrar naquela tela. Ligar o evento manual ali
seria fiação para um controle que não é renderizado.

## Relacionados

- [[SOFTWARE-2504 - Queda do ms-cameras por env ausente e smoke test cego]], o outro card da mesma PR.
  No ambiente publicado o efeito era total de qualquer forma, porque com o serviço caído toda abertura
  de sessão respondia 503.

> [!info] Estado em 25/08 - alinhado com o GitHub
> PR #1607 mergeada (última em 14/08/2026). Nenhuma PR desta task está aberta.
> O `status` anterior dizia: "Em revisão (PR aberta em 14/08)".
