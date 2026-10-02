---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - streaming
titulo: "[Back] Streaming - control API do media server restrita, e o HLS em disco removido"
frente: Streaming
tamanho: 3 pts
pr: "#4073, #4117"
status: "Feita. #4117 mergeada em 23/09, às 14h02, levando junto o primeiro commit da #4073; a #4073 entrou em seguida, às 15h14."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Streaming - superfície do media server e o HLS em disco morto

## A superfície aberta

A control API do media server respondia a qualquer origem que alcançasse a porta. Passa a responder
só na faixa de IP declarada e no loopback do host (#4073). A faixa versionada é um piso, loopback e
as três faixas privadas; cada ambiente a aperta para o próprio CIDR por `MEDIAMTX_API_ALLOWED_IPS`,
que o compose interpola em `MTX_AUTHINTERNALUSERS_2_IPS`, e em dev a porta publicada ficou presa a
`127.0.0.1`. Provado contra um media server real subido
em contêiner descartável: dentro da faixa, listagem de caminhos, listagem de configuração e métricas
respondem 200; com a faixa estreitada para loopback, os três respondem 401.

No mesmo arquivo apareceu uma coisa que ninguém tinha visto: a permissão de métricas está ligada
desde março e nunca foi concedida a ninguém, então a porta responde 401 a todo scrape. Ninguém
percebeu porque nenhum job do Prometheus aponta para lá. A concessão por faixa de IP foi revertida no
review, com razão: a regra do repositório exige token, e conceder por faixa diverge dela. A versão
que entrou desligou o listener (`metrics: no`) até existir credencial de scrape. Ligar de novo é
pendência de observabilidade, não parte desta task.

> [!warning] Estado em 23/09: o runbook de saturação ainda aponta para a 9998
> A seção 6 de `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`, escrita pela #4121 antes
> desta mudança, manda ler `localhost:9998/metrics` "na mesma faixa de IP da control API". Com
> `metrics: no` o comando não responde. É correção de doc no repo, pendente.

## O código morto

O controlador de arquivos HLS lê um diretório que nenhum código escreve desde que o media server
passou a servir o HLS, e as duas estratégias de entrega existem só para servi-lo. Junto saem o
resolver de URL de stream do analítico e a forma em lote dele, sem chamador nenhum em `apps/` desde a
remoção do modo servidor do analítico em 16/09, mais a permissão de caminho do media server que era
configuração daquele consumidor (#4117).

## O que tem de valer no fim

A control API só responde a quem foi declarado, e não sobra rota nem estratégia servindo diretório
que ninguém escreve.

## Relacionado

- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].
- [[Sem prazo (backlog)]], onde o card do comparativo de entrega em HLS com CDN depende do que esta PR remove.
