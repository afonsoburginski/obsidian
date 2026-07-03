# Problemas identificados

> [!abstract] Para que serve este documento
> Registro direto dos problemas de infraestrutura já identificados e ainda sem correção aplicada. Para cada um: o que é, se o Kubernetes resolve sozinho, e uma sugestão de correção. O **foco é deixar os problemas claros**; as sugestões de correção são caminhos possíveis, não decisões fechadas. Escrito para a reunião do time, em linguagem direta e sem depender de conhecimento prévio de Kubernetes.
>
> - **Versão:** 3.0 · **Data:** 02/07/2026

## Glossário rápido (o mínimo para acompanhar)

| Termo                           | O que é                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pod / cópia**                 | Uma instância do serviço rodando. Um serviço pode ter várias cópias ao mesmo tempo.                                                                       |
| **Réplica**                     | Cada cópia a mais do mesmo serviço. "2 réplicas" = 2 cópias iguais rodando lado a lado.                                                                   |
| **Escalar horizontal**          | Criar mais cópias do serviço para aguentar mais carga.                                                                                                    |
| **KEDA**                        | O automático que cria e remove cópias conforme a carga sobe ou desce (aqui, medindo a CPU).                                                               |
| **Monitoramento (healthcheck)** | O `ms-cameras` mantém um canal aberto com cada câmera para saber se está viva e receber eventos (queda de rede, tamper, falha).                           |
| **WebSocket**                   | Conexão que fica aberta o tempo todo entre duas pontas para troca ao vivo. Aqui aparece nos dois sentidos: navegador para serviço, e serviço para câmera. |
| **Broadcast**                   | Quando o serviço avisa de uma vez todos os clientes interessados (todos que abriram a tela daquela câmera).                                               |

---

## A raiz comum dos dois problemas

Os dois problemas abaixo têm a **mesma causa**: esses serviços guardam estado na memória de cada cópia e **não se coordenam entre as cópias**. Enquanto existe uma cópia só, o problema não aparece. Quando o KEDA cria réplica, cada cópia refaz o trabalho por conta própria.

Esses serviços **precisam escalar** (o `ms-cameras`, em especial, é pesado de CPU por causa do vídeo/HLS), então **limitar réplica não é a solução**. A solução é **fazer as cópias se coordenarem**, para que a escala seja segura. O que muda entre os dois problemas é **como** essa coordenação acontece (cada seção explica).

---

## Problema 1 (o mais perigoso): o monitoramento multiplica os canais na câmera

### O que é

Na subida, **cada cópia** do `ms-cameras` abre um canal permanente com **cada câmera** para monitorar a saúde (WebSocket VAPIX na Axis, ou pull-point ONVIF) e fica dando ping a cada 5 segundos. Isso é feito por cada cópia de forma independente. A trava que evita canal duplicado vale só dentro da mesma cópia, não entre cópias.

### O que quebra

- **A câmera recebe um canal por cópia.** Se o serviço tem 5 cópias, cada câmera passa a receber **5 canais abertos e 5x os pings**, em vez de 1. Isso consome o recurso do dispositivo, que aguenta pouquíssimas conexões simultâneas. No limite, derruba a câmera.
- **A escala do parque multiplica tudo.** Hoje o healthcheck bate em algumas dezenas de dispositivos, mas em produção serão **centenas ou milhares** de câmeras e controladores. Com N cópias, é N vezes esse total de canais. Esses canais **não podem se multiplicar** quando o microsserviço escala horizontalmente.
- **Pior na hora da escala.** Quando o KEDA sobe uma cópia nova, ela abre de uma vez um canal com **todos** os dispositivos. Escalar de 2 para 6 cópias é uma enxurrada de conexões novas caindo em cima de todo o parque ao mesmo tempo.

### Isso se resolve sozinho (o Kubernetes resolve)? **Não.**

O Kubernetes não sabe que "só uma cópia deve monitorar cada câmera". Ele só cria cópias, e cada cópia refaz tudo. O "quadro compartilhado" (Redis) do Problema 2 **também não resolve isto**: aquilo é para o lado do cliente. Aqui o problema é o serviço abrindo conexão para o dispositivo.

### Sugestão

O `ms-cameras` precisa escalar, então limitar réplica não é opção. Para escalar **sem** multiplicar os canais na câmera, o monitoramento precisa de um **dono único por câmera**, por um de dois caminhos:

- **Líder único:** uma cópia é a dona do monitoramento e faz tudo; as outras só atendem tela/REST. Se a dona cai, outra assume. Câmera sempre com 1 canal. Simples, mas o monitoramento não se distribui (uma cópia aguenta todas as câmeras).
- **Divisão (sharding):** repartir as câmeras entre as cópias, cada câmera monitorada por uma cópia só. Espalha a carga e mantém 1 canal por câmera. Mais trabalho, mas escala de verdade.

Em qualquer um dos dois, o ideal é **separar o monitoramento (trabalho de fundo) do gateway REST/WebSocket**, para escalar o gateway livremente sem arrastar o monitoramento junto. O mesmo padrão vale para qualquer serviço que mantenha canais com dispositivos em campo (controladores, por exemplo), não só câmeras.

> [!note] A regra dura, independente da solução escolhida
> O número de canais em cada dispositivo tem que continuar **1**, não importa quantas cópias o serviço tenha. Com centenas ou milhares de câmeras e controladores, os canais de healthcheck **não podem se replicar por cópia** quando o microsserviço escala. As duas opções acima são sugestões de como garantir isso; a decisão do caminho é do time.

---

## Problema 2: o aviso ao vivo não chega em todos os clientes

### O que é

Três serviços usam WebSocket para mandar atualização ao vivo aos navegadores: **`ms-cameras`** (status das câmeras), **`ms-pmv`** (conectividade dos painéis) e **`ms-communication-channels`** (notificações). Cada cópia guarda **só na própria memória** a lista de quem está conectado a ela.

### O que quebra

- **O aviso não chega em todo mundo.** Se o cliente está ligado na cópia A e o aviso nasce na cópia B, o cliente não recebe. As cópias não conversam entre si.
- **Na notificação é pior:** ela é descartada em silêncio (sem erro) quando o usuário está conectado em outra cópia.
- **É difícil de perceber:** só aparece quando a carga sobe e o KEDA cria réplica, e some quando a carga cai.

### Isso se resolve sozinho (o Kubernetes resolve)? **Não.**

O Kubernetes não tem como fazer um aviso de uma cópia chegar na outra (isso é lógica da aplicação). E "grudar o cliente numa cópia" (sticky session) também não resolve: ajuda a conexão a se manter estável, mas não faz o aviso cruzar de uma cópia para outra, e ainda piora a distribuição de carga. Um detalhe que medimos: **só criar cópia não distribui a carga** (ver teste).

### Testamos no servidor (02/07/2026)

Rodamos o teste no ambiente real (cluster `attlas-quito`), com o `ms-cameras`, que já rodava com 2 cópias:

1. Abrimos 12 conexões na mesma câmera. Caíram **9 numa cópia e 3 na outra**. A "sala" daquela câmera está partida, cada cópia enxerga só a sua metade.
2. Geramos carga. O KEDA **criou cópias de 2 até 6** (o automático funciona).
3. As **4 cópias novas ficaram com zero conexões**. Toda a carga continuou nas 2 antigas, no talo de CPU. **Criar cópia não aliviou nada** (conexão WebSocket é longa e não muda de cópia depois de aberta).
4. No pico, as cópias sobrecarregadas **derrubaram as conexões abertas**, o que vira uma onda de reconexões no pior momento.

### Sugestão

O serviço precisa escalar, então a solução não é limitar réplica, e sim as cópias compartilharem quem está conectado. Para o aviso de uma cópia chegar em todas, ligar um **"quadro compartilhado"** entre elas (o adapter Redis do Socket.IO). Passos:

1. **Subir o Redis do `ms-cameras`**, que hoje **nem existe**.
2. Ligar o adapter Redis do Socket.IO nos três serviços.
3. No `ms-communication-channels`, saber quem está online via Redis (não pela memória de cada cópia).
4. Escalar pela **métrica certa** (não pela CPU do gateway), com limite de conexões por cópia e encerramento gracioso, para a cópia nova de fato receber carga.

---

## Por que ainda não estourou

Não é que o risco esteja controlado, é que o ambiente atual ainda não o expõe:

- **A carga hoje é baixa,** então o serviço fica quase sempre em uma cópia e os dois problemas não aparecem. Assim que a carga crescer e o KEDA escalar, os dois aparecem.
- **O frontend reassina ao reconectar,** então o navegador não fica órfão de sala quando a conexão cai e volta.
- **O `ms-communication-channels` encerra as conexões com dreno no desligamento,** o que deixa o scale-in mais limpo do lado das notificações.

Nada disso corrige o fundo. São só o motivo de os problemas ainda não terem estourado, e a razão de precisarmos resolvê-los antes de confiar na escala que já está ligada.

---

> [!important] O ponto para a reunião
> Esses serviços **precisam escalar**, então limitar cópia não é solução. Nenhum dos dois é bug de código solto nem coisa que o Kubernetes conserta sozinho: o trabalho é **fazer as cópias se coordenarem**, de dois jeitos diferentes, um dono único por câmera (Problema 1) e um quadro compartilhado entre as cópias (Problema 2). É um projeto de arquitetura da aplicação, não de cluster, e é **pré-requisito para confiar na escala que já está ligada hoje**. Entre os dois, o **Problema 1 é o mais urgente**, porque atinge o hardware da câmera em campo.

---

## Apêndice técnico (para quem for implementar)

Detalhe que não precisa entrar na discussão da reunião, mas fica registrado.

**Problema 1 (monitoramento por dispositivo):**

- `CameraHealthBootstrapService` (`OnApplicationBootstrap`) roda em cada pod, carrega as câmeras `OPERATIONAL`/`TESTING` e chama `CameraHealthWorker.startMonitoring` por câmera. Cliente = `AxisWsClient` (WebSocket VAPIX, lib `ws`) ou `OnvifPullPointClient`. Ping a cada `PING_INTERVAL_MS` (default 5000 ms).
- A guarda `if (this.clients.has(cameraId)) return` é um `Map` em memória, por pod. Não há coordenação entre pods (sem leader-election, sem lock distribuído, sem sharding).
- Correção "escalar": leader-election (lock em Redis ou Postgres) ou sharding por `cameraId`; idealmente extrair o worker de monitoramento para um deployment próprio (1 réplica ou com sharding), separado do gateway.

**Problema 2 (broadcast para o cliente):**

- Gateways: `StreamingGateway` e `CameraStatusGateway` (`apps/ms-cameras`), `PmvStatusGateway` (`apps/ms-pmv`), `NotificationsGateway` (`apps/ms-communication-channels`). Todos com adapter Socket.IO **em memória**.
- A fonte dos eventos é local ao pod: `@OnEvent` do EventEmitter (ms-cameras), poller + handler (ms-pmv), registro de sockets por pod (ms-communication-channels). Um `server.to(sala).emit()` roda em um pod só e alcança só os sockets daquele pod. No `NotificationsGateway.emitToUser`, o teste `registry.hasActive(userId)` é por pod e devolve `false` (descarte silencioso) quando o socket do usuário está em outra cópia; e o consumidor Kafka que dispara o envio também escala, então quase nunca é o pod onde o socket está.
- Contradição chart x spec: o bloco `scaling` do `infra/helm/attlas/values.yaml` escala `ms-cameras` até 8, `ms-communication-channels` até 4, `ms-pmv` até 2 (gatilho CPU); a spec do `ms-cameras` (`docs/atomic/UC-09-camera-status-websocket.md`, `SPEC.md`, `PROJ-001`) pede `replicas: 1`.
- Sticky sessions: hoje o handshake não quebra porque o frontend força `transports: ['websocket']` (conexão única, sem o vai-e-volta do long-polling). As rotas WebSocket no `kong.yml` são allowlist puras, sem afinidade de sessão. Se reabilitarem o fallback `polling` (o Kong já roteia GET/POST para ele), o handshake passa a saltar entre cópias e quebra com "Session ID unknown".
- Correção "escalar": provisionar `redis-cameras` (hoje inexistente: o `ioredis` do `ms-cameras` fica em `ECONNREFUSED` contínuo, o que ainda entope o log do pod e gasta CPU à toa); `@socket.io/redis-adapter` via `IoAdapter` custom no `main.ts` dos três serviços; no `ms-communication-channels`, presença via Redis no lugar do registro por-pod; escalar pelo trabalho real (não CPU do gateway), com limite de conexões por pod e encerramento gracioso.

**Detalhe do teste (02/07/2026, cluster `attlas-quito`):** ScaledObject do KEDA `min 1 / max 6`, gatilho CPU 60%, `ms-cameras` já em 2 cópias em nós distintos, Service sem afinidade. 12 clientes na sala `camera:TESTROOM` caíram 9/3 entre as duas cópias (contagem por `/proc/net/tcp6`). Flood de 80 conexões subiu a CPU de 41% para ~497% do request; o KEDA levou o deployment de 2 para 3 e depois para 6 (teto) em ~40 s. As 4 cópias novas ficaram com 0 conexões e CPU ociosa (~40 mCPU); as 2 originais ficaram presas em ~500 mCPU (throttling no limite) segurando tudo. Durante o pico as 12 conexões de observação caíram em ondas (13:12 a 13:14). Scale-in respeita a janela de estabilização (~5 min). Ambiente de teste limpo ao final.

**Sobre limitar réplica:** não é a solução. Os serviços precisam escalar, então a correção é a coordenação descrita acima (dono único por câmera + adapter Redis). Reduzir o teto de réplicas no bloco `scaling` do `values.yaml` serve apenas como **contenção emergencial** se um dispositivo estiver sendo prejudicado agora, nunca como plano.

**Em aberto:** confirmar o plano de mídia do HLS (segmentos servidos por qual cópia; o MediaMTX é componente à parte, em `infra/helm/attlas/files/mediamtx.yml`). Sem isso, o scale-out do `ms-cameras` não é seguro nem depois do adapter.

---

## Referências

- Escala de pods (KEDA) e o que escala ou não: [[01-VISAO-GERAL]] (seção 4).
- Dimensionamento e o teto por worker: [[02-DIMENSIONAMENTO]].
- Modos de falha com prevenção conhecida: [[05-FALHAS-E-RECUPERACAO]].
