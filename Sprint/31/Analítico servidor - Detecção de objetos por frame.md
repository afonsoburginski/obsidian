---
tags:
  - attlas
  - task
  - sprint-31
  - analitico
card: SOFTWARE-2696
clickup: https://app.clickup.com/t/86ak5njcx
titulo: "[Back] Detecção de objetos por frame"
frente: Analítico
tamanho: 5 pts
status: comprometido na Sprint 31 (planejada em 24/08). Card criado no ClickUp em 25/08. Repontuado de 3 para 5 em 25/08 contra o "Guia Geral de Boas Práticas" (tabela §3.1) - inferência nativa embutida + carga de modelo de object storage + gate de readiness + medição de custo por resolução passa de 4-8h para 1-2 dias.
sprint: "[[Attlas - Sprint 31]]"
atualizado: 2026-08-25
---

# Analítico servidor - Detecção de objetos por frame

O frame que o card anterior entrega passa a virar caixa e classe. É o card que determina o custo de toda a
cadeia.

## Runtime e modelo

Inferência **embutida no processo Node**, conforme a decisão preservada em
[[Analítico - Arquitetura e estratégias]], com o peso do modelo carregado de object storage via
`@attlas/core-storage`. Peso não entra no git.

**Se o modelo não carrega, o serviço não fica `ready`.** Um analítico que sobe verde sem modelo é pior que
um que não sobe: ele consome stream, não produz ocupação e nada acusa.

## Saída no vocabulário do embarcado

Caixa, classe e confiança, na **mesma forma que o caminho embarcado já emite**. O consumidor não pode
precisar de duas gramáticas para ler a mesma coisa, e o `IAnalyticsFrameEvent` do embarcado, em
`libs/contracts/src/lib/object-detection/`, é o precedente de forma a seguir.

Veículo é o alvo desta unidade. **Pedestre fica filtrado e declarado como próximo eixo**, não removido em
silêncio: filtrar sem registrar é o tipo de decisão que reaparece como bug seis meses depois.

## Entrega obrigatória: o tempo de inferência medido por resolução

Isto não é um "seria bom ter", é parte do DoD. **O teto de câmeras por instância sai deste número**, e é
exatamente por isso que o card de escala ficou fora da semana em vez de entrar com estimativa.

A medição também é o gatilho da cláusula de reabertura registrada no ADR: se o custo por frame no processo
Node provar a via inviável, a alternativa Python volta à mesa como decisão registrada, não como descoberta
no CI.

## DoD

Detecção rodando sobre o frame do relay, com caixa, classe e confiança na forma do embarcado, modelo vindo
de object storage, `/health/ready` vermelho quando o modelo não carrega, e **o tempo de inferência medido e
registrado por resolução**. Teste de integração cobrindo o caminho feliz e a falha de carga do modelo.

## Encosta em

- [[Analítico servidor - Serviço, imagem e ingestão do stream]], que entrega o frame.
- [[Analítico servidor - Laço virtual e ocupação da região]], que consome a caixa.
- [[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop]], que registra a cláusula de
  reabertura do runtime e o teto de câmeras como número medido.
- [[Attlas - Sprint 31]], riscos 1 e 3.
