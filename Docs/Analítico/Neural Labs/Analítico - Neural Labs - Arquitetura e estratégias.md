---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "Analítico - Integração com a Neural Labs"
  - "NEURAL SERVER"
  - "LPR da Neural Labs"
  - "Integração Neural Labs"
  - "Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)"
  - "Decisão - Analítico servidor Neural Labs no cadastro e mapeamento (25-09-2026)"
  - "Registro - documentação nova da Neural Labs comparada com o Attlas (28-09-2026)"
  - "Neural Labs - Arquitetura e estratégias"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Arquitetura e estratégias

Volta para [[Analítico - Neural Labs]].

## Resumo

O NEURAL SERVER, servidor de leitura de placas (LPR) da Neural Labs instalado no cliente, disca para a
porta TCP 17000 do `ms-video-analytics` e manda cada leitura como um quadro `NEURAL` com um XML
`<infoplate>`. O Attlas reconhece o servidor pelo IP de origem, acha a câmera pelo par `ComputerID` e
`CamID`, guarda a placa só como impressão HMAC e pareia as passagens para o tempo de viagem. No Attlas ele
é um analítico servidor: aparece em Analítico > Instâncias, na mesma página da instância embarcada, e o
`ms-cameras` serve as rotas públicas. A inferência é toda do NEURAL SERVER, e o domínio inteiro fica atrás
de `NEURAL_LPR_ENABLED`.

## Onde está no código

| Caminho | Papel |
| --- | --- |
| `apps/ms-video-analytics/src/neural-lpr/` | módulo do domínio: socket, instâncias, vínculo, medição e retenção; só carrega com `NEURAL_LPR_ENABLED=true` |
| `apps/ms-video-analytics/src/neural-lpr/infrastructure/tcp/neural-lpr-tcp.server.ts` | `NeuralLprTcpServer`: escuta a 17000, reconhece a instância pelo IP de origem e fecha o resto |
| `apps/ms-video-analytics/src/neural-lpr/infrastructure/tcp/neural-lpr-connection.ts` | uma conexão: processa um quadro por vez com o socket pausado e isola a falha de cada quadro |
| `apps/ms-video-analytics/src/neural-lpr/protocol/neural-frame.decoder.ts` | separa os quadros `NEURAL` + tamanho + XML pelo fechamento `</infoplate>` |
| `apps/ms-video-analytics/src/neural-lpr/protocol/neural-infoplate.parser.ts` | lê o `<infoplate>`, só com os campos de `neural-infoplate-field.enum.ts`; recusa DOCTYPE e motor que não é LPR |
| `apps/ms-video-analytics/src/neural-lpr/application/handlers/ingest-plate-read/ingest-plate-read.handler.ts` | `IngestPlateReadHandler`: acha o vínculo, converte a hora, grava e pareia |
| `apps/ms-video-analytics/src/neural-lpr/application/services/neural-camera-auto-linker.service.ts` | `NeuralCameraAutoLinker`: vínculo automático pelo `CamName` |
| `apps/ms-video-analytics/src/neural-lpr/application/services/lpr-observation-reporter.service.ts` | relata ao `ms-cameras` a evidência de que a câmera lê placa |
| `apps/ms-video-analytics/src/neural-lpr/infrastructure/persistence/prisma-plate-read.repository.ts` | grava a leitura, marca a passagem, cria os pares e atualiza as janelas numa transação SERIALIZABLE |
| `apps/ms-video-analytics/src/neural-lpr/infrastructure/scheduling/` | sincronia dos Trajetos a cada `LPR_JOURNEY_SYNC_INTERVAL_MS` e expurgo da retenção todo dia às 03:00 UTC |
| `apps/ms-video-analytics/src/database/schema/lpr/` | modelos Prisma do domínio, no banco `db-video-analytics` |
| `apps/ms-video-analytics/src/config/lpr-environment.ts` | limites e padrões das variáveis LPR |
| `apps/ms-cameras/src/server-analytics/` | associação da câmera (`CameraServerAnalytic`), rotas públicas da Neural Labs, cliente do `ms-video-analytics` e candidatas do vínculo automático |
| `apps/ms-cameras/src/lpr-capability/` | capacidade LPR da câmera (`CameraLprCapability`): declaração manual e evidência observada |
| `apps/web-attlas/src/app/modules/analytics-instances/` | linha e página da instância Neural Labs em Instâncias |
| `apps/web-attlas/src/app/modules/analytics/components/instance-creation-panel/` | caixa "Cadastrar servidor Neural Labs" do painel "Adicionar analítico" |
| `libs/contracts/src/lib/lpr/` e `libs/contracts/src/lib/camera-analytic/` | contratos das rotas e enums de origem do vínculo, divergência e resultado da importação |
| `tools/simulators/neural-server/` | simulador do NEURAL SERVER: `npm run tool:simulate-neural-server -- --help`; `--register` cadastra a instância |
| `docs/modules/analitico.md`, seções 3.8 e 3.9 | regra de negócio da medição e do vínculo |
| `docs/specs/cross-service/CROSS-149-neuralabs-lpr-journey-measurement.md` | desenho da medição |
| `docs/specs/cross-service/CROSS-170-neural-labs-server-analytic-mapping.md` | desenho da associação e do vínculo |
| `apps/ms-video-analytics/docs/atomic/INT-004-neuralabs-ingestion.md` | spec da ingestão |
| `apps/ms-cameras/docs/atomic/UC-223-neural-labs-camera-mapping.md` | spec das rotas públicas e do cadastro |

## Contratos

### Rotas públicas

Servidas pelo `ms-cameras`, atrás do Kong. Toda rota exige função ativa no Sistema.

| Rota | Permissão | Para quê |
| --- | --- | --- |
| `GET /api/cameras/analytics/neural-labs/cameras` | nenhuma além da função | página e listas: instâncias, câmeras com associação e vínculos, câmeras externas sem vínculo e resumo; `neuralAvailable` diz se o `ms-video-analytics` respondeu |
| `POST /api/cameras/analytics/neural-labs/instances` | `INSTANCES_MANAGE` | cadastra a instância já habilitada; auditoria `ANALYTIC_INSTANCE_REGISTERED`; IP já cadastrado volta 409 `NEURAL_INSTANCE_ADDRESS_IN_USE` |
| `PATCH /api/cameras/analytics/neural-labs/instances/{id}` | `INSTANCES_MANAGE` | liga ou desliga o vínculo automático (`autoLinkEnabled`), e nada mais; auditoria `ANALYTIC_INSTANCE_UPDATED` |
| `PUT /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings` | `INSTANCES_MANAGE` | vínculo manual de câmera externa; auditoria `CAMERA_NEURAL_LABS_MAPPED` |
| `POST /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings/import` | `INSTANCES_MANAGE` | vínculo pela lista do equipamento; auditoria `CAMERA_NEURAL_LABS_MAPPED` |
| `DELETE /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings/{cameraId}` | `INSTANCES_MANAGE` | desfaz o vínculo; auditoria `CAMERA_NEURAL_LABS_UNMAPPED` |
| `GET /api/cameras/{cameraId}/server-analytics` | nenhuma além da função | associação da câmera a cada analítico servidor |
| `PUT` e `DELETE /api/cameras/{cameraId}/server-analytics/NEURAL_LABS/manual` | `CAMERA_EDIT` | associar ou desassociar à mão, e voltar ao automático |
| `GET /api/cameras/{cameraId}/lpr-capability` | nenhuma além da função | capacidade LPR efetiva, com a declaração e a observação |
| `PUT` e `DELETE /api/cameras/{cameraId}/lpr-capability/manual` | `CAMERA_EDIT` | declarar ou retirar a capacidade LPR manual |

### Rotas internas

Exigem o cabeçalho `x-internal-service-token` e não passam pelo Kong. As que levam Sistema recebem o
cabeçalho `System-Id`.

| Rota | Serviço | Para quê |
| --- | --- | --- |
| `POST` e `GET /api/internal/lpr/neural-instances` | `ms-video-analytics` | cadastro e lista das instâncias, com `lastFrameAt` |
| `PATCH /api/internal/lpr/neural-instances/{id}` | `ms-video-analytics` | muda nome, IP, fuso, `enabled` ou `autoLinkEnabled`; IP, fuso e `enabled` fecham a conexão aberta da instância |
| `PUT /api/internal/lpr/neural-instances/{id}/camera-mappings` | `ms-video-analytics` | vínculo manual |
| `DELETE /api/internal/lpr/neural-instances/{id}/camera-mappings/{cameraId}` | `ms-video-analytics` | desfaz o vínculo; as leituras já gravadas ficam com a câmera |
| `GET /api/internal/lpr/neural-instances/{id}/unmapped-cameras` | `ms-video-analytics` | câmeras externas sem vínculo |
| `GET /api/internal/lpr/camera-mappings` | `ms-video-analytics` | vínculos do Sistema, em todas as instâncias |
| `GET /api/internal/lpr/camera-mappings/read-activity` | `ms-video-analytics` | última leitura e leituras da última hora de cada vínculo do Sistema |
| `GET /api/internal/lpr/segments/{segmentId}/measurement` | `ms-video-analytics` | medição de um trecho ([[Analítico - Neural Labs - Tempo de viagem]]) |
| `GET /api/internal/lpr/journeys/{journeyId}/measurement` | `ms-video-analytics` | medição de um Trajeto, trecho a trecho e o total pela soma das pernas |
| `GET /api/internal/lpr/journeys/{journeyId}/measurement-series` | `ms-video-analytics` | série de 30 min do total do Trajeto, no eixo da fonte externa |
| `POST /api/internal/lpr/journeys/{journeyId}/sync` | `ms-video-analytics` | sincroniza na hora os trechos de um Trajeto |
| `GET /api/internal/cameras/neural-labs/auto-link-candidates?camName=` | `ms-cameras` | candidatas do vínculo automático, em todos os Sistemas |
| `POST /api/internal/cameras/{cameraId}/lpr-observations` | `ms-cameras` | relato da evidência LPR de uma câmera |
| `POST /api/internal/cameras/lpr-capabilities/lookup` | `ms-cameras` | capacidade LPR de várias câmeras, para o status da medição |
| `POST /api/internal/cameras/lookup` | `ms-cameras` | confere se as câmeras de um vínculo manual são do Sistema (`CAMERA_NOT_IN_SYSTEM`) |

### Tópicos Kafka

Nenhum. A integração não publica nem consome tópico Kafka: o NEURAL SERVER fala TCP, e os serviços falam
HTTP interno.

### Tabelas do banco

| Tabela | Banco | O que guarda |
| --- | --- | --- |
| `NeuralInstance` | `db-video-analytics` | um NEURAL SERVER: nome, `sourceAddress` (IPv4, único), `timeZone`, `enabled`, `autoLinkEnabled` (padrão ligado) e `lastFrameAt`; sem `systemId` |
| `ExternalCameraMap` | `db-video-analytics` | vínculo do par `ComputerID` + `CamID` de uma instância com uma câmera do Attlas e o Sistema dela; `origin` `MANUAL` ou `AUTOMATIC`; único nos dois sentidos dentro da instância |
| `UnmappedExternalCamera` | `db-video-analytics` | câmera externa que mandou leitura sem vínculo: o par, `lastCamName`, `occurrences`, `firstSeenAt` e `lastSeenAt` |
| `PlateRead` | `db-video-analytics` | leitura aceita: câmera, impressão da placa, instante, confiança, sentido, `rawSpeed` e `passage`; única por instância, `ComputerID` e chave da leitura |
| `LprSegment`, `TravelTimePair`, `SegmentWindow` | `db-video-analytics` | trechos, pares e janelas de 5 minutos do tempo de viagem |
| `CameraServerAnalytic` | banco do `ms-cameras` | só a decisão manual de associação, uma linha por câmera e tipo de analítico servidor |
| `CameraLprCapability` | banco do `ms-cameras` | declaração manual e evidência observada da capacidade LPR, em colunas separadas |

### Variáveis de ambiente

Do `ms-video-analytics`, na ordem em que um operador liga o domínio. A explicação completa está em
`apps/ms-video-analytics/docs/ENV.md`.

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `NEURAL_LPR_ENABLED` | `false` | liga o domínio: módulo `neural-lpr`, banco próprio, rotas internas, sincronia de Trajetos e medição |
| `LPR_FINGERPRINT_KEY` | gerada pelo `setup:env` | chave HMAC da impressão da placa, com no mínimo 32 caracteres; gerada uma vez por ambiente e nunca trocada |
| `LPR_DATA_POLICY_APPROVED` | `false` | política de dados de placa aprovada; sem ela o boot recusa o socket ligado |
| `LPR_RETENTION_DAYS` | `30` | dias de retenção de leituras e janelas, de 1 a 365; sem ela o boot recusa o socket ligado |
| `NEURAL_LPR_TCP_LISTENER_ENABLED` | `false` | abre o socket que recebe placas reais; exige o domínio ligado, a política aprovada e a retenção |
| `NEURAL_LPR_TCP_PORT` | `17000` | porta em que o NEURAL SERVER disca |
| `NEURAL_LPR_TCP_MAX_FRAME_BYTES` | `2097152` (2 MiB) | teto de um quadro; acima dele a conexão cai |
| `NEURAL_LPR_TCP_IDLE_TIMEOUT_MS` | `0`, comentada | tempo sem dados para fechar a conexão; `0` nunca fecha |
| `NEURAL_LPR_TCP_MAX_CONNECTIONS` | `16` | conexões simultâneas no socket; a excedente cai com `connection_limit` |
| `LPR_PAIRING_WINDOW_SECONDS` | `3600` | maior tempo de viagem aceito entre origem e destino |
| `LPR_REREAD_WINDOW_SECONDS` | `10` | releitura da mesma placa na mesma câmera dentro deste prazo é a mesma passagem |
| `LPR_MIN_CONFIDENCE` | ausente (comentada com `80`) | piso do `Confidence`, de 0 a 100; definida, a leitura abaixo dela é recusada (`low_confidence`) e não é gravada; ausente, toda leitura conta |
| `LPR_JOURNEY_SYNC_INTERVAL_MS` | `300000` | intervalo da varredura do feed de Trajetos do `ms-traffic-model` |
| `LPR_OBSERVATION_REPORT_INTERVAL_MS` | `300000` | intervalo mínimo entre dois relatos de evidência LPR da mesma câmera |
| `NEURAL_LPR_AUTO_LINK_RETRY_INTERVAL_MS` | `60000` | intervalo mínimo entre duas tentativas de vínculo automático da mesma câmera externa |
| `NEURAL_LPR_INTERNAL_HTTP_TIMEOUT_MS` | `3000` | timeout de toda chamada interna do domínio |
| `LPR_INGEST_TRANSACTION_TIMEOUT_MS` | `5000` | prazo da transação que grava e pareia uma leitura |
| `LPR_INGEST_TRANSACTION_MAX_WAIT_MS` | `2000` | espera máxima por uma conexão do pool para essa transação |
| `DATABASE_URL` | banco `db-video-analytics` | exigida com o domínio ligado |
| `MS_CAMERAS_INTERNAL_URL` | `http://localhost:3300` | base das chamadas ao `ms-cameras`: candidatas do vínculo automático, relato e consulta de capacidade e conferência das câmeras do vínculo manual |
| `MS_TRAFFIC_MODEL_INTERNAL_URL` | `http://localhost:3010` | base do feed de Trajetos do `ms-traffic-model` |
| `INTERNAL_SERVICE_TOKEN` | gerado pelo `setup:env` | token das chamadas internas, nos dois sentidos |
| `MS_VIDEO_ANALYTICS_INTERNAL_URL`, no `ms-cameras` | `http://localhost:3302` | onde o `ms-cameras` alcança o `ms-video-analytics`; sem ela a leitura responde `neuralAvailable = false` |

### Métricas e logs

| Métrica | O que conta |
| --- | --- |
| `neural_lpr_frames_total{outcome}` | quadros: `accepted`, `size_mismatch`, `oversize` ou o motivo de recusa do XML |
| `neural_lpr_reads_total{outcome}` | leituras: `accepted`, `reread`, `duplicate`, `failed` ou o motivo de recusa |
| `neural_lpr_pairs_total` | pares de tempo de viagem criados |
| `neural_lpr_discarded_bytes_total` | bytes descartados fora de um quadro |
| `neural_lpr_connections_rejected_total{reason}` | conexões recusadas: `unknown_source` ou `connection_limit` |
| `neural_lpr_active_connections` | conexões abertas agora |
| `neural_lpr_last_frame_timestamp_seconds{instanceId}` | instante do último quadro de cada instância |
| `neural_lpr_observation_report_failures_total` | relatos de capacidade ao `ms-cameras` que falharam |
| `neural_lpr_auto_link_attempts_total{outcome}` | tentativas de vínculo automático: `linked`, `no_match`, `ambiguous`, `skipped` ou `failed` |

| Log (`event`) | Quando |
| --- | --- |
| `neural_lpr_listening` | o socket abriu, com a porta |
| `neural_lpr_connection_rejected` | conexão de IP sem instância habilitada, com o `sourceAddress` visto |
| `neural_auto_link_attempted` | cada tentativa de vínculo automático, com o par e o resultado |
| `neural_auto_linked` | vínculo automático criado |
| `neural_auto_link_failed` | a tentativa falhou, em geral por `ms-cameras` fora |
| `neural_lpr_read_failed` | erro ao gravar uma leitura; os outros quadros do pacote seguem |
| `neural_lpr_frame_failed`, `neural_lpr_server_error` | erro na fila da conexão ou no servidor TCP |

### Motivos de recusa de uma leitura

| Motivo | Quando |
| --- | --- |
| `malformed_xml` | XML inválido ou sem a raiz `<infoplate>` |
| `doctype_rejected` | XML com DOCTYPE |
| `engine_not_lpr` | `Engine` declarado e diferente de `LPR` (contêiner, `ACCR`) |
| `missing_field` | falta `DateHour`, `Plate`, `CamID` ou `ComputerID`; é o caso de todo XML curto |
| `invalid_plate` | a placa, em maiúscula e sem espaço nem hífen, não tem de 4 a 10 letras e dígitos |
| `unmapped_camera` | o par não tem vínculo na instância; a câmera vira pendente |
| `invalid_date` | `DateHour` fora de `AAAA-MM-DD HH:MM:SS[.mmm]`, ou horário que não existe no fuso da instância |
| `event_in_future` | mais de 60 s à frente do relógio do Attlas |
| `low_confidence` | `Confidence` abaixo de `LPR_MIN_CONFIDENCE`, quando ela está definida |
| `duplicate_conflict` | a mesma chave de leitura chega com placa, câmera ou instante diferente |

## Por que é assim

### Caminho de uma leitura

1. O NEURAL SERVER, no "Client mode", disca para a porta 17000 e manda cada leitura como `NEURAL` +
   tamanho + XML. O formato do fabricante está em [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]].
2. O socket compara o IP de origem com o `sourceAddress` das instâncias habilitadas. IP sem instância é
   fechado antes de qualquer byte ser lido. Toda réplica do serviço pode aceitar conexão, porque a chave da
   leitura deduplica e dispensa trava entre réplicas.
3. A conexão fica aberta. O Client mode não tem ACK e o NEURAL SERVER só descobre um fechamento na escrita
   seguinte, que se perde; por isso o Attlas nunca fecha conexão quieta e usa keepalive TCP de 30 s para
   achar o par morto.
4. Os quadros são processados um por vez, com o socket pausado: um banco lento segura o envio em vez de
   crescer memória. A falha de um quadro não leva os outros do mesmo pacote, porque o fabricante não
   reenvia.
5. Só o XML completo vale, porque o curto não traz `ComputerID`. `Engine` ausente conta como placa.
   `IncidenceID` vazio, como no exemplo do manual, é aceito com uma chave derivada do `CamID`, do instante e
   da impressão da placa, para que um reenvio caia na mesma linha.
6. A câmera sem vínculo vira pendente, com o `CamName`, antes de a hora ser conferida: um fuso errado ainda
   mostra quais câmeras estão lendo. A leitura é descartada e o vínculo automático é tentado em segundo
   plano ([[Analítico - Neural Labs - Vínculo de câmeras]]). Com vínculo, a leitura vai para a câmera do
   par.
7. O `DateHour` vem sem fuso, e o Attlas o converte pelo fuso cadastrado na instância. Leitura mais de 60 s
   no futuro é recusada: é o sinal de fuso da instância ou relógio do equipamento errado. `Speed` negativo
   (-1, não medida) fica nulo.
8. A gravação, a marca de passagem, os pares e as janelas entram numa transação SERIALIZABLE, então duas
   leituras simultâneas do mesmo carro não pareiam com a mesma passagem.
9. O relato de capacidade LPR ao `ms-cameras` e o vínculo automático não são esperados pelo socket: um
   `ms-cameras` lento nunca trava a ingestão.
10. Mudar `enabled`, IP ou fuso da instância fecha a conexão aberta dela, e o equipamento disca de novo
    sob a regra nova.

### Regras do dado

- **Leitura de placa não é incidente.** A tabela `INCIDENCE` do fabricante é leitura válida de placa. Os
  incidentes da Neural Labs são outro contrato, que ainda não chegou.
- **A placa nunca é guardada em claro.** Ela vira impressão HMAC-SHA256 com `LPR_FINGERPRINT_KEY`,
  escopada pelo Sistema da câmera, para que o mesmo carro nunca se correlacione entre Sistemas. Antes da
  impressão, a placa passa para maiúscula e perde espaço e hífen, sem trocar caracteres parecidos (`O` e
  `0`, `I` e `1`). Imagens e os outros campos do XML, como tipo, cor e marca do veículo, são descartados
  na leitura. Nenhuma resposta, log ou métrica expõe placa.
- **Capacidade LPR da câmera.** Toda leitura aceita comprova que a câmera lê placa; ausência de leitura não
  prova o contrário. O relato vai ao `ms-cameras` no máximo uma vez por
  `LPR_OBSERVATION_REPORT_INTERVAL_MS` por câmera. Declaração manual que discorda da observação vira
  `CONFLICT`, e nenhuma das duas é sobrescrita.
- **Releitura.** A mesma placa na mesma câmera dentro de `LPR_REREAD_WINDOW_SECONDS` é a mesma passagem; a
  primeira leitura é a passagem.
- **Instância sem Sistema.** A `NeuralInstance` não tem `systemId` de propósito: o servidor é da
  instalação, e o deploy é um cluster por cliente. O vínculo guarda o Sistema da câmera, e as candidatas
  do vínculo automático vêm de todos os Sistemas.
- **Cadastro pela tela.** A varredura de "Encontrados na rede" procura câmeras com analítico embarcado, e
  quem disca é o NEURAL SERVER, então ele nunca aparece nela. O cadastro é a caixa "Cadastrar servidor
  Neural Labs" do painel "Adicionar analítico", visível só quando a leitura da Neural Labs responde
  `neuralAvailable = true`. A explicação para usuário está em
  [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]].
- **Sem exclusão.** Não há rota de excluir instância. Desligar é `enabled = false`, só pela rota interna;
  na tela a linha da Neural Labs só tem a ação "ver", e o `PATCH` público só muda o vínculo automático.
- O tempo de viagem está em [[Analítico - Neural Labs - Tempo de viagem]].

## Armadilhas conhecidas

### Qual IP cadastrar

O IP de origem é o endereço que o container do `ms-video-analytics` vê, e ele depende do caminho:

| Caminho até o Attlas | O que o socket vê |
| --- | --- |
| IP público, com a 17000 aberta no security group | o IP público da rede do cliente, porque o DNAT do Docker preserva a origem |
| Tailnet | o gateway da rede do compose, `172.18.0.1` no dev.v2, porque o Tailscale do servidor mascara a conexão encaminhada ao container (medido com tcpdump) |
| O próprio servidor (`localhost:17000`) | o mesmo gateway, pelo docker-proxy |

Pela tailnet o IP não identifica o equipamento, então o NEURAL SERVER real tem de vir pelo IP público. Na
dúvida, deixar o equipamento discar e ler o IP no log `neural_lpr_connection_rejected`.

### Outras armadilhas

- **Servidores atrás do mesmo NAT** chegam com o mesmo IP, que só uma instância pode ter. Nesse caso cada
  servidor precisa de `ComputerID` diferente.
- **Formato JSON** na tela "Sending Connection": o Attlas aceita, com ou sem o cabeçalho `NEURAL`, mas o
  formato real do equipamento ainda não foi capturado. O XML completo segue como a configuração
  recomendada até a captura ([[Analítico - Neural Labs - Payloads e endpoints]]).
- **"Send Image" ligado**: a imagem em base64 pode passar do teto de 2 MiB e derrubar a conexão.
- **XML curto** (`SendLigthWeigthXML = True`): toda leitura é recusada como `missing_field`.
- **Trocar `LPR_FINGERPRINT_KEY`** faz as leituras de antes e de depois deixarem de parear.
- **Porta publicada pelo Docker** pula a cadeia INPUT do host: o `ufw` não fecha a 17000. Restringir no
  security group ou na cadeia `DOCKER-USER`.
- **Tamanho declarado no cabeçalho** é só informativo, porque o manual não diz se os separadores contam. O
  quadro termina no `</infoplate>`; tamanho que não bate conta em `size_mismatch`. Um corpo que nunca fecha
  é descartado no próximo cabeçalho completo, sem engolir os quadros de trás.
- **Fuso errado na instância** desloca toda leitura; se ele empurra a hora para o futuro, as leituras caem
  em `event_in_future`. As câmeras ainda aparecem em "Aguardando vínculo", e isso separa fuso errado de
  equipamento parado.

## Ligar um NEURAL SERVER real

O passo a passo está em [[Analítico - Neural Labs - Runbook]].

## Pendências

O que falta está em [[Analítico - Neural Labs - Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| LPR | leitura automática de placa de veículo |
| Client mode | modo de envio em que o NEURAL SERVER abre a conexão TCP com o sistema externo |
| Instância | um NEURAL SERVER cadastrado no Attlas, reconhecido pelo IP de origem |
| `ComputerID` | número do equipamento NEURAL SERVER, escolhido pelo operador na instalação |
| `CamID` | número da câmera dentro de um NEURAL SERVER |
| Impressão da placa | HMAC-SHA256 da placa normalizada com a chave do ambiente e o Sistema; a placa em claro não é guardada |
| Passagem | leitura que não é releitura da mesma placa na mesma câmera |
| `neuralAvailable` | campo da leitura pública que diz se o `ms-video-analytics` respondeu |
