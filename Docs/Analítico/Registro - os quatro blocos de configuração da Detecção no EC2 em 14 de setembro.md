---
tags:
  - doc
  - analitico
  - registro
  - ec2
  - ms-cameras
  - deteccao
aliases:
  - "Blocos de configuração da Detecção no EC2 (14/09)"
  - "Registro - habilitar os quatro blocos da Detecção"
fonte: sessão de 14/09/2026 no box aws-attlas-26 por Tailscale (ubuntu@100.101.165.32), banco attlas_cameras, e o código da develop em 0d4e1655fb
atualizado: 2026-09-14
---

# Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro

Parte do [[Analítico]]. Continua o [[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]].
O user pediu, em 14/09: "preciso de todas as opções configuradas e habilitadas para todas as cameras -
Detecção e classificação de objetos, Ativação de laço, Detecção automática de incidentes, Métricas de
desempenho". Esta nota registra **onde cada bloco lê o estado dele**, o que o EC2 tinha, e o que falta
para fechar.

## Onde cada bloco lê o estado

Levantado no código da `develop`, não presumido. A tela monta os quatro em
`apps/web-attlas/src/app/modules/analytics-detection/utils/to-detection-blocks.util.ts`.

| Bloco | O que decide se está habilitado | Onde mora |
| --- | --- | --- |
| Detecção e classificação de objetos | sempre presente; cada campo lê "não reportado" quando ausente | colunas de `CameraAnalyticRegion` mais `metadata.length` |
| Ativação de laço | `loop.active` | `CameraAnalyticRegion.metadata.virtualLoop.active` no modo SERVER; o `/config` do device no modo EMBEDDED |
| Detecção automática de incidentes | algum sub-bloco habilitado | `CameraAnalyticRegion.metadata.incidentsSettings` - **lista vazia lê como "nada reportado", não como oito desligados** |
| Métricas de desempenho | `lane !== null` | `VirtualLoopDetectorBinding` da região, casado pelo **index** da região e não pelo id |

Duas consequências que não são óbvias:

- O laço é configuração **da câmera**, mas é gravado em **cada região** dela
  (`saveServerLoopConfig` em `analytics-realtime/camera-regions.controller.ts`), porque no analítico
  servidor não existe device segurando um `/config`.
- O `laneOf` do frontend casa binding com região por `regionIndex`. Um binding na linha do banco
  acende a faixa também para a região que o **device** reporta no mesmo índice, que é como a câmera
  embarcada ganha faixa sem ter linha própria.

## O que o EC2 tinha em 14/09

Sete analíticas vivas, todas no sistema `6c277280-b369-49a5-bbb9-72a5d5fcf789`:

| Câmera | Analítica | Modo | Regiões | `virtualLoop` | Incidentes | Binding |
| --- | --- | --- | --- | --- | --- | --- |
| ATM-PTZ | ATSPM | SERVER | 1 | `active: false` | 0 | índice 23 |
| ATMN - EMBEDDED 101 | ATSPM | EMBEDDED | 1 | `active: true` | 0 | nenhum |
| ATMN - DEMO | VIRTUAL_LOOP | SERVER | 1 | `active: false` | 0 | índice 22 |
| SNL - 10.11.1.101 | VIRTUAL_LOOP | SERVER | **0** | - | 0 | nenhum |
| SNL - 10.11.1.102 | ATSPM | SERVER | **0** | - | 0 | nenhum |
| SNL - 10.11.3.101 | VIRTUAL_LOOP | SERVER | **0** | - | 0 | nenhum |
| SNL - 10.11.3.102 | VIRTUAL_LOOP | SERVER | **0** | - | 0 | nenhum |

Ou seja: os quatro blocos apareciam desabilitados porque **nenhum dos quatro estados existia**, e não
porque a tela os estivesse escondendo. As quatro SNL, sem região, nem entram na frota de ingestão do
`ms-video-analytics`.

## O que resolve, e o que falta

O script está pronto em `ec2-analytics-enable-all.sql`, na raiz do repo, ao lado dos dois de 11/09. Ele
cria a região padrão das quatro SNL, escreve `length`, `virtualLoop.active` e os oito
`incidentsSettings` em toda região viva, e cria os vínculos de detector 24 a 28 no controlador
Quito 2 (`f722dd6f-627a-48bf-a02f-16aada2fbe48`, que aceita até 48 índices e usa 1..21).

> [!warning] Os índices 22 a 28 são fiação de desenvolvimento
> É o único controlador vivo do tenant e é o que faz o bloco de faixa responder. Não corresponde a
> laço físico nenhum, e não deve viajar para um ambiente de cliente.

**O que falta**: aplicar. O classificador do harness recusa escrita remota por SSH
(`[Remote Shell Writes]`); a leitura passa. Para liberar, a regra é uma linha em `permissions.allow`:

```
"Bash(ssh -o ConnectTimeout=15 -o BatchMode=yes -i ~/.ssh/id_ed25519_aws_attlas ubuntu@100.101.165.32 *)"
```

A `ATMN - EMBEDDED 101` é caso à parte: no modo EMBEDDED o laço e os incidentes vêm do próprio device,
e foram habilitados nele em 14/09 pela API do ACAP (os oito tipos na região
`00000000-0000-4000-8000-000000007101`). Do banco ela só precisa do vínculo de detector.

## Ver também

[[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]] ·
[[Analítico - Estudo de caso de captura, inferência e sincronização]] ·
[[Analítico - Embarcado x Servidor]] · [[Analítico]] · [[Attlas - Sprint 33]]
