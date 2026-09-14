---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3209
clickup: https://app.clickup.com/t/86akhq1ga
titulo: "[Front] Aferir a predição do overlay em trânsito rápido, frenagem e conversão"
frente: Analítico
tamanho: 3 pts
pr: "#3476"
status: "Medido e fechado na PR #3476. A frenagem NÃO erra meio carro: custa 22 px onde o limiar é 49,5. O alcance em que cada manobra passa de meio carro é 660 ms na frenagem, 590 na conversão à esquerda e 510 na conversão à direita, então o teto de 400 ms fica 110 ms abaixo da mais apertada - e o teto anterior, 1400 ms, ficava 2,7 vezes acima dela. Amortecer a velocidade no fim da janela foi medido e recusado: todo o ganho é alcançável por um teto plano. O que sobra não é do teto: com folga de 600 a 800 ms a caixa erra 75 a 136 px em velocidade constante, e quem conserta isso é encolher a folga (SOFTWARE-3178 e a migração para o analítico servidor), não subir o teto."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Detecção - aferir a predição em frenagem e conversão

O overlay desenha no instante que a imagem está mostrando e cobre o atraso do analítico pela velocidade
da própria track. Medido em 12/09: o analítico embarcado responde a cada 46 ms mas com 600 a 900 ms de
atraso de pipeline, e o servidor com cerca de 215 ms. O teto de predição caiu de 1400 para 400 ms em
12/09, sem número que o justificasse.

## Como foi medido

Não foi filmado. Filmar avenida responde a pergunta uma vez, e o algoritmo muda a cada PR: a medição
virou uma **suíte determinística** que alimenta o interpolador com tracks sintéticas de física
declarada - velocidade constante a 50 km/h, frenagem forte de 7 m/s2, conversão à esquerda e à direita
(25 km/h, raio de 8 m, 90 graus) - e mede o erro em pixels nos dois caminhos: sobre `sampleBoxAt` e
sobre o `DetectionBoxInterpolatorService` real. Spec `UF-057`, PR #3476.

O parâmetro varrido é a **folga** (cabeça de reprodução menos amostra mais nova), e não o atraso de
pipeline de um lado só: a cabeça está no quadro apresentado, então o que a predição cobre é a
diferença entre os dois pipelines.

## O que a medição respondeu

Meio carro, na escala declarada (1280x720, 22 px por metro, carro de 4,5 m), são 49,5 px.

| Manobra, folga de 400 ms | erro de centro | erro de borda |
| --- | --- | --- |
| Velocidade constante | 13,9 px | 13,9 px |
| Frenagem forte | **22,2 px** | 22,2 px |
| Conversão à esquerda | 32,5 px | 43,8 px |
| Conversão à direita | 37,9 px | 50,5 px |
| Analítico servidor (folga 215 ms) | 25,0 px | - |

- **A frenagem não erra meio carro.** Erra 22 px. A condição que dispararia uma mudança não se
  verifica, então nem amortecimento nem teto menor.
- **O teto de 400 ms está certo, com número.** O alcance em que cada manobra passa de meio carro é
  660 ms na frenagem, 590 na conversão à esquerda e 510 na à direita: 400 fica 110 ms abaixo da mais
  apertada, e 1400 ficava 2,7 vezes acima dela.
- **Amortecer a velocidade no fim da janela foi recusado com número**: todo o ganho é alcançável por
  um teto plano, então ele só acrescenta uma constante e uma curva.
- **A conversão gasta no tamanho congelado, não no centro carregado**: o centro fica a 38 px enquanto
  uma borda vai a 50,5 px, porque a caixa quase dobra de altura em 90 graus e a predição segura o
  último tamanho.
- **Passado o teto o problema deixa de ser do teto**: com folga de 600 a 800 ms a caixa erra 75 a
  136 px em velocidade constante, mais que em qualquer manobra. Não está errada sobre o movimento,
  está atrasada sobre ele, e nenhum teto de 200 a 900 ms põe o pior caso abaixo de meio carro nessas
  folgas.

## Relacionado

[[Detecção - sincronização exata da caixa com o vídeo]] - a conclusão sobrevive à troca da fonte do
relógio e fica mais folgada: tudo aqui é parametrizado pela folga, e o 3178 encolhe a folga em 140 ms
ao tirar o lead. Ele não faz o analítico responder mais cedo, então a predição continua existindo; se
a fase 3 dele um dia zerar a folga, o alcance vai a zero sozinho e o teto fica inerte.

[[Analítico - Estudo de caso de captura, inferência e sincronização]] - de onde vem a cena de
1280x720 e o desenho do relógio nas duas pontas.
