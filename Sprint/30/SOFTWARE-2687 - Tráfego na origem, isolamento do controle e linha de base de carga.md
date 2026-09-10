---
tags:
  - attlas
  - sprint-30
  - task
  - streaming
  - ms-cameras
  - banda
card: SOFTWARE-2687
clickup: https://app.clickup.com/t/86ak5e33b
titulo: "[Back] Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx)"
frente: Streaming
tamanho: 5 pontos (1 a 2 dias), estimativa nova para o recorte de sábado
status: "EM ANDAMENTO. PR [#2344](https://github.com/atmanadmin/attlas-2026/pull/2344) aberta em 29/08 com a linha de base (requisito 3, instrumentação); os requisitos 1 e 2 seguem abertos, com o motivo de cada corte ter ficado fora registrado no amendment do PROJ-007. COMPROMETIDO para sábado 30/08 em hora extra, decisão registrada no report de 28/08. Sai do sem prazo, onde estava desde 24/08. Três frentes: cortar o fan-out de pulls na origem, separar o tráfego de controle do de vídeo, e levantar a linha de base de carga que hoje não existe. Alvo de entrega em PR única, porque o teste é manual e iterativo."
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-29
---

# Tráfego na origem, isolamento do controle e linha de base de carga

> Recorte de execução do [[Streaming - Saturação de banda de saída sob carga concorrente]], que era
> achado sem prazo e ganhou data. A investigação, os números do incidente e os diagramas continuam em
> [[Incidentes - Streaming (ms-cameras)]]. Esta nota não repete a investigação, define o que fazer.

## De onde veio

O report de 28/08 fechou a semana declarando três pendências de streaming para sábado 30/08, em hora
extra: reduzir o tráfego na origem publicando apenas a qualidade solicitada, separar o tráfego de
controle do de vídeo, e rodar os testes de carga que faltam para existir critério de aceite de escala.
As correções rápidas do mesmo achado já saíram na PR
[#2246](https://github.com/atmanadmin/attlas-2026/pull/2246), mergeada em 27/08.

## O que já está entregue, para não refazer

A PR #2246 fechou quatro itens que apareciam como pendência nas notas anteriores. Reabrir qualquer um
deles no sábado é retrabalho.

| Item | Onde ficou |
| --- | --- |
| Backoff do WHEP no player, corta o loop de reconexão | `whep-failure-tracker.util.ts`, memória por url com validade de 60 segundos |
| Carência de 10 segundos no monitor de saúde do player | `CameraStreamPlayerComponent.sampleHealth` |
| Teto agregado de sessões novas por host | `MAX_CONCURRENT_STREAM_SESSIONS`, default 40, recusa 429 só para sessão genuinamente nova |
| Retenção do rollup diário de disponibilidade | `AvailabilityRollupService.cleanupDailyRollups`, `AVAILABILITY_ROLLUP_RETENTION_DAYS` default 90 |

Fora isso, a telemetria de bitrate que mantinha uma sessão RTSP contínua por câmera 24 horas por dia
foi removida na mesma PR. O `TelemetryPathReconciler` não existe mais e o `TelemetryPathRegistry` ficou
inerte, sempre vazio. O comentário de `docker/mediamtx.yml` que ainda descreve os caminhos de telemetria
sempre ligados está defasado e vale corrigir de carona.

## Requisito 1: publicar apenas a qualidade solicitada

### Correção necessária no enunciado

A frase do report, "publicar apenas a qualidade solicitada em vez das três variantes", descreve um
comportamento que **não existe no caminho do player**. A leitura de código de 27/08 já tinha confirmado
isso, e a releitura de hoje confirma de novo: o front pede uma qualidade por vez e troca em modo abre
antes de fechar, e o backend cria exatamente uma sessão por combinação de câmera, qualidade e codec.
Não há nenhum ponto que faça leque para PRIMARY, SECONDARY e TERTIARY ao mesmo tempo, e nenhum cron ou
aquecimento abre sessão sem uma requisição de espectador.

O ganho existe, mas a origem dele é outra. São quatro multiplicadores reais, e somados eles sustentam a
ordem de grandeza de dois terços que o report citou. Vale ajustar o enunciado no próximo report, porque
quem for procurar "três variantes" no player não vai encontrar.

### Multiplicador 1: a mesma câmera física puxada uma vez por sistema

O caminho no servidor de mídia e a sessão são identificados por `cameraId`, que é a linha do banco, não
o aparelho. A mesma câmera física está cadastrada uma vez por sistema, seis hoje em produção. Dois
operadores de sistemas diferentes olhando a mesma câmera física abrem duas relays independentes, e a
câmera atende as duas.

O precedente de correção já existe e é do próprio serviço: `groupByDeviceStream`
(`health/utils/device-stream-group.util.ts`) dobra a lista de câmeras em uma entrada por stream físico,
com a url do stream como chave e a menor identificação como representante. Foi escrito exatamente para
impedir que a telemetria virasse seis conexões contra uma câmera. O streaming nunca usou.

Este é o item de maior retorno da lista, e é o único que escala com a frota.

### Multiplicador 2: H264 e H265 são relays separados da mesma imagem

`streamPathName` acrescenta o sufixo `-h265` e o controlador trata as duas como sessões independentes,
com contagem de espectadores própria. Está documentado como decisão deliberada, para que clientes com
decodificação por hardware e clientes sem ela coexistam. O efeito colateral é que a mesma câmera, na
mesma qualidade, pode ter duas relays puxando ao mesmo tempo se dois navegadores diferentes a
assistirem.

Não é para desfazer a decisão. É para decidir se, sob pressão de banda, a negociação passa a convergir
para H264 quando já existe uma relay H264 viva para aquela câmera e qualidade.

### Multiplicador 3: a projeção no videowall puxa direto da câmera

`VideowallProjectionSourceGridService.resolveCameraSourceUrl` resolve o descritor da câmera e registra
um caminho `videowall-projection-<uuid>` cuja fonte é a url RTSP da própria câmera, com credencial. Esse
caminho é independente do caminho `<cameraId>-<qualidade>` que o navegador consome, e o nível servido
ao painel é `VIDEOWALL_PROJECTION_STREAM_TYPE`, que vem `PRIMARY` por padrão.

Ou seja, uma câmera na parede de LED e aberta numa tela ao mesmo tempo são duas leituras da mesma
câmera, uma delas no nível mais pesado. Há atenuação parcial, porque o caminho é `sourceOnDemand: true`
e um slot ocioso não custa banda, mas quando o painel está exibindo o custo é real e simultâneo.

Existe um piso de resolução declarado para a parede, 480 linhas, então servir a projeção a partir de um
nível mais leve é possível dentro da regra, e a mudança pode ser só de configuração.

### Multiplicador 4: sobreposição durante a troca de nível

A troca de qualidade abre o novo nível e só derruba o antigo quando o novo confirma. Somado ao
`HLS_SESSION_GRACE_MS` de 10 segundos, as duas relays coexistem por algo em torno de 10 segundos mais o
tempo de abertura. É o comportamento correto para não piscar a imagem, e não deve ser removido. Importa
como fator quando uma grade inteira troca de nível de uma vez, que é justamente o gesto do videowall.

### Recorte proposto

Fazer o multiplicador 1 como trabalho de código, porque é o que escala com a frota e já tem precedente
interno. Tratar os multiplicadores 2 e 3 como decisão de configuração e política, medindo antes e
depois. Deixar o 4 como está e apenas contabilizá-lo na leitura dos números.

## Requisito 2: separar o tráfego de controle do de vídeo

### O que compete hoje

O vídeo servido aos navegadores e os pings de saúde para as câmeras, que são ONVIF, VAPIX e WebSocket
Axis, saem pela mesma interface do host. Foi essa disputa que, em 24/08, entre 11:50 e 12:15 UTC,
levou todas as câmeras da rede a `DEGRADED` ao mesmo tempo, com a latência de ping saindo de cerca de
145 milissegundos para algo entre 800 e 1300, enquanto a saída da interface subia cerca de 150 vezes
acima do normal. As câmeras estão em sub-redes distintas, o que descarta problema em um aparelho e
confirma que o engarrafamento é do cano de saída do host.

### O que já foi investigado e descartado, com o motivo

Priorizar controle sobre vídeo com `tc` foi investigado em 27/08 e descartado. O motivo é específico e
precisa acompanhar a decisão: `fq_codel` já está ativo na interface, por padrão do driver, então já
existe justiça entre fluxos e proteção contra enfileiramento excessivo. E a instância é `t3a.2xlarge`,
família com crédito de rede limitado, cujo padrão de falha é exatamente degradar, cair e voltar sozinha
em minutos. Disciplina de fila não inventa banda acima do teto que a instância tem alocado.

Isso muda o que "separar" pode significar, e vale decidir antes de abrir o editor.

### Opções reais, do mais barato ao que de fato resolve

1. **Marcar e priorizar o controle na fila existente.** Custa pouco e reduz a latência de fila do ping,
   mas não muda o teto. Serve para o vídeo degradar antes da saúde, o que já é um ganho de
   diagnóstico, porque hoje o sintoma aparece como câmera instável.
2. **Segunda interface de rede na mesma instância.** Separa as filas, mas na AWS as interfaces de uma
   instância dividem o mesmo teto de banda dela. Resolve disputa, não resolve saturação.
3. **Tirar a saúde do host que serve vídeo.** Resolve de verdade, porque separa os recursos e não só as
   filas. É mudança de topologia, não de código, e conversa com a escalabilidade horizontal que já tem
   card próprio.
4. **Trocar a classe da instância para uma família sem crédito de rede.** Resolve o teto. É decisão de
   custo e infraestrutura, não é código, e é a única que ataca a causa apontada em 27/08.

A recomendação para sábado é executar a opção 1, porque cabe no dia e melhora o diagnóstico, e levar as
opções 3 e 4 como recomendação registrada com o número medido do teste ao lado. Sem o número, a conversa
de custo não tem base.

## Requisito 3: linha de base de carga

### O que medir

O report define três eixos, e todos os três são mensuráveis com o que já existe no ambiente.

| Eixo | Como medir | De onde vem |
| --- | --- | --- |
| Banda por stream | Megabits por segundo por relay, separado por nível e codec | Contadores por caminho do servidor de mídia, porta 9998 |
| Latência | Tempo até o primeiro quadro por abertura, e latência de ping da saúde no mesmo intervalo | `CameraTtffSample` e `CameraAvailabilityWindow.avgLatencyMs` |
| Vários espectadores | Confirmar que M espectadores da mesma câmera e nível reusam uma relay, e achar o joelho da saída | Contagem de leitores por caminho, mais `sar` na interface do host |

### Lacuna de instrumentação

O `/metrics` do serviço tem duas métricas de streaming, o total encerrado pelo reaper e o número de
sessões vivas. Nenhuma por câmera e nenhum histograma. Sem histograma de tempo até o primeiro quadro
não existe comparativo honesto entre estratégias de entrega, e essa lacuna já estava anotada no
levantamento do card de escalabilidade em HLS. Se a linha de base precisa sobreviver ao sábado e servir
de critério de aceite depois, o histograma e um medidor de bytes por caminho entram no trabalho.

### Roteiro

O passo zero é confirmar alcance às câmeras antes de qualquer medição. Em 27/08 todas as linhas de
câmera ficaram `OFFLINE` por mais de quatro horas, sem uma única conexão ONVIF bem sucedida, com
suspeita de perda de rota pelo roteador de sub-rede do tailnet. Esse teste específico ficou pendente. Se
a rota não estiver de pé, não há teste de carga, e o sábado vira investigação de rede.

Com alcance confirmado, o roteiro é reproduzir o episódio de 24/08 de forma controlada: abrir N
espectadores contra M câmeras, subir em degraus, e registrar em cada degrau a saída da interface, a
banda por relay, o tempo até o primeiro quadro e a latência de ping da saúde. O ponto onde a latência de
saúde sai do patamar normal é o teto operacional do host, e é esse número que vira critério de aceite.

### Critério de aceite que sai do teste

O resultado esperado é uma frase com número: quantas câmeras simultâneas este host sustenta mantendo a
latência de saúde no patamar normal, e quanto cada corte de multiplicador do requisito 1 moveu esse
número. É isso que hoje não existe, e é por isso que a fase de validação de escala do card antigo de
ciclo de vida de sessões nunca teve critério comprovado.

## Estado em 29/08: primeira PR aberta

[#2344](https://github.com/atmanadmin/attlas-2026/pull/2344) leva a linha de base do requisito 3, que
é o que precisa existir antes de qualquer medição de sábado: histograma do tempo até o primeiro quadro
por variante, relays vivas por variante, espectadores somados e recusas pelo teto do host. O par
relays contra espectadores é a medida de reuso. Banda por stream ficou de fora de propósito, porque o
servidor de mídia já expõe bytes por caminho na porta 9998.

Os quatro multiplicadores do requisito 1 ficaram registrados no amendment do PROJ-007
(`apps/ms-cameras/docs/atomic/PROJ-007-stream-session-reaper.md`), cada um com o motivo de não ter
entrado. O dedup por aparelho físico é o de maior retorno e o que exige decisão própria: muda a dona
da sessão e faz a URL entregue a um sistema carregar o identificador da linha de outro.

## Entrega em PR única

A intenção declarada é uma PR só, porque o teste é manual e iterativo e ficar trocando de branch atrapalha.
É viável, com uma ressalva de escopo.

Cabe na PR:

- Dedup de relay por aparelho físico no streaming, reusando o agrupamento que a saúde já usa.
- Política de convergência de codec sob pressão, se a decisão for tomada.
- Nível servido à projeção do videowall, que é configuração.
- Instrumentação de linha de base, histograma de tempo até o primeiro quadro e bytes por caminho.
- Correção do comentário defasado do `docker/mediamtx.yml` sobre a telemetria removida.

Não cabe na PR, e deve sair como recomendação escrita com os números ao lado:

- Troca de classe da instância e separação de host para a saúde, que são decisões de infraestrutura.
- Priorização de fila na interface, que é configuração de host e não versiona no repositório.

Duas obrigações do repositório valem aqui. A primeira é que teste de integração é obrigatório para
implementação nova, e o dedup por aparelho físico é exatamente o tipo de mudança que precisa de um. A
segunda é que isto segue o fluxo de correção de incidente do processo de specs, o mesmo caminho que a
PR #2246 usou, então não trava esperando spec aprovada, mas registra a dívida no corpo da PR.

## Riscos

- **O ambiente pode não estar de pé.** É o risco que mata o dia inteiro, e por isso é o passo zero.
- **O dedup por aparelho físico muda quem é o dono da sessão.** Duas linhas de câmera de sistemas
  diferentes passam a compartilhar uma relay, e a contagem de espectadores precisa somar entre elas.
  Errar isso reintroduz o vazamento de sessão de 03/07 pelo outro lado, com a relay morrendo enquanto
  ainda há alguém assistindo pelo outro sistema.
- **Isolamento de dado entre sistemas.** Compartilhar relay entre linhas de sistemas diferentes precisa
  continuar servindo o vídeo por um caminho que cada sistema tem direito de ler. A imagem é a mesma
  câmera física, então não há vazamento de conteúdo, mas o caminho compartilhado precisa de leitura
  consciente antes de entrar.
- **O teto pode ser da instância, e não do código.** Se o teste mostrar que o joelho chega antes do
  esperado mesmo depois dos cortes, a conclusão honesta é que o gargalo é a classe da instância, e a
  entrega do dia vira o número que sustenta essa decisão, não um ganho de banda.

## Encosta em

[[Streaming - Saturação de banda de saída sob carga concorrente]] · [[Incidentes - Streaming (ms-cameras)]] ·
[[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] · [[Streaming - Arquitetura]] ·
[[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] ·
[[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]] ·
[[SOFTWARE-2314 - Performance do streaming de vídeo]] · [[VMS - Banda e alertas]] ·
[[Attlas - Sprint 30]] · [[00 - Sem prazo (backlog)]]
