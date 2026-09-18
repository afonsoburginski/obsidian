---
tags:
  - attlas
  - sprint-33
  - prompt
aliases:
  - "Handoff da sessão de 16 de setembro"
  - "Prompt de continuação dos fixes de 16/09"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "Escrito em 16/09 para ser colado num terminal novo. ATUALIZADO na tarde de 16/09: as provas de tela de #3480, #3459, #3451 e #3452 foram fechadas, #3438 foi medida no caminho real, e dois achados novos viraram commit (8a7a13568c e a16696a4fb). O que sobrou está na seção final."
atualizado: 2026-09-16
---

# Prompt - continuar a validação e os fixes de 16 de setembro

---

Continuando trabalho no repo `attlas-2026`, branch `shared/chore/NO-CARD-sprint33-validation`.
Tudo commitado até `a16696a4fb`, nada pushado ainda, nada mergeado — merge é decisão minha, nunca sua.

## REGRAS DURAS — quebrar qualquer uma destas é falha grave

1. **NUNCA rode `nx build`, `nx test`, `nx lint`, `tsc`, `jest`, `npm test`, teste de integração ou
   `docker build`.** Esta máquina tem 15 GB e vive com 13 GB usados e 17 GB de swap. Roda e trava.
   O CI é o gate. Isto não é negociável e já foi repetido várias vezes.
2. **Commite sempre com `--no-verify`** — o hook do husky dispara eslint/prettier e isso também pesa.
3. **NUNCA mate nem reinicie o `nx serve web-attlas`.** O front é meu, eu subo e eu derrubo. Já
   aconteceu de você matar o meu e me deixar sem ambiente.
4. **NUNCA suba/derrube microsserviço ou container por conta própria.** Pergunte.
5. **Máximo um `nx serve` por vez** e ~12 containers. Antes de subir qualquer coisa, `free -h`.
6. **Tela se prova no navegador (Playwright MCP), não com `curl`.** `curl` dá 200 com build quebrado.
7. **Achado de verdade vira commit nesta branch**, referenciando no corpo o que o motivou. Sem PR
   nova, sem branch nova.
8. **Resposta curta.** Primeira frase é a resposta. Sem tabela/header/narração de investigação
   quando a pergunta é simples.
9. Se eu pedir a mesma coisa duas vezes, **faça**, não explique de novo por que não fez.

## Estado do ambiente agora

Rodando (subido por você numa sessão anterior, deixe como está a menos que eu peça):

- Containers: `attlas-kong attlas-kafka attlas-zookeeper attlas-minio attlas-mediamtx`
  `attlas-db-cameras attlas-db-organization attlas-redis-cameras attlas-redis-organization`
- `nx serve ms-cameras` → :3300 · `ms-video-analytics` → :3302 · `ms-organization` → :3001
- **`web-attlas` (:4200) NÃO está rodando** — vou subir eu mesmo. Não suba.

Login: `admin@atmansystems.com` / `change-me` → Entrar → organização **Atman** → **Acessar** no
sistema **Atman - Vitória**. Sem esse passo toda rota de módulo devolve pra `/organizations`.

Câmera da bancada que importa: **ATMN – EMBEDDED 080**, `10.1.1.80`,
id `00000000-0000-4000-8000-000000000101`, tela em
`http://localhost:4200/#/analytics/detection/00000000-0000-4000-8000-000000000101`.

## Gotchas descobertos hoje — não redescubra, custou horas

- **Firmware/reboot do device volta com o produtor Kafka DESLIGADO.** Quando as caixas somem e o
  badge vira Offline, o primeiro lugar a olhar é
  `GET http://10.1.1.80/local/atman_traffic_edge_atspm/api/producer` (digest `root:Sinales123`).
  Cura: `POST .../api/producer?enable=true`.
- **A API do analítico embarcado tem OpenAPI próprio** em `http://10.1.1.80:2001/openapi.json`, sem
  auth. O app é `atman_traffic_edge_atspm` 0.6.0, prefixo `/local/atman_traffic_edge_atspm/api`.
  A porta 8000 / prefixo `/horus/traffic-analytics` da nota antiga do vault é a geração ANTIGA
  (câmera DEMO, 10.1.1.78) — as duas convivem, por isso o prefixo virou lista no código.
- **O daemon do NX serve um snapshot de env cacheado.** Editar `.env` e reiniciar o `nx serve` NÃO
  basta: confira em `/proc/<pid>/environ`. Só matando o daemon
  (`node .../nx/dist/src/daemon/server/start.js`) o valor novo chega ao processo.
- **Kafka cai com znode órfão no Zookeeper** (`Error while creating ephemeral at /brokers/ids/1`).
  Cura: `docker restart attlas-zookeeper`, esperar uns segundos, **depois** `docker start attlas-kafka`.
- **`pkill -f "nx serve <ms>"` não pega o processo que segura a porta** (o executor tem outro
  cmdline). Confira com `ss -ltnp | grep :3300` e mate por PID, senão acumula zumbi e o serve novo
  fica em "Waiting for ... in another nx process".
- UI de referência do time de design: `http://localhost:4242/modulo/analitico/deteccao/cam-001`.

## O que já foi feito (10 commits, não refaça)

`4e818f8f` seed do ms-cameras (FK de videowall + upsert de credencial por cameraId) ·
`b36c6a08` compose aponta MinIO pro quay.io · `0f6d9ccc` `incidentsSettings` padrão na região do seed ·
`64f4faba` para de fabricar o campo `analytics` de câmera real na tela de Métricas ·
`49b4a428` remove a sobreposição "Sem sinal" do player da Detecção ·
`37bf1fdb` prova vários caminhos da API atspm (`ATMAN_ANALYTIC_API_PATHS`, lista) ·
`92fee710` colapsa as retentativas de stream numa só (era storm de 324 req/s, derrubava o FPS) ·
`cc8411cd` mostra o "Limiar automático" do Congestionamento, que era filtrado fora ·
`80e38681` ordena os incidentes pela ordem do design, vinda da constante e não do banco ·
`ba463164` classe fora do catálogo mostra o código, não a chave i18n.

Vault atualizado: `Docs/Analítico/Analítico - Embarcado x Servidor.md` e
`Docs/ms-cameras/Streaming/Streaming - Arquitetura.md` (seções "Estado em 16/09").

## O QUE FALTA — é o seu trabalho

### 1. Bug alcançável no streaming (backend, exige rebuild do ms-cameras — me peça antes)

`apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts:200` — se o ffmpeg morre DENTRO
da janela de grace (10s), o handler de `exit` só reconecta se ainda houver lease; com o conjunto
vazio nada acontece, o status não vira `STOPPED`/`ERROR` e a entrada fica `ACTIVE` com
`process = null`. O GET seguinte anexa, cancela o grace e devolve a URL WHEP **sem respawn** →
tile preto até o reaper agir 60s depois. Na mesma superfície, duas linhas de endurecimento:
`registry.create` sobrescreve a entrada sem limpar o `graceTimer` da anterior, e o callback do grace
nunca zera `state.graceTimer`.

### 2. Paridade com a UI do design na tela de Detecção — o que sobrou

- **"Métricas de desempenho"**: o design tem *Via associada*, *Faixa associada* e *Detector*; nós
  temos um campo só, e o valor que ele mostra é o DETECTOR com rótulo de faixa
  (`analytics.detection.field.lane.boundDetector` = "Detector {index} do controlador").
  `IVirtualLoopDetectorBinding` não carrega via nem faixa — precisa de join com o Modelo de Tráfego.
  Decida comigo se vale abrir isso.
- **"Tipo da região"**: temos esse campo e o design não. NÃO removi porque é o único jeito de definir
  o tipo da região. Confirme comigo antes de mexer.
- **Rótulos divergentes** (nosso × design): "Classes do incidente" × "Tipo de veículo";
  "Tempo mínimo parado" × "Tempo mínimo para considerar parado"; "Velocidade mínima de fluxo" ×
  "Velocidade mínima do fluxo"; "Tempo máximo parado" × "Tempo máximo parado permitido";
  "Limiar de congestionamento" / "Janela de observação" × "Limiar de detecção" / "Tempo de amostragem".
  Os nossos são discutivelmente mais corretos — não troque sem me perguntar.
- **"Ativação de laço"**: o design mostra *Posição da linha ativadora* e *Classes de objetos
  ativadores*; confirme na tela com o bloco LIGADO (em modo Editar) se os nossos aparecem.

### 3. Sprint 33 — provas de tela que faltam

Todas precisam do `:4200` no ar (eu subo) e de Playwright:

- **#3480** — abrir a mesma câmera em duas abas, ver UMA sessão ffmpeg/path no mediamtx, fechar a
  primeira e confirmar que a segunda continua. (Código já validado por leitura; falta a tela.)
- **#3459** — trocar entre as abas ATSPM ↔ Laço Virtual em **Métricas** e provar que a face que sai
  fica no DOM. (Código confirma `@if` + classe hidden; falta a tela.)
- **#3451** — câmera fora do ar: contar `GET .../thumbnail`, navegar e voltar, confirmar que não
  repete dentro de 5 min. (Código confirma cache com TTL em singleton de raiz; falta a tela.)
- **#3478 / #3462** — ACOM com câmera que tenha laço: mesma cor e mesmo número no cartão e no modal.
- **#3438** — só se prova com WebRTC do path do analítico embarcado. Se não der, diga isso e siga.

### 4. Pendências já levantadas e ainda abertas

- **Mapa da tela de Laço Virtual não abre sozinho** — o picker lateral sempre inicia em "Lista"; o
  mapa exige clique na sub-aba. É estado inicial/UX (`AtspmCameraPanelComponent`, `view` nasce
  `'list'` quando recebe `pickerCards`), não import quebrado. Precisa de decisão de produto.
- **Métricas e incidentes não chegam por WebSocket**, só HTTP na carga e a cada troca de filtro.
  Não existe gateway análogo ao `CameraStatusGateway` pra eles e **nenhuma spec pede** (UC-063,
  PROJ-016, UF-040/041/044/045). Se o requisito for real, é spec nova.
- **`/health/ready` do ms-cameras não checa dependência nenhuma** (só heap < 250MB), com Postgres,
  Kafka, Redis e mediamtx pendurados. Dívida do serviço, documentada no vault.
- **`HlsFilesController` serve um diretório que nenhum código escreve** (`HLS_OUTPUT_DIR`). Sobrou
  da fase anterior do pipeline.
- **Queda de FPS abaixo de 14**: a causa principal era o storm de retentativas (corrigido em
  `92fee710`). Se voltar a acontecer, meça de novo antes de concluir — o relay é `-c copy`, ~0,4 %
  de CPU, então não é ele.


---

## Sessão da tarde de 16/09 — o que fechou (não refaça)

### Provas de tela concluídas

- **#3480 — SIM.** Mesma câmera em duas abas: um path no mediamtx, um `ffmpeg`, dois leitores WHEP;
  fechada a primeira aba, a segunda continua tocando (1280x720, `currentTime` andando). O leitor que
  saiu some da lista do mediamtx ~20 s depois (renegociação do media server, não a lease). **Aba nova
  exige login próprio** — a sessão do Attlas não atravessa aba.
- **#3459 — SIM.** A face `app-atspm-panel` foi marcada no DOM antes da troca de aba e a **mesma
  marca** continua lá depois, com `metrics-panel--hidden`; a face de Incidentes, nunca visitada, não
  existe no DOM. Zero requisições de miniatura ao entrar na tela.
- **#3451 — SIM.** Miniatura da DEMO interceptada com 502: o `<img>` dela some (as outras duas
  seguem), e navegar para Dispositivos e voltar **não repete o pedido**.
- **#3452 — SIM.** Varredura do texto todo do DOM da Detecção: nenhum código cru, nenhuma chave de
  tradução vazada.
- **#3438 — PARCIAL, medida.** `captureTime` **não existe** no WebRTC do analítico embarcado (a chave
  nem aparece na metadata; só `receiveTime` e `rtpTimestamp`), em 8 quadros seguidos. O fallback está
  correto (`typeof !== 'number'` cobre `undefined`); o ganho da PR é **inerte** enquanto o relay
  `ffmpeg` estiver no meio sem repassar sender report. Fecha com as fases #3472 e #3489.
- **#3478 / #3462 — LEITURA.** Não dá para provar na bancada: nenhuma câmera local tem laço vinculado
  e o `ms-controllers` não está de pé. O que dá para afirmar: cartão e modal importam o **mesmo**
  `acomVirtualLoops`, e `components/controller-acom-loop-overlay/` não existe mais no repo.

### Achados que viraram commit

- `8a7a13568c` — **sessão de stream cujo relay morre sem espectador**. É o item 1 do handoff anterior,
  fechado: o fim do relay sem lease agora encerra a sessão, `registry.create` desarma o grace da
  entrada que substitui e o callback do grace zera `state.graceTimer`. Testes de unidade dos dois
  arquivos atualizados. **Não foi rodado nada local — o CI é o gate.**
- `a16696a4fb` — **os parâmetros do incidente não atravessavam o device**. Leitura copiava a chave
  snake_case do equipamento (a tela pede camelCase e mostrava "Não informado pelo analítico" para
  todo parâmetro de toda condição) e a escrita mandava só `enable`/`event_classes`, descartando
  limiar, janela e tempos que o operador ajustou. Conversão por forma nas duas pontas. Detalhe em
  [[Detecção - os parâmetros do incidente não atravessavam o device]].

### O que sobrou para a próxima sessão

1. **Provar a escrita dos parâmetros contra o equipamento** quando o ACAP voltar: salvar a Detecção
   com um limiar alterado e reler `GET .../object-detection-regions`. Se o app recusar chave que não
   conhece, o nome real sai do `openapi.json` da porta 2001.
2. **O ACAP da `10.1.1.80` está fora** desde as 14h38 (503 em `/local/atman_traffic_edge_atspm/api/*`,
   porta 2001 recusando, câmera respondendo ping). Reiniciar o app é decisão do usuário.
3. **Paridade com o design na tela de Detecção** (métricas de desempenho com via/faixa/detector,
   "Tipo da região", rótulos divergentes) — tudo continua **aguardando decisão**, nada tocado.
4. **Métricas e incidentes sem WebSocket** — confirmado na tela agora: só o socket do Vite e o
   `api/cameras/status/realtime`, e 25 s parado sem nenhuma chamada nova (não é polling, é carga
   única). Se o requisito é real, é spec nova.
5. As PRs ainda `a validar` da lista: #3402, #3431, #3444, #3453, #3460, #3461, #3464, #3471, #3472,
   #3474, #3476, #3487, #3489, #3490, #3492, #3440.

### Um detalhe do ambiente que custou tempo

A tela de Detecção **muda de fonte** conforme o equipamento responde: `getRegions` lê o device quando
ele está no ar e cai no cache do banco quando não está. Ler a tela duas vezes e ver valores
diferentes **não é bug da tela** — é isso. Confirme qual fonte está valendo antes de chamar de
regressão.
