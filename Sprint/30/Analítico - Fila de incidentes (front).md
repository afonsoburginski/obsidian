---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
  - frontend
card: SOFTWARE-2734
titulo: "[Front] Fila de incidentes do analítico"
clickup: https://app.clickup.com/t/86ak5vek3
frente: Analítico
tamanho: 8 pts
status: card criado na reestimativa de 25/08, quando o frontend entrou na conta da sprint. Irmão de [[Analítico - Contagem e dedup de incidente DAI]] (o backend). Spec UF-034 escrita em 25/08, [PR #2022](https://github.com/atmanadmin/attlas-2026/pull/2022) aberta em draft (fase só-spec).
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Fila de incidentes (front)

A maior superfície de tela genuinamente nova do módulo. Porta a fila de incidentes do
`attlas-design` para o `web-attlas`, consumindo o evento contável que o card irmão
([[Analítico - Contagem e dedup de incidente DAI]]) passa a produzir.

## Por que é card próprio e não parte do backend

O backend do dedup é 5 pts de consumer Kafka. Esta tela são 6 componentes mais 2 páginas, com mapa
MapLibre e timeline - 8 pts. Somar os dois num card só esconderia que a tela é o dobro do trabalho
do backend que a alimenta, e foi exatamente esse tipo de subestimativa que a reestimativa de 25/08
corrigiu.

## O que vem do protótipo

Do `modulo-analitico/entrega-frontend/`, conforme [[Analítico - Frontend do attlas-design]]:

- `pages/incidents/` - a fila em si
- `pages/incident-detail/` - detalhe do incidente
- `components/incidents-panel/`, `incidents-table/`, `incidents-map/` (MapLibre, pinos e calor por
  câmera), `incident-side-detail/`, `incident-timeline/`
- Spec de referência do protótipo: `UF-ANL-F`

## O que precisa ser reescrito, não copiado

O protótipo é mock-first. Copiar HTML/CSS/fluxo é o barato; o que dá trabalho:

1. **Camada de serviço** - o protótipo lê de um interceptor com 216 incidentes derivados
   (`incident.factory.ts`). Reescrever contra o endpoint real de `CameraEventLog` filtrado por
   `CameraEventCategory.ANALYTICS`, com o toolkit de listagem do backend (filtro multivalor, busca,
   ordenação, paginação).
2. **i18n** - todo o texto do protótipo é pt-BR hardcoded. Extrair para
   `libs/contracts/src/lib/i18n/locales/<locale>/cameras.json` nos 3 locales.
3. **Permissão** - o protótipo não tem guarda nenhuma.
4. **Testes** - o protótipo tem zero. Aqui precisa de cobertura de componente e do serviço.

## Três pontas soltas que o protótipo declara em aberto

Herdadas de `UF-ANL-F`, não resolvidas por esta tela: registro da ocorrência no Inventário,
configuração de criticidade por tipo de incidente, e envio por WhatsApp. Nenhuma delas bloqueia a
fila em si - ficam registradas aqui para não serem redescobertas como "faltando".

## DoD

Fila de incidentes no `web-attlas` lendo evento real do backend (não mock), com tabela, mapa,
timeline e detalhe lateral, i18n nos 3 locales, guarda de permissão e teste de componente. Sem
nenhuma chamada a `localStorage` nem a factory de mock.

## Encosta em

- [[Analítico - Contagem e dedup de incidente DAI]] - o backend que produz o evento. **Dependência
  dura**: sem produtor, a tela não tem o que listar.
- [[Analítico - Frontend do attlas-design]] - de onde o código vem.
- [[Attlas - Sprint 30]].
