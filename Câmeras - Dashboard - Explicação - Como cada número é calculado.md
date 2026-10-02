---
tags:
  - cameras
  - dashboard
  - explicação
atualizado: 2026-10-01
aliases:
  - "Dashboard de câmeras - Como cada número é calculado"
---

# Câmeras - Dashboard - Explicação - Como cada número é calculado

Todos os números respeitam o período e o filtro de escopo escolhidos no topo do dashboard. Nos cards
abaixo só entram as câmeras que estão Operativas ou Em testes.

## Consumo Total de Largura de Banda de Vídeo

O gráfico tem duas linhas.

- **Disponível (azul)**: a soma da banda configurada em cada câmera, lida da própria câmera. Usa o fluxo
  secundário (o mesmo do videowall) e, quando a câmera não tem fluxo secundário, o principal. É a
  configuração atual da câmera, que não tem histórico, por isso a linha é reta no período inteiro.
- **Consumo (laranja)**: a banda de vídeo medida. A cada 5 minutos o sistema mede quantos bytes de cada
  câmera passaram pelo servidor de vídeo enquanto alguém assistia. Câmera que ninguém está assistindo não
  transmite vídeo, então não soma nada. Cada ponto do gráfico (5 minutos no período de 1 hora, uma hora no
  de 24 horas, um dia nos de 7 e 30 dias) é a soma das câmeras medidas no mesmo instante, e a média desses
  instantes dentro do ponto.

## Distribuição de Banda por Área

- **Consumo Médio**: para cada câmera, a média das medições dela no período; depois, a soma dessas médias
  entre as câmeras. Não é a soma do período inteiro: uma câmera que transmitiu 4 Mbps em média conta 4 Mbps,
  seja o período de 1 hora ou de 30 dias.
- **"de X Mbps disponíveis"**: o mesmo valor da linha azul do gráfico.
- **Utilização**: Consumo Médio dividido pelo Disponível, vezes 100.
- **"X Mbps livres"**: Disponível menos Consumo Médio. Quando o medido passa do configurado (picos de
  câmera com taxa variável), mostra 0, nunca um número negativo.
- **Rosca**: o Consumo Médio de cada câmera, agrupado pela área da interseção da câmera no Modelo de
  Tráfego. Câmera sem interseção associada entra numa fatia sem nome, para o total da rosca bater com o
  Consumo Médio.

### Por que já apareceu 8.661.004,98 Mbps

Câmeras com taxa de bits variável (VBR) informam "sem limite" como 2.147.483.647 kbps. Quando ninguém
assistia, o sistema usava a banda configurada como aproximação do consumo e gravava esse número, que vira
2,1 milhões de Mbps por câmera. Esse valor é descartado, inclusive nos dados que já estavam gravados, e a
aproximação não conta como consumo em nenhum número do card.

## Monitoramento de Conectividade

- **Severidade**: depende só da latência média da câmera no período. Até 80 ms é Baixa, acima de 80 até
  130 ms é Média, acima de 130 até 180 ms é Alta e acima de 180 ms é Crítica. Quedas e disponibilidade não
  entram. A latência é o tempo de resposta do canal de eventos da câmera, então câmeras alcançadas por rede
  remota (cerca de 150 ms) aparecem como Alta mesmo estáveis. As faixas vieram do protótipo da tela e ainda
  não passaram por revisão de produto.
- **Latência média (ms)**: a média das latências medidas no período. Câmera sem nenhuma medição no período
  fica com latência e severidade em branco.
- **Total de Quedas**: nos períodos de 1 hora e de 24 horas, quantas vezes a câmera passou de online para
  offline. Nos períodos de 7 e 30 dias e no personalizado, quantas janelas de 5 minutos a câmera ficou
  instável.
- **Disponibilidade**: a porcentagem das janelas de 5 minutos em que a câmera esteve online e estável.
  Janela instável ou sem sinal da câmera conta como indisponível. O tempo conta só a partir do cadastro:
  câmera adicionada no meio do período não é penalizada pelos dias em que ainda não existia.
