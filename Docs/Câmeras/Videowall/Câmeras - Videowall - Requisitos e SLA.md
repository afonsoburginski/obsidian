---
tags:
  - doc
  - cameras
  - videowall
  - novastar
  - quito
  - contrato
aliases:
  - "Câmeras - Videowall - Requisitos e SLA"
  - "Cláusula 16.13 do contrato de Quito"
  - "Cláusula 16.13"
  - "Módulo de gestión de videowall (contrato)"
  - "Videowall - Requisitos e SLA"
atualizado: 2026-10-07
banner: "led video wall display"
---

# Câmeras - Videowall - Requisitos e SLA

Volta para [[Câmeras - Videowall]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| De onde vêm os requisitos | Cláusula 16.13 do contrato de Quito, lida em `RF-VW-07` a `RF-VW-20` e `RNF-CAM-14` a `RNF-CAM-19` de `docs/modules/cameras.md`, seção 3.2 |
| O que está atendido | Gestão pela consola, câmeras na parede nos dois modos, cenários dinâmicos, Ethernet, RTSP com H.264, layouts, plano de resposta com precedência |
| O que não está | Programação horária de exibição e de brilho; aviso ao deslocado por plano; página web sem operador |
| O que falta no H9 real | O vídeo chegar ao painel e o brilho, que o firmware 1.9.7.1 recusa |
| Quem manda na parede | Um ocupante por vez; plano desloca qualquer um, programação cede a qualquer um, operador desloca outro operador só com duty administrativo |

Como o código atende cada item está em [[Câmeras - Videowall - Arquitetura e estratégias]].

## Regras

### Cláusula 16.13 do contrato de Quito (texto literal)

> **16.13. MÓDULO DE GESTIÓN DE VIDEOWALL**
>
> El módulo de gestión de videowall cumple con el requisito de integración con el módulo de planes de
> respuesta automatizados, permitiendo automatizar acciones como reproducciones predefinidas y operaciones
> programadas directamente en el videowall.
>
> **Instalación e interoperabilidad.** El módulo cumple con el requisito de permitir la gestión completa
> del videowall directamente desde la consola de operación de la plataforma semafórica, posibilitando:
> Visualización de cámaras IP en el videowall. Creación dinámica de escenarios desde la propia consola de
> operación. Requisito mínimo cumplido: gestión centralizada sin interfaces intermedias.
>
> **Compatibilidad y formatos.** El módulo cumple los requisitos de compatibilidad al: Permitir la
> integración con el videowall existente mediante puerto Ethernet/TCP/IP. Ser compatible, como mínimo, con
> los siguientes formatos y protocolos de transmisión: RTSP (Real Time Streaming Protocol); H.264 (códec de
> compresión de video).
>
> **Gestión desde la consola de operación.** El operador puede controlar íntegramente el videowall
> directamente desde la consola de operación de la plataforma, sin necesidad de dispositivos dedicados
> adicionales (como teclado o mouse específico). La solución cumple con el requisito de permitir: Definir
> layouts personalizados de visualización. Proyectar cámaras IP y páginas web. Operar el videowall
> directamente a través de la interfaz de usuario de la plataforma.

A citação fica em espanhol, sem tradução ao lado, porque uma tradução seria outra paráfrase. A leitura em
português é a prosa dos requisitos em `docs/modules/cameras.md`.

### Obrigações e o que o código entrega

| Obrigação | Responde | No código |
| --- | --- | --- |
| Integração com planos de resposta | RF-VW-14 | Atendida: comando de plano projeta cena nativa com precedência |
| Reproduções predefinidas e operações programadas | RF-VW-14, RF-VW-15, RF-VW-18 | Plano e grupos em rotação com operador atendidos; programação horária sem produtor; sequência sob projeção nativa diferida |
| Gestão completa desde a consola | RF-VW-07 a RF-VW-20 | Atendida sobre o painel emulado; no H9 real, comando, fonte e camada confirmados, vídeo e brilho não |
| Câmeras IP no videowall | RF-VW-09 | Atendida nos dois modos |
| Criação dinâmica de cenários desde a consola | RF-VW-02 com RF-VW-12 | Atendida, lendo "escenario" como cena do VMS |
| Gestão centralizada sem interfaces intermediárias | RNF-CAM-14 | Atendida |
| Integração por Ethernet, TCP e IP | RF-VW-07 com RNF-CAM-14 | Atendida |
| RTSP e H.264 no mínimo | RNF-CAM-05, RF-INT-05, RNF-CAM-18 | Atendida: toda fonte vai em RTSP com H.264, e publicação fora disso é recusada |
| Sem dispositivos dedicados | RNF-CAM-14 | Atendida |
| Layouts personalizados | RF-VW-01 com RF-VW-11 | Atendida: a geometria da parede deriva da cena |
| Projetar câmeras IP e páginas web | RF-VW-09, RF-VW-10 | Câmera atendida; página web só com operador |
| Operar pela interface da plataforma | RF-VW-07 a RF-VW-20 | Atendida |

### Leituras registradas

| Termo da cláusula | Leitura adotada | Consequência |
| --- | --- | --- |
| "Escenario" | Cena do VMS, não preset do equipamento: a cláusula nunca diz preset, o verbo aponta para a consola, e composição salva no equipamento seria um segundo modelo para reconciliar | Se o cliente confirmar a outra leitura, RF-VW-13 volta ao escopo e o catálogo de capacidades cresce |
| "Proyectar páginas web" | Com operador, é o espelho: a parede mostra a consola, que abriu a página | Sem operador não há caminho, porque nenhum card do chassi renderiza HTML. É a única lacuna declarada da cláusula (RF-VW-10) |
| "RTSP y H.264 como mínimo" | Prova de conformidade de formato | Câmera legada que só entrega MJPEG é espelhável e não é projetável |

### Precedência na parede

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Ocupantes simultâneos | Um por vez, espelho ou projeção (RF-VW-19) | `VideowallSession`, uma por processador |
| Operador sobre operador | Recusado com quem detém e desde quando; com `takeover` e duty administrativo, desloca e registra | `apps/ms-cameras/src/video-wall/targets/projection/services/videowall-occupancy.arbiter.ts` |
| Operador sobre projeção de plano | Recusado sem `takeover`; com `takeover`, desloca sem exigir duty administrativo | idem |
| Plano de resposta | Desloca qualquer ocupante, com registro e aviso ao deslocado; mesmo precedente do PTZ vindo de Emergências (RF-VW-14) | idem |
| Exibição programada | Cede a qualquer ocupante, registrando que cedeu; agenda que atropela operador vira agenda desligada (RF-VW-15) | idem |
| Brilho | Do painel inteiro, sobrevive a reinício e é reaplicado (RF-VW-16) | `apps/ms-cameras/src/video-wall/targets/state/services/videowall-brightness-reconciler.service.ts` |
| Exposição de quem espelha | Quem espelha é avisado de que está exposto e tem a liberação sempre ao alcance (RF-VW-20) | Lançador radial, item Liberar |
| Mesmo ocupante pedindo de novo | Não é deslocamento | Árbitro |

### Requisitos não funcionais do painel

| ID | O que exige | Onde no código |
| --- | --- | --- |
| RNF-CAM-14 | Comando direto pela rede, sem intermediário nem dispositivo dedicado; servir o espelho pela plataforma não é intermediário | Cliente da Open API em `targets/novastar-h9/client/` |
| RNF-CAM-15 | Procedência por capacidade; capacidade presumida não é executada às cegas e é recusada com código estável | `NovastarCapabilityGate`, 501 `VIDEOWALL_CAPABILITY_UNVERIFIED` |
| RNF-CAM-16 | Escrita no painel não é reenviada automaticamente | Lease de escrita sem retentativa |
| RNF-CAM-17 | Credencial do processador ilegível em leitura, log, métrica e erro | `SecretCipherService`, `pId` mascarado |
| RNF-CAM-18 | Formato da fonte fixado; piso de 480 linhas checado quando a resolução é conhecida; piso de taxa de bits pendente da banda provisionada | Codec enforcer e `VideowallProjectionFormatGate` |
| RNF-CAM-19 | Endereço do caminho do espelho é segredo (nome não adivinhável, leitura só pelo equipamento cadastrado); caminhos de câmera projetada seguem a postura do streaming | Caminho `videowall-mirror-*` e credencial de leitor do espelho |

> [!warning] Onde o código não cumpre o requisito hoje
> - RF-VW-15: programação horária de exibição e de brilho não existe; o árbitro já sabe ceder, mas nada cria
>   ator `SCHEDULE`.
> - RF-VW-14: o deslocado por plano não recebe aviso, e o encerramento de projeção não entra no livro de
>   encerramentos.
> - RF-VW-09: no H9 de Quito a camada abre com a câmera, mas o vídeo não chega ao painel
>   ([[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]]).
> - RF-VW-16: `screen/writeBrightness` responde 500 no firmware 1.9.7.1, então o brilho só funciona no painel
>   emulado.

## Variáveis de ambiente

Do `ms-cameras` (`apps/ms-cameras/.env.example`), salvo indicação.

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `MEDIAMTX_RTSP_URL` | `rtsp://localhost:8554` no `.env.example` | Base do endereço RTSP que vai ao equipamento |
| `VIDEOWALL_RTSP_BASE_URL` | `rtsp://mediamtx:8554` | Lida pelo `docker-compose.yml` para preencher `MEDIAMTX_RTSP_URL` do `ms-cameras`; no dev.v2, o IP público |
| `MEDIAMTX_WEBRTC_BASE_URL` | `/live` no `.env.example` | Base do endereço WHIP do espelho |
| `VIDEOWALL_OPENAPI_TIMEOUT_MS` | 8000 | Prazo de cada chamada à Open API |
| `VIDEOWALL_CODEC_CIPHER_ENABLED` | `false` | Liga o modo cifrado da Open API |
| `VIDEOWALL_CODEC_CIPHER_KEY` | Sem padrão | Chave DES em 16 hexadecimais; exigida quando a cifra está ligada |
| `VIDEOWALL_PRESUMED_CAPABILITIES_ENABLED` | `false` | Deixa executar capacidade presumida, para comissionamento |
| `VIDEOWALL_PLAYGROUND_ENABLED` | `false` | Troca as portas do equipamento pelo painel emulado |
| `VIDEOWALL_PLAYGROUND_BRIGHTNESS_MIN` e `VIDEOWALL_PLAYGROUND_BRIGHTNESS_MAX` | 10 e 90 | Faixa de brilho do painel emulado |
| `VIDEOWALL_NOVASTAR_DEVICE_ID` | 0 | `deviceId` da Open API |
| `VIDEOWALL_NOVASTAR_SCREEN_ID` | Lido do processador | `screenId` da Open API |
| `VIDEOWALL_NOVASTAR_IPC_SLOT_ID` | Lido do processador | Slot da placa de vídeo IP |
| `VIDEOWALL_MIRROR_READER_USERNAME` e `VIDEOWALL_MIRROR_READER_PASSWORD` | Gerados por `npm run setup:env` | Credencial de leitura do caminho do espelho no MediaMTX |
| `VIDEOWALL_MIRROR_CODEC_ENFORCER_CRON` | `*/5 * * * * *` | Cadência do codec enforcer |
| `VIDEOWALL_MIRROR_REAPER_CRON` | `*/15 * * * * *` | Cadência do reaper |
| `VIDEOWALL_MIRROR_REAPER_LEASE_TTL_SECONDS` | 90 | TTL da lease do reaper |
| `VIDEOWALL_MIRROR_UNPUBLISHED_GRACE_MS` | 60000 | Tempo sem publicação até o espelho expirar |
| `VIDEOWALL_MIRROR_PUBLISHING_SETTLE_MS` | 1500 | Atraso do segundo quadro de ocupação depois do aviso de publicação, para o MediaMTX já listar o caminho como pronto |
| `VIDEOWALL_OCCUPANCY_TRANSACTION_TIMEOUT_MS` | 10000 | Prazo da transação de ocupação |
| `VIDEOWALL_PROJECTION_STREAM_TYPE` | `PRIMARY` | Tier da câmera servido ao painel na projeção |
