---
tags:
  - doc
  - analitico
atualizado: 2026-09-16
fonte: attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + "Anotações sobre Analítico de vídeo" (notas do user) + auditoria de código de 24/08 e 25/08
---

# Analítico - Embarcado x Servidor

Parte do [[Analítico]]. **A mesma capacidade de produto roda de duas formas**, e quase tudo o que confunde
neste domínio vem de tratar as duas como se fossem a mesma coisa. Esta nota separa: o que muda, o que não
pode mudar, e o que a câmera permite.

> [!important] Prazo externo: 18/09/2026, front e backend
> A entrega do Analítico de vídeo (front e backend) tem prazo externo fechado em 25/08: **18 de setembro
> de 2026**. Cobertura de sprint em [[Attlas - Sprint 30]], [[Attlas - Sprint 31]] e [[Attlas - Sprint 32]].

## A regra que organiza tudo

> [!important] O que muda por tipo de câmera é **onde** a capacidade roda, nunca a capacidade em si
> Virtual Loop é Virtual Loop nas duas formas, e ATSPM é ATSPM nas duas. O que a arquitetura da câmera
> decide é se dá pra rodar dentro dela ou se precisa de servidor. Por isso a matriz abaixo é de
> **execução**, não de funcionalidade.

## Matriz de compatibilidade por arquitetura de câmera

| Forma de execução | Não-Axis | Axis ARTPEC 7 (antigo) | Axis ARTPEC 8/9 (novo) |
| --- | --- | --- | --- |
| VL, app na câmera | Não | Sim | Sim |
| VL, servidor analítico | Sim | Sim | Sim |
| VL embutido no ATSPM | Só servidor | Não | Sim (app ou servidor) |
| ATSPM, app na câmera | Não | Não | Sim |
| ATSPM, servidor analítico | Sim | Sim | Sim |

Duas restrições resumem a tabela:

1. **Câmera não-Axis nunca executa app embarcado.** Tudo roda em servidor.
2. **ARTPEC 7 não executa o app de ATSPM**, e por consequência também não alcança o VL embutido do ATSPM
   dentro da própria câmera.

E uma exclusão que vale só no ARTPEC 8/9: **o app de VL e o app de ATSPM nunca rodam juntos na mesma
câmera**. Para ter os dois embarcados, instala-se só o ATSPM, que já entrega o VL embutido.

> [!warning] Nada disso é validado no código hoje
> `ARTPEC` só aparece no repositório em doc de codec de streaming (`MOD-004`), nunca como campo. Nem a
> `Camera` nem o `CameraManufacturer` têm arquitetura de processador, e `capabilities.dai` /
> `capabilities.virtualLoop` são duas flags independentes que a auto-detecção do cadastro seta com **o
> mesmo valor** (a presença do ACAP), sem nenhuma noção de exclusão mútua. Modelar isso é o card de
> compatibilidade da [[Attlas - Sprint 30]], que em 25/08 ganhou requisito explícito do user: a
> arquitetura tem que ser **identificada automaticamente pelo backend**, nunca selecionada manualmente no
> cadastro. `Camera.hardwareId` já é capturado pelo probe ONVIF e hoje é só ignorado - é o candidato
> natural a um lookup `hardwareId → geração ARTPEC` sem chamada de rede nova; sonda VAPIX nativa via
> `AxisDigestClient` (o mesmo client que já lê PTZ, zoom e bitrate configurado) fica como fallback para o
> que não mapear. Detalhe técnico completo na nota do card,
> [[Analítico - Compatibilidade por arquitetura de câmera]].

## O que muda entre as duas formas

| Eixo | Embarcado (app na câmera) | Servidor (container) |
| --- | --- | --- |
| **Onde processa** | No processador da própria câmera | Em instância nossa, fora da câmera |
| **Câmeras suportadas** | Só Axis, conforme a matriz acima | Qualquer câmera com stream |
| **Fonte do vídeo** | Nenhuma - o app já está dentro do device | Relay que o `ms-cameras` mantém, no substream de menor resolução (decisão do ADR de alimentação de vídeo, preservada do reescopo - ver [[Attlas - Sprint 31]]) |
| **Dono da geometria** | O device. `ms-cameras` lê e escreve por proxy HTTP, e resolve `region_id` para índice estável | O `ms-cameras`, que passa a persistir a região em banco. O analítico lê com cache e recarga sem restart |
| **Custo de encode na câmera** | Disputa: o mesmo hardware codifica o stream e roda a inferência | Zero na câmera; o custo é nosso |
| **Escala** | Uma câmera, um app | Câmeras por instância é número **medido**, não estimado, com política de saturação |
| **Unicidade de cadastro** | Um analítico por tipo por câmera. Instalar VL e ATSPM juntos é proibido | Sem essa restrição: a mesma câmera pode ter mais de um vínculo de servidor |
| **Atuação por ACOM** | Uma placa por caminho | Um analítico servidor pode alimentar **várias** placas ACOM |
| **Atualização do app** | Precisa de OTA no device (não existe hoje) | Deploy de imagem, como qualquer serviço |

## O que NÃO pode mudar: o contrato de ocupação

Esta é a decisão que impede o domínio de rachar em dois. **Os dois caminhos emitem a mesma forma de
evento de ocupação**, para o consumidor não precisar saber a origem:

- `attlas.analytics.region-occupancy`, com `IRegionOccupancyEvent` (`cameraId`, `regionIndex`, `symbols`,
  `counters` em RLE de `DETECTOR_SAMPLE_DURATION_MS`, `sampledAt`, `receivedAt`).
- O servidor publica direto; o embarcado republica no mesmo tópico, a partir do estado de ocupação que já
  calcula para o WebSocket.
- A partir daí o cano é único: o **analítico servidor** traduz o endereço (não há connector separado,
  ver [[Analítico - Arquitetura e estratégias]]) e o `ms-detector-history` persiste a série igual ao
  caminho do laço físico.

O contrato nasce como card próprio na [[Attlas - Sprint 31]]. **Estado em 31/08**: ele mora no
domínio `virtual-loop/` de `libs/contracts`, que já existia, e não num domínio `analytics/` novo -
já havia três domínios irmãos de analítico e um quarto seria espalhamento. O tópico é
`attlas.virtual-loop.region-occupancy`.

> [!note] A convergência do contrato continua valendo depois de CROSS-077
> A topologia fechou em um analítico servidor, mas o **caminho embarcado continua existindo** dentro
> do [[ms-cameras]] - ele roda na câmera, não em servidor nenhum. Então os dois produtores seguem
> sendo dois, e este contrato segue sendo o que os faz convergirem.

## Regras de desenho de região: quem decide é o motor, não o lugar

A geometria permitida depende do **motor de análise**, e é indiferente a onde ele roda:

| Motor | Região permitida |
| --- | --- |
| VL puro (app ou servidor de VL) | Padronizada e pequena |
| VL embutido no ATSPM (app ou servidor de ATSPM) | Pode ser grande, com uma linha |
| Demais funcionalidades do ATSPM (Tracker, DAI, TPM) | Arbitrária |

> [!warning] O contrato de hoje não suporta essa tabela
> `IObjectDetectionRegion.points` é `number[][]` (percentuais 0..100), **sem conceito de linha** e sem
> nenhuma validação - não há classe de validação nem `ValidationPipe` no controller que recebe as regiões.
> O front desenha sempre o mesmo quadrilátero de quatro vértices, para qualquer motor. Diferenciar
> geometria por motor é mudança de contrato, não de tela.

## Cardinalidades com ACOM

A ACOM é transporte (contato seco), não capacidade. As regras fechadas em alinhamento:

| Relação | Regra | Estado no código |
| --- | --- | --- |
| ACOM ↔ Controlador | **1:1**, por motivo físico (cabeamento) | Hoje é **N:N** via `AcomAssociation` com unique `(acomId, slot, channel)` - a mesma placa pode apontar para 8 controladores |
| ACOM → analíticos | Até **4** | Não existe relação ACOM ↔ analítico em lugar nenhum |
| Analítico → laços por câmera | Até **4** | Ver contradição abaixo |
| Analítico servidor → ACOMs | **Várias** placas por analítico (limitação a manter como regra) | Não existe relação |

> [!warning] "Quatro laços por câmera" contradiz o contrato atual
> `IVirtualLoopConfig` é hoje **uma configuração única por câmera** (`active`, `classes`,
> `delaySeconds`), sem geometria própria e sem multiplicidade - o docblock diz literalmente que o laço
> "não tem geometria própria: compartilha as regiões de detecção de objeto e é uma configuração única,
> por câmera, não por região". Suportar quatro laços por câmera é **redesenho de contrato**, não uma
> constante nova - e já está decidido nas notas de alinhamento, não é decisão em aberto. Ficou fora da
> Sprint 30 e da Sprint 31 por tamanho, como card próprio no sem prazo:
> [[SOFTWARE-2686 - Suportar até quatro laços virtuais por câmera|Analítico - Suportar até 4 laços virtuais por câmera]].

## Convergência: o que o operador vê

Do ponto de vista da tela, a origem do analítico deve ser um detalhe de cadastro, não um modo de operação
paralelo. O mesmo desenho de região, o mesmo overlay ao vivo, o mesmo healthcheck e a mesma série de
detector, independente de o processamento estar dentro da câmera ou num container nosso. O que muda é o
que o fluxo de cadastro oferece, e isso é [[Analítico - Fluxos]].

## Ver também

- [[Analítico]] · [[Analítico - Requisitos e SLA]] · [[Analítico - Arquitetura e estratégias]] · [[Analítico - Fluxos]]
- [[Attlas - Sprint 30]] · [[Attlas - Sprint 31]] · [[Attlas - Sprint 32]] (o escopo que fecha os buracos acima, contra o prazo de 18/09)

## Estado de campo em 11/09/2026: o que os dois aparelhos da bancada realmente têm

Levantamento feito direto nas câmeras, com `GET /axis-cgi/applications/list.cgi` por digest. Corrige
por observação o que até aqui era inferido, e é a informação que faltava para decidir modo de execução.

| Câmera | IP | Apps com `Status="Running"` |
| --- | --- | --- |
| ATMN - DEMO | 10.1.1.78 | `atman_virtual_loop_analytic` 1.2.4 e `traffic_edge_detection` 0.1.0 |
| ATMN - PTZ | 10.1.1.79 | `atman_virtual_loop_analytic` 1.2.2, mais o diagnóstico da Axis |

> [!warning] A DEMO tem DOIS apps de analítico rodando ao mesmo tempo
> A seção da matriz acima registra que o app de laço e o app de ATSPM nunca rodam juntos na mesma
> câmera. O que a DEMO tem rodando em paralelo é o app de laço e o `traffic_edge_detection`, que é o de
> detecção de objetos. Se esse terceiro app conta como o app de ATSPM para efeito daquela exclusão, a
> regra precisa ser revista com a squad de Visão Computacional, porque o aparelho está contrariando ela.
> Se é um app à parte, a matriz precisa ganhar a terceira coluna. Não decidi por conta: registrei.

### Por que as duas estão em Servidor hoje

Não é preferência, é o que o aparelho permite.

A **PTZ não tem o app de detecção de objetos**. Servidor não é escolha, é o único caminho. Aqui o
responsável pelo analítico estava certo.

A **DEMO tem o app**, e ele está detectando de fato: o estado do detector acusava 113.220 detecções
sobre 74.371 quadros, com o rastreador vivo e quase quatro horas de atividade. Mesmo assim ela também
está em Servidor, por dois motivos somados. O app de laço dela só reporta pelo protocolo TCP antigo do
attlas de 2025, discando para fora, e a topologia decidida em 31/08 aposentou o conector que escutaria
isso. E o app de detecção de objetos nasce com o produtor desligado e sem destino configurado, então
não publica em lugar nenhum.

### Onde a API do app de objetos realmente atende

Esta é a descoberta que destrava o caminho embarcado, e ela vale anotar porque custou tempo.

O app **não** responde sob o caminho que o backend procurava. Ele atende na **porta 8000**, sob o
prefixo **`/traffic-motion-detection`**:

- `info/analytic` devolve o id do analítico, que na DEMO é `ATMAN-7RGS2SIVI3E0EKFL`
- `status/analytic` devolve o estado do detector e do rastreador
- `cameras` devolve `[{"id":"self","uri":"vdo://self"}]`, ou seja, ele analisa o próprio sensor
- `classes` devolve o catálogo completo com os nomes em português

O backend procurava em `/horus/traffic-analytics`, que aparelho nenhum atende. O probe caía em 404, o
resolvedor concluía que a câmera não tem analítico, e a chave de origem nunca era descoberta. Esse é o
motivo de o consumidor do stream registrar zero fontes mapeadas. Corrigido tornando o prefixo uma lista,
porque tentar os dois só encontra mais aparelhos e nunca menos. O attlas de 2025 confirma o prefixo de
forma independente: o serviço externo dele monta exatamente esse endereço.

### A receita para o app publicar, herdada do attlas de 2025

São dois passos, na ordem, e estão no caso de uso de criação de detector de movimento daquele
repositório:

1. `PATCH` em `settings/analytic/streams` com o host, a porta e o tópico de destino
2. `POST` em `producers/self` habilitando o produtor

O primeiro diz para onde publicar, o segundo liga. No attlas de 2025 o produtor é acionado sob demanda,
quando alguém abre a tela, e por isso ele nasce desligado. Confirmei consumindo o tópico por 65 segundos
no broker de desenvolvimento: zero mensagens, ou seja, nenhuma instância está disputando o aparelho.

> [!warning] Esse endpoint de streams é só escrita
> Uma leitura nele devolve "not found". Não há como capturar o valor anterior para restaurar depois. O
> attlas de 2025 também não lia, sempre regravava no provisionamento. Quem for gravar precisa saber que
> a operação não é reversível por leitura.

E uma restrição de rede que decorre disso: a câmera alcança o host de desenvolvimento, mas não alcança
uma estação de trabalho, porque a rota até ela sai por Tailscale. O destino tem de ser um broker que o
aparelho enxergue, que é o mesmo que a variável de brokers do stream já aponta.

### Caixas de detecção: onde elas podem e não podem vir

Vale fixar, porque é a pergunta que mais se repete.

Pelo **caminho embarcado** as caixas já têm cano pronto: o consumidor do stream recebe o quadro e o
gateway de WebSocket já tem o método que as transmite para a tela. Falta só o aparelho publicar.

Pelo **caminho servidor** elas não existem como contrato. O analítico servidor calcula as caixas
internamente, mas publica apenas ocupação de região, e o domínio de contratos tem um tópico só, o de
ocupação. Levar caixa por esse caminho é tópico novo, produtor, consumidor e ponte para o WebSocket,
com limitação de taxa, porque caixa por quadro em cada câmera é volume considerável. É trabalho de
spec, não de configuração.

Consequência prática para a PTZ: como ela não tem o app de objetos e o caminho servidor não publica
caixa, **hoje não existe forma de mostrar caixa nela**.

Ver [[Analítico - Arquitetura e estratégias]] e [[Analítico - O que falta para fechar o módulo]].

## Estado em 16/09/2026: a EMBEDDED 080 corrige boa parte do que está acima

> [!important] O levantamento de 11/09 descreve uma geração de app que não é a que está em campo hoje
> A seção "Onde a API do app de objetos realmente atende" acima diz que o app atende na **porta 8000**
> sob **`/traffic-motion-detection`**. Isso continua valendo para a **DEMO** (10.1.1.78), que roda
> `traffic_edge_detection` 0.1.0. **Não vale para a EMBEDDED 080** (10.1.1.80), levantada em 16/09: ela
> roda outro app, mais novo, com outro nome, outra porta e outro prefixo. As duas descrições convivem —
> é por isso que o prefixo precisa ser lista, nunca valor único.

### O que a EMBEDDED 080 (10.1.1.80) realmente tem, verificado no aparelho em 16/09

`GET /axis-cgi/applications/list.cgi` (digest root/Sinales123):

| App | Versão | Status |
| --- | --- | --- |
| `atman_traffic_edge_atspm` ("ATMAN Traffic Edge Analytics") | 0.6.0 | Running |
| `atman_virtual_loop_analytic` ("ATMAN Virtual Loop Detection") | 1.2.6 | Running |

> [!note] Estado em 16/09 às 16h: o ACAP já é **0.7.0**
> A linha acima é a leitura das 14h. No fim da tarde o mesmo
> `GET /axis-cgi/applications/list.cgi` responde `atman_traffic_edge_atspm` **0.7.0**, `Running` - o
> aparelho foi atualizado no meio do dia. Detalhe na seção "Estado em 16/09 às 16h" ao final desta
> nota.

> [!warning] A EMBEDDED 080 repete a anomalia que a DEMO já tinha: dois apps de analítico rodando juntos
> A matriz acima registra que o app de VL e o app de ATSPM nunca rodam juntos na mesma câmera, e que
> para ter os dois embarcados se instala só o ATSPM, que já entrega o VL embutido. A EMBEDDED 080 tem
> os **dois instalados e em `Running`** ao mesmo tempo — agora com o app de ATSPM de verdade
> (`atman_traffic_edge_atspm`), não o `traffic_edge_detection` sobre o qual restava dúvida na nota de
> 11/09. Ou a regra precisa ser revista com a squad de Visão Computacional, ou a bancada está fora do
> padrão que a regra descreve. Não decidi por conta: registrei, igual a nota de 11/09 fez.

### A API do app novo: porta 2001, prefixo `/local/atman_traffic_edge_atspm/api`, e tem OpenAPI

O app 0.6.0 publica o **próprio contrato OpenAPI** em `http://<ip>:2001/openapi.json` (sem auth),
`title: "ATMAN Traffic Edge ATSPM 0.6.0"`. Isso dispensa sondagem: o contrato é legível direto do
aparelho. A porta 8000 nele **recusa conexão** (não é timeout, é `connection refused`) — o dialeto
horus daquela porta não existe nesse build.

O mesmo servidor de :2001 expõe **os dois dialetos**, o que a nota de 11/09 tratava como serviços
separados em portas separadas:

- `/local/atman_traffic_edge_atspm/api/…` — `health`, `status`, `regions` (GET/POST),
  `regions/{region_id}` (DELETE), `config` (GET/**PUT**), `metrics` (POST), `metrics/csv`,
  `metrics/latest`, `metrics/flow-model/{region_id}`, `incidents` (POST), `license` (GET/POST/DELETE),
  `producer` (GET/POST), `traffic-model` (GET/POST)
- `/horus/traffic-analytics/…` — `info/device`, `info/analytic`, `status`, `status/device`,
  `status/services`, `status/analytic`, `settings/streams` (GET/**PATCH**),
  `settings/analytic/streams` (PATCH), `settings/update-sources`, `classes`, `cameras`,
  `regions/{camera_id}/regions`, `producers/{camera_id}`, `incidents`, `metrics/{camera_id}`,
  `cameras/{camera_id}/regions`, `output/{path}`

O `config` de 16/09 traz, entre outros: `analytic_id=ATMAN-JP26CXE9IQ8BCQ6C`,
`source_id=1414dde8-b0fa-4a0b-a630-e144ac9f738c`, `vloop_enabled=true`, `incidents_enabled=true`,
`kafka_broker_ip=vitoria.attlas.atmansystems.com`, `kafka_broker_port=9094`,
`kafka_topic=traffic-motion-detection.detections`, `acom_enabled=true`, `signal_enabled=true`,
`controller_enabled=true`. `status` responde `regions_count=1`; `license` responde
`valid=true, valid_until=2028-09-14`; `producer` responde `{"enabled": true}`.

> [!note] Neste aparelho o produtor já nasce ligado
> A receita de dois passos da nota de 11/09 (PATCH em `settings/analytic/streams`, depois POST em
> `producers/self`) era necessária porque no app antigo o produtor nascia desligado. Na EMBEDDED 080 o
> `GET producer` já devolve `enabled: true` e o broker/tópico já estão gravados no `config`. Nada
> precisou ser escrito no aparelho para as caixas chegarem.

### O que estava quebrando o caminho embarcado nesta máquina, e não era código

Três camadas de configuração velha empilhadas, todas fora do repositório:

1. **`.env` local do `ms-cameras`** com `ATMAN_ANALYTIC_API_PATH=/local/traffic_edge_detection/api`
   (slug do app antigo). O default no código e o `.env.example` já estavam certos
   (`/local/atman_traffic_edge_atspm/api`) — só o arquivo local desta máquina tinha ficado para trás.
   Sintoma: `could not fetch /regions … -> HTTP 404` a cada 60 s, e o `resolveDeviceApi` caindo no
   primeiro candidato como fallback.
2. **Daemon do NX servindo um snapshot de env cacheado.** Editar o `.env` e reiniciar o `nx serve`
   **não** era suficiente: o processo continuava nascendo com a env antiga (conferido em
   `/proc/<pid>/environ`). Só depois de matar o daemon (`nx/dist/src/daemon/server/start.js`) o valor
   novo chegou ao processo. Vale para qualquer env var do `ms-cameras`, não só esta.
3. **Kafka caído por znode órfão no Zookeeper** (`Error while creating ephemeral at /brokers/ids/1`),
   que derruba o consumo do tópico de detecções por inteiro. Cura conhecida: `docker restart
   attlas-zookeeper`, esperar, e só então `docker start attlas-kafka`.

Com as três resolvidas, o log passa a dizer `analítico ao vivo recebendo quadros: broker=… source_id=…`
e as caixas aparecem no player.

### Correção levada para o repositório (branch `shared/chore/NO-CARD-sprint33-validation`)

`ATMAN_ANALYTIC_API_PATH` era **um valor único por processo**, enquanto o dialeto horus já provava uma
**lista** de prefixos (`ATMAN_HORUS_API_PATHS`). Numa frota com os dois builds convivendo — que é
exatamente o que a bancada tem hoje, DEMO no slug antigo e EMBEDDED 080 no novo — só a câmera que
casasse com o valor do `.env` respondia; a outra dava 404 em todos os transportes, indistinguível de
aparelho offline. Virou lista (`ATMAN_ANALYTIC_API_PATHS`), com produto cartesiano
`paths × endpoints` em `deviceApiCandidates`, mantendo `ATMAN_ANALYTIC_API_PATH` aceito como fallback
de uma linha só.

### O que a tela de Detecção realmente entrega hoje nesta câmera

Verificado no navegador em 16/09, com a EMBEDDED 080 selecionada:

- **Vídeo ao vivo**: toca, 720p, 25-30 FPS conforme o momento.
- **Caixas de detecção**: chegam e são desenhadas sobre o vídeo, com a região por cima.
- **Os 11 switches da tela funcionam e persistem** — o que engana é que eles só destravam **em modo de
  edição**, pelo botão `Editar` da tarja do player; fora dele todos aparecem `zDisabled` de propósito.
  Provado ligando "Veículo lento", salvando e conferindo `enabled: true` no
  `CameraAnalyticRegion.metadata.incidentsSettings` por SQL (e revertido depois).
- **O bloco de incidentes vinha vazio** porque o seed do `ms-cameras` não gravava `incidentsSettings`
  no metadata da região. Corrigido no seed com o preset de região `VEHICLES`
  (`WRONG_WAY`, `STOPPED_FLOW`, `CONGESTION` ligados; os outros cinco presentes e desligados),
  espelhando `REGION_TYPE_ENABLED_INCIDENTS` + `INCIDENT_PARAM_SCHEMA` do front.

### Pendências reais que sobraram

- **Queda de FPS abaixo de 14** relatada pelo usuário: não consegui diagnosticar ao vivo porque o
  aparelho saiu do ar no meio (atualização de firmware avisada). O relay local não é suspeito — o
  `ffmpeg` roda com `-c copy` (remux puro, ~0,4 % de CPU), então a queda vem de antes dele: ou do
  encode na própria câmera disputando SoC com a inferência, ou do link. **A investigar com o aparelho
  de volta.**
- **Mapa da tela de Laço Virtual** não abre sozinho: o picker lateral sempre inicia em "Lista" e o mapa
  exige um clique na sub-aba. É estado inicial/UX, não import quebrado
  (`AtspmCameraPanelComponent`, `view` nasce `'list'` quando `pickerCards` é passado).
- **Métricas e incidentes não chegam por WebSocket**, só por HTTP na carga e a cada troca de filtro.
  Não há gateway análogo ao `CameraStatusGateway` para eles, e **nenhuma spec pede** (UC-063, PROJ-016,
  UF-040/041/044/045 não mencionam tempo real aqui). Se o requisito for real, é spec nova, não ajuste.

### Estado em 16/09 às 15h: o ACAP ficou 503 durante uma atualização, e duas leituras que a queda permitiu

**O app do analítico parou de responder**: `/local/atman_traffic_edge_atspm/api/*` devolvia **503**
em todos os caminhos e a **porta 2001 recusava conexão**, com a câmera respondendo ping normalmente.
A tela mostrava "Offline" e "Analítico ao vivo sem quadros" - era o equipamento, não a tela.

> [!important] Não era queda: era a atualização de 0.6.0 para 0.7.0 em curso
> Confirmado por `GET /axis-cgi/applications/list.cgi` no fim da tarde: o app voltou sozinho, em
> **0.7.0** e `Running`. O 503 das 14h38 é a janela da atualização, não falha do aparelho, e não
> exigiu decisão nenhuma de reinício.

**A queda expôs de onde a tela lê.** `GET /cameras/:id/object-detection-regions` lê o **device**
quando ele responde e cai no **cache do banco** quando não responde. Com o app no ar, todo parâmetro
de incidente aparecia como "Não informado pelo analítico"; com o app fora, os mesmos campos vinham
preenchidos. A causa tem **duas pernas**: a grafia das chaves nunca era traduzida, e o device não
reporta parâmetro nenhum - detalhe e correção em
[[Detecção - os parâmetros do incidente não atravessavam o device]].

**`captureTime` não existe neste caminho.** Medido no `requestVideoFrameCallback` do WebRTC do
analítico embarcado: a chave nem aparece na metadata (só `receiveTime` e `rtpTimestamp`), em 8
quadros seguidos. O relay `ffmpeg` no meio não repassa o sender report que o navegador usaria para
resolver o instante de captura, então a #3438 está correta mas **inerte nesta topologia** - é o que
as fases #3472 e #3489 precisam fechar.

**Confirmado na tela, não só por leitura**: métricas e incidentes não chegam por WebSocket. Na tela
de Métricas o navegador abre só o socket do Vite e o `api/cameras/status/realtime`, e 25 s parado não
produzem **nenhuma** chamada nova - não é polling, é carga única.

### Estado em 16/09 às 16h: ACAP 0.7.0 no ar, e o que ele reporta e o que não reporta

`GET /axis-cgi/applications/list.cgi` na EMBEDDED 080 (10.1.1.80) responde
`atman_traffic_edge_atspm` **0.7.0**, `Status="Running"`. A versão 0.6.0 descrita acima foi
substituída no meio do dia; o endereço não mudou (porta **2001**, prefixo
`/local/atman_traffic_edge_atspm/api`, `openapi.json` sem auth continua servido).

**O que o device reporta por condição de incidente**: `enable` e `event_classes`. Só isso.

**O que ele não reporta**: **nenhum parâmetro**. Tempo mínimo parado, velocidade mínima de fluxo,
tempo máximo parado, limiar de congestionamento e janela de observação são **aceitos na escrita** (o
campo `incidents` do schema `RegionCreate` é objeto livre, `additionalProperties: true`, no
`openapi.json` do próprio app) e **nunca voltam na leitura**. É por isso que a tela mostrava todo
parâmetro como "Não informado pelo analítico" com a câmera online e preenchido com ela offline, quando
o cache do banco respondia no lugar. Correção em
[[Detecção - os parâmetros do incidente não atravessavam o device]] (commit `32b0c9f190`): o merge do
`withStoredPresentation` deixa o equipamento mandar no que ele reporta e completa o resto com a linha
guardada, sem inventar condição que ele não reporta.

**O que a config global traz** (`GET /local/atman_traffic_edge_atspm/api/config`): `stops_threshold_vel`,
`sampling_period`, `space_occupancy_interval`, `track_buffer*`, `vloop_*`,
`kafka_broker_ip=vitoria.attlas.atmansystems.com:9094`,
`source_id=1414dde8-b0fa-4a0b-a630-e144ac9f738c` e `analytic_id=ATMAN-JP26CXE9IQ8BCQ6C`.

> [!question] Se o limiar por incidente não existe no device, quem avalia a condição?
> O aparelho tem limiar **global** na `config` e não devolve limiar **por incidente**. Ou ele avalia
> a condição com a config global - e o que a tela escreve por incidente não muda o comportamento
> dele - ou quem avalia é o Attlas, e aí o valor por incidente é nosso por desenho. A resposta decide
> se a tela de Detecção está configurando algo que surte efeito. Pergunta aberta para a squad de
> Visão Computacional; não se responde por leitura do nosso código.

> [!warning] Divergência de 16/09: `SLOW_MOVING` ligado no device, desligado no nosso banco
> O device reporta `slow_moving` com `enabled=true` e a linha local em
> `CameraAnalyticRegion.metadata.incidentsSettings` tem `false`. Não é defeito do merge: é o
> equipamento sendo a autoridade sobre o que ele reporta. Com o fix aplicado, a tela mostra o estado
> do aparelho - Contramão, Veículo parado, Veículo lento e Congestionamento ligados, com 5 s, 5 km/h,
> 60 s, 10 km/h, 40 veíc/km e 360 s.

### Estado em 16/09 às 13h: a subida para 0.7.0 resetou o device

A atualização do ACAP de 0.6.0 para 0.7.0 **não preserva configuração**, e isso custou uma tarde de
diagnóstico. O que ela fez na EMBEDDED 080:

- **Trocou o `source_id`** (`1414dde8-...` virou `8c288df8-...`). O `source_id` é como um quadro no
  broker acha a câmera: com o vínculo antigo no banco, o `ms-cameras` seguiu casando um id que
  ninguém publica mais, o overlay ficou vazio e o analítico leu Offline - em silêncio, com o
  equipamento saudável publicando ao lado. Corrigido no commit `77b5d3fc8a`: a leitura de `/config`
  que a tela já faz agora realinha os dois lados do vínculo.
- **Desligou o produtor Kafka** de novo (`GET /api/producer` devolvia `{"enabled":false}`). É o
  mesmo gatilho já anotado: reinício do app volta com o produtor desligado. Cura:
  `POST /api/producer?enable=true`.
- **Resetou a região**: id novo (`69182dbe-...`), **sem nome**, 23 classes de fábrica, 50 m de
  comprimento e **uma** condição de incidente (`wrong_way`) no lugar das oito. O banco do Attlas
  manteve a configuração real; o equipamento é que a perdeu.

Consequência prática: a tela mostra o que o device reporta, então ela passou a mostrar uma condição
só - e está certa em mostrar. **Restaurar a configuração no equipamento é escrita no device**, que a
sessão não conseguiu fazer (o classificador do harness recusa escrita em recurso compartilhado). O
payload pronto ficou em `/tmp/claude-1000/region-payload.json`.

Regra que fica: **toda atualização de firmware ou de ACAP exige reprovisionar a câmera** - produtor,
`source_id` e a região inteira. Conferir na ordem `/producer` -> `/status` -> `/regions` antes de
concluir que o Attlas está com defeito.
