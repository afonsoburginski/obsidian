---
tags:
  - attlas
  - analitico
  - deteccao
  - sprint-33
  - gap
sprint: Sprint 33
status: levantado em 12/09 durante a consolidação do console do Analítico, entregue pela PR #3328 (mergeada em 12/09). A PR resolve a maior parte da tela de Detecção; o que está aqui é o que ficou de fora e precisa virar card.
atualizado: 2026-09-12
---

# Detecção do Analítico - gaps para polir

Levantado enquanto a tela de Detecção era refeita em 12/09. Nada aqui bloqueou o merge da #3328:
são as pontas que apareceram no caminho e que a próxima semana deve fechar. Cada bloco está escrito
para virar card direto, com o porquê e onde olhar.

## 1. Consolidar o overlay do laço e apagar a cópia da ACOM

O overlay compartilhado nasceu em `apps/web-attlas/src/app/core/shared/components/virtual-loop-overlay`
e a tela de Detecção já consome ele. A cópia de `modules/controllers/components/controller-acom-loop-overlay`
continua de pé, e o docblock dela mesma diz que a Fase 7 do plano ACOM promove um overlay para
`core/shared` e apaga a cópia. A `UF-706` condiciona essa fase a alinhamento com quem toca o módulo
Analítico, que é por isso que não foi feito junto.

O que o card faz: troca o consumo da ACOM para o componente compartilhado (converte os pontos de 0-100
para 0-1 e mapeia os quatro estados de pintura para cor resolvida mais ênfase), apaga a cópia e as
declarações que só ela usava, e sobe com a regressão de `UF-033` que a própria UF pede.

## 2. Reaper derruba a sessão de streaming local em ~20 s

Em desenvolvimento a sessão morre sozinha pouco depois de abrir. O log do `ms-cameras` diz:
`StreamSessionReaperService - Reaping orphan session <camera>:SECONDARY: 0 readers no mediamtx por 20s`,
e o navegador passa a receber 404 no `/whep/<sessão>`. A imagem volta se a tela for reaberta, o que
torna qualquer validação visual longa penosa.

O que investigar: se o leitor WHEP do navegador está sendo contado pelo mediamtx, e se o reaper deveria
olhar a sessão e não só a contagem de leitores. Vale conferir se o mesmo acontece no EC2 antes de
tratar como problema só de ambiente.

## 3. `infra:up` não sobe mais a infraestrutura inteira

`npm run infra:up` passou a nomear cinco serviços na linha de comando, então os bancos e caches que não
estão em profile ficam fora, e o `ms-detector-history` não está na lista. Consequência direta: a face
Métricas do Laço Virtual responde 502 em toda máquina que subiu o ambiente por ali, porque o único
backend que ela lê não está no ar. O `CLAUDE.md` da raiz e o readme ainda descrevem o comportamento
antigo.

Decisão a tomar: renomear a pilha mínima para `infra:up:min` e devolver `infra:up` ao `docker compose up -d`,
ou manter o novo significado e corrigir a documentação. Seja qual for, `db-detector-history` e
`ms-detector-history` precisam entrar no caminho padrão.

## 4. Thumbnail de câmera fora do ar polui o console

`GET /api/cameras/<id>/thumbnail` responde 502 quando o gateway não alcança o equipamento, que é a
resposta honesta e o player já cai no estado offline. O efeito colateral é ruído: toda tela que lista
câmeras repete o erro no console a cada montagem, e num ambiente com uma câmera inalcançável isso
esconde erro de verdade.

O que o card faz: parar de pedir a mesma miniatura depois da primeira falha enquanto a câmera seguir
fora do ar, sem trocar o código de status.

## 5. Cobertura de teste da superfície nova

- `components/detection-object-boxes` entrou sem spec, e é onde mora o laço de pintura por quadro.
- O spec do `virtual-loop-overlay` usa laços de três pontos, então nem o chevron de direção nem o disco
  do índice são exercitados.
- `utils/sample-box-at.util.spec.ts` é anterior à predição e à janela de velocidade.
- `detection-toolbar.component.spec.ts` e `detection-block.component.spec.ts` continuam sem existir,
  como já registrado no handoff da frente anterior.

## 6. Contadores `OPEN` e `DETECTED` na fila de incidentes

Divergência já conhecida e ainda aberta: `list-camera-events.handler.ts` devolve `statusCounts` com a
chave `OPEN` e a página indexa os tiles por `DETECTED`. O filtro foi corrigido antes; os contadores dos
tiles não.

## 7. Aferir a predição do overlay em trânsito rápido

O overlay desenha no instante que a imagem está mostrando e cobre o atraso do analítico pela velocidade
da própria track, com teto de 1,4 s. Medido em 12/09: o analítico embarcado responde a cada 46 ms mas
com 600 a 900 ms de atraso de pipeline, e o servidor com cerca de 215 ms. Com veículo em velocidade
constante o sólido cai em cima; falta aferir frenagem e conversão, onde a extrapolação linear erra por
metade de um carro.

O que o card faz: filmar a tela em avenida com fluxo real, medir o erro em frenagem e decidir se o teto
cai, se a velocidade passa a ser amortecida ao final da janela, ou se fica como está.

## 8. Métricas do Laço Virtual paga round-trip demais

A lateral da face é um seletor e mesmo assim monta o cartão completo de cada câmera, com uma miniatura
por câmera - quinze requisições por visita. Além disso o `@switch` da página destrói e recria o painel a
cada troca de aba, então ir e voltar entre ATSPM e Laço Virtual repete a montagem inteira.

## 9. Guard de permissão falha fechado e diz 403

Quando o resolver de permissões não responde, o `core-auth` nega e a resposta é
`403 FORBIDDEN_ACTION` com `PERMISSION_RESOLVER_UNAVAILABLE` no corpo. Falhar fechado está certo; o
código de status é que engana, porque lê como "você não tem permissão" quando o que houve foi
"não deu para perguntar". Custou tempo de diagnóstico em 12/09.

Proposta de card: manter o fail-closed e responder 503 com o mesmo `errorCode` quando o motivo for
indisponibilidade do resolver, para separar as duas coisas na tela e no log.

## 10. i18n das quatro locales depois das chaves novas

A frente adicionou `analytics.metrics.virtualLoop.state.unavailable` nas quatro locales. Vale passar o
conferidor de paridade antes do merge para garantir que as quatro terminam com a mesma contagem e sem
chave órfã.

## 11. `PERMISSIONS_CHECK_TIMEOUT_MS` não é lido por ninguém

Levantado junto com o 403 de 12/09. O `.env.docker` do `ms-cameras` define
`PERMISSIONS_CHECK_TIMEOUT_MS=1500`, mas o `core-auth` lê `CORE_AUTH_PERMISSION_TIMEOUT_MS`, cujo
default é 800 ms. Deu para ver na prática: o `PUT` que falhava respondia em 875 ms e 805 ms, tempo do
abort de 800, não de 1500. A variável do `.env` é letra morta e a expectativa de quem a escreveu não
está valendo.

O que o card faz: escolher um nome só, corrigir os `.env.example` de todos os serviços que declaram o
antigo, e conferir se o mesmo par existe para os outros parâmetros do resolver (limiar e janela do
circuit breaker).

## Contexto do 403 que foi corrigido em 12/09

Fica registrado porque a causa não era óbvia e vai voltar em qualquer máquina nova. O guard de
permissão do `core-auth` resolve cada escrita em `POST /internal/permissions/check` no
`ms-organization` e falha fechado. O `ms-cameras` roda em container e o `ms-organization` estava em
`nx serve` no host, então o nome `ms-organization` não resolvia na attlas-net: o DNS embutido do
Docker deixava a consulta estourar por timeout, o axios abortava aos 800 ms e o guard negava.

A permissão em si nunca esteve errada: `cameras.analyticsRegion:configure` é catalog-bound no perfil
Administrador, que está num grupo com acesso global, e o endpoint interno responde
`allowed: true, reason: PROFILE_COVERS_FULL_SYSTEM` quando alcançado. O tipo ou a versão do analítico
também não entram na conta - o guard corre antes do handler.

A correção foi no `docker-compose.override.yml`: `ms-organization:host-gateway` no `extra_hosts` do
`ms-cameras` e a porta do host (3001) nas duas variáveis de URL, o mesmo padrão que o Kong e o
`ms-video-analytics` já usavam no arquivo.


## 12. Sincronização perfeita da caixa com o vídeo (pedido explícito do dia 12/09)

O pedido, nas palavras do usuário: a caixa ainda fica atrasada em relação ao vídeo, precisa ser mais
suave e acompanhar exatamente, e essa sincronização precisa ser perfeita nesta tela **sem afetar
negativamente o streaming de câmeras no resto do sistema**. É a task de maior prioridade da 33 nesta
frente.

O que já foi feito na PR atual, e serve de ponto de partida:

- A cabeça de reprodução segue o relógio da imagem (`VideoLockedHeadStrategy`), com recuo para o buffer
  quando os dois relógios não se conciliam.
- Os carimbos do device passaram a ser lidos no relógio do navegador (menor atraso observado, estilo
  NTP), porque a câmera de bancada publica cerca de 600 ms atrás da hora real e essa diferença estava
  sendo paga como extrapolação.
- O alcance da predição caiu de 1,4 s para 400 ms, já que a extrapolação linear erra em veículo que se
  aproxima (o movimento na tela não é reta).

O que falta avaliar, e o card deve percorrer todas as possibilidades:

- No WHEP o `estimatedPlayoutTimestamp` do `getStats` volta **nulo** nesta máquina, então o relógio da
  imagem cai no aproximado `Date.now() - jitterBufferDelay - rtt/2`, que subestima o atraso real do
  pipeline (não conta captura, codificação e decodificação). Medir o atraso real ponta a ponta e
  decidir se entra uma calibração por câmera, um `PROGRAM-DATE-TIME` no lado HLS, ou RTCP com NTP
  correto no mediamtx.
- Avaliar se o mediamtx pode publicar o NTP da fonte no sender report, o que daria o relógio exato sem
  nenhuma heurística no front.
- Avaliar suavização por filtro (alfa-beta, Kalman de posição e tamanho) em vez de amortecimento
  exponencial na posição desenhada.
- Qualquer uma dessas saídas fica **restrita à tela de Detecção**: nada do que for decidido aqui pode
  mudar o comportamento do player nas outras telas.

## 13. O broker do analítico embarcado não é o mesmo do ambiente dev

Apurado em 12/09 e vale como aprendizado do ambiente: as caixas não apareciam para a `ATMN - EMBEDDED 101`
porque o app embarcado da câmera publica em `vitoria.attlas.atmansystems.com:9094` enquanto o
`ms-cameras` consumia `dev.attlas.atmansystems.com:9094` (`ANALYTICS_STREAM_BROKERS`). O tópico é o
mesmo, `traffic-motion-detection.detections`, e o `source_id` do device confere com o
`analyticsCapabilities.deviceSourceId` da câmera, então o consumo passou a funcionar assim que o
endereço foi corrigido no ambiente local.

O que o card decide: qual é o broker de cada ambiente, se o `.env.example` deve apontar para o broker
onde os devices de campo realmente publicam, e se o console precisa avisar quando o consumer está
conectado a um broker em que a câmera não publica (hoje o sintoma é silêncio absoluto na tela).

## 14. Consumidor local do tópico compartilhado fica para trás

Com o `ms-cameras` apontado para o broker de campo, o atraso entre o carimbo do quadro e a chegada ao
navegador cresceu de 0,8 s para quase 10 s em poucos minutos: a partição carrega o fluxo de todos os
devices em campo e o consumer processa tudo para filtrar por `source_id`. Em produção o desenho é
outro, mas o efeito local é uma tela de Detecção que parece quebrada.

O que investigar: filtrar por chave de partição, dedicar um grupo por `source_id`, ou limitar o lote do
consumer. O critério de aceite é o atraso ficar estável abaixo de um segundo durante meia hora.

## 15. Caixa 3D isométrica ficou de fora, por decisão

A extrusão isométrica foi implementada e retirada no mesmo dia: o analítico não reporta pose, então a
direção do volume é a mesma para um ônibus atravessando e para um carro de frente, e na tela isso lê
como caixa torta, pendendo para um lado. O que ficou é a caixa plana, com cantoneiras, fiel ao
retângulo reportado mais uma margem pequena para cobrir o veículo inteiro.

Se a ideia voltar, ela depende de pose vinda do analítico (ângulo do veículo ou caixa 3D já projetada
pelo device), e não de heurística no front.

## 16. Ler uma unidade de analítico sem compor a frota inteira

Levantado na review da PR #3328 e atendido pela metade: `findById` passou a ler os vínculos uma vez e
repassar para `listBySystem`, então a requisição que pagava `findBySystem` três vezes paga uma. O que
fica é o caminho de leitura em si - resolver a unidade direto pelo id, sem montar a frota, que hoje
custa duas consultas, uma leitura Redis por câmera e uma chamada HTTP de estado da frota. Como
`requireById` fecha o `POST` e o `PATCH`, toda escrita de unidade paga esse custo.

O que o card faz: um caminho de leitura por id que devolve a unidade sem compor a frota, mantendo as
três chaves que a `UC-075 §4.6` aceita, e a medição antes e depois na mesma rota.

## 17. Ocupação da câmera embarcada é descartada por falta de detector vinculado

Visto no box de desenvolvimento logo depois do deploy de 12/09, e reproduzido no ambiente local:
`DetectorTranslationService` registra `occupancy discarded: camera …101 region 0 has no VEHICLE
detector binding` a cada poucos segundos. A câmera embarcada tem região configurada e publica caixa
normalmente - o que não existe é a linha em `VirtualLoopDetectorBinding` ligando a região a um
detector de controlador, porque a semente só vincula as duas câmeras de modo servidor.

Consequência: a contagem e a ocupação da 101 não chegam ao `ms-detector-history`, então ela não
aparece nas Métricas nem alimenta o controlador, embora a tela de Detecção pareça correta.

O que o card decide: se a câmera embarcada deve ganhar vínculo de detector por padrão (e em qual
controlador e índice), ou se a tela precisa dizer que a região não tem detector, em vez de deixar o
descarte só no log.
