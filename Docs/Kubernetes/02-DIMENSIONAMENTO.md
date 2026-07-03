# Teste de capacidade e dimensionamento de hardware - Quito

> [!abstract] Em uma frase
> Subimos o stack real no **servidor de teste** (sumo, hardware menor), medimos o que cada serviço consome e projetamos o hardware de Quito, que é **maior e é a recomendação de produção**. Onde ainda não temos medição própria (serviços não portados), usamos o consumo do sistema atual como referência (Seção 8). O servidor de teste é prova de conceito; o destino é o hardware do cliente.

- **Versão:** 2.5 - **Data:** 01/07/2026
- Contexto: [[03-PRODUCAO]] (arquitetura), [[01-VISAO-GERAL]] (lab), [[04-CI-CD]] (distribuição).

> [!note] Unidades usadas no documento
>
> - **CPU**: medida em **vCPU** = um núcleo virtual de processador. `1 vCPU` = 1 núcleo; `0,5 vCPU` = meio núcleo. Quando aparece a notação do Kubernetes `500m` ("m" = milicore = milésimo de núcleo), é só outra forma de escrever: `500m = 0,5 vCPU`, `100m = 0,1 vCPU`.
> - **Memória (RAM)**: em **MB / GB**.
> - **req/s**: requisições atendidas por segundo (vazão).
> - **p95**: 95% das respostas ficaram abaixo desse tempo (mede latência sem o ruído dos piores 5%).

---

## 1. O que foi testado e critérios

- **Ambiente**: cluster `attlas-quito` no servidor de teste, RKE2, 3 control (4 vCPU / 8 GB) + 3 workers (8 vCPU / 16 GB), stack completo pelo chart. A aplicação roda só nos workers (o control é reservado). Estas medições são do worker de 8 vCPU; o alvo é 16 vCPU (Seção 5), então o próximo ciclo re-mede o worker de produção.
- **Dois tipos de teste**:
  - **Por serviço** (isolado): carga em um serviço de cada vez, para medir **quanto 1 réplica aguenta** e quanto consome (§3, "sob carga").
  - **Plataforma inteira** (integrado): vários serviços sob carga ao mesmo tempo **+ o teste de falha de nó (N+1)**, para validar o cluster como um todo (§3, "alta disponibilidade").
- **Carga**: `fortio` em pod, autenticado com sessão real (seed do ms-organization no banco do cluster + login de operador MASTER); produtor Kafka para os serviços que consomem eventos.
- **Critério de capacidade**: maior carga em que, com o autoescalador (KEDA) estabilizado, 95% das respostas (p95) ficam abaixo de 300 ms, sem travamento por CPU nem estouro de memória.
- **Critério de alta disponibilidade (N+1)**: o pico tem que caber em **2 dos 3 workers** - perder um nó não pode derrubar nada.

## 2. Como o consumo funciona (modelo mental)

> [!tip] Como roda, numa olhada: pods elásticos sobre workers fixos
>
> - **3 workers** = o pool de hardware, **fixo** (não cresce sozinho).
> - **Pod** = 1 cópia de **1** serviço (nunca vários serviços num pod). Cada serviço tem o **seu** tamanho de pod, calibrado pelo consumo real medido (Seção 8): os pesados (ms-cameras, ms-audit, ms-connector-une) têm pod de até 1 vCPU; os leves (ms-pmv) 0,3 vCPU.
> - O que é **elástico** é o **número de pods** de cada serviço: o **KEDA** cria e remove pods conforme a carga, dentro dos 3 workers. Cada serviço tem sua faixa (ex.: ms-cameras 1→8, ms-pmv 1→2).
> - Os **caps** (max de pods por serviço) são o teto pra a soma caber nos workers (N+1). São eles que fazem o escalonamento elástico não estourar o hardware fixo.

A unidade de consumo é a **réplica** (uma cópia do serviço em execução, = 1 pod). Três fatos definem o dimensionamento:

1. Em repouso, uma réplica usa quase nada de CPU (~0,05 vCPU).
2. Cada serviço tem um **teto de pod próprio** (de 0,25 a 1 vCPU, conforme o peso do serviço). Sob carga o pod sobe até o seu teto e satura ali; passando de ~60% dele, o autoescalador **cria outra réplica**.
3. Logo: **consumo de um serviço = nº de réplicas × o teto do pod daquele serviço.** Dimensionar é estimar quantas réplicas cada serviço precisa em Quito, somar, e garantir que cabe em 2 workers (N+1).

> [!important] Nos serviços, CPU é o que aperta; a RAM pesa é nos bancos.
> Os microsserviços saturam CPU com pouca RAM por pod (dezenas a poucas centenas de MB). Quem puxa RAM é **banco**: o db-audit chegou a **4,6 GB** no attlas 25. Então o dimensionamento olha **CPU nos serviços** e **RAM nos bancos** (db-audit acima de tudo).

## 3. Consumo medido nos testes

**Em repouso (1 réplica, sem tráfego):**

| Grupo                          | Serviços                                                   | CPU em repouso | RAM em repouso          |
| ------------------------------ | ---------------------------------------------------------- | -------------- | ----------------------- |
| Microsserviços com Kafka ativo | organization, communication-channels, cameras, audit       | ~0,05 vCPU     | 90-110 MB               |
| Microsserviços sem Kafka       | pmv, traffic-model, connector-une                          | ~0,005 vCPU    | 40-85 MB                |
| Infraestrutura                 | Kafka ~0,04 vCPU / Redis ~0,01 / Kong ~0,005 / Postgres ~0 | -              | Kafka 389 / Kong 183 MB |

**Sob carga (cada réplica satura 0,5 vCPU e o autoescalador sobe o nº de réplicas):**

| Serviço                        | Requisições/s no máximo | Réplicas | Req/s por réplica |
| ------------------------------ | ----------------------- | -------- | ----------------- |
| ms-organization (leitura leve) | 559                     | 6        | ~93               |
| ms-cameras (leitura pesada)    | 97                      | 6        | ~16               |

O custo por requisição varia muito: a mesma réplica entrega 93 leituras/s no organization e só 16 no cameras - por isso a projeção é feita serviço a serviço, não com um número único.

**Alta disponibilidade**: no perfil testado (3 serviços no máximo, 45 pods, workers a ~43% de CPU) desliguei um worker e tudo migrou para os 2 restantes sem nada parar. **N+1 confirmado.**

**3 defeitos encontrados no autoescalamento por Kafka (corrigidos no chart e revalidados):**

| Defeito                                          | Efeito                                                                           | Correção                                                  | Validação                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `sasl: none` na config do KEDA                   | gatilho inválido -> autoescalador nunca criado para audit/communication-channels | omitir `sasl`/`tls` (`scaledobjects.yaml`)                | ScaledObject passou a `Ready=True`                  |
| grupo de consumo errado                          | KEDA observava grupo inexistente -> lag lido como zero                           | usar o nome real `<serviço>-group-server` (`values.yaml`) | KEDA lê o lag real (~950 mil) e marca `Active=True` |
| filas-mortas (`attlas.dlq.<topico>`) não criadas | audit quebra ao descartar evento inválido                                        | criar as DLQ na inicialização (`kafka-topics.list`)       | 0 erros de fila-morta (antes era um storm)          |

> [!note] Achado extra: o scaler de Kafka do KEDA não funciona neste ambiente - audit escala por CPU
> Com os 3 defeitos corrigidos, o config está certo (grupo, sem sasl, DLQ criadas, HPA criado, lag real de ~940 mil). Mas o **scaler de Kafka do próprio KEDA falha** ao construir (`"scaler with id not found"`), reproduzido em **duas** instalações limpas do KEDA - é limitação do KEDA com este Kafka (cp-kafka single-broker, listener `POD_IP`), **não do chart**. **Correção aplicada**: dar ao `ms-audit` um gatilho de **CPU** (como os demais) - audit é CPU/DB-bound ao processar o firehose, então CPU é sinal melhor. **Validado**: sob carga o audit escalou **1 → 10 réplicas por CPU** e o lag começou a drenar. A escala por lag fica como aspiracional (reativa se/quando o scaler do KEDA for corrigido).

## 4. Projeção para Quito

Escala de Quito: **milhares de câmeras, ~1000 controladores, centenas de PMVs**, dezenas de operadores - uma escala muito maior. Diferença para o servidor de teste: esse parque gera **carga contínua** (status, eventos, polling), então os serviços pesados ficam perto do máximo ao mesmo tempo e o tempo todo - é regime de operação, não pico raro.

Aplicando o consumo por serviço (Seção 7.1) ao volume de Quito. As colunas são o **total do serviço em regime**, não por réplica: **Réplicas** = quantas réplicas ele deve rodar em regime (a faixa min-max está na seção 7.1); **CPU/RAM** = réplicas x o pod daquele serviço, ou seja o serviço inteiro somado.

| Serviço                     | Por que consome em Quito                                          | Réplicas | CPU          | RAM        |
| --------------------------- | ----------------------------------------------------------------- | -------- | ------------ | ---------- |
| ms-cameras                  | ingestão/correlação de eventos de milhares de câmeras             | ~4       | ~4 vCPU      | ~6 GB      |
| ms-audit                    | recebe **todo** evento (status, detecção, ciclo de vida) como log | ~4       | ~4 vCPU      | ~2,5 GB    |
| db-audit (não escala)       | grava o fluxo de auditoria no banco (o mais pesado de RAM)        | 1        | ~2 vCPU      | ~5 GB      |
| ms-connector-une            | comunicação contínua com ~1000 controladores (200-400/instância)  | ~3       | ~3 vCPU      | ~3 GB      |
| ms-traffic-model            | rodadas de modelo (cálculo pesado, em rajadas)                    | ~2       | ~2 vCPU      | ~0,5 GB    |
| kong                        | porta de entrada de todo o tráfego                                | ~2       | ~2 vCPU      | ~0,6 GB    |
| Kafka (não escala)          | alto volume de eventos passando                                   | 1        | ~1,5 vCPU    | ~1,5 GB    |
| db-cameras (não escala)     | grava metadados/telemetria de câmeras                             | 1        | ~1 vCPU      | ~0,6 GB    |
| ms-communication-channels   | notificações disparadas por eventos                               | ~2       | ~1 vCPU      | ~0,3 GB    |
| ms-organization             | dezenas de operadores                                             | ~2       | ~1 vCPU      | ~0,3 GB    |
| ms-pmv                      | centenas de painéis, baixa frequência                             | ~1       | ~0,3 vCPU    | ~0,1 GB    |
| web + Redis + demais bancos | leves, não escalam por carga                                      | -        | ~1,5 vCPU    | ~1 GB      |
| **TOTAL EM REGIME**         |                                                                   |          | **~23 vCPU** | **~21 GB** |

Os que puxam o consumo são **câmeras, auditoria (ms-audit + db-audit) e o connector-une**; pmv, organization e communication-channels são leves. No pico (rodadas de modelo + rajada de eventos) o total chega a ~30-32 vCPU. A RAM do stack é ~21 GB (não os ~8 GB do laboratório enxuto) por causa do **db-audit** (~5 GB sozinho) e das réplicas de câmeras - por isso o worker é 32 GB (2 workers = 64 GB seguram isso no N+1, ver 7.2).

> [!warning] O que é MEDIDO e o que é ESTIMADO (importante para a confiança do número)
>
> - **Medido por carga**: `ms-organization` e `ms-cameras` (curva REST, §3); `ms-audit` (escala 1→10 por CPU sob firehose de eventos); `ms-communication-channels` (escala por CPU); footprint em repouso de todos (§3); plataforma inteira + N+1 (§3).
> - **Estimado** (ainda **não** testado por carga, falta simulador/dados): `ms-traffic-model` (depende de disparar rodadas de modelo com topologia populada), `ms-pmv` e `ms-connector-une` (dependem de simular centenas de dispositivos). Os valores deles na tabela são ordem de grandeza pela natureza da carga, não medição.
> - **Multiplicador de Quito** (nº de câmeras/controladores/PMVs/operadores) vem do **edital** - é o que transforma "capacidade por réplica" em "réplicas no pico". Sem ele, o total de ~23 vCPU em regime (pico ~32) é estimativa fundamentada, não número fechado. O que É medido é o **tamanho do pod** de cada serviço (Seção 8); o que é estimado é o **nº de réplicas** em Quito.

## 5. Configuração das VMs (o hardware do cluster)

O regime de Quito (~23 vCPU, pico ~32; ver Seção 4) tem que caber em **2 dos 3 workers** (N+1). Isso fixa o worker de **produção** em **16 vCPU** (2 x 16 = 32, cobre o pico; com 8 vCPU não caberia). **Esta é a configuração de produção** - o hardware forte que roda o attlas 26, e é a especificação que vale para o cliente. O servidor de teste roda a **mesma topologia 3+3 num cluster menor** (workers menores), porque é só prova de conceito; não precisa do hardware de produção.

> [!important] Hardware total do cluster: **60 vCPU / 120 GB de RAM / ~3 TB SSD**
> 3 control-plane (4 vCPU / 8 GB / 100 GB SSD cada) + 3 workers (16 vCPU / 32 GB / 200 GB SSD cada) + um **pool de dados de ~2 TB** (Nutanix CSI) para os bancos e o Kafka. É esse o hardware que roda o Attlas. O servidor físico embaixo (o Nutanix, ou o servidor de teste) é dimensionado por quem hospeda e não entra nesta conta - só as VMs importam.

| Papel                       | Qtd       | vCPU (cada) | RAM (cada) | SSD        | Função                                                             |
| --------------------------- | --------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------ |
| Control-plane (RKE2 + etcd) | 3         | 4           | 8 GB       | 100 GB     | miolo do Kubernetes; não roda o app, não é o Rancher (Seção 6)     |
| Worker                      | 3         | **16**      | **32 GB**  | **200 GB** | roda o app; só SO/imagens no disco (o dado dos bancos vai no pool) |
| Pool de dados (Nutanix CSI) | 1 pool    | -           | -          | **~2 TB**  | 1 volume por banco + Kafka (db-audit o maior); expansível          |
| **TOTAL do cluster**        | **6 VMs** | **60 vCPU** | **120 GB** | **~3 TB**  | ~0,9 TB nos discos de SO + ~2 TB no pool de dados                  |

> [!note] O servidor de teste roda um cluster menor (de propósito)
> A tabela acima é **produção**. O servidor de teste (sumo) roda a mesma topologia 3+3 com workers menores (hoje 8 vCPU / 16 GB, disco pequeno) porque é só prova de conceito - basta para validar escala, N+1 e o comportamento por serviço, já que o consumo por réplica é o mesmo. Os números de produção não dependem do tamanho do servidor de teste.

**RAM de 32 GB por worker vem do consumo real, não da medição enxuta do laboratório.** O laboratório roda só 7 dos 27 serviços sob carga sintética e usa pouca RAM (~8 GB), mas em produção o attlas 25 inteiro (todos os serviços, dados reais) rodou em **~32 GB numa única caixa** (Seção 8), com o db-audit sozinho em 4,6 GB. A conta do attlas 26: o regime é ~21 GB e o pior caso (todo pod no teto) ~53 GB; no N+1 os **2 workers que sobram (2 x 32 = 64 GB)** seguram o regime com folga (33%) e até o pior caso (83%). Por isso **32 GB** e não menos (16 GB apertaria o db-audit numa reprogramação) nem mais (48 GB seria folga demais). A CPU continua o gargalo do dia a dia; a RAM é dimensionada pelo db-audit e pelo empacotamento de pods no N+1.

**O dado dos serviços com estado não fica no disco do worker, e sim num pool de dados (Nutanix CSI).** Cada banco é uma **instância única** (1 pod + 1 volume + 1 cópia, sem réplica - Seção 6): o Kubernetes recorta um volume (PV) do pool por banco e o anexa ao worker que roda aquele pod. Se o worker cair, o pod sobe em outro worker e o **mesmo volume reconecta** - continua um banco só, uma cópia só. Por isso o disco do worker é pequeno (200 GB: SO, imagens, efêmero) e o control-plane só 100 GB (SO + etcd).

O **pool é dimensionado pelo dado real**: o attlas 25 inteiro ocupa **~700 GB** hoje. Para Quito (maior, ~1000 controladores) com folga e retenção, o pool começa em **~2 TB, expansível**. O maior consumidor é o **db-audit** (auditoria de ~1 ano), seguido do Kafka; os demais bancos e o Redis são pequenos. O número fino sai da retenção (que o cliente define) x a taxa de ingestão (medível pelo Prometheus do legado, Seção 8).

**Backup é responsabilidade do cliente**, fora deste dimensionamento (e não deve ficar no mesmo pool dos dados vivos).

**Vida útil (5 anos)**: SSD enterprise com endurance (TBW) para escrita contínua (Kafka e auditoria escrevem o tempo todo) e garantia cobrindo os 5 anos.

> [!warning] O pool de ~2 TB é ponto de partida, não um teto validado
> O attlas 25 inteiro ocupa **~700 GB** hoje; Quito é maior (**~1000 controladores** e milhares de câmeras), então o pool começa em ~2 TB com folga. Duas exigências: (1) o pool tem que ser **expansível** (adicionar disco sem parar), e (2) o número fino sai da **retenção x taxa de ingestão** (eventos/s x bytes/evento), medível pelo Prometheus do legado (Seção 8). Até medir, tratar ~2 TB como piso e deixar margem para crescer.

Alternativa equivalente aos workers de 16 vCPU: **5-6 workers de 8 vCPU** (mesma capacidade total, mais nós).

## 6. Arquitetura: estratégia e distribuição

**Estratégia: cluster Kubernetes de Alta Disponibilidade (HA), topologia _stacked etcd_ - 3 control-plane em quórum + 3 workers em N+1.** É o **menor desenho sem ponto único de falha** em todas as camadas: menos que 3+3 deixa de ser HA (2 control não formam quórum útil; 1 worker não tem para onde reagendar). É isso que justifica as 6 VMs.

Entender os papéis evita o erro de achar que mais VMs significa sistema duplicado:

- **Control-plane (3 VMs) = o "cérebro" do Kubernetes do cluster.** Administra o cluster mas **não roda a aplicação Attlas**. Faz 4 coisas: recebe os comandos (**API**), guarda o estado do cluster - quais serviços existem, quantas réplicas, qual pod em qual nó (**etcd**, que é a config **do cluster**, **não o banco do Attlas**), decide em qual worker cada pod roda (**scheduler**) e corrige sozinho quando algo sai do esperado, ex. recriar um pod morto (**controllers**).
- **Rancher (painel de gestão) NÃO fica nessas 6 VMs** - não confundir com o control-plane. Vive na camada de gestão, fora do servidor do cliente: no laboratório é o cluster `local` na raiz da máquina (sumo); em produção é o Rancher central da Atman, que gerencia Quito remotamente por GitOps (Fleet). O hardware de Quito são só estas 6 VMs; o painel não consome esse hardware.
- **Workers (3 VMs)**: onde toda a aplicação roda.
- **Stateless × stateful** (a regra de o que escala e o que não escala fica em [[01-VISAO-GERAL]] §4): os `ms-*`, Kong e front escalam em réplicas; Postgres, Kafka e Redis ficam single-instance com disco persistente. Para o **dimensionamento**, o que importa é que o **banco de auditoria e o Kafka** são os mais pesados - pedem CPU dedicada (2-4 vCPU) e disco rápido, e em produção exigem disco persistente (o SSD do worker, ou Nutanix CSI se quiser que o volume siga o pod), nunca o efêmero do lab.
- **Streaming de câmera (vídeo via MediaMTX)**: limitado por **rede/banda**, não por CPU. Dimensionar pelo nº de transmissões simultâneas x taxa de bits; pode exigir banda dedicada. Não foi medido neste teste.

## 7. Configuração Kubernetes

- **Pod dimensionado por serviço** (Seção 8), no lugar de um teto único: cada serviço tem request (reserva) e limit (teto) próprios - os pesados (ms-cameras, ms-audit, ms-connector-une) com pod de 1 vCPU / 1-2 GB, os leves (ms-pmv) com 0,3 vCPU / 256 MB, e o banco de auditoria (db-audit) com 2 vCPU / 8 GB. Tabela em 7.1; no chart via `microserviceResources` / `databaseResources` (`values.yaml`).
- **Tetos de réplica são limite duro (hardware dedicado)**: cada serviço tem um `max` de réplica. A soma de `max x teto do pod` mais os serviços com estado cabe no cluster (60 vCPU), e o **regime** cabe em 2 de 3 workers (N+1 = 32 vCPU). Os `max` foram calibrados para isso (7.1). Em hardware dedicado **nenhum pod fica sem teto** - inclui db-audit e Kafka.
- **Espalhar réplicas entre os nós** (`topologySpreadConstraints` / anti-affinity), para o autoescalador não concentrar tudo num worker só.
- **Limitar os workers do Kong** (`KONG_NGINX_WORKER_PROCESSES=2`), senão OOM no boot. Já no chart; sintomas em [[05-FALHAS-E-RECUPERACAO]].
- **Escala do audit por CPU**, não por lag (o scaler Kafka do KEDA não funciona neste ambiente); manter o `kafka-init` alinhado ao catálogo `@attlas/contracts`. Contexto na Seção 3; sintomas em [[05-FALHAS-E-RECUPERACAO]].
- **Sem autoescalamento de VM** (capacidade fixa, planejada): ver [[01-VISAO-GERAL]] §4.

### 7.1 Recurso dedicado por microsserviço

Cada serviço tem o **seu** pod. **Reserva (request)** = piso garantido e base do gatilho de CPU do KEDA; **teto (limit)** = máximo por pod; **min-max** = faixa de réplicas do KEDA; **regime** = réplicas esperadas em Quito (Seção 4). É a fonte da tabela do chart (`values.yaml`); a origem de cada número está na Seção 8.

| Serviço                   | Reserva/pod        | Teto/pod           | Réplicas (min-max) | Regime |
| ------------------------- | ------------------ | ------------------ | ------------------ | ------ |
| ms-cameras                | 0,25 vCPU / 512 MB | **1 vCPU / 2 GB**  | 1-8                | ~4     |
| ms-audit                  | 0,25 vCPU / 384 MB | **1 vCPU / 1 GB**  | 1-8                | ~4     |
| ms-connector-une          | 0,2 vCPU / 384 MB  | **1 vCPU / 1 GB**  | 1-6                | ~3     |
| ms-traffic-model          | 0,1 vCPU / 192 MB  | 1 vCPU / 768 MB    | 1-4                | ~2     |
| ms-communication-channels | 0,1 vCPU / 192 MB  | 0,5 vCPU / 512 MB  | 1-4                | ~2     |
| ms-organization           | 0,1 vCPU / 192 MB  | 0,5 vCPU / 512 MB  | 1-3                | ~2     |
| ms-pmv                    | 0,05 vCPU / 128 MB | 0,3 vCPU / 256 MB  | 1-2                | ~1     |
| kong                      | 0,1 vCPU / 256 MB  | 1 vCPU / 512 MB    | 1-3                | ~2     |
| web-attlas                | 0,05 vCPU / 64 MB  | 0,25 vCPU / 256 MB | 1-2                | ~1     |

Serviços com estado **não escalam** (réplica única + PV, sem ScaledObject - Seção 6), mas têm pod dedicado pelo mesmo critério:

| Stateful   | Reserva/pod        | Teto/pod           |
| ---------- | ------------------ | ------------------ |
| db-audit   | 1 vCPU / 2 GB      | **2 vCPU / 8 GB**  |
| kafka      | 0,25 vCPU / 1 GB   | 2 vCPU / 2 GB      |
| db-cameras | 0,15 vCPU / 384 MB | 1 vCPU / 1 GB      |
| demais db  | 0,1 vCPU / 128 MB  | 0,5 vCPU / 512 MB  |
| zookeeper  | 0,05 vCPU / 384 MB | 0,5 vCPU / 512 MB  |
| redis      | 0,02 vCPU / 64 MB  | 0,25 vCPU / 256 MB |

Cada um é **instância única** (1 pod + 1 PV + 1 cópia, sem réplica): o disco vem do pool CSI (~2 TB, Seção 5), 1 volume por banco, o db-audit o maior. Estes números são o **ponto de partida**; os testes de carga afinam serviço a serviço. A conta que garante que a soma **não extrapola o hardware** está em 7.2.

### 7.2 A conta fecha (não extrapola o hardware limitado)

Pod x réplicas de todos os serviços, contra a capacidade **fixa** do cluster:

| Cenário                                 | CPU         | RAM       |
| --------------------------------------- | ----------- | --------- |
| Regime (réplicas esperadas x pod)       | ~23 vCPU    | ~21 GB    |
| Pior caso (todo serviço no `max` x pod) | ~42 vCPU    | ~53 GB    |
| **Capacidade do cluster (3 workers)**   | **48 vCPU** | **96 GB** |
| **Capacidade em N+1 (2 workers)**       | **32 vCPU** | **64 GB** |

- **Regime cabe folgado no N+1** (23 de 32 vCPU; 21 de 64 GB). É a garantia operacional: perder 1 worker não derruba nada.
- **Pior caso** (todos no `max` ao mesmo tempo, que não é padrão de carga real) cabe no **cluster inteiro** (42 de 48 vCPU; RAM 53 de 96). No pior caso o limite é **CPU**, não RAM (o gargalo de sempre).
- **Nada passa dos 48 vCPU / 96 GB.** Os `max` por serviço são o teto que impede a soma de extrapolar. Precisou de mais teto num serviço? Corta de outro, ou adiciona worker (decisão à parte, [[01-VISAO-GERAL]] §4).

> [!note] O que falta para fechar o número
> A Seção 4 é ordem de grandeza (ver o callout MEDIDO x ESTIMADO acima). Para travar o número: o volume exato do edital, dados reais no banco e medir por carga os 3 serviços ainda não testados (traffic-model, pmv, connector-une). O caminho mais rápido para os 3 é a série do `prometheus_federate` legado (Seção 8).

## 8. Referência do legado (attlas 25)

Nem todos os 27 serviços do attlas 26 estão prontos, e o servidor de teste é pequeno, então para os serviços que ainda não medimos por carga usamos o **consumo do sistema atual** como referência de tamanho de pod. É um monólito em Docker Compose (sem Kubernetes), numa única caixa de 8 vCPU / 30,8 GB. Serve de **âncora de tamanho, não de validação**: é outra arquitetura e o snapshot foi um vale. Quito é uma escala muito maior, então ele dá o **tamanho de cada peça**, não a folga.

### 8.1 Consumo medido (docker stats) e mapa para o attlas 26

Snapshot do `docker stats` da caixa do attlas 25 - os pesados guiam o pod de cada serviço do attlas 26 (Seção 7.1):

| Container attlas 25          | CPU   | RAM        | Vira no attlas 26          |
| ---------------------------- | ----- | ---------- | -------------------------- |
| attlas-detector-history      | 105%  | 640 MB     | ms-audit                   |
| attlas-virtual-loop-server   | 102%  | 2,08 GB    | ms-cameras                 |
| attlas-video-analytic        | 71%   | 500 MB     | ms-cameras                 |
| attlas-controller            | 36%   | 976 MB     | ms-connector-une           |
| attlas-gateway-api           | 13%   | 307 MB     | kong                       |
| attlas-notification          | 2,5%  | 102 MB     | ms-communication-channels  |
| attlas-traffic-model         | 1,8%  | 90 MB      | ms-traffic-model           |
| attlas-system-1..5           | baixo | ~120 MB    | ms-organization            |
| attlas-client + attlas-nginx | baixo | ~25 MB     | web-attlas                 |
| **db-detector-history**      | 16,8% | **4,6 GB** | **db-audit** (topo de RAM) |
| db-video                     | 14,8% | 598 MB     | db-cameras                 |
| attlas-kafka-broker          | 2,9%  | 1,24 GB    | kafka                      |
| attlas-zookeeper             | 0,1%  | 330 MB     | zookeeper                  |
| redis-\*                     | ~0%   | ~3 MB      | redis-\*                   |
| demais dbs (system/notif/tm) | baixo | 30-90 MB   | demais db-\*               |

Leituras que definiram o dimensionamento:

- **Câmeras e auditoria são o topo de CPU** (virtual-loop e detector-history batem 1 núcleo cheio) - por isso pod de 1 vCPU e escala horizontal.
- **db-audit é o topo de RAM** (4,6 GB numa instância) - por isso pod com teto de 8 GB, e é por isso que o worker tem 32 GB (Seção 5), não por chute.
- **O parque inteiro somou ~4,6 vCPU / ~24 GB** num instante (por praça, ~1-2 vCPU). Confirma a direção: CPU aperta nos serviços, RAM pesa nos bancos.
- **pmv não existe no attlas 25**, por isso é o único estimado (leve) sem referência.

> [!note] Como fechar os 3 serviços ainda não medidos por carga no attlas 26
> traffic-model, pmv e connector-une ainda não foram testados por carga no attlas 26. O caminho mais rápido é extrair as séries do `prometheus_federate` do attlas 25 (CPU max/p95 e RAM working-set no pico de uma praça) e refinar o pod deles na Seção 7.1.
