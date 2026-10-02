---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
  - contrato
aliases:
  - "Cláusula 16.13 do contrato de Quito"
  - "Cláusula 16.13"
  - "Módulo de gestión de videowall (contrato)"
atualizado: 2026-10-01
---

# Videowall - Requisitos e SLA

Volta para [[Videowall externo (NovaStar H9)]]. Os requisitos autoritativos são `RF-VW-07` a `RF-VW-20` e
`RNF-CAM-14` a `RNF-CAM-19` de `docs/modules/cameras.md`, seção 3.2, que cita a cláusula abaixo. Como o
código os atende está em [[Videowall - Arquitetura e estratégias]].

## Cláusula 16.13 do contrato de Quito (texto literal)

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

A citação fica em espanhol, sem tradução ao lado: uma tradução seria outra paráfrase. A leitura em
português é a prosa dos requisitos em `cameras.md`.

## Obrigações, quem responde e o que o código entrega

| Obrigação | Responde | No código |
| --- | --- | --- |
| Integração com planos de resposta | RF-VW-14 | atendida: comando de plano projeta cena nativa com precedência |
| Reproduções predefinidas e operações programadas | RF-VW-14, RF-VW-15, RF-VW-18 | plano e grupos em rotação com operador atendidos; **programação horária sem produtor** e sequência sob projeção nativa diferida |
| Gestão completa desde a consola | RF-VW-07 a RF-VW-20 | atendida sobre o painel emulado; no H9 real, comando, fonte e camada confirmados, vídeo e brilho ainda não (aviso abaixo) |
| Câmeras IP no videowall | RF-VW-09 | atendida nos dois modos |
| Criação dinâmica de cenários desde a consola | RF-VW-02 com RF-VW-12 | atendida, lendo "escenario" como cena do VMS |
| Gestão centralizada sem interfaces intermediárias | RNF-CAM-14 | atendida |
| Integração por Ethernet/TCP/IP | RF-VW-07 com RNF-CAM-14 | atendida |
| RTSP e H.264 no mínimo | RNF-CAM-05, RF-INT-05, RNF-CAM-18 | atendida: toda fonte vai em RTSP com H.264, publicação fora disso é recusada |
| Sem dispositivos dedicados | RNF-CAM-14 | atendida |
| Layouts personalizados | RF-VW-01 com RF-VW-11 | atendida: a geometria da parede deriva da cena |
| Projetar câmeras IP e páginas web | RF-VW-09, RF-VW-10 | câmera atendida; página web só com operador |
| Operar pela interface da plataforma | RF-VW-07 a RF-VW-20 | atendida |

## Leituras registradas

- **"Escenario" é a cena do VMS, não o preset do equipamento**: a cláusula nunca diz preset, o verbo aponta
  para a consola, e composição salva no equipamento seria um segundo modelo para reconciliar. Se o cliente
  confirmar a outra leitura, RF-VW-13 volta ao escopo e o catálogo de capacidades cresce.
- **"Proyectar páginas web" com operador é o espelho**: a parede mostra a consola, que abriu a página. Sem
  operador não há caminho, porque nenhum card do chassi renderiza HTML. É a única lacuna declarada da
  cláusula (RF-VW-10).
- **"RTSP e H.264 no mínimo"** é a prova de conformidade de formato. Consequência de produto: câmera legada
  que só entrega MJPEG é espelhável e não é projetável.

## Precedência na parede

- Um ocupante por vez, espelho ou projeção (RF-VW-19). Tomar painel ocupado é recusado com quem detém e
  desde quando; supervisor pode tomar de operador, registrado.
- **Plano de resposta preempta o operador**, com registro e aviso ao deslocado (mesmo precedente do PTZ
  vindo de Emergências).
- **Exibição programada cede ao operador**, registrando que cedeu: agenda que atropela operador vira agenda
  desligada.
- Brilho é do painel inteiro, sobrevive a reinício e é reaplicado (RF-VW-16).
- Quem espelha é avisado de que está exposto e tem a liberação sempre ao alcance (RF-VW-20).

## Requisitos não funcionais do painel

| ID | O que exige |
| --- | --- |
| RNF-CAM-14 | comando direto pela rede, sem intermediário nem dispositivo dedicado; servir o espelho pela plataforma não é intermediário |
| RNF-CAM-15 | procedência por capacidade; presumida não é executada às cegas e é recusada com código estável |
| RNF-CAM-16 | escrita no painel não é reenviada automaticamente |
| RNF-CAM-17 | credencial do processador ilegível em leitura, log, métrica e erro |
| RNF-CAM-18 | formato da fonte fixado; piso de 480 linhas checado quando a resolução é conhecida; piso de taxa de bits pendente da banda provisionada |
| RNF-CAM-19 | endereço do caminho do espelho é segredo (nome não adivinhável, leitura só pelo equipamento cadastrado); caminhos de câmera projetada seguem a postura do streaming |

> [!warning] Onde o código não cumpre o requisito hoje
> - RF-VW-15: programação horária de exibição e de brilho não existe; o árbitro já sabe ceder, mas nada cria
>   ator `SCHEDULE`.
> - RF-VW-14: o deslocado por plano não recebe aviso, e o encerramento de projeção não entra no livro de
>   encerramentos.
> - RF-VW-09: no H9 de Quito a camada abre com a câmera, mas o vídeo ainda não chega ao painel
>   ([[Videowall H9 - vídeo não chega ao painel]]).
> - RF-VW-16: `screen/writeBrightness` responde 500 no firmware 1.9.7.1, então o brilho só funciona no painel
>   emulado.
