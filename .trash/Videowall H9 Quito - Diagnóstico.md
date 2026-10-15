---
tags:
  - doc
  - cameras
  - videowall
  - quito
aliases:
  - "Videowall H9 Quito - Diagnóstico"
atualizado: 2026-10-14
---

# Videowall H9 Quito - Diagnóstico

Endpoints em [[Videowall H9 Quito - Endpoints]]. Credenciais em [[Videowall H9 Quito - Credenciais]]. Comandos
de `ffplay` em [[Videowall H9 Quito - Teste de streaming]]. Rede completa em
[[Câmeras - Videowall - Arquitetura e estratégias#Rede até o H9]].

## Resumo

O vídeo não chega ao painel porque a placa de vídeo do H9 (INPUT 7) não consegue sair da rede local de Quito.
Ela tenta conectar por TCP em `3.15.199.101:554` e nenhum pacote chega ao servidor. O Attlas, a senha, a URL e
a porta estão certos: com o mesmo usuário e senha o stream abre de fora. O conserto é na rede de Quito e não
exige código.

## Prova

Teste de 14/10/2026, 22:08 (01:08 UTC), sem passar pela tela do Attlas:

| Passo | Resultado |
| --- | --- |
| Stream de teste H.264 Constrained Baseline 1280x720 publicado em `videowall-mirror-<id>` | `ffprobe` de fora da AWS, com `videowall-h9-reader`, abre o vídeo |
| Fonte `attlas-teste-554` e camada criadas no H9 com o mesmo corpo que o Attlas manda | O H9 aceita as duas |
| Status da fonte no H9, aba Streaming Media | `3.15.199.101`, porta `554`, transporte TCP |
| Status da fonte no H9, aba Decoding Status | Connection Status `Other error`, Decoding Status `Decoder uninitialized`, 0x0, 0 quadros |
| `tcpdump` na porta 554 do dev.v2 e log do MediaMTX, por 15 minutos | Nenhum pacote e nenhuma conexão do H9; só o publicador e o leitor de teste |

Os três espelhamentos reais da tela, entre 20:53 e 20:59, mostram o mesmo: nenhuma conexão RTSP nos caminhos
publicados.

## Hipóteses descartadas

| Hipótese | Por que não é |
| --- | --- |
| Senha | O H9 tem estado próprio para isso, `Service authentication failed`, e ele só aparece depois de conectar |
| Formato do RTSP ou do vídeo | Também tem estados próprios (`Unsupported encoding method`, `Unsupported video resolution`) e o decodificador nem iniciou |
| Transporte | O H9 usa TCP, que é o que o MediaMTX aceita |
| Porta pública | `3.15.199.101:554` abre o stream de fora da AWS |

Um firewall descartando os pacotes daria `Request timed out (invalid IP address)`. O erro imediato
(`Other error`) é o que acontece quando a placa não tem rota para sair da própria rede.

## Duas peças, dois endereços

| Peça do H9 | Endereço | O que faz |
| --- | --- | --- |
| Controlador | `10.200.1.52`, Open API na porta `8000` | Recebe os comandos do Attlas |
| Placa de vídeo INPUT 7 (`H_2xRJ45 IP`) | Porta 0 `10.200.4.202/24`, porta 1 `10.200.0.53/24`, sem saída padrão (`wanId` 255) | Puxa o vídeo RTSP |

O comando funcionar prova só que o controlador alcança e responde. As 20 câmeras tocam porque estão na mesma
rede da porta 0 da placa e não precisam de gateway.

> [!warning] Falta confirmar a rede da placa
> Os IPs e o `wanId` da placa foram lidos quando o controlador estava em `10.200.0.51`. Conferir na interface
> web: aba Device, placa INPUT 7, IP, máscara e gateway de cada porta e qual porta é a saída padrão.

## Caminho do comando

dev.v2 (`ms-cameras`) → Tailscale → `aws-attlas-develop` (`100.95.150.89`, anuncia `10.200.1.0/24` a
`10.200.4.0/24` na tailnet) → WireGuard `192.168.10.11` → concentrador `18.216.165.106` → Quito →
`10.200.1.52:8000`.

## Solução

**1. Saída padrão na placa.** Na aba Device, placa INPUT 7, escolher a porta de saída (WAN) com um gateway que
tenha internet. O processador **H9 Quito** já manda `3.15.199.101:554`, então não precisa mudar nada no
Attlas. Gravar o `wanId` pela API web responde `status 0`, mas a placa mantém a configuração anterior: fazer
pela interface e conferir depois.

**2. Redirecionar a porta no roteador de Quito.** No roteador que responde em `10.200.4.1`:

- dst-nat de `10.200.4.1:554` TCP para `192.168.10.11:554`;
- masquerade na saída para `192.168.10.11` pelo túnel;
- liberar esse tráfego no firewall de forward.

No Attlas, **Streaming RTSP** do processador **H9 Quito** fica `10.200.4.1`, porta `554`. Funciona mesmo sem
saída padrão, porque a placa fala com um endereço da própria rede.

> [!warning] Porta 1 da placa não passa no relay
> `10.200.0.0/24` não está nos `AllowedIPs` do `wg0` do `aws-attlas-develop`, então um pacote vindo da porta 1
> é descartado na chegada. Na opção 2 isso não acontece, porque quem chega no relay é o IP do roteador no
> túnel.

## Como provar depois do ajuste

1. No dev.v2: `sudo tcpdump -ni ens5 'tcp port 554'`. Na opção 2, no `aws-attlas-develop`:
   `sudo tcpdump -ni wg0 'tcp port 554'`.
2. No Attlas, espelhar a tela no painel.
3. Conexão vinda de Quito é a placa saindo, e o Status da fonte no H9 passa a `Connected` e `Decoded`.

## Para corrigir depois

Na PR única:

| Problema | Onde |
| --- | --- |
| Caminhos de espelhamentos encerrados ficam no MediaMTX (18 sem publicador) | `ms-cameras`, liberação do espelho |
| Qualquer um publica em qualquer caminho do MediaMTX sem senha (usuário `any` com `publish` em todos os caminhos) | `docker/mediamtx.yml` e valores do cluster |
| RTSP oferece só autenticação Basic; aparelho que só faz Digest não entra | `rtspAuthMethods` do MediaMTX |
| Resolução do espelho segue o tamanho da aba (1584x1056), fora do padrão da placa 200W | captura do espelho no `web-attlas` |
| Perda de RTP e `invalid FU-A packet (non-starting)` na entrada do espelho | publicação WHIP do navegador |

Fora da PR, no servidor dev.v2: o redirecionamento da porta 554 (`/usr/local/bin/rtsp-forward.sh`) pega
qualquer conexão na 554, inclusive a do MediaMTX puxando as câmeras, que volta para ele mesmo e leva `401`.
A regra precisa de `-m addrtype --dst-type LOCAL`, como a da 8554.
