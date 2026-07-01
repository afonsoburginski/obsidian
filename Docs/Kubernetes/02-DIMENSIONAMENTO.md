# Teste de capacidade e dimensionamento de hardware - Quito

> [!abstract] Em uma frase
> Subimos o stack real no cluster de teste (3 control + 3 workers, **mesma topologia** da produção - mas workers menores), medimos quanto cada serviço consome e projetamos o hardware de Quito a partir disso. O laboratório é prova de conceito; o destino é o hardware do cliente.

- **Versão:** 2.4 - **Data:** 25/06/2026
- Contexto: [[03-PRODUCAO]] (arquitetura), [[01-VISAO-GERAL]] (lab), [[04-CI-CD]] (distribuição).

> [!note] Unidades usadas no documento
>
> - **CPU**: medida em **vCPU** = um núcleo virtual de processador. `1 vCPU` = 1 núcleo; `0,5 vCPU` = meio núcleo. Quando aparece a notação do Kubernetes `500m` ("m" = milicore = milésimo de núcleo), é só outra forma de escrever: `500m = 0,5 vCPU`, `100m = 0,1 vCPU`.
> - **Memória (RAM)**: em **MB / GB**.
> - **req/s**: requisições atendidas por segundo (vazão).
> - **p95**: 95% das respostas ficaram abaixo desse tempo (mede latência sem o ruído dos piores 5%).

---

## 1. O que foi testado e critérios

- **Ambiente**: cluster `attlas-quito` no laboratório, RKE2, 3 control (4 vCPU / 8 GB) + 3 workers (8 vCPU / 16 GB), stack completo pelo chart. A aplicação roda só nos workers (o control é reservado).
- **Dois tipos de teste**:
  - **Por serviço** (isolado): carga em um serviço de cada vez, para medir **quanto 1 réplica aguenta** e quanto consome (§3, "sob carga").
  - **Plataforma inteira** (integrado): vários serviços sob carga ao mesmo tempo **+ o teste de falha de nó (N+1)**, para validar o cluster como um todo (§3, "alta disponibilidade").
- **Carga**: `fortio` em pod, autenticado com sessão real (seed do ms-organization no banco do cluster + login de operador MASTER); produtor Kafka para os serviços que consomem eventos.
- **Critério de capacidade**: maior carga em que, com o autoescalador (KEDA) estabilizado, 95% das respostas (p95) ficam abaixo de 300 ms, sem travamento por CPU nem estouro de memória.
- **Critério de alta disponibilidade (N+1)**: o pico tem que caber em **2 dos 3 workers** - perder um nó não pode derrubar nada.

## 2. Como o consumo funciona (modelo mental)

A unidade de consumo é a **réplica de microsserviço** (uma cópia do serviço em execução). Três fatos medidos definem o dimensionamento:

1. Em repouso, uma réplica usa quase nada de CPU: cerca de **0,05 vCPU**.
2. Sob carga, cada réplica sobe até o **teto de 0,5 vCPU** (meio núcleo) e satura ali. Quando passa de 60% desse teto, o autoescalador **cria outra réplica**.
3. Logo: **consumo de um serviço = nº de réplicas que a carga exige x 0,5 vCPU.** Dimensionar é estimar quantas réplicas cada serviço precisa em Quito, somar, e garantir que cabe em 2 workers (N+1).

> [!important] CPU é o recurso que aperta; memória sobra.
> Em todos os testes a réplica bateu o teto de CPU (0,5 vCPU) usando menos de 150 MB de RAM. O hardware é guiado por **CPU**; a memória só acompanha.

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

Escala de Quito: **milhares de câmeras, centenas de controladores, centenas de PMVs**, dezenas de operadores. Diferença para o lab: esse parque gera **carga contínua** (status, eventos, polling), então os serviços pesados ficam perto do máximo ao mesmo tempo e o tempo todo - é regime de operação, não pico raro.

Aplicando o consumo medido ao volume de Quito (réplicas x 0,5 vCPU):

| Serviço                         | Por que consome em Quito                                          | Réplicas | CPU             | RAM       |
| ------------------------------- | ----------------------------------------------------------------- | -------- | --------------- | --------- |
| ms-audit                        | recebe **todo** evento (status, detecção, ciclo de vida) como log | ~8       | ~4 vCPU         | ~1,2 GB   |
| db-audit (não escala)           | grava o fluxo de auditoria no banco                               | 1        | ~3 vCPU         | ~1 GB     |
| ms-cameras                      | ingestão/correlação de eventos de milhares de câmeras             | ~6       | ~3 vCPU         | ~0,9 GB   |
| ms-traffic-model                | rodadas de modelo (cálculo pesado, em rajadas)                    | ~6       | ~3 vCPU         | ~0,9 GB   |
| Kafka (não escala)              | alto volume de eventos passando                                   | 1        | ~2,5 vCPU       | ~1 GB     |
| ms-connector-une                | comunicação contínua com centenas de controladores                | ~4       | ~2 vCPU         | ~0,6 GB   |
| kong                            | porta de entrada de todo o tráfego                                | ~2       | ~2 vCPU         | ~0,5 GB   |
| ms-communication-channels       | notificações disparadas por eventos                               | ~3       | ~1,5 vCPU       | ~0,5 GB   |
| ms-organization                 | dezenas de operadores                                             | ~2       | ~1 vCPU         | ~0,4 GB   |
| ms-pmv                          | centenas de painéis, baixa frequência                             | ~1       | ~0,5 vCPU       | ~0,2 GB   |
| web + Redis + Postgres (outros) | leves, não escalam por carga                                      | -        | ~2 vCPU         | ~0,8 GB   |
| **TOTAL EM REGIME**             |                                                                   |          | **~26-28 vCPU** | **~8 GB** |

Os que puxam o consumo são **auditoria (ms-audit + banco de auditoria), câmeras e traffic-model**; pmv, organization, web e os demais bancos são leves. No pico (rodadas de modelo + rajada de eventos) o total chega a ~32 vCPU. A RAM do stack inteiro é ~8 GB, o que reforça: o gargalo é CPU.

> [!warning] O que é MEDIDO e o que é ESTIMADO (importante para a confiança do número)
>
> - **Medido por carga**: `ms-organization` e `ms-cameras` (curva REST, §3); `ms-audit` (escala 1→10 por CPU sob firehose de eventos); `ms-communication-channels` (escala por CPU); footprint em repouso de todos (§3); plataforma inteira + N+1 (§3).
> - **Estimado** (ainda **não** testado por carga, falta simulador/dados): `ms-traffic-model` (depende de disparar rodadas de modelo com topologia populada), `ms-pmv` e `ms-connector-une` (dependem de simular centenas de dispositivos). Os valores deles na tabela são ordem de grandeza pela natureza da carga, não medição.
> - **Multiplicador de Quito** (nº de câmeras/controladores/PMVs/operadores) vem do **edital** - é o que transforma "capacidade por réplica" em "réplicas no pico". Sem ele, o total de ~28-32 vCPU é estimativa fundamentada, não número fechado.

## 5. Hardware recomendado para produção

> [!important] Qual é a decisão de produção (lab ≠ produção)
> A **decisão** é a **topologia 3+3 HA** (a estratégia da Seção 6). O cluster que rodou no laboratório usou workers de **8 vCPU** - era prova de conceito, sem a carga real de uma cidade. Para **Quito**, a recomendação é a **mesma topologia com workers de 16 vCPU** (o dobro de CPU). Mesma forma, mais músculo - porque o lab não tinha milhares de câmeras gerando carga contínua.

**Do teste ao hardware - o cálculo, em 6 passos:**

1. **Teste por serviço** (§3): 1 réplica satura em **0,5 vCPU**; medimos quanto cada uma aguenta (ex.: organization ~93 req/s, cameras ~16 req/s por réplica).
2. **Demanda de Quito** (§4): milhares de câmeras, centenas de controladores/PMVs, dezenas de operadores - parque que gera carga **contínua**.
3. **Réplicas por serviço** = demanda ÷ capacidade por réplica.
4. **CPU por serviço** = réplicas × 0,5 vCPU. Somando todos os serviços = **~28 vCPU em regime** (pico ~32).
5. **Teste da plataforma inteira** (§3): vários serviços no máximo juntos + **falha de nó (N+1)** confirmaram que o conjunto reagenda e cabe nos nós restantes.
6. **Tamanho do worker**: o regime (~28-32 vCPU) tem que caber em **2 de 3 workers** (N+1) → **16 vCPU por worker** (2 × 16 = 32 ≥ pico). Com 8 vCPU não caberia nem nos 3 nós.

| Papel                       | Qtd       | vCPU (cada) | RAM (cada) | Disco      | Função                                                            |
| --------------------------- | --------- | ----------- | ---------- | ---------- | ----------------------------------------------------------------- |
| Control-plane (RKE2 + etcd) | 3         | 4           | 8 GB       | 50 GB SSD  | miolo do Kubernetes; não roda o app, não é o Rancher (Seção 6)    |
| Worker                      | 3         | **16**      | **32 GB**  | 100 GB SSD | roda toda a aplicação Attlas                                      |
| **TOTAL das VMs**           | **6 VMs** | **60 vCPU** | **120 GB** | **450 GB** | regime usa ~28-32 vCPU; o resto é folga operacional + reserva N+1 |

**O que o cliente compra é UMA máquina física** (o servidor Nutanix). Ele hospeda as 6 VMs e ainda reserva recursos pro próprio Nutanix (hypervisor AHV + CVM, ~12 vCPU / ~32 GB). Somando as VMs (60 vCPU / 120 GB / 450 GB) + esse overhead + folga pra crescimento de dados, a **máquina a adquirir** é:

| Recurso       | Especificação | Composição                                                 |
| ------------- | ------------- | ---------------------------------------------------------- |
| CPU           | **72 vCPU**   | 60 das VMs + 12 do Nutanix (AHV + CVM)                     |
| RAM           | **192 GB**    | 120 das VMs + 32 do Nutanix + folga                        |
| Armazenamento | **2 TB SSD**  | 450 GB dos discos das VMs + folga pro crescimento de dados |

RAM de 32 GB por worker é folgada (o stack todo usa ~8 GB) - acompanha a CPU, que é o gargalo. O crescimento de SSD é puxado pelo banco de auditoria e pelo Kafka (fluxo contínuo de eventos), então o disco deve permitir expansão. Alternativa equivalente aos workers de 16 vCPU: **5-6 workers de 8 vCPU** (mesma capacidade total, mais nós).

## 6. Arquitetura: estratégia e distribuição

**Estratégia: cluster Kubernetes de Alta Disponibilidade (HA), topologia _stacked etcd_ - 3 control-plane em quórum + 3 workers em N+1.** É o **menor desenho sem ponto único de falha** em todas as camadas: menos que 3+3 deixa de ser HA (2 control não formam quórum útil; 1 worker não tem para onde reagendar). É isso que justifica as 6 VMs.

Entender os papéis evita o erro de achar que mais VMs significa sistema duplicado:

- **Control-plane (3 VMs) = o "cérebro" do Kubernetes do cluster.** Administra o cluster mas **não roda a aplicação Attlas**. Faz 4 coisas: recebe os comandos (**API**), guarda o estado do cluster - quais serviços existem, quantas réplicas, qual pod em qual nó (**etcd**, que é a config **do cluster**, **não o banco do Attlas**), decide em qual worker cada pod roda (**scheduler**) e corrige sozinho quando algo sai do esperado, ex. recriar um pod morto (**controllers**).
- **Rancher (painel de gestão) NÃO fica nessas 6 VMs** - não confundir com o control-plane. Vive na camada de gestão, fora do servidor do cliente: no laboratório é o cluster `local` na raiz da máquina (sumo); em produção é o Rancher central da Atman, que gerencia Quito remotamente por GitOps (Fleet). O hardware de Quito são só estas 6 VMs; o painel não consome esse hardware.
- **Workers (3 VMs)**: onde toda a aplicação roda.
- **Stateless × stateful** (a regra de o que escala e o que não escala fica em [[01-VISAO-GERAL]] §4): os `ms-*`, Kong e front escalam em réplicas; Postgres, Kafka e Redis ficam single-instance com disco persistente. Para o **dimensionamento**, o que importa é que o **banco de auditoria e o Kafka** são os mais pesados - pedem CPU dedicada (2-4 vCPU) e disco rápido, e em produção exigem disco persistente (Nutanix CSI, o volume reconecta se o pod troca de nó), nunca o efêmero do lab.
- **Streaming de câmera (vídeo via MediaMTX)**: limitado por **rede/banda**, não por CPU. Dimensionar pelo nº de transmissões simultâneas x taxa de bits; pode exigir banda dedicada. Não foi medido neste teste.

## 7. Configuração Kubernetes

- **Reserva de CPU calibrada pelo repouso medido** (Seção 3), no lugar do valor único atual de 0,1 vCPU: serviço com Kafka ativo ~0,08 vCPU, os demais ~0,02 vCPU; teto de 0,5 vCPU por serviço; memória 128 MB reservados / 512 MB de teto.
- **Tetos de réplicas (KEDA) dentro do N+1**: a soma de `réplicas máximas x teto de CPU` tem que caber em 2 workers (com 3x16 vCPU = 32 vCPU, os tetos atuais cabem).
- **Espalhar réplicas entre os nós** (`topologySpreadConstraints` / anti-affinity), para o autoescalador não concentrar tudo num worker só.
- **Limitar os workers do Kong** (`KONG_NGINX_WORKER_PROCESSES=2`): por padrão o Kong sobe 1 worker nginx por core do nó (8 numa VM de 8 vCPU); juntos estouram o limite de 512Mi e o pod entra em CrashLoopBackOff por OOM no boot. Com 2 workers fica em ~185Mi. Já corrigido no chart (validado no reimplante de 25/06).
- **Os 3 defeitos de Kafka/KEDA já corrigidos no chart** (Seção 3). Como o **scaler de Kafka do KEDA não funciona neste ambiente** (Seção 3), o `ms-audit` ganhou um gatilho de **CPU** (já no chart) e passou a escalar - **não confiar só no gatilho de lag**. Manter a inicialização do Kafka alinhada ao catálogo `@attlas/contracts` (o `kafka-init` do chart já cria os tópicos consumidos + as DLQ).
- **Sem autoescalamento de VM** (capacidade fixa, planejada): ver [[01-VISAO-GERAL]] §4.

> [!note] O que fecha o número fino
> A Seção 4 é uma estimativa de ordem de grandeza a partir da capacidade medida. Para travar o número final faltam: o volume exato do edital (nº de câmeras / controladores / PMVs / operadores e eventos por segundo), dados de verdade no banco (as curvas foram sobre tabelas pequenas) e medir sob carga os **3 serviços ainda não testados** (traffic-model, pmv, connector-une) com simuladores de modelo/dispositivo. Isso confirma ou ajusta o 3x16 vCPU / 32 GB.
