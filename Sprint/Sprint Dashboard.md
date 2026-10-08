---
tags:
  - attlas
  - sprint-dashboard
aliases:
  - "Sprint Dashboard"
atualizado: 2026-10-08
banner: "sprint agile kanban board"
---

# Sprint Dashboard

Visão consolidada da sprint corrente e histórico, gerada por Dataview.

## Sprint corrente

```dataview
TABLE WITHOUT ID
  file.link AS "Sprint",
  status AS "Status",
  sprint AS "Janela"
FROM "Sprint"
WHERE contains(tags, "moc")
SORT file.name DESC
LIMIT 1
```

## Tasks da sprint corrente (por estado)

### Abertas

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  natureza AS "Tipo",
  estado AS "Estado"
FROM "Sprint/36"
WHERE estado != null AND !contains(estado, "feita") AND !contains(estado, "mergeada")
SORT file.name ASC
```

### Feitas

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  natureza AS "Tipo",
  estado AS "Estado"
FROM "Sprint/36"
WHERE estado != null AND (contains(estado, "feita") OR contains(estado, "mergeada"))
SORT file.name ASC
```

## Histórico de sprints

```dataview
TABLE WITHOUT ID
  file.link AS "Sprint",
  sprint AS "Janela",
  length(file.outlinks) AS "Links"
FROM "Sprint"
WHERE contains(tags, "moc")
SORT file.name DESC
LIMIT 10
```
