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
  - "Videowall - Vídeo não chega ao H9"
  - "Videowall H9 - vídeo não chega ao painel"
  - "Videowall H9 Quito - Diagnóstico"
  - "Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9"
atualizado: 2026-10-15
---

# Videowall - Vídeo não chega ao H9
Como o videowall funciona: [[Videowall - Como funciona]]. Endpoints em
[[Videowall - Endpoints H9]]. Credenciais em [[Videowall - Credenciais H9]].

## Resumo

O Attlas já comanda o painel de Quito: cria no H9 a fonte de vídeo e abre na tela a camada dessa fonte. O que
falta é a imagem.

A placa de vídeo do H9 (INPUT 7) precisa buscar o vídeo no servidor do Attlas e não consegue sair da rede
local de Quito. Senha, endereço, porta e formato do vídeo estão certos. O conserto é na rede de Quito e não
exige mudança no Attlas.

## Onde o vídeo para

1. O Attlas manda os comandos ao H9, em `10.200.1.52`, porta `8000`. **Funciona.**
2. O H9 recebe a fonte `rtsp://192.168.10.16:554/<caminho>`, o servidor do Attlas pela VPN de Quito. **Funciona.**
3. O H9 abre a camada ligada à fonte. **Funciona.**
4. A placa de vídeo conecta no servidor do Attlas e puxa o vídeo. **Não funciona.**
5. A camada mostra o vídeo. **Não funciona**, porque depende do passo 4.

O comando chegar não prova que o vídeo chega. O controlador do H9, que recebe os comandos, e a placa de vídeo,
que puxa o vídeo, são peças diferentes, com endereços diferentes.

## Como foi provado

Teste de 14/10/2026, às 22:08, feito direto no H9, sem passar pela tela do Attlas:

1. Publiquei um vídeo de teste H.264 1280x720 no servidor do Attlas. Ele abre de qualquer computador com
   internet, com o mesmo usuário e senha que o H9 usa.
2. Criei no H9 uma fonte e uma camada com os mesmos dados que o Attlas manda. O H9 aceitou as duas.
3. No Status da fonte, o H9 mostrou o endereço `3.15.199.101`, porta `554`, por TCP, com a conexão em
   `Other error`, o decodificador em `Decoder uninitialized` e 0 quadros.
4. Durante 15 minutos, o servidor do Attlas não recebeu nenhum pacote do H9.

Os espelhamentos reais da tela, entre 20:53 e 20:59, mostram o mesmo: nenhuma conexão do H9 chegou ao servidor.

## O que não é

**Senha.** O H9 mostra `Service authentication failed` quando a senha está errada, e isso só aparece depois de
conectar. Aqui ele nem conectou.

**Formato do vídeo ou do endereço.** O H9 tem avisos próprios para formato não suportado, e o decodificador
nem começou.

**Porta 554 do servidor.** Ela abre o vídeo de fora da AWS.

**Bloqueio da VPN.** Um bloqueio faria o H9 esperar e mostrar `Request timed out`. O erro imediato é o de quem
não tem por onde sair.

## Por que a placa não sai

A placa de vídeo tem dois endereços próprios na rede de Quito, cada um com gateway:

- Porta 1: `10.200.4.202/24`, gateway `10.200.4.1`, na rede das câmeras.
- Porta 2: `10.200.1.53/24`, gateway `10.200.1.1`, na rede do H9.

A placa responde a quem fala com ela, mas não abre conexão para fora das duas redes:

- Um ping do relay da VPN (`192.168.10.11`) para `10.200.1.53` volta pelo gateway `10.200.1.1`.
- Uma fonte apontada para o mesmo relay, `rtsp://192.168.10.11:554/...`, fica em `Other error` e
  `Decoder uninitialized`, e nenhum pacote da placa chega ao relay. É o mesmo resultado da fonte apontada para
  `3.15.199.101:554`.

O gateway de cada porta serve só para responder. Para abrir conexão, a placa precisa de uma porta marcada como
saída padrão, e nenhuma está. A rede das câmeras também não responde pela VPN: nem as câmeras, nem o gateway
`10.200.4.1`, nem a porta 1 da placa.

## O que fazer

Quem administra a rede de Quito cria, no roteador que responde em `10.200.1.1`, o redirecionamento de
`10.200.1.1:554` para o servidor do Attlas na VPN, `192.168.10.16:554`:

```
/ip firewall nat add chain=dstnat src-address=10.200.1.53 dst-address=10.200.1.1 protocol=tcp dst-port=554 action=dst-nat to-addresses=192.168.10.16 to-ports=554
/ip firewall nat add chain=srcnat src-address=10.200.1.53 dst-address=192.168.10.16 protocol=tcp dst-port=554 action=masquerade
/ip firewall filter add chain=forward dst-address=192.168.10.16 protocol=tcp dst-port=554 action=accept place-before=0
```

A regra vale só para a placa de vídeo (`10.200.1.53`), que é quem busca o vídeo; o controlador (`10.200.1.52`) só
recebe comandos e não precisa dela. A segunda linha troca a origem pelo endereço do roteador no túnel
(`192.168.10.10`): o servidor do Attlas só aceita pelo túnel origens `192.168.10.0/24`, e responde `10.200.1.x`
por outro caminho. A terceira só é necessária se o firewall do roteador bloquear esse tráfego. No Attlas, o processador **H9 Quito** passa a usar `10.200.1.1`, porta `554`. Funciona sem saída
padrão, porque a placa fala com um endereço da rede da porta 2.

A interface web do H9 não resolve. A tela da placa (aba Device, INPUT 7) não tem opção de saída padrão, e tirar
o gateway da porta 1 não fez a placa sair pela porta 2. Gravar a saída padrão pela API do H9 responde sucesso
sem mudar nada.

Para conferir: espelhar a tela no painel e abrir o Status da fonte no H9 (aba Programming). Com o vídeo
chegando, aparece `Connected` e `Decoded`. O passo a passo do teste ao vivo, com log e captura de rede, está em
[[Câmeras - Videowall - Runbook - Testar se o H9 tenta buscar o vídeo]].

## Estados que o H9 mostra

No Status da fonte, Connection Status é a conexão e Decoding Status é o decodificador.

- `Connected` / `Decoded`: conectou / está mostrando vídeo.
- `Request timed out (invalid IP address)`: o endereço não respondeu.
- `Service authentication failed`: usuário ou senha errados.
- `Service not found`: o caminho do vídeo não existe no servidor.
- `Other error`: falha fora das outras. Em Quito, é a placa sem rota para sair.
- `Decoder uninitialized`: nenhum dado chegou ao decodificador.
- `Unsupported ...`: o vídeo chegou num formato que a placa não decodifica.

## Para corrigir depois

Problemas achados no caminho, para uma PR única:

1. Endereços de espelhamentos encerrados ficam no servidor de vídeo. Fica no `ms-cameras`, na
   liberação do espelho.
2. Qualquer um publica vídeo em qualquer endereço do servidor de vídeo sem senha. Fica na configuração do
   MediaMTX.
3. O servidor aceita só um tipo de senha (Basic), e aparelho que só usa Digest não entra. Fica na configuração
   do MediaMTX.
4. A resolução do espelho segue o tamanho da aba (1584x1056), fora do padrão da placa. Fica na captura do
   espelho no `web-attlas`.
5. Perda de pacotes na entrada do espelho (`invalid FU-A packet`). Fica no envio do navegador ao servidor de
   vídeo.
