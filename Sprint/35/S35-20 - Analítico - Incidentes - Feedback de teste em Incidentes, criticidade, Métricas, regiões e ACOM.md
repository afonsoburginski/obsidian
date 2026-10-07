---
id: S35-20
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - incidentes
titulo: "[Full] Feedback de teste do Analítico em Incidentes, criticidade, Métricas, regiões e ACOM"
frente: Incidentes
pr: "#5259"
status: "Feita. #5259 mergeada em 29/09 às 16h21."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-20 - Analítico - Incidentes - Feedback de teste em Incidentes, criticidade, Métricas, regiões e ACOM

## O que se pediu

Os pontos do feedback de teste do Analítico que nenhuma PR aberta ou mergeada ainda cobria, numa PR só.

## O que a PR entregou

- **Status do incidente**: a fila e o detalhe usam o mesmo vocabulário, seguindo o edital: Não
  reconhecido, Confirmado e Falso positivo, e depois de Confirmado os passos Em tratamento e Resolvido. O
  seletor do detalhe mostra só o estado atual e os próximos permitidos.
- **Criticidade por tipo**: o diálogo guardava a escolha só na sessão. Agora o `ms-cameras` grava a tabela
  por Sistema, e fila, filtros, marcadores, pinos, detalhe, Métricas e a exportação XLS e PDF leem a tabela
  gravada.
- **Métricas**: "Fixar cabeçalho" acompanha a página até o fim, o título do gráfico expandido mostra o nome
  da métrica em vez da chave de tradução, e a aba Laço Virtual abre quando o analítico avançado também
  atende laço.
- **Regiões**: a região nova leva o menor número livre, e o cartão do analítico no detalhe da câmera mostra
  o nome da região.
- **ACOM**: a página e o painel da instância mostram a placa vinculada, e o `ms-controllers` recusa com 409
  um analítico ligado a uma segunda placa, que antes era ignorada em silêncio.

Ficou fora o stream de vídeo travando, que precisa de medição no ambiente e não tinha causa confirmada no
código.

## Estado

Mergeada em 29/09.

## Relacionado

- [[Analítico - Vínculo com a ACOM]]
