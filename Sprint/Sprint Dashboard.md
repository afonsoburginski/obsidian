---
tags:
  - attlas
  - sprint-dashboard
aliases:
  - "Sprint Dashboard"
atualizado: 2026-10-08
banner: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200"
---

# Sprint Dashboard

Central de operações. Fonte de verdade: este vault. GitHub é input, ClickUp é output.

> [!tip] Sincronizar com GitHub
> Roda `bash scripts/github-sprint-sync.sh 36 2026-10-05 2026-10-11` para puxar PRs.
> Ver resultado: [[GitHub Sync Report]]

## Sprint corrente

```dataview
TABLE WITHOUT ID
  file.link AS "Sprint",
  sprint AS "Janela",
  status AS "Situação"
FROM "Sprint"
WHERE contains(tags, "moc") AND contains(tags, "sprint-36")
LIMIT 1
```

## Velocidade (últimas 5 sprints)

```dataview
TABLE WITHOUT ID
  file.link AS "Sprint",
  sprint AS "Janela",
  length(file.outlinks) AS "Tasks"
FROM "Sprint"
WHERE contains(tags, "moc")
SORT file.name DESC
LIMIT 5
```

## Tasks da Sprint 36 — por natureza

### Frontend

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  estado AS "Estado"
FROM "Sprint/36"
WHERE file.name != "index" AND contains(file.outlinks, [[]])
FLATTEN file.frontmatter AS fm
WHERE contains(string(file.name), "Front") OR contains(string(file.name), "Câmeras") OR contains(string(file.name), "Detalhe")
SORT file.name ASC
LIMIT 20
```

### Backend

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  estado AS "Estado"
FROM "Sprint/36"
WHERE file.name != "index" AND (contains(string(file.name), "Back") OR contains(string(file.name), "PTZ") OR contains(string(file.name), "Cadastro"))
SORT file.name ASC
LIMIT 20
```

### Infraestrutura

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  estado AS "Estado"
FROM "Sprint/36"
WHERE file.name != "index" AND (contains(string(file.name), "Infra") OR contains(string(file.name), "Ambiente"))
SORT file.name ASC
LIMIT 20
```

### Analítico

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  estado AS "Estado"
FROM "Sprint/36"
WHERE file.name != "index" AND contains(string(file.name), "Anal")
SORT file.name ASC
LIMIT 20
```

## Todas as tasks da Sprint 36

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  estado AS "Estado",
  dateformat(file.mtime, "dd/MM") AS "Última edição"
FROM "Sprint/36"
WHERE file.name != "index"
SORT file.name ASC
```

## Timeline de sprints

> [!timeline] Histórico completo
> ```dataview
> TABLE WITHOUT ID
>   file.link AS "Sprint",
>   sprint AS "Janela",
>   length(file.outlinks) AS "Tasks"
> FROM "Sprint"
> WHERE contains(tags, "moc")
> SORT file.name DESC
> ```
