# Videowall H9 Quito - tcpdump espelhamento

Volta para [[Videowall H9 Quito - Diagnóstico sem vídeo]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Onde | EC2 dev.v2, `tcpdump -i any` gravando em `/tmp/vw.pcap` |
| Filtro | `((port 8554 or port 554) and not host 172.19.0.2 and not net 10.244.0.0/16) or (host 100.95.150.89 and not port 41641)` |
| Fonte no H9 | `rtsp://192.168.10.11:554/videowall-mirror-hermes-test` (relay no `aws-attlas-develop`) |
| Estado no H9 | Decoder alocado (`decodeId 0`), `Connection Status: Other error`, `Decoder uninitialized` |
| Relay funciona? | Sim. Conexão de teste do próprio EC2 faz o caminho completo (bloco abaixo) |
| A placa IP do H9 chegou no relay? | Não. Zero pacotes da placa (10.200.4.202 / 10.200.1.53) chegando ao EC2 pelo relay |

## Caminho do relay validado

Conexão de teste do EC2 (porta de origem 50032): sai por `wg0` para `192.168.10.11:554`, o relay entrega em `tailscale0` no `100.101.165.32:8554` (MediaMTX) e a resposta volta pelo mesmo caminho.

```
2026-10-14 21:44:41.562048 wg0   Out IP 192.168.10.16.50032 > 192.168.10.11.554: Flags [S], seq 2668860400, win 62167, options [mss 8881,sackOK,TS val 2562259863 ecr 0,nop,wscale 10], length 0
2026-10-14 21:44:41.568206 tailscale0 In  IP 100.95.150.89.50032 > 100.101.165.32.8554: Flags [S], seq 2668860400, win 62167, options [mss 8881,sackOK,TS val 2562259863 ecr 0,nop,wscale 10], length 0
2026-10-14 21:44:41.568365 tailscale0 Out IP 100.101.165.32.8554 > 100.95.150.89.50032: Flags [S.], seq 1754556419, ack 2668860401, win 65160, options [mss 1460,sackOK,TS val 971554971 ecr 2562259863,nop,wscale 10], length 0
2026-10-14 21:44:41.571227 wg0   In  IP 192.168.10.11.554 > 192.168.10.16.50032: Flags [S.], seq 1754556419, ack 2668860401, win 65160, options [mss 1460,sackOK,TS val 971554971 ecr 2562259863,nop,wscale 10], length 0
2026-10-14 21:44:41.571281 wg0   Out IP 192.168.10.16.50032 > 192.168.10.11.554: Flags [.], ack 1, win 61, options [nop,nop,TS val 2562259872 ecr 971554971], length 0
2026-10-14 21:44:41.571523 wg0   Out IP 192.168.10.16.50032 > 192.168.10.11.554: Flags [F.], seq 1, ack 1, win 61, options [nop,nop,TS val 2562259872 ecr 971554971], length 0
2026-10-14 21:44:41.572098 tailscale0 In  IP 100.95.150.89.50032 > 100.101.165.32.8554: Flags [.], ack 1, win 61, options [nop,nop,TS val 2562259872 ecr 971554971], length 0
2026-10-14 21:44:41.572208 tailscale0 In  IP 100.95.150.89.50032 > 100.101.165.32.8554: Flags [F.], seq 1, ack 1, win 61, options [nop,nop,TS val 2562259872 ecr 971554971], length 0
2026-10-14 21:44:41.573129 tailscale0 Out IP 100.101.165.32.8554 > 100.95.150.89.50032: Flags [.], ack 2, win 64, options [nop,nop,TS val 971554976 ecr 2562259872], length 0
2026-10-14 21:44:41.576973 wg0   In  IP 192.168.10.11.554 > 192.168.10.16.50032: Flags [.], ack 2, win 64, options [nop,nop,TS val 971554976 ecr 2562259872], length 0
2026-10-14 21:44:41.577952 tailscale0 Out IP 100.101.165.32.8554 > 100.95.150.89.50032: Flags [F.], seq 1, ack 2, win 64, options [nop,nop,TS val 971554980 ecr 2562259872], length 0
2026-10-14 21:44:41.580160 wg0   In  IP 192.168.10.11.554 > 192.168.10.16.50032: Flags [F.], seq 1, ack 2, win 64, options [nop,nop,TS val 971554980 ecr 2562259872], length 0
2026-10-14 21:44:41.580212 wg0   Out IP 192.168.10.16.50032 > 192.168.10.11.554: Flags [.], ack 2, win 61, options [nop,nop,TS val 2562259881 ecr 971554980], length 0
2026-10-14 21:44:41.583996 tailscale0 In  IP 100.95.150.89.50032 > 100.101.165.32.8554: Flags [.], ack 2, win 61, options [nop,nop,TS val 2562259881 ecr 971554980], length 0
```

## Conclusão

Nenhuma linha além da conexão de teste. Captura no `wg0` do `aws-attlas-develop` com a placa tentando conectar também deu zero pacotes de `10.200.4.202`, `10.200.1.53` e `10.200.1.52`. Conexão que nasce em Quito para `192.168.10.0/24` não atravessa a VPN. Correção em [[Videowall H9 Quito - Diagnóstico sem vídeo#Correção de rede]].
