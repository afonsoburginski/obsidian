---
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - ms-cameras
  - web-attlas
  - fullstack
titulo: "[Full] Analítico - Instâncias ligadas ao backend, descoberta na rede e vínculo do source_id"
frente: Analítico
tamanho: 23 pts, numa PR só
pr: "#4414, #4887, #4891"
status: "Mergeada em 24/09 (merge d304f408c4). Os itens prometidos ao review como próximo commit vão numa PR nova. Em 26/09, o Sincronizar entrou no menu da linha e passou a trazer de volta a instância offline (#4887 e #4891, mergeadas), e a remoção da instância órfã deixou de responder 404."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-26
---

# Analítico - Instâncias ligadas ao backend, descoberta na rede e vínculo do source_id

Pedido do dono em 23/09: uma validação Axis/VAPIX que **escreva** no equipamento e vincule o
`source_id` da câmera ao analítico, a tela de Instâncias e a de detalhe funcionando de ponta a ponta, e
um jeito fácil e rápido de achar na rede as câmeras com analítico disponível e vincular tudo. O motivo
imediato: hoje nem o producer do embarcado está apontado para o Attlas.

## Estado medido em 23/09

### Os equipamentos

Lido por `GET` direto, sem escrita, com a conta VAPIX da câmera.

| Equipamento | App instalado (`applications/list.cgi`) | O que o analítico responde |
| --- | --- | --- |
| 10.1.1.80, EMBEDDED 080 | `atman_traffic_edge_atspm` 0.10.0, rodando | `source_id` nulo, `kafka_broker_ip` = `localhost:9092`, producer desligado, `analytic_id` novo (`ATMAN-SCMEXG8289LDMBKX`) |
| 10.1.1.78, DEMO | `atman_traffic_edge_sdct` 0.4.0, rodando | o caminho do atspm dá 404, é outro app, com API que o repositório não conhece |
| 10.1.1.79, PTZ | `atman_virtual_loop_analytic` 1.2.2 | sem o app do atspm |
| 10.11.20.101 | `atman_traffic_edge_atspm` 0.7.0, parado | 503 |

A 10.1.1.80 perdeu a configuração na troca de versão do app, o que a nota
[[Analítico - Embarcado x Servidor]] já previa: atualizar o app zera a configuração e exige
reprovisionar. Na versão 0.10.0 o `/infra` deixou de existir (404) e os campos do broker
(`kafka_broker_ip`, `kafka_broker_port`, `kafka_topic`) passaram para o `/config`. O banco local ainda
espera o `source_id` `1414dde8-b0fa-4a0b-a630-e144ac9f738c`, o mesmo do dev.v2, e ninguém o escreveu
de volta no equipamento. Por isso a tela de Detecção está muda nos dois ambientes.

A DEMO também mudou: o banco a registra como laço virtual, mas o app que roda nela hoje é outro. A API
dele precisa vir do responsável pelo app antes de entrar no escopo.

### A tela de Instâncias

A premissa de "nenhuma chamada" vale só para parte da tela. Lista e detalhe já fazem `GET` real e
respondem 200 pelo Kong: `/api/cameras/analytics/instances`, `/instances/:id` e `/instance-cameras`,
com as duas instâncias embarcadas do seed. A edição (`PATCH`) também existe.

O que não chega ao backend:

- a varredura da rede, que é um `of([])`, então o painel de registro sempre mostra "nenhuma instância
  encontrada";
- o teste de conexão, que devolve sempre inalcançável;
- o log de eventos, que é sempre vazio;
- o "Registrar", que só marca a linha como registrada na memória da tela. O formulário manual de
  endereço e porta é descartado, e o `nextName` está marcado como protótipo;
- o vínculo de câmera no detalhe, que é uma lista só de leitura. Não existe o painel de vínculo que a
  referência de design descreve;
- nenhum campo de `source_id`, `analytic_id`, broker ou producer aparece em nenhuma das duas telas.

O fornecedor está fixo em `atman` no mapeador, e o limite de latência e a taxa de erro chegam sempre
nulos.

### O backend

O que existe e se reusa:

- O `POST /api/cameras/validate-credentials` do cadastro de câmera. É `POST`, mas só **lê**: sonda
  ONVIF, lê o `/config` do analítico e adota o `source_id` que encontrar. Não escreve nada no
  equipamento.
- `AtmanDeviceProvisioner`, com `withDevice`, `ensureSourceId` e `enableProducer`, mais o resolvedor de
  endpoint e o cliente Digest/Basic com a trava de host privado.
- O `resolveDeviceSourceId` do provisionamento, que escolhe o valor guardado, depois o do equipamento,
  depois o serial e por último o id da câmera.
- O CRUD de instância servidor (`POST`, `PATCH` e `DELETE` em `/instances`), com a permissão
  `analytics.instances:manage` e auditoria.

O que falta:

- Nenhum código escreve o broker no equipamento, nem no `/infra` antigo nem no `/config` novo.
- Não há descoberta de rede. O `applications/list.cgi` é usado só como sonda de vida e a lista de apps
  não é lida.
- Não há rota para vincular ou desvincular câmera de instância, nem para registrar instância embarcada
  fora do cadastro de câmera.
- O `POST /instances` aceita só servidor.

Duas incoerências que entram no conserto:

- O reparo do producer da instalação dona chama `enableProducer`, que passa por `ensureSourceId` e pode
  escrever `source_id` com `PUT /config`. A atômica e o comentário da classe dizem que ele nunca
  escreve configuração.
- O consumidor monta o mapa de vínculo pelo JSON `Camera.analyticsCapabilities.deviceSourceId`, e não
  pela coluna `CameraAnalytic.deviceSourceId`. Os dois precisam ser gravados juntos, na mesma
  transação, até um deles deixar de existir.

### A referência de design

A `UF-ANL-A` do attlas-design (branch `main`, `9e25b5e9`) cobre lista e detalhe numa spec só. Ela
define a varredura antes do cadastro manual, o "Testar conexão" por linha, os estados de linha
`new | alreadyRegistered | unreachable`, o nome lido do equipamento e o painel de vínculo com contador
de capacidade. Ela declara `POST /api/analytics/network-discoveries` e `.../test`, mas não tem backend,
não tem rota de escrita para registro e vínculo, e não menciona `source_id`, `analytic_id` nem Kafka. A
resposta da equipe de visão computacional (Q18) confirma o caminho: listar os apps da câmera Axis pela
VAPIX e testar o IP na porta do app, com a credencial que o Attlas já tem.

## Requisitos

A regra de negócio que governa tudo já está no doc do módulo: configuração do equipamento só se
reescreve por **ação explícita do operador**, nunca por laço em segundo plano. O vínculo pedido é
exatamente essa ação, então cabe na regra sem mudá-la.

### Parte 1 - [Back] Vincular o analítico embarcado à câmera, com validação lida de volta (5 pts)

- `GET /api/cameras/:cameraId/analytics/device-binding` lê o estado vivo do equipamento, sem escrever:
  app e versão, `analytic_id`, `source_id` atual, broker e tópico configurados, producer ligado ou não,
  e se esse estado bate com o que esta instalação espera.
- `POST /api/cameras/:cameraId/analytics/device-binding` escreve, com a credencial da `CameraCredential`:
  1. um único `PUT /config` com `source_id`, `kafka_broker_ip`, `kafka_broker_port` e `kafka_topic`,
     para o pipeline reiniciar uma vez só. Quando o `GET /config` não traz os campos do broker (app
     anterior à 0.10.0), o broker vai pelo `/infra`. A escolha é pela presença das chaves, não pela
     versão;
  2. `POST /producer?enable=true`;
  3. releitura do `/config` e do `/producer`. A resposta devolve o que o equipamento diz depois da
     escrita, não o que foi pedido.
- Nada é escrito quando o equipamento já está com os valores certos, e a resposta diz isso.
- O `source_id` é o que o banco já guarda para a câmera e, na falta dele, o id da câmera. O vínculo
  nunca adota o valor que encontra no equipamento. Na 10.1.1.80 isso dá o `1414dde8...`, igual ao do
  dev.v2, então vincular aqui não tira o equipamento do dev.v2.
- O broker que o equipamento deve alcançar vem de uma env nova por ambiente, separada do
  `ANALYTICS_STREAM_BROKERS`, que é o endereço pelo qual o `ms-cameras` consome. No dev.v2 os dois
  diferem: `kafka:29092` para consumir e `dev.v2.attlas.atmansystems.com:9094` para o equipamento
  publicar.
- Se o equipamento já tem outro `source_id` ou outro broker, a resposta é 409 com um `errorCode`
  próprio e os valores atuais. O operador confirma e reenvia com `confirmTakeover: true`.
- Os erros de equipamento reusam `DEVICE_ANALYTIC_UNREACHABLE` e `DEVICE_ANALYTIC_NOT_CONFIGURABLE`.
  Permissão `analytics.instances:manage`, auditoria da escrita e nenhuma credencial em log.
- A gravação de `deviceSourceId` vai para `CameraAnalytic` e `Camera.analyticsCapabilities` na mesma
  transação, e a instância embarcada é criada ou atualizada pelo `upsertEmbedded` que já existe.
- O reparo do producer passa a só ligar o producer, sem passar pelo `ensureSourceId`.

### Parte 2 - [Back] Descobrir analíticos na rede pela VAPIX e testar a conexão (5 pts)

- `POST /api/cameras/analytics/network-discoveries` com dois escopos:
  - **câmeras cadastradas**, o padrão e o caminho rápido: varre os IPs e as credenciais que o sistema
    já tem, sem o operador digitar nada;
  - **endereços**: lista de IPs ou faixa até `/24`, com usuário e senha informados na hora.
- Por host: `GET /axis-cgi/applications/list.cgi` (Digest), com nome, versão e estado de cada app da
  Atman. Para o atspm, também o `/config` e o `/producer`.
- Estado por linha: novo, já vinculado nesta instalação, governado por outro ambiente, sem analítico,
  app não suportado (com nome e versão exibidos) e inalcançável.
- Concorrência limitada e timeout curto de conexão, para uma `/24` responder em segundos. Só
  endereços privados, reusando a trava do cliente Digest.
- Nada vai para o banco. O resultado fica em cache curto no Redis do `ms-cameras`, e o `discoveryId` é
  a chave desse cache.
- `POST /api/cameras/analytics/network-discoveries/test` com `{ discoveryId }` devolve
  `{ discoveryId, reachable, reason? }`, como a referência de design define.
- A descoberta de ONVIF por multicast fica de fora: a estação e as câmeras estão em sub-redes
  diferentes, ligadas por roteamento e Tailscale, e o multicast não atravessa.

### Parte 3 - [Front] Registro e detalhe da instância ligados ao backend (5 pts)

- No adaptador HTTP, `scanNetwork` e `testConnection` apontam para as rotas da parte 2, e o vínculo para a
  rota da parte 1.
- O painel de registro abre em "câmeras cadastradas" e oferece a faixa de endereços com credencial.
  Cada linha mostra o app, a versão e o estado, e tem "Testar conexão" e "Vincular".
- No 409, o painel mostra o `source_id` e o broker atuais e pede confirmação para assumir o
  equipamento.
- O caminho manual de endereço e porta testa a conexão e registra a instância servidor pelo `POST`
  que já existe.
- O detalhe ganha um bloco do equipamento: `source_id`, `analytic_id`, broker, estado do producer e
  versão do app, lidos do `GET` da parte 1. Ações: "Vincular novamente" e "Ligar producer".
- Saem o `nextName` de protótipo, a marcação local de registrado e o fornecedor fixo.
- Textos em `analytics.instances.*` nos quatro catálogos, e ramificação por `errorCode`.

### Parte 4 - [Full] Vínculo de câmera na instância e log de eventos (5 pts)

- Vincular e desvincular câmera de instância servidor, respeitando a capacidade e a regra de uma
  unidade por capacidade em cada câmera. Na instância embarcada a capacidade é 1 e o vínculo nasce da
  parte 1.
- O painel de vínculo da referência, com busca, abas Disponíveis e Todas e o contador de vagas.
- `GET /api/cameras/analytics/instances/:id/events`, a partir das transições de disponibilidade e das
  escritas auditadas no equipamento, alimentando o log do detalhe e do painel lateral.

O dono pediu as quatro partes e o recuo do laço numa PR só, em 23/09. A parte 1 é a que resolve o
producer desapontado: com ela a 10.1.1.80 volta a publicar, e o dev.v2 e o local recebem as detecções.

### Parte 5 - [Full] Recuo do laço na Detecção (3 pts)

Pedido do dono no mesmo dia, com o handoff da equipe do app embarcado. Cada região tem uma linha de
laço atravessando o fluxo, e o `loop_offset` é a fração de 0 a 1 que recua essa linha da frente da
região rumo ao fundo.

- Os pontos da região seguem a ordem do equipamento: fundo-esquerda, frente-esquerda, frente-direita
  e fundo-direita, em porcentagem do quadro. A frente é a aresta entre o segundo e o terceiro ponto.
- A linha é interpolada nas duas arestas laterais: em 0 ela fica sobre a frente, em 1 sobre o fundo.
  Região sem exatamente quatro pontos não tem linha.
- O controle fica no bloco de configuração da região, ao lado do comprimento: slider e campo numérico
  de 0 a 1, passo 0,01, com o rótulo "Recuo do laço" e a ajuda "0 = frente, 1 = fundo".
- A linha é desenhada sobre o vídeo para todas as regiões e se ajusta na hora, ao mexer no controle ou
  ao arrastar um vértice. A região selecionada destaca a aresta da frente.
- Região nova nasce com 0,25, o padrão do equipamento. A leitura usa `loop_offset ?? 0.25`, porque
  firmware antigo não traz o campo, e a escrita sempre envia o campo.

### Documentação que vai junto

- `docs/modules/analitico.md`: requisito funcional de descoberta e de vínculo do equipamento. Não há
  nenhum hoje.
- `ms-cameras`: atômica nova para o vínculo e outra para a descoberta. A `INT-026` e a `INT-010`
  apontam para a do vínculo, que é onde o broker passa a ser escrito.
- `web-attlas`: atômica da tela de Instâncias, que não existe. O código cita a `UF-045`, que é outra
  tela, e a `UF-056`, da edição, não está no índice.

## Ambiente local para validar

O equipamento não alcança a estação pelo Tailscale, e o IP da estação na rede do escritório é
atribuído por DHCP. O caminho sem rede nova: o `ms-cameras` local consome o broker do dev.v2
(`ANALYTICS_STREAM_BROKERS=dev.v2.attlas.atmansystems.com:9094`, alcançável daqui, com grupo de
consumidor próprio), e o equipamento publica nesse mesmo broker. Com o mesmo `source_id` nos dois
ambientes, os dois recebem sem disputar o equipamento. A alternativa é o listener externo do Kafka
local na porta 9094, que depende de a câmera alcançar a estação e de o IP não mudar.

## Estado da PR em 23/09

A [#4414](https://github.com/atmanadmin/attlas-2026/pull/4414) leva as cinco partes num commit de
implementação e em duas sincronizações com a develop, as duas sem conflito. A segunda trouxe a #4400,
que tirou a porta 2001 dos padrões do resolvedor de endpoint.

O que foi provado no stack local, só com leitura:

- O `ms-cameras` e o `web-attlas` sobem com o código da PR, e o consumidor local liga no broker do
  dev.v2.
- O `GET` do vínculo da 10.1.1.80 responde `UNBOUND`, com o `source_id` esperado `1414dde8...` e o broker
  do dev.v2 ao lado dos valores atuais do equipamento.
- A varredura das câmeras cadastradas responde em cerca de 3 s: a 10.1.1.80 aparece como nova e a DEMO
  como app não suportado. A PTZ leva de 3 a 4,5 s para listar os apps com Digest, e o timeout por
  endereço subiu de 2,5 s para 6 s, com 64 endereços em paralelo, o que ainda fecha uma `/24` muda em
  cerca de 24 s.
- O log de eventos da instância já responde, alimentado pelas transições de saúde.

O que falta:

- O "Vincular" na 10.1.1.80, que escreve no equipamento compartilhado e fica para a validação do dono.
- O CI da PR. Nada de teste, lint ou typecheck rodou localmente, e as suítes novas que as atômicas pedem
  não foram escritas.
- Declarar `ANALYTICS_DEVICE_PUBLISH_BROKER=dev.v2.attlas.atmansystems.com:9094` no host do dev.v2 antes
  do deploy.

## Teste real no stack local em 23/09, à noite

Feito pela tela no :4200, com o Playwright, e pela API através do Kong, sobre o código da PR.

- **Painel "Adicionar analítico"**: comparado lado a lado com a referência de design, que roda no
  :4242. Ficou no mesmo formato: checkbox por cartão, cartão bloqueado em cinza com o motivo, só o que
  ainda não está vinculado, "Encontrados na rede (N)", "Varrer de novo", "Cadastrar manualmente" e o
  rodapé com Cancelar e "Adicionar (N)". A varredura das câmeras cadastradas respondeu em cerca de 3 s,
  o "Testar" deu "Respondeu" na 10.1.1.80, e a busca manual por endereço, com usuário e senha, trouxe só
  a 10.1.1.80. O cadastro manual pede usuário e senha no lugar do nome e da porta da referência, porque
  é assim que o equipamento responde.
- **Um defeito achado e corrigido no teste**: a varredura marcava a 10.1.1.80 como já vinculada só
  porque o `source_id` batia, mas o broker dela continuava em `localhost:9092`, e o equipamento sumia do
  painel. Agora o equipamento só conta como vinculado quando também publica no broker desta instalação.
- **Detalhe da instância**: o cartão "Equipamento" mostra "Não vinculado", o broker atual contra o
  esperado e o producer ligado. O log de eventos traz a "Conexão perdida" gravada pelo registro novo de
  disponibilidade.
- **Vínculo de câmera em instância servidor**: numa instância de teste, o painel mostrou "0 de 2" e
  escondeu a câmera que já tem laço virtual. Vincular a PTZ gravou a linha no banco, e a instância foi
  apagada no fim. Pela API responderam como a atômica diz: acima da capacidade, câmera já servida pelo
  mesmo tipo, embarcada sem vínculo manual, varredura expirada e faixa pública ou larga demais.
- **Recuo do laço**: um segundo defeito, que já existia antes, apareceu aqui. Numa câmera sem nenhuma
  região, como a 10.1.1.80 depois da troca de versão do app, a primeira região nascia sem nenhum bloco
  de configuração, porque herdava os blocos de uma vizinha que não existia. Agora ela nasce com os
  blocos do tipo. O controle "Recuo do laço" aparece ao lado do comprimento, e mudar o valor de 0,25
  para 0,75 levou a linha de 0,351 para 0,251 da altura do quadro, exatamente o que a regra do handoff
  dá para a região padrão. A edição foi descartada sem salvar.
- **Não testado**: o "Adicionar" na 10.1.1.80. Ele grava o broker no equipamento compartilhado, e o
  classificador do modo automático barrou o clique. Também não foi salva nenhuma região, pelo mesmo
  motivo.

## Validação do dono e tempo real, na noite de 23/09

O dono testou o "Adicionar" na 10.1.1.80 pelo painel e funcionou: o equipamento ficou com o `source_id`
`1414dde8...`, o broker do dev.v2 e o producer ligado. Ele pediu atualização imediata no frontend, porque as
telas de Instâncias liam o estado uma vez e só mudavam recarregando.

Agora a listagem, a página da instância e o cartão do equipamento ouvem o socket `cameras-analytics`, nas
salas das câmeras que hospedam as unidades embarcadas. O status muda assim que a saúde do analítico muda,
cada transição gravada entra no topo do log, e o cartão do equipamento troca para o estado que o vínculo
deixou, venha ele do painel, do próprio cartão ou de outra aba. O vínculo e o gravador de disponibilidade
passaram a emitir esses dois eventos. Conferido pelo Playwright: a listagem entra nas salas das duas
câmeras, o detalhe entra na sala da câmera hospedeira, e os dois recebem o estado atual na hora.

A 10.1.1.80 continua sem regiões depois da troca de versão do app, então ainda não publica detecção. A
primeira região salva na Detecção é o que faz as caixas e o status aparecerem.

## Decisões fechadas em 23/09

O dev.v2 é o ambiente de referência do desenvolvimento, e o dono valida localmente antes de subir.

- **O equipamento publica sempre no broker do dev.v2**, nos dois ambientes. A env nova que diz ao
  vínculo qual broker escrever vale `dev.v2.attlas.atmansystems.com:9094` no dev.v2 e no local, e o
  `ms-cameras` local consome esse mesmo broker com um grupo de consumidor próprio. Como o `source_id`
  também é o mesmo nos dois bancos, um vínculo feito no local escreve exatamente o que o dev.v2
  escreveria, e os dois recebem as detecções sem disputar o equipamento. O Kafka local com listener
  externo ficou de fora: depende de a câmera alcançar a estação e de o IP dela não mudar.
- **A posse do equipamento continua na env do reparo do producer.** Religar o producer é idempotente e
  não reinicia o pipeline; o que criava a disputa entre instalações era a escrita de `source_id` em
  laço. Essa escrita passa a existir só no vínculo, que é ação explícita do operador, e o reparo deixa
  de passar por ela.
- **O app da DEMO fica como app não suportado** na descoberta, com nome e versão exibidos, até a API
  dele chegar do responsável.

## Relacionado

- [[Analítico - o producer do embarcado religado só pela instalação dona]], que é a posse do
  equipamento que o vínculo tem de respeitar.
- [[Analítico embarcado - broker por ambiente e consumidor sem atraso]], da Sprint 33, com o broker
  por ambiente.
- [[Instâncias - ler uma unidade sem compor a frota]], da Sprint 33.
- [[Analítico - Arquitetura e estratégias]] e [[Analítico - Embarcado x Servidor]].
- [[Analítico - Frontend do attlas-design]].
- [[Attlas - Sprint 34]].

## Remoção do cadastro, pedida na validação em 23/09

O dono testou o "Adicionar" na 10.1.1.80, viu o cartão nascer "Offline" (esperado - o equipamento
ainda não publicou o primeiro quadro, e o estado se resolve sozinho quando publicar) e perguntou como
remover o cadastro pela tela. Não havia como: UF-725 seção 11 listava "Remover instância" como fora do
escopo.

Achado antes de implementar: a 10.1.1.80 é compartilhada de propósito com o dev.v2 (mesmo `source_id`,
mesmo broker, a decisão de posse já fechada acima nesta nota). Reverter a configuração no equipamento
ao remover desconfiguraria o dev.v2 também. Sem uma câmera de teste isolada para validar esse caminho
com segurança, a remoção completa no equipamento (o inverso exato do vínculo) ficou de fora.

> [!warning] Estado em 24/09: o botão saiu do detalhe e as regiões ficam
> A pedido do dono, "Remover instância" mora só na **lista** de Instâncias (menu "..." da linha e menu de
> contexto do clique direito), atrás de `analytics.instances:manage`, e não na página do detalhe. A linha
> sai da tabela na hora, sem reler a frota. As regiões **nunca** são apagadas: ficam no banco e no
> equipamento, e o próximo vínculo da mesma câmera e tipo as re-parenta para a linha nova
> (`UC-216` seção 16), então o operador reencontra a configuração que tinha. O parágrafo abaixo é o
> retrato de 23/09.

**O que entrou (mesma PR #4414)**: `UC-219` (`ms-cameras`) + `UF-726` (`web-attlas`) - "Remover
instância" ao lado de "Editar instância" na página do detalhe, atrás da mesma permissão. Só banco:
some o link (`CameraAnalytic`) e a unidade (`AnalyticInstance`), e limpa `deviceSourceId` de
`Camera.analyticsCapabilities` (o `DeviceStreamConsumer.refreshNow` lê só esse JSON, nunca junta com
`CameraAnalytic` - sem isso o consumidor seguiria roteando quadros para uma câmera cujo cadastro já não
existe). O equipamento não é tocado; se continuar publicando, o Attlas simplesmente para de atribuir
os quadros a qualquer câmera. Unidade servidor com câmera vinculada continua recusando (sem mudança,
UC-075).

**Falta**: reversão completa no equipamento (UC-219-B), atômica futura, aguardando câmera de teste que
não seja compartilhada com o dev.v2. Suítes novas (handler, repositório, página) não rodaram local -
CI.

## Rodada de 24/09, na validação do dono

Tudo na mesma branch da PR #4414, ainda sem commit. Cada item diz o que o dono viu, a causa e o que
mudou.

- **Vínculo sem recarregar a tela** (`UF-725` seção 15): o vínculo devolve o `instanceId`, e a lista relê
  só as unidades que o lote tocou, uma leitura independente por unidade. Uma leitura que falha não
  derruba as outras; sem id nenhum na resposta, cai na releitura silenciosa, sem voltar ao skeleton.
- **"Offline" logo depois de vincular**: a 10.1.1.80 estava sem nenhuma região depois da troca de
  versão do app, e equipamento sem região não publica quadro. Com a primeira região salva, ficou saudável.
- **Notificações com 500** (`unread-count` e `stream`): o Kong local não resolvia `ms-notifications`. O
  `docker-compose.override.yml` ganhou o `extra_hosts` e a reescrita para a porta 3404. É arquivo
  versionado, mudança só da máquina, que não deve ir no commit.
- **Descoberta na rede em 2 a 3 s e resposta enorme** (`UC-217` seção 3.6, `UF-725` seção 5.5): o `POST`
  virou abertura de lote e responde em 42 ms, medido no servidor, com `{ batchId, total }`. Cada câmera
  chega pelo socket `cameras-analytics` assim que responde, gravada no Redis antes de emitida; só o dono
  do lote entra na sala, e quem entra tarde recebe a repetição. O workflow que desenhou isso deixou três
  furos, corrigidos na revisão: o fim podia passar na frente dos últimos resultados, o que saísse antes
  da entrada na sala se perdia, e a checagem de tenant confiava num valor mandado pelo próprio cliente.
- **Remoção** (`UC-219`, `UF-726`): ver o aviso de 24/09 na seção de remoção acima.
- **O seed apagava o vínculo da 080 a cada `nx serve`**: o `serve` depende de `prisma:seed`, e a limpeza
  do seed fazia `deleteMany` de toda linha de `CameraAnalytic` fora de `SEED_ANALYTICS` nas três câmeras
  de bancada, com as regiões por cascade. Foi assim que o vínculo da 080 sumiu às 04:46 UTC, quando
  reiniciei o serviço. A sessão 9e restringiu a limpeza ao espaço de ids do seed (`SEED_ID_SPACE`).
- **"Analítico ao vivo sem quadros" na 10.1.1.80**: a câmera estava certa (app rodando, producer ligado,
  `source_id` e broker do dev.v2). Quem parou foi o consumidor local: o DNS do
  `dev.v2.attlas.atmansystems.com` falhou às 08:12 e as leituras deram timeout entre 08:39 e 08:44, com o
  consumidor Kafka caindo e reiniciando sem sair do laço. O restart do `ms-cameras` às 08:47 reconectou.
- **Detecção diferente da referência** (`UF-053` seção 4.5, `UF-052` adenda de 24/09): a classificação
  abre com os quatro campos da referência na ordem dela, e tipo da região e vagas vêm depois; o recuo do
  laço passou para o bloco de ativação de laço, ao lado das classes ativadoras; o número lido e o
  editado saem da mesma função, com vírgula decimal; a caixa do slider tem 64 px, centralizada. Nada saiu.
  O botão "Cores das classes" da referência não entrou, porque não há onde persistir a cor por classe.
- **Player** (`UF-046`, nova, e `UF-055` seção 16): regiões e caixas apareciam antes do vídeo e
  continuavam no pause, o primeiro play piscava preto ou branco e a entrada mostrava a miniatura de
  320x240 antes do quadro nítido. Causa comum: o player dizia `playing` quando a conexão respondia, antes
  do primeiro quadro. Agora ele publica o estado da imagem (`none`, `loading`, `live`, `paused`,
  `failed`), segura a imagem parada até o primeiro quadro e a desfaz com fade, e mostra skeleton enquanto
  o quadro nítido chega. A Detecção guarda o quadro por câmera durante a aba. O dono aprovou na tela.

## Review local rigoroso de 24/09

Rodado sobre a PR inteira contra a develop, incluindo a rodada sem commit, por 13 frentes (arquitetura e
CQRS, contratos, banco, erros e i18n, frontend, performance, resiliência, segurança, specs, testes,
comentários e estrutura, cache e eventos, impacto). Cada achado passou por um cético que tentava
derrubá-lo; 25 dos 34 sobreviveram. A consolidação foi feita à mão, porque o limite semanal de
subagentes estourou no último passo (volta em 28/09 às 22h).

- **Bloqueante**: o módulo do vínculo (`UC-216`) não tem nenhuma suíte, que é o primeiro bloqueante do
  review do Daniel, ainda aberto.
- **Importantes**: as suítes que faltam do `UC-217` (expansor de endereços, parser da listagem, os seis
  estados do sweeper, o cache e o handler do teste) e do `UC-218` (handler de vínculo de câmera,
  gravador de disponibilidade e mapper); a sala `camera:<id>` do socket aceita qualquer usuário logado sem
  conferir o tenant, e agora carrega vínculo e log da instância; a lista de Instâncias abre um WebSocket
  por câmera da frota e reabre todos a cada mudança; o gateway da câmera ganhou a descoberta de rede como
  segunda responsabilidade, o que forçou um provider duplicado para fugir de ciclo; a varredura em
  segundo plano não é drenada no desligamento; a transição de disponibilidade é ler-e-inserir sem
  garantia única entre réplicas; o front duplica o contrato do evento da instância; o painel de vínculo
  tem dois focos para a mesma ação; imports `../../` onde a regra pede `@ms-cameras/*` e `@/`.
- **Menores**: o teste de conexão é leitura modelada como comando; clientes Digest redeclarados em dois
  módulos; remoção embarcada sem transação única; conexão do socket da descoberta copiada da conexão por
  câmera; resultado da descoberta com custo quadrático no front; três interfaces num arquivo no adaptador
  SDCT; um comentário em português e uma narração de histórico no seed; e os três ajustes do Daniel
  (ramo inalcançável do `VALIDATION_FAILED` e dois comentários que parafraseiam o tipo), ainda abertos.

## Correções dos reviews, commit d5a389eeea (24/09)

Tudo o que o review local e o do Daniel apontaram entrou num commit só, junto com o trabalho das sessões
9e (registro de builds e presença ao vivo) e fc (404 do `POST` de virtual-loop-bindings).

- **Suítes**: as da seção 9 do `UC-216`, `UC-217` e `UC-218`, mais cache da varredura, teste de conexão,
  gateway da descoberta, acesso à sala da câmera, remoção embarcada e socket único do front. Nenhuma
  rodou localmente, e o `ci-pr` não roda jest.
- **Sala `camera:<id>`**: só entra membro do sistema da câmera, ou o MASTER. Conferido com socket de
  verdade: o MASTER recebe o snapshot e os quadros, e o usuário de fora recebe
  `SYSTEM_MEMBERSHIP_REQUIRED`.
- **Descoberta**: saiu do gateway da câmera para o `NetworkDiscoveryGateway`, no mesmo namespace, e o
  provider duplicado do cache sumiu. A varredura termina antes do desligamento do pod, e o lote sempre
  fecha. O teste de conexão virou Query, e o `RB-06` saiu tirando o ramo inalcançável.
- **Disponibilidade**: o gravador trava a unidade antes de ler a última transição, para duas réplicas não
  gravarem a mesma.
- **Remoção embarcada**: vínculo e unidade numa transação só (`softDeleteEmbeddedUnit`).
- **Front**: um socket só para o analítico ao vivo, com salas por câmera e por varredura; a lista de
  Instâncias só liga e desliga as câmeras que entram e saem (`mergeEach`); o evento de instância usa o
  contrato, e as três chaves de tradução do tipo viraram os valores do enum; o painel de vínculo tem um
  foco por cartão.
- **Fora, de propósito**: agrupar os resultados da varredura no front. São no máximo 256 endereços, e
  agrupar atrasaria o aviso de fim.

Review do Daniel: as seis threads respondidas e resolvidas, o corpo respondido num comentário e o review
pedido de novo só a ele.

O primeiro CI do d5a389eeea caiu no Lint em arquivos da develop que a branch nem tem (`radial-menu` e
`chat-dock`): o CI testa a PR mesclada com a develop, e às 15:15 a develop ainda não tinha a correção de
lint do Daniel, que entrou às 15:32. Um commit vazio (6c320c9e17) disparou um CI novo, verde em Lint e
Build. A develop inteira não entrou na branch porque traz migração do ms-controllers, que roda local.

## Mergeada em 24/09, à tarde

O dono mandou mergear com os dois reviews ainda em pedido de mudança. A branch recebeu a develop antes
(537 commits, um conflito só, no índice de specs) e foi apagada depois do merge (`d304f408c4`).

As respostas da revisão foram publicadas no commit `04895ef6b3`: 53 threads do Zanotelli respondidos,
41 acatados, 2 recusados com a razão (o split da página de Instâncias em store e o `RestApiService` na
descoberta, cujo `retry(3)` abriria varreduras duplicadas) e 7 prometidos para o próximo commit. Duas
mudanças de comportamento entraram por essa rodada e o dono pode vetar:

- salvar região ou laço não reescreve mais o `source_id` do equipamento, só religa o producer, então
  retomar uma câmera como a DEMO passa a ser só pelo card de vínculo;
- na varredura por endereço, um host que só aceita desafio Basic em http aparece como credencial
  recusada.

O que segue aberto está em [[Attlas - Sprint 34]], na atualização de 24/09 à tarde.

## Sincronizar pela linha e a instância offline (26/09)

Pedido do dono em 26/09, validando no stack local: uma ação de recarregar a instância que funcione com
ela offline ou com o producer Kafka desligado, no menu de contexto da tabela de Instâncias. O
Sincronizar existia só no card "Equipamento" da página da instância, e só com a leitura do equipamento em
dia, justamente o que falta na instância offline.

- **Front, na #4887**: "Sincronizar" entra no menu da linha (três pontos e menu de contexto) de toda
  instância embarcada com câmera hospedeira, online ou offline, atrás de `analytics.instances:manage`. O
  card "Equipamento" passa a oferecer o botão também quando a leitura do equipamento falhou. O card e a
  linha usam o mesmo fluxo (toast do resultado e diálogo de tomada), a linha é lida de novo depois da
  resposta e não dispara duas sincronizações ao mesmo tempo. O pedido tem teto de 65 s no front, acima dos
  60 s do gateway.
- **Backend, na #4891**: quando a leitura falha e a API do analítico não responde, o `ms-cameras` lê os
  apps da câmera pela VAPIX e inicia o app parado, ou reinicia o que a câmera diz que roda. Espera até
  20 s a API voltar e segue o vínculo de sempre: grava o source id e o broker que diferem e liga o
  producer. Câmera que não responde, sem app suportado ou que recusa a ordem continua com o erro de
  equipamento inalcançável.
- **Remoção da instância órfã, na #4891**: remover uma instância respondia "AnalyticInstance com
  identificador ... não foi encontrado" quando o registro da unidade já estava apagado e o vínculo com a
  câmera seguia ativo. A remoção agora acha a unidade pelo vínculo e fecha o vínculo, e um vínculo novo
  não reaproveita unidade apagada.

As duas PRs foram mergeadas na noite de 26/09, sem deploy no dev.v2 até então. O Sincronizar pela linha
não foi exercitado contra uma câmera com o app parado de verdade.
