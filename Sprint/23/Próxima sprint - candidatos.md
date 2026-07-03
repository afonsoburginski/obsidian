---
tags:
  - attlas
  - backlog
  - proxima-sprint
status: mapeado (tarefas separadas em notas próprias)
atualizado: 2026-07-03
---

# Próxima sprint — candidatos

> Backlog bruto da Sprint 23. **Já mapeado e separado**: cada candidato virou uma nota de tarefa própria, listadas no índice [[Attlas - Sprint 23]]. Falta estimar, quebrar em specs atômicas e criar os cards `SOFTWARE-xxxx` no ClickUp (a sprint ainda não existe lá).
> Nota: o filtro de busca por "uptime" **não está aqui** — é feito hoje dentro da #577 (ver [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).

## Candidatos (agora detalhados em nota própria)

- [ ] [[Encerramento robusto de sessões de stream (reaper + lease)]] — corrige o vazamento de `viewerCount` que mantém relays ffmpeg puxando 1080p das câmeras sem viewer. Origem: [[Incidente - vazamento de sessões de stream (banda das câmeras)]]. Frente Streaming.
- [ ] [[Particionamento de tabelas de telemetria de câmeras]] — tabelas de histórico/telemetria que mais crescem (janelas de 5 min, TTFF, heartbeat, rollup). Gancho: [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]].
- [ ] [[Novas regras de permissões de usuário]] — repassadas pelo Hadson em 02/07. Item mais documentado do lote; base para detalhar a spec.
- [ ] [[Separação dos eventos de câmera por domínio]] — isolar a funcionalidade de eventos num domínio próprio. Gancho: [[SOFTWARE-1921 - Eventos de câmera (auto + duração)]].
- [ ] [[Revisar uso de systemId em rotas de API]] — checar se há mais rotas que precisam do escopo `systemId` (já aplicado na busca por topologia da #574).

## Insumo de planejamento

- [x] Após validar o ambiente em dev, documentar melhorias e implementações faltantes → alimentam este backlog. (feito 03/07: incidente de banda das câmeras documentado e tarefas separadas)
- [ ] Criar a Sprint 23 no ClickUp e gerar os cards `SOFTWARE-xxxx`, preenchendo `card`/`pr`/`branch` em cada nota.
