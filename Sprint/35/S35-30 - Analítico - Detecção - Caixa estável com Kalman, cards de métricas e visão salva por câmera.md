---
id: S35-30
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
titulo: "[Full] Detecção: caixa sólida estável, cards de métricas com visão salva por câmera e streaming Hikvision blindado"
frente: Detecção
pr: "#5576, #5765"
status: "Feita. #5765 mergeada na branch da #5576 em 02/10 às 16h20, e a #5576 na develop às 17h01."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-30 - Analítico - Detecção - Caixa estável com Kalman, cards de métricas e visão salva por câmera

## O que estava errado

Na Detecção ao vivo, a caixa tremia, ficava menor que o carro que se aproxima da câmera e variava de
tamanho entre quadros. Em produção, o vídeo das câmeras Hikvision falhava com 502 `HLS_START_TIMEOUT` sem
causa no log.

## O que as PRs entregaram

- **Caixa**: um filtro de Kalman de velocidade constante substitui a mediana, o One Euro e o teto de salto.
  Medido em 69 s de quadros reais da câmera 10.1.1.80, com 82 trilhas, o atraso da largura na aproximação caiu de
  43,9 px para 2,7 px, e o tremor do centro por quadro de 0,40 px para 0,06 px. O sólido aponta para o
  ponto de fuga aprendido do tráfego, azul em movimento e âmbar parado, e as regiões ficam por baixo dos
  veículos.
- **Cards de métricas avançadas** (#5765): faixa por região, agregado da aproximação, objetos rastreados e
  objeto selecionado, calculados no navegador, em quatro zonas sobre o player com encaixe por arraste. Com
  o vídeo pausado, tudo fica no instante da pausa. Cores por classe escolhidas pelo operador.
- **Visão salva**: o `ms-cameras` guarda por usuário e câmera os cards, as caixas, as badges, as regiões e
  as cores.
- **Hikvision**: a senha com caractere especial deixa de ser injetada duas vezes na URL, o fallback pelo IP
  monta o canal certo, e o 502 traz a causa na resposta e no log, com a senha mascarada.

## Estado

Mergeada em 02/10. A estabilidade da escala da caixa sobre o Kalman seguiu na
[[S36-04 - Analítico - Detecção - Escala da caixa estável sobre o Kalman|S36-04]].
