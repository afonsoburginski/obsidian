---
tags:
  - attlas
  - analitico
  - decisao
aliases:
  - "CROSS-077"
  - "ms-video-analytics"
  - "Um analítico servidor"
frente: Analítico
status: "DECIDIDO em 31/08 com o user. Registrado no repo como CROSS-077 e ADR-31, e propagado pela pilha da Sprint 31. Dois cards de execução saem daqui e seguem sem prazo (ver seção final)."
atualizado: 2026-08-31
---

# Analítico - Topologia de serviço do analítico de vídeo

Quantos microsserviços o analítico de vídeo precisa. A resposta fechada em 31/08 é **um novo**, e
não os cinco que o `services.md` reservava.

## A pergunta

O Grupo 5 de `docs/architecture/services.md` reservou cinco serviços dedicados: `ms-atspm` (3301),
`ms-virtual-loop` (3302), `ms-connector-virtual-loop` (3303), `ms-dai` (3304) e `ms-acom` (3305).
Todos existem em `apps/` como scaffold NX de **6 arquivos**, sem doc e sem schema, e todos já custam
banco no compose, rota no Kong e um projeto no grafo do NX. A reserva é anterior à definição
funcional do módulo.

## A regra que decide, e é a nossa

> **O que muda por tipo de câmera é ONDE a capacidade roda, nunca a capacidade em si**
> ([[Analítico - Embarcado x Servidor]]).

Logo a divisão de serviço é por **capacidade**, não por forma de execução (embarcado × servidor) nem
por forma de carga (decodificar × agregar). E as capacidades de produto são duas: Virtual Loop e
ATSPM.

Some a isso o segundo fato do produto, que está nas anotações de alinhamento: **onde há ATSPM, o app
de Virtual Loop separado não é instalado**, porque o ATSPM já traz o VL embutido. Na câmera é um
app, nunca dois.

## A decisão

**Um analítico servidor, chamado `ms-video-analytics`.** É o `ms-virtual-loop` que a
[[Attlas - Sprint 31]] está construindo, renomeado.

| Serviço | O que acontece |
| --- | --- |
| [[ms-cameras]] | Mantém. Não é serviço de analítico: é dono das câmeras, credenciais, relay e geometria |
| `ms-virtual-loop` → `ms-video-analytics` | **O analítico servidor.** Único deployable novo |
| `ms-detector-history` | Mantém. É o sumidouro da série, e atende também o laço físico |
| `ms-controllers` | Mantém. Dono do ACOM (78 arquivos, `/api/acoms`) |
| `ms-atspm` | **Não nasce.** ATSPM é capacidade do analítico servidor |
| `ms-dai` | **Não nasce.** Detecção por objeto é biblioteca compartilhada; como feature é sub-produto do ATSPM |
| `ms-connector-virtual-loop` | **Não nasce.** Já decidido em 24/08; a tradução vive dentro do servidor |
| `ms-acom` | Descontinuar. O user decidiu em 31/08 manter o scaffold por ora, sem código previsto |

## Por que não separar VL e ATSPM em dois servidores

Não é preferência de estilo, é duplicação medível:

- **Duas sessões de relay na mesma câmera.** É exatamente o que o ADR de alimentação de vídeo existe
  para evitar.
- **Duas inferências sobre os mesmos frames.** VL e ATSPM partem da mesma detecção por objeto, e o
  custo por frame é o número que define o teto de câmeras por instância.
- **Dois pesos de modelo, dois gates de readiness, dois projetos numa fila de CI de três runners.**

O produto já recusou essa duplicação no device. Não há motivo para reintroduzi-la do nosso lado.

## O nome

`ms-video-analytics`. Inglês com prefixo `ms-` (ADR-12), kebab-case como `ms-detector-history`, e
sem colisão: não existe serviço com `video` ou `analytics` no nome. Sobrevive ao ATSPM, ao VL e ao
DAI entrando dentro dele, que é justamente o que `ms-virtual-loop` não sobrevive.

Descartados: `ms-analytics` (largo demais, encosta em relatório e dashboard), `ms-vision` (jargão,
não diz vídeo) e `ms-analytics-server` (põe o **lugar de execução** no nome, que é o eixo que a
regra acima diz não ser a identidade da capacidade).

## O que a decisão NÃO move

Geometria, credencial, caminho embarcado e vínculo região-detector seguem no [[ms-cameras]]. A série
segue no `ms-detector-history`, compartilhada com o laço físico. ACOM segue no `ms-controllers`. E o
contrato de ocupação continua necessário: o caminho **embarcado** roda na câmera e continua
existindo, então os dois produtores seguem sendo dois.

## Escala: o cenário de 900 câmeras

A topologia é a mesma em 9 e em 900. O que muda em 900 é a **ordem** do que precisa estar decidido,
e três das quatro peças já foram implementadas na [[Attlas - Sprint 31]].

1. **Borda primeiro, e é a decisão que mais pesa.** Detecção por frame custa da ordem de décimos de
   núcleo por câmera em CPU; vezes 900 não fecha em topologia nenhuma. A saída já é do produto:
   câmera Axis compatível roda o app embarcado, custo de servidor zero, e o analítico servidor
   atende só o que a matriz proíbe embarcar. Já é o comportamento do código - a rota interna de
   alvos devolve apenas analíticos em modo `SERVER`.
2. **Inferir sobre o recorte da região, não sobre o frame.** Num laço típico o recorte é cerca de um
   décimo da área (640x360 vira ~192x108). Feito, com margem de 25% porque a regra de contato lê a
   base da caixa e recorte justo entregaria veículo truncado.
3. **O gargalo que sobra é decode, não inferência.** Por isso a cadência de frame passou a ser
   histograma próprio por resolução, separado do tempo de inferência: são diagnósticos e fixes
   diferentes.
4. **Pool particionado por câmera.** O analítico é stateful por câmera (um ffmpeg e uma histerese
   cada), então não se escala somando réplica. Partição **estática** por hash estável do `cameraId`
   feita agora; a **dinâmica** (lease, rebalanceamento, teto medido) segue sendo o `MOD-002` da
   [[Attlas - Sprint 32]].

Consequência para a decisão de serviço: em 900 câmeras o analítico servidor é dimensionado por
**capacidade de decode e inferência**, com classe de nó própria, e o [[ms-cameras]] por **operador**.
Num processo só, cada réplica da API de câmera carregaria capacidade de vídeo que não usa. É isso
que torna a separação requisito de escala, e não preferência.

> [!warning] O que ainda não é fato: o teto de câmeras por instância
> Ele sai de dois números que a Sprint 31 instrumentou mas ainda não mediu: cadência de decode
> sustentada por resolução, e tempo de inferência sobre o recorte. Sem eles, contagem de réplica é
> chute e o `MOD-002` não fecha política de saturação.

## Cards que saem daqui, sem prazo

1. **Renome `ms-virtual-loop` → `ms-video-analytics`.** Depois de a pilha da Sprint 31 mergear e
   antes de o ATSPM começar. Toca `apps/`, `project.json`, `Dockerfile`, compose, Kong, nome de
   imagem, `.env*`, Helm e o workflow de deploy. Mesma forma do renome de VMS; fazê-lo com feature
   em voo reescreveria as 10 PRs empilhadas.
2. **Remoção dos scaffolds** `ms-atspm`, `ms-dai` e `ms-connector-virtual-loop`, com `db-atspm`,
   `db-dai`, `redis-connector-virtual-loop` e as rotas de Kong. Independente do renome.

## Ver também

[[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Arquitetura e estratégias]] ·
[[Analítico - Visão do produto]] · [[Attlas - Sprint 31]] · [[00 - Sem prazo (backlog)]]
