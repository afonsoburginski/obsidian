---
tags:
  - attlas
  - registro
  - sprint-33
  - analitico
  - ec2
frente: Analítico
ambiente: aws-attlas-26 (EC2 dev), tenant 6c277280-b369-49a5-bbb9-72a5d5fcf789
atualizado: 2026-09-17
---

# Registro - o EC2 dev alinhado com a bancada local em 17 de setembro

O EC2 passou a ter exatamente a configuração da bancada local: três câmeras, analítico só embarcado,
mesmas regiões. Backup do estado anterior em `pg_dump --data-only` das quatro tabelas, antes de
qualquer escrita.

## O que o EC2 tinha de diferente

| | EC2 antes | Local |
| --- | --- | --- |
| Câmeras no tenant | 14 (3 ATMN + 11 SNL) | 3 |
| EMBEDDED | `EMBEDDED 101`, IP `10.11.20.101` | `EMBEDDED 080`, IP `10.1.1.80` |
| `source_id` | `E827251A4173` | `1414dde8-b0fa-4a0b-a630-e144ac9f738c` |
| DEMO | `VIRTUAL_LOOP` **SERVER** | `VIRTUAL_LOOP` **EMBEDDED**, laço ativo com 0,5 s |
| PTZ | `ATSPM` SERVER com região | sem analítico |
| Analíticos SERVER | 6 | 0 |

O IP da EMBEDDED apontava para uma rede que o box não alcança. De lá, `10.1.1.78`, `.79` e `.80`
respondem RTSP pela Tailscale - é o endereço certo.

## Dois achados que o banco sozinho não resolvia

**O consumidor lia o broker errado.** `ANALYTICS_STREAM_BROKERS` estava em `kafka:29092`, o Kafka do
próprio EC2, enquanto o equipamento publica em `vitoria.attlas.atmansystems.com:9094`. Corrigido no
`apps/ms-cameras/.env.docker` do box (backup em `.env.docker.bak-antes-broker-campo`), e o box alcança
esse broker.

**O `source_id` vive em dois lugares.** Além da coluna em `CameraAnalytic`, ele está em
`Camera.analyticsCapabilities`, e é por ali que o consumidor casa o quadro com a câmera. Só a coluna
corrigida deixava todo quadro publicado sem dono, descartado em silêncio.

Depois das duas: chave `camera:analytics:last-frame:…0101` gravada no Redis do EC2 e o diagnóstico
reportando "analítico ao vivo recebendo quadros".

## As instâncias, e por que havia várias com três câmeras

`AnalyticInstance` é o registro do **equipamento que roda a inferência**, separado da câmera que
produz a imagem (UC-075 §7.1). No modo SERVER a relação era N:1 - um processo `ms-video-analytics`,
com endereço e porta, atendia várias câmeras - e por isso a unidade precisa de registro próprio:
capacidade, cadência de sondagem e saúde não pertencem a nenhuma câmera em particular. É o que
alimenta a tela Instâncias.

No embarcado a relação é 1:1 e **a câmera É a unidade**: `name`, `address` e `port` ficam nulos e o
mapper os projeta da câmera hospedeira (§7.2), com o handler de update recusando escrita neles.

O que estava errado nos dois ambientes:

- **Local**: 4 unidades `ms-video-analytics` em modo SERVER e **nenhum analítico apontando para
  elas** - os dois estavam com `instanceId` nulo, por terem sido criados depois da migration que fez
  o backfill.
- **EC2**: a DEMO apontava para uma unidade **SERVER**, isto é, para um processo que não existe mais
  desde que o modo saiu do produto.

Corrigido nos dois com a mesma regra da migration `20260912151018_create_analytic_instance`: unidade
SERVER apagada, vínculo para SERVER anulado, e uma unidade EMBEDDED por analítico embarcado. Estado
final idêntico dos dois lados - `EMBEDDED/ATSPM: 1`, `EMBEDDED/VIRTUAL_LOOP: 1`, órfãos: 0.

> [!note] Onde o classificador do harness barra
> Leitura no box passa; escrita (`ssh` com `psql`, `sed`, arquivo com SQL destrutivo) é barrada até a
> regra `Bash(ssh aws-attlas-26:*)` existir nas settings. Vale lembrar antes de planejar trabalho no
> EC2.

## Ver também

[[Detecção - a caixa desliza a sessenta quadros por segundo]] ·
[[Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes]] ·
[[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]] ·
[[Métricas - por que as telas não mostram nada no dev2]]
