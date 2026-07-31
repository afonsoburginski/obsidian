---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
card: SOFTWARE-2386
clickup: https://app.clickup.com/t/86aju62w6
titulo: "[Back] Especificação do analítico de vídeo em container"
frente: Analítico de vídeo
tamanho: 3 pts
status: comprometido (segunda à tarde), depende do ADR de alimentação. Card reescrito em 31/07 - era "subir o motor do fornecedor" e virou a especificação do analítico que nós vamos construir.
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-07-31
---

# SOFTWARE-2386 - Especificação do analítico de vídeo em container

O card mudou de natureza no fim do dia 31/07. Ele era "subir o ATMAN Traffic Edge como container
standalone", ou seja, instalar motor de terceiro. Passou a ser a **especificação do analítico que nós vamos
construir**, porque a frente é fazer o analítico de vídeo, não embrulhar o do fornecedor.

O embarcado na câmera já está integrado e entregue desde 15/07. O que não existe é analítico nosso, capaz
de olhar câmera comum.

## Por que a spec vem antes de qualquer linha

Cinco decisões mudam o custo de todos os cards seguintes, e nenhuma delas se descobre no meio da
implementação sem retrabalho.

### 1. Runtime e onde mora

Duas saídas honestas, e a escolha vai declarada com o desvio que ela cria:

- **`ms-virtual-loop` em NestJS**, reusando o esqueleto que já existe no monorepo. Ganha tooling, lint, test
  e CI de graça, e o serviço entra no grafo do NX como qualquer outro. Custo: inferência em Node é caminho
  menos trilhado, e a decodificação de vídeo tende a virar processo filho.
- **Serviço em Python fora do pipeline NX**, que é o normal do mercado para visão computacional. Ganha o
  ecossistema inteiro de modelo e decodificação. Custo: sai do gate de lint, test e build do monorepo, e
  isso precisa ser decisão registrada em vez de descoberta no CI.

Terceira saída, que deixou de ser o caminho: embrulhar motor de terceiro.

### 2. Modelo de detecção

Qual modelo, de onde vem o peso, onde ele fica versionado (não binário solto no git) e qual o custo por
frame por resolução. Esse último número é o que fecha o teto de câmeras por instância.

### 3. Autoridade da geometria do laço

No embarcado a região vive **no device** e o `ms-cameras` lê pelo `/regions`, resolvendo `region_id` para
índice estável. No nosso analítico não existe device para guardar nada, então alguém precisa ser dono da
geometria. É decisão de dono, não detalhe de tabela: o consumidor da ocupação depende de o índice de região
ser estável no tempo.

### 4. Fronteira do serviço

Entra stream, sai ocupação por região. Não persiste série (isso é `ms-detector-history`), não fala com
controlador (isso é atuação), não calcula métrica de tráfego (fluxo e ocupação agregada saem no histórico).
Fronteira estreita é o que permite escalar por câmera sem o serviço virar monólito de analítica.

### 5. Convergência com o caminho embarcado

Os dois analíticos, o da câmera e o nosso, precisam emitir a **mesma forma** de ocupação, senão o consumidor
passa a ter duas gramáticas e o contrato duplica. O card 2388 traz o embarcado para esse contrato depois,
mas a forma nasce aqui.

## Escopo (1 PR)

`SPEC.md` do serviço, que hoje não existe (o esqueleto tem `docs/` só com `.gitkeep`, então é bootstrap SDD
obrigatório), mais a MOD do pipeline de analítico. Zero código de produção.

## DoD

Spec aprovada com as 5 decisões fechadas e as alternativas rejeitadas registradas com motivo.

## Encosta em

- [[SOFTWARE-2385 - Alimentação de vídeo do analítico desacoplado]], que decide o que o serviço consome.
- [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]], que é o caminho embarcado já
  entregue e a referência de vocabulário de detecção e de região.
- [[Attlas - Sprint 27]].
