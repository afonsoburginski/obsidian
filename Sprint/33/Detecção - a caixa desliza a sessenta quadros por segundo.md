---
tags:
  - attlas
  - registro
  - sprint-33
  - analitico
  - frontend
frente: Analítico
commits: "fa3505004c, af1e62fd08 (laço de desenho), 100464021b (rota de capacidades), 9561e1fc87 (corpo do digest + laço na coluna), f31da74b06 (streaming), 565e53dda8 (glide + imobilidade)"
branch: shared/chore/NO-CARD-sprint33-validation
relacionado: "[[Detecção - sincronização exata da caixa com o vídeo]]"
atualizado: 2026-09-16
---

# Detecção - a caixa desliza a sessenta quadros por segundo

O pedido era a caixa "quase cravada no objeto", deslizando em vez de dar micro saltos. A
suavização exponencial sozinha não resolveu, e a medição na tela explicou por quê.

## O que estava errado

O overlay era desenhado dentro do `requestVideoFrameCallback`, ou seja **uma vez por quadro de
vídeo** (25 a 30 fps) enquanto a tela roda a 60 Hz. Entre dois quadros de vídeo a caixa ficava
parada e no seguinte andava o dobro. Medido antes: passo médio 3,56 px e **solavanco médio de
7,0 px** - a caixa mudava de velocidade mais do que andava, que é a definição de serrote.

Dois relógios agravavam o mesmo defeito, e os dois só mudam quando o navegador apresenta um
quadro: o `mediaTime` do callback e o `captureTime` (o instante em que a câmera capturou, que o
WebRTC reporta). Fixada no último valor lido, a cabeça do interpolador também andava em degraus.

## O que foi feito

1. **O desenho saiu do callback de vídeo.** `requestAnimationFrame` pinta a cada quadro de tela;
   o `requestVideoFrameCallback` continua registrado, mas só para atualizar `mediaTime` e o
   instante de captura. Arquivo: `detection-object-boxes.component.ts`.
2. **Os dois relógios são carregados por tempo de parede** entre uma apresentação e a seguinte,
   com teto de 40 ms (`MEDIA_CARRY_MAX_MS`) - um quadro de um stream lento. Além disso a imagem
   travou, e continuar carregando levaria a cabeça para fora do vídeo que ela acompanha. Arquivo:
   `detection-box-interpolator.service.ts` (`carriedCaptureClock`, `carriedVideoClock`).
3. **Constantes da suavização** que fecharam o conjunto: `POSITION_SMOOTH_TAU_MS = 50`,
   `SIZE_SMOOTH_TAU_MS = 200`, teto de salto adaptativo por ritmo (`JUMP_PACE_FACTOR = 4`).

## Medição na tela, depois

Playwright no `:4200`, câmera ATMN - EMBEDDED 080, 8 rastros, 8 segundos:

- pintura a **60,1 fps**
- solavanco **p50 0,07 px**, **p90 1,34 px**, p99 5,14 px
- passo médio 2,01 px

Os poucos casos acima de 5 px são objeto realmente rápido logo após entrar em quadro (o limitador
deixa a correção acontecer em dois quadros, de propósito) e uma pausa de 1 s do próprio navegador.

## A rota de capacidades que faltava

A tela chamava `GET /cameras/:cameraId/analytics/:analyticId/capabilities` e recebia 404 - o
descritor do CROSS-119 existia em contrato, em coluna e em adapter, mas **nenhum controller o
publicava**. Criados `analytic-capabilities.controller.ts` e `.service.ts` em
`ms-cameras/src/analytics-device/`. A resposta guardada vence a sondagem (TTL de 10 min) e uma
sondagem que falha nunca apaga o que está gravado: quem decide qual painel oferecer não pode
depender de o equipamento responder agora.

## Armadilha que derrubou o boot inteiro

`AnalyticDeviceModule` nunca tinha estado no `app.module.ts`. Ao ligá-lo, o Nest tentou injetar o
argumento do construtor de `AnalyticDeviceConfig` (`env: NodeJS.ProcessEnv = process.env`, default
que o container não enxerga) e **abortou a aplicação inteira**:

```
UnknownDependenciesException: Nest can't resolve dependencies of the AnalyticDeviceConfig (?)
```

Correção: provider por fábrica, `{ provide: AnalyticDeviceConfig, useFactory: () => new AnalyticDeviceConfig() }`.

> [!warning] O `nx serve` não reinicia sozinho quando o boot falha
> O processo velho continuou servindo o `:3300` por 40 minutos com o bundle novo já em `dist/`.
> Para saber se o código sobe, o jeito rápido é bootar o bundle numa porta livre:
> `PORT=3399 node dist/apps/ms-cameras/main.js`. Rota registrada responde 401, rota inexistente
> responde 404 - é assim que se distingue sem token.

## A câmera recusava a escrita que nunca recebeu

Salvar o laço virtual devolvia **502** com `DEVICE_ANALYTIC_REQUEST_FAILED`, e no log do
`ms-cameras` a causa era `device PUT /local/atman_traffic_edge_atspm/api/config -> HTTP 422`. O
device respondia:

```json
{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}
```

**O corpo não chegava.** O `digestFetch` mandava o payload já na primeira tentativa, sem
autenticação; o servidor web da Axis responde o 401 ele mesmo e **não repassa ao app o que veio
junto**. Na segunda tentativa, autenticada, o corpo ia de novo - mas para a câmera aquilo era outra
requisição, e o que o analítico viu foi um PUT vazio. Provado na bancada: o mesmo payload enviado
com o header `Authorization` já montado responde `200 {"status":"ok","updated":[...]}`.

Correção: o desafio é pedido **sem corpo**, e o corpo viaja só na requisição autenticada. Quando o
device não desafia (não pede auth), a requisição é reenviada com o corpo - senão o probe vazio seria
a própria escrita e um 200 diria que gravou nada.

Vale para **toda escrita no equipamento**, não só o laço: regiões, parâmetros de incidente e o
produtor passam pelo mesmo cliente.

Provado na tela depois: `PUT /virtual-loops` **204** e o device lendo de volta
`{"active":true,"classes":["car","truck"],"delaySeconds":7}`; `PUT /object-detection-regions`
**204**. O device foi devolvido ao estado original (`vloop_enabled: false`).

## O laço virtual mudou de casa

A coluna `CameraAnalytic.loopConfig` existia desde a migration de 16/09 e **nada escrevia nela** - o
laço continuava indo para o `metadata` de uma região achada por `findFirst` **sem escopo de
analítico**. Numa câmera com ATSPM e Laço Virtual ao mesmo tempo, salvar em uma aba gravava a região
da outra; e num analítico ainda sem região o `storeLoopConfig` retornava cedo e o salvamento sumia
sem dizer nada.

Agora a leitura e a escrita vão na linha do analítico, com o `analyticType` da tela no escopo. O
`metadata` continua sendo **lido** como recuo, para não apagar o que foi salvo antes da virada;
ninguém escreve mais lá.

## Regime [DBM] da migration

- **Invariante conferida:** `prisma migrate diff --from-migrations ./src/database/migrations
  --to-schema ./src/database/schema` com shadow descartável devolveu `No difference detected`,
  exit 0. Em Prisma 7 o `--shadow-database-url` saiu da CLI (vem do `prisma.config.ts` por
  `SHADOW_DATABASE_URL`) e o `--to-schema` precisa apontar para a **pasta** do schema; apontado para
  o `schema.prisma` sozinho o diff lê um modelo vazio e acusa a remoção de todas as tabelas.
- **`rollback-class` inválida corrigida:** estava `data-recoverable`, que não existe no padrão (só
  `data-safe` e `data-destructive`). É `data-destructive` - derruba `loopConfig`, que agora guarda
  configuração digitada pelo operador. A compensatória é o próprio `migration.sql` (exceção do
  ADD COLUMN / DROP COLUMN), registrada no `apps/ms-cameras/docs/DBM-DRIFT.md` com a janela de dado
  perdido nomeada.

## A segunda rodada: tremia parado e saltava em movimento

O desenho a 60 fps resolveu o degrau da tela, mas não a trajetória. Três defeitos com a mesma raiz -
**a suavização trabalhando contra a precisão** - e a lição é que nenhum dos dois se ajusta sozinho.

### A trajetória tinha quinas por construção

A interpolação era **linear por trecho**: contínua em posição, descontínua em velocidade. Dentro de
um trecho a caixa anda a ritmo constante e, no instante em que cruza uma amostra, esse ritmo muda em
degrau. O caminho tem quinas, uma a cada report do analítico, e **nenhuma suavização por cima disso
desliza** - ela persegue uma referência que já está quebrada.

Agora é **Hermite cúbica** com tangentes Catmull-Rom para nós desigualmente espaçados, limitadas por
Fritsch-Carlson para não ultrapassar o intervalo das próprias amostras. Contínua em posição **e** em
velocidade, e com a tangente do último nó costurada à velocidade que a predição usa - senão haveria
uma quina exatamente onde o overlay passa a maior parte do tempo, já que a cabeça fica à frente do
dado.

### Filtrar a posição atrasa quem anda

Um tau fixo não serve aos dois extremos: forte o bastante para parar o tremor de um carro parado
atrasa um que anda; fraco o bastante para acompanhar deixa passar a remedição do detector. Entrou o
**filtro One Euro** (Casiez, Roussel e Vogel, CHI 2012), que faz o corte função da velocidade.

Duas correções foram necessárias em cima dele, e as duas foram achadas por medição:

1. **O que se filtra é o resíduo contra a previsão, nunca a posição.** Um passa-baixa sobre a posição
   responde onde o objeto esteve, e para algo em movimento isso é distância: a suíte de precisão
   mostrou **214 px** de atraso num veículo em velocidade constante. Prevendo primeiro e filtrando só
   o que a previsão errou, um movimento linear não tem resíduo e passa intacto.
2. **O corte abre pela velocidade do OBJETO e pelo erro pendente.** O resíduo de algo em movimento
   constante é quase zero, então um filtro que se julgasse pela própria entrada leria todo veículo
   como parado. E só a velocidade também não basta: um carro freando até parar tem velocidade indo a
   zero exatamente enquanto a caixa ainda tem terreno a recuperar.

### A banda morta só vale para quem está parado

A banda que imobiliza a caixa parada, aplicada a todo rastro, engolia também as correções pequenas de
quem se move - **281 px** de erro numa frenagem. Ela passou a ser **portão por velocidade**, e a
velocidade do rastro é medida por **mínimos quadrados sobre a janela** em vez da diferença entre as
pontas, que sobre ruído inventava movimento.

## Números, medidos

Suítes determinísticas (`detection-prediction-accuracy.spec.ts` e o novo
`detection-overlay-smoothness.spec.ts`, que puxam para lados opostos de propósito):

| | antes | depois |
| --- | --- | --- |
| erro do pior quadro, veículo em velocidade | 18,3 px | **15,5 px** |
| suavidade (solavanco p50 / p90, cruzeiro) | reprovado | **aprovado** |
| imobilidade do veículo parado | reprovado | **aprovado** (passo máximo < 0,25 px) |

Na tela, EMBEDDED 080, 18 s, solavanco por faixa de velocidade:

| faixa | p50 | p90 | p99 |
| --- | --- | --- | --- |
| lento | **0 px** | 0,40 px | 3,8 px |
| médio | 0,08 px | 1,42 px | 6,2 px |
| rápido | 0,14 px | 2,68 px | 11,2 px |

Vídeo no mesmo teste: overlay a **59,9 fps**, vídeo a 28,9 fps apresentados de 30 entregues, **1,39
buracos por segundo** (eram 3,2 com o overlay ligado antes da otimização, contra 2,2 com ele
escondido - ou seja, o overlay saiu de graça).

> [!warning] A suíte de precisão continua com uma falha, e ela é anterior a este trabalho
> `puts the box on a vehicle holding its speed` exige < 12,375 px e entrega 15,5 px. Antes destas
> mudanças entregava 18,3 px, então o número melhorou 15% - mas o teste **já estava vermelho** e
> continua. Não é regressão, é dívida herdada que este trabalho reduziu sem zerar.

## O que ficou de fora, de propósito

- **O piso de travadinhas do vídeo é a máquina, não o código.** O Chrome da Dell roda em SwiftShader
  (render em software, `reference_dell_software_rendering_swiftshader_cap`), e sobram ~1,4 buracos por
  segundo com o overlay desligado. Numa máquina com GPU isso muda; no código não há mais o que tirar.
- **O segundo `<video>` da tela.** É espelho do mesmo `MediaStream` (uma decodificação, duas
  apresentações), está a 0x0 e ainda assim compõe. Mexer nele é `live-media-registry.service.ts`, que
  é compartilhado com videowall, câmeras e mais sete módulos - fora do escopo pedido.
