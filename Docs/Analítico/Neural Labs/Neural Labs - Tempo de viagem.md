---
tags:
  - doc
  - analitico
  - neural-labs
  - tempo-de-viagem
aliases:
  - "Registro - comentários no documento dos gestores sobre o tempo de recorrido (28-09-2026)"
  - "Tempo de recorrido"
atualizado: 2026-10-01
---

# Neural Labs - Tempo de viagem

O tempo e a velocidade média entre câmeras de um Trajeto, calculados pelo Attlas a partir das leituras
de placa da Neural Labs. Regra em `docs/modules/analitico.md` seção 3.8; desenho em `CROSS-149`. A
divisão de donos: o Modelo de Tráfego diz onde medir e com quais câmeras (os Trajetos), o módulo
Câmeras diz se a câmera lê placa, e o Analítico pareia e calcula. Índice em [[Neural Labs]].

## A regra

- **Passagem**: toda leitura válida numa câmera vinculada. Releitura da mesma placa na mesma câmera
  dentro da janela curta (`LPR_REREAD_WINDOW_SECONDS`, 10 s) é a mesma passagem.
- **Par**: num trecho de origem e destino, a última passagem não consumida da placa na origem pareia com
  a primeira posterior no destino, dentro da janela de pareamento (`LPR_PAIRING_WINDOW_SECONDS`,
  3600 s). Decide o horário do evento, não a ordem de chegada. Uma passagem pareia uma vez por trecho.
- **Grandezas do par**: tempo = `t_destino - t_origem` (zero ou negativo é recusado); velocidade =
  `3,6 x distância em metros / tempo em segundos`, com a distância do trecho definida pelo Trajeto.
- **Grandezas da janela**: tempo médio dos `N` pares e velocidade espacial `3,6 x distância / tempo
  médio`. Não é a média das velocidades dos pares, e o `Speed` do XML (velocidade instantânea numa só
  câmera) não entra.
- **Sem par é sem dado** (`NO_DATA`), nunca zero. Todo valor publicado leva a quantidade de pares, a
  janela, a origem, o destino e a distância.
- Só se medem os trechos dos Trajetos do `ms-traffic-model`, sincronizados a cada
  `LPR_JOURNEY_SYNC_INTERVAL_MS` (5 min); nunca todas as combinações de câmeras.

## O que o código faz

Pares por trecho, agrupados em janelas de 5 minutos, com tempo médio e velocidade média. A leitura de
um Trajeto responde trecho por trecho. A retenção (`LPR_RETENTION_DAYS`) apaga as leituras e também as
janelas calculadas.

## O documento dos gestores

O documento-fonte é [[Neural Labs - Documento dos gestores sobre tempo de recorrido]], em espanhol, com o original e os comentários dos
gestores no
[Google Docs](https://docs.google.com/document/d/1_48UEFUtBnj__6RmfhIbv2RZeAwqdwfERDuTyzdoJ9U/edit?tab=t.0).
Ele é a regra que o Attlas deve seguir. Onde o Attlas diverge, e a posição registrada nos comentários:

| O documento pede | O Attlas hoje | Posição combinada |
| --- | --- | --- |
| Mediana, com descarte dos valores dispersos e recálculo | Média | Aceita pelos gestores: trocar para mediana |
| Mínimo de 5 veículos no intervalo | Publica com qualquer quantidade, desde 1 | Proposta da Atman: mínimo como parâmetro por corredor, não condição fixa |
| Tempo de referência e limites mínimo e máximo por trecho | Só a espera máxima global de 1 hora | Registrado no documento |
| Ponto de leitura é câmera em um sentido; sentido contrário descartado | Recebe e guarda o sentido de cada leitura, não filtra | Confirmado que a Neural Labs informa o sentido (aproxima ou afasta); falta usar |
| Ponto de leitura definido sobre o mapa | O ponto é a câmera associada à Neural Labs e vinculada ao par `ComputerID` e `CamID` | Não existe sentido por ponto |
| Na releitura, ficar com a de maior confiança | Fica com a primeira | |
| Resultado do intervalo guardado para sempre | A retenção apaga também o resultado | Registrado no documento |
| Trajeto completo (soma de trechos e ponta a ponta) e porcentagem de emparelhamento | Só trecho a trecho | |

## Pendências

Cada linha da tabela acima é uma pendência: alinhar o cálculo do Attlas ao documento dos gestores.
Ligar um servidor de verdade tem as próprias pendências em
[[Neural Labs - Arquitetura e estratégias#Pendências]].
