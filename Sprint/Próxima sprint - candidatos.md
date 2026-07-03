---
tags:
  - attlas
  - backlog
  - proxima-sprint
status: a mapear
atualizado: 2026-07-03
---

# Próxima sprint — candidatos

> Backlog a mapear na próxima sprint — estimar, quebrar em specs atômicas e criar cards no ClickUp.
> Nota: o filtro de busca por "uptime" **não está aqui** — é feito hoje dentro da #577 (ver [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).

## Candidatos

- [ ] **Particionamento de tabelas no banco de dados** — provavelmente as tabelas de histórico/telemetria de câmeras que mais crescem (janelas de 5 min, TTFF, rollup). Gancho: [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]].
- [ ] **Novas regras de permissões de usuário** — repassadas pelo Hadson em 02/07. Já é o item mais documentado do lote; base para detalhar a spec.
- [ ] **Separação dos eventos de câmera por domínio** — isolar a funcionalidade de eventos num domínio próprio. Gancho: [[SOFTWARE-1921 - Eventos de câmera (auto + duração)]].
- [ ] **Revisar uso de `systemId` em rotas de API** — checar se há mais rotas que precisam do escopo `systemId` (já aplicado na busca por topologia da #574).

## Insumo de planejamento

- [ ] Após validar o ambiente em dev, documentar melhorias e implementações faltantes → alimentam este backlog e o mapeamento da próxima sprint.
