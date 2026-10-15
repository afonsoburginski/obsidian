---
tags:
  - doc
  - cameras
  - videowall
  - explicacao
  - novastar
  - quito
  - rede
aliases:
  - "Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9"
  - "Videowall H9 - vídeo não chega ao painel"
atualizado: 2026-10-14
---

# Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9

Volta para [[Câmeras - Videowall]]. Diagnóstico técnico em [[Videowall H9 Quito - Diagnóstico]].

## Resumo

O Attlas já comanda o painel de Quito: ele cria no processador H9 a fonte de vídeo e abre na tela a janela
dessa fonte. O que falta é a imagem. A placa de vídeo do H9 precisa buscar o vídeo no servidor do Attlas, e ela
não consegue sair da rede local de Quito. A janela abre, mas fica vazia.

## Como o vídeo chega ao painel

| Passo | O que acontece | Funciona hoje |
| --- | --- | --- |
| 1 | O servidor do Attlas manda os comandos ao H9, em `10.200.1.52`, porta `8000` | Sim |
| 2 | O H9 recebe uma fonte com o endereço do vídeo no servidor do Attlas, `rtsp://3.15.199.101:554/<caminho>`, com usuário e senha | Sim |
| 3 | O H9 abre na tela uma janela ligada à fonte | Sim |
| 4 | A placa de vídeo do H9 conecta no endereço e puxa o vídeo | Não |
| 5 | A janela mostra o vídeo | Não, porque depende do passo 4 |

Na tela do Attlas, o palco do painel mostra só os retângulos quando o painel é o H9 real. Isso é normal e não
indica falha.

## Por que a placa não busca o vídeo

1. No Status da fonte, o H9 mostra `Other error` na conexão e `Decoder uninitialized` no vídeo: ele não
   recebeu nenhum byte.
2. No servidor do Attlas não chega nenhum pacote do H9 na porta `554`.
3. O mesmo endereço, com o mesmo usuário e senha, abre o vídeo de qualquer computador com internet.
4. A placa de vídeo tem dois endereços próprios (`10.200.4.202` e `10.200.0.53`) e nenhuma porta de saída
   escolhida. Sem saída, ela só alcança a própria rede, que é onde estão as 20 câmeras que ela já mostra.

Conclusão: o bloqueio está na rede da placa, em Quito. Senha, endereço e formato do vídeo estão certos.

## O que fazer para o vídeo chegar

Quem administra a rede de Quito escolhe uma das duas:

- **Dar saída à placa.** Na interface web do H9 (`http://10.200.1.52`), aba Device, placa INPUT 7, escolher a
  porta de saída com um gateway que tenha internet.
- **Redirecionar a porta no roteador.** O roteador de Quito encaminha `10.200.4.1:554` para o servidor do Attlas
  pelo túnel (`192.168.10.11:554`). No Attlas, o processador **H9 Quito** passa a usar `10.200.4.1`, porta `554`.

Para conferir: espelhar a tela no painel e abrir o Status da fonte no H9. Com o vídeo chegando, aparece
`Connected` e `Decoded`.

## Glossário

| Termo | O que é |
| --- | --- |
| H9 | O processador NovaStar que monta a imagem do painel de Quito a partir das fontes |
| Fonte | Endereço de vídeo que o H9 usa para preencher uma janela da tela |
| Janela | Área da tela do painel que mostra uma fonte; o H9 chama de camada |
| Placa de vídeo IP | Placa do H9 (INPUT 7) que busca vídeo pela rede |
| RTSP | Protocolo que a placa usa para puxar o vídeo do servidor |
| Túnel VPN | Ligação WireGuard entre os servidores do Attlas e a rede de Quito |
| Gateway | Endereço por onde um equipamento sai da própria rede para alcançar outra |
