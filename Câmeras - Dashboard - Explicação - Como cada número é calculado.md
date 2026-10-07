---
tags:
  - doc
  - cameras
  - dashboard
  - explicação
aliases:
  - "Dashboard de câmeras - Como cada número é calculado"
atualizado: 2026-10-07
---

# Câmeras - Dashboard - Explicação - Como cada número é calculado

Volta para [[Câmeras - Dashboard]].

## Resumo

Todos os números do dashboard de câmeras respeitam o período e o filtro de escopo escolhidos no topo da tela.
Nos cards de banda e de conectividade explicados aqui, só entram as câmeras que estão Operativas ou Em testes. A
banda disponível é a configurada em cada câmera; o consumo é só o que foi medido enquanto alguém assistia ao
vídeo; a conectividade vem do canal que o Attlas mantém aberto com cada câmera.

## Consumo Total de Largura de Banda de Vídeo

O gráfico tem duas linhas.

- **Disponível (azul).** A soma da banda configurada em cada câmera, lida da própria câmera. Usa o fluxo
  secundário (o mesmo do videowall) e, quando a câmera não tem fluxo secundário, o principal. É a configuração
  atual da câmera, que não tem histórico, por isso a linha é reta no período inteiro.
- **Consumo (laranja).** A banda de vídeo medida. A cada 5 minutos o sistema mede quantos bytes de cada câmera
  passaram pelo servidor de vídeo enquanto alguém assistia. Câmera que ninguém está assistindo não transmite
  vídeo, então não soma nada.

Cada ponto do gráfico soma as câmeras medidas no mesmo instante e tira a média desses instantes dentro do ponto.
Um ponto vale 5 minutos no período de 1 hora, uma hora no de 24 horas e um dia nos de 7 e 30 dias. No período
personalizado, cada ponto é um dia até 14 dias; acima disso, o período é dividido em cerca de seis pontos.

## Distribuição de Banda por Área

- **Consumo Médio.** Para cada câmera, a média das medições dela no período; depois, a soma dessas médias entre
  as câmeras. Não é a soma do período inteiro: uma câmera que transmitiu 4 Mbps em média conta 4 Mbps, seja o
  período de 1 hora ou de 30 dias.
- **"de X Mbps disponíveis".** O mesmo valor da linha azul do gráfico.
- **Utilização.** Consumo Médio dividido pelo Disponível, vezes 100.
- **"X Mbps livres".** Disponível menos Consumo Médio. Quando o medido passa do configurado (picos de câmera com
  taxa variável), mostra 0, nunca um número negativo.
- **Rosca.** O Consumo Médio de cada câmera, agrupado pela área da interseção da câmera no Modelo de Tráfego.
  Câmera sem interseção associada entra numa fatia sem nome, para o total da rosca bater com o Consumo Médio.

## Números que o sistema descarta ou mistura

- **"Sem limite" de câmera de taxa variável.** Câmera com taxa de bits variável (VBR) informa "sem limite" como
  2.147.483.647 kbps, o que daria 2,1 milhões de Mbps por câmera. O sistema descarta qualquer valor desse
  tamanho, inclusive nos dados já gravados, e ele nunca entra na conta.
- **Banda configurada no lugar da medida.** Quando ninguém assiste a câmera, o sistema guarda a banda
  configurada como aproximação. Essa aproximação não conta como consumo em nenhum número do card.
- **Dias inteiros nos períodos longos.** Nos períodos de 7 dias, 30 dias e personalizado, cada dia já encerrado
  entra com a média do dia inteiro da câmera. Essa média mistura as horas medidas com a banda configurada das
  horas em que ninguém assistia, então uma câmera assistida só em parte do dia aparece com consumo maior que o
  medido. O dia em que ninguém assistiu a câmera normalmente continua fora da conta.

## Monitoramento de Conectividade

- **Severidade.** Depende só da latência média da câmera no período. Até 80 ms é Baixa, acima de 80 até 130 ms
  é Média, acima de 130 até 180 ms é Alta e acima de 180 ms é Crítica. Quedas e disponibilidade não entram. A
  latência é o tempo de resposta do canal de eventos da câmera, então câmeras alcançadas por rede remota (cerca
  de 150 ms) aparecem como Alta mesmo estáveis. As faixas ainda aguardam revisão de produto.
- **Latência média (ms).** A média das latências medidas no período. Câmera sem nenhuma medição no período fica
  com latência e severidade em branco.
- **Total de Quedas.** Nos períodos de 1 hora e de 24 horas, quantas vezes a câmera passou de online para
  offline. Nos períodos de 7 e 30 dias e no personalizado, quantas janelas de 5 minutos a câmera ficou instável.
  Câmera que não caiu aparece com zero.
- **Disponibilidade.** A porcentagem das janelas de 5 minutos em que a câmera esteve online e estável. Janela
  instável ou sem sinal da câmera conta como indisponível. O tempo conta só a partir do cadastro: câmera
  adicionada no meio do período não é penalizada pelos dias em que ainda não existia.
- **Lista parcial.** O card carrega as 100 primeiras câmeras de cada leitura. Com mais câmeras que isso, ele
  avisa que a lista é parcial, e a exportação sai com o mesmo aviso.

## Exemplo

Três câmeras Operativas, período "Últimas 24 horas", cada uma com 2 Mbps configurados no fluxo secundário:

| Câmera | Quem assistiu | Média medida |
| --- | --- | --- |
| A | Um operador por 2 horas | 3 Mbps |
| B | Um operador por 6 horas | 1,5 Mbps |
| C | Ninguém | sem medição |

- **Disponível:** 2 + 2 + 2 = 6 Mbps, linha reta no gráfico.
- **Consumo Médio:** 3 + 1,5 = 4,5 Mbps. A câmera C não soma nada, porque ninguém a assistiu.
- **Utilização:** 4,5 dividido por 6, vezes 100 = 75%.
- **Livres:** 6 menos 4,5 = 1,5 Mbps.
- **Gráfico:** nas horas em que só a câmera B estava aberta, o ponto fica perto de 1,5 Mbps; nas horas em que A e
  B estavam abertas juntas, perto de 4,5 Mbps; nas horas sem ninguém assistindo, em 0.
