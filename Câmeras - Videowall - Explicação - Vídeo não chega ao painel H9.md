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
atualizado: 2026-10-07
---

# Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9

Volta para [[Câmeras - Videowall]].

## Resumo

O Attlas já comanda o painel de Quito: ele cria no processador H9 a fonte de cada câmera e abre na tela a
janela dessa câmera. O que falta é a imagem. Para a imagem aparecer, a placa de vídeo do H9 precisa buscar o
vídeo no servidor do Attlas, e essa conexão não acontece: a janela abre, mas fica vazia. O bloqueio está na
rede entre a placa de vídeo, em Quito, e o servidor do Attlas, não na tela do Attlas.

## Como o vídeo chega ao painel

Exemplo: o operador monta no VMS uma cena com quatro câmeras e clica em "Enviar ao painel".

| Passo | O que acontece                                                                                                                                                                                           | Funciona hoje                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1     | O servidor do Attlas (dev.v2) manda os comandos ao H9, em `10.200.0.51`, porta `8000`, pelo túnel VPN até Quito                                                                                          | Sim                            |
| 2     | Para cada uma das quatro câmeras, o H9 recebe uma fonte com o endereço do vídeo no servidor do Attlas, no formato `rtsp://3.15.199.101:8554/<caminho>`. O endereço é sempre do servidor, nunca da câmera | Sim                            |
| 3     | O H9 abre na tela uma janela por câmera, já ligada à fonte                                                                                                                                               | Sim                            |
| 4     | A placa de vídeo do H9 conecta no endereço da fonte e puxa o vídeo do servidor                                                                                                                           | Não                            |
| 5     | Cada janela mostra o vídeo da sua câmera                                                                                                                                                                 | Não, porque depende do passo 4 |

O mesmo vale para o espelho da tela do operador: o Attlas cria a fonte e a janela, e a placa precisaria buscar o vídeo da tela no servidor.

Na tela do Attlas, o palco do painel não mostra o vídeo das telas espelhadas quando o painel é o H9 real; ele
mostra só os retângulos. Isso é comportamento normal da tela e não indica falha.

## Por que a placa não busca o vídeo

A placa de vídeo do H9 tem duas portas de rede:

| Porta | Endereço | Saída da rede (gateway) | Rede |
| --- | --- | --- | --- |
| 0 | `10.200.4.202` | `10.200.4.1` | Rede das câmeras de Quito |
| 1 | `10.200.0.53` | `10.200.0.1` | Rede do H9 |

1. A placa não tem uma porta de saída escolhida: o campo de saída padrão está vazio.
2. Mudar a saída pela interface web do H9 é aceito, mas a placa mantém a configuração anterior.
3. A captura de tráfego no túnel e no servidor do Attlas não mostra nenhum pacote da placa em direção à porta
   `8554`.

Conclusão: pelo caminho de rede que a placa usa, ela não alcança o servidor do Attlas. A porta `8554` do
servidor está aberta e responde com vídeo H.264 para quem a alcança.

## O que fazer para o vídeo chegar

> [!warning] Confirme primeiro que o H9 está na rede
> A última varredura registrada da rede `10.200.0.0/24`, feita por ping e pela porta `8000`, achou só o
> roteador de Quito, e o roteador respondia "host inalcançável" para `10.200.0.51` e `10.200.0.53`. Antes de
> testar o vídeo, confirme com o passo 2 abaixo que o H9 responde.

1. **Ligar o túnel no PC.**

   ```bash
   sudo wg-quick up ~/.config/wireguard/wg-quito.conf
   ```

2. **Conferir se o H9 responde.**

   ```bash
   ping 10.200.0.51
   ```

   Com resposta, o H9 está na rede e o passo 3 pode seguir. Com "host inalcançável" vindo de `10.200.0.1`, o
   H9 está desligado, sem cabo ou com outro endereço: alguém em Quito confere energia e o cabo da porta do
   controlador. Se o endereço mudou, o novo aparece no painel frontal do H9, e o cadastro do processador no
   Attlas recebe o endereço novo. O cadastro nunca recebe `10.200.0.53` (a placa) nem o login da interface web
   no lugar do `pId`, porque isso deixa o processador inalcançável.

3. **Testar o vídeo.** Projetar uma cena no videowall pelo Attlas e, no servidor dev.v2, observar a porta do
   vídeo:

   ```bash
   sudo tcpdump -ni any tcp port 8554
   ```

   Conexão vinda do IP público de Quito quer dizer que a placa conectou: o caminho `videowall-projection-...`
   no servidor de vídeo passa a ter leitor e a câmera aparece no painel. Nenhuma conexão quer dizer que o
   passo 4 da tabela continua bloqueado.

4. **Se a placa não conectar**, a rede de Quito precisa dar a ela um caminho até o servidor. As duas saídas
   dependem de quem administra a rede de Quito:

   - uma regra de NAT no roteador MikroTik `10.200.0.1`, para a rede das câmeras sair pelo túnel, com o endereço
     do vídeo no servidor do Attlas (`VIDEOWALL_RTSP_BASE_URL`) voltando a ser o endereço do servidor dentro do
     túnel, `rtsp://192.168.10.16:8554`:

     ```bash
     /ip firewall nat add chain=srcnat src-address=10.200.4.0/24 dst-address=192.168.10.0/24 action=masquerade
     ```

   - ou um retransmissor de vídeo (MediaMTX) numa máquina dentro da rede de Quito, que busca o vídeo no
     servidor do Attlas e o entrega à placa na rede local.

A rede do túnel, os endereços de cada ponta e a armadilha de configuração do WireGuard estão em
[[Câmeras - Videowall - Arquitetura e estratégias#Rede até o H9]].

## Glossário

| Termo | O que é |
| --- | --- |
| H9 | O processador NovaStar que monta a imagem do painel de Quito a partir das fontes |
| Fonte | Endereço de vídeo que o H9 usa para preencher uma janela da tela |
| Janela | Área da tela do painel que mostra uma fonte; o H9 chama de camada |
| Placa de vídeo IP | Placa do H9 que busca vídeo pela rede |
| RTSP | Protocolo que a placa usa para puxar o vídeo do servidor |
| Túnel VPN | Ligação WireGuard entre o servidor do Attlas, o PC do Afonso e a rede de Quito |
| Gateway | Endereço por onde um equipamento sai da própria rede para alcançar outra |
