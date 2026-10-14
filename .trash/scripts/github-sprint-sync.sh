#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# github-sprint-sync.sh — Puxa PRs do GitHub e atualiza o vault do Obsidian
# Fonte de verdade: Obsidian. GitHub é input, não o contrário.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

VAULT="/home/afonso/Área de trabalho/obsidian"
REPO="atmanadmin/attlas-2026"
AUTHOR="afonsoburginski"
SPRINT_DIR="$VAULT/Sprint"
REPORT_FILE="$VAULT/Sprint/GitHub Sync Report.md"

# ── Configuração da sprint corrente ──
CURRENT_SPRINT="${1:-36}"
SPRINT_START="${2:-2026-10-05}"
SPRINT_END="${3:-2026-10-11}"

echo "🔄 Syncing GitHub PRs for Sprint $CURRENT_SPRINT ($SPRINT_START → $SPRINT_END)"

# ── Buscar PRs da sprint ──
PRS_JSON=$(gh pr list \
  --repo "$REPO" \
  --author "$AUTHOR" \
  --state all \
  --limit 100 \
  --json number,title,state,mergedAt,createdAt,labels,url,additions,deletions,changedFiles \
  --jq "[.[] | select(.createdAt >= \"${SPRINT_START}T00:00:00Z\" or (.mergedAt != null and .mergedAt >= \"${SPRINT_START}T00:00:00Z\"))]"
)

TOTAL=$(echo "$PRS_JSON" | jq length)
MERGED=$(echo "$PRS_JSON" | jq '[.[] | select(.state == "MERGED")] | length')
OPEN=$(echo "$PRS_JSON" | jq '[.[] | select(.state == "OPEN")] | length')
CLOSED=$(echo "$PRS_JSON" | jq '[.[] | select(.state == "CLOSED")] | length')
ADDITIONS=$(echo "$PRS_JSON" | jq '[.[].additions] | add // 0')
DELETIONS=$(echo "$PRS_JSON" | jq '[.[].deletions] | add // 0')
FILES=$(echo "$PRS_JSON" | jq '[.[].changedFiles] | add // 0')

echo "  PRs: $TOTAL total ($MERGED merged, $OPEN open, $CLOSED closed)"
echo "  Code: +$ADDITIONS -$DELETIONS across $FILES files"

# ── Gerar report ──
NOW=$(date '+%Y-%m-%d %H:%M')

cat > "$REPORT_FILE" << HEADER
---
tags:
  - attlas
  - github-sync
  - sprint-$CURRENT_SPRINT
aliases:
  - "GitHub Sync"
atualizado: $(date '+%Y-%m-%d')
banner: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=1200"
---

# GitHub Sync Report

Última sincronização: **$NOW**
Sprint: **$CURRENT_SPRINT** ($SPRINT_START → $SPRINT_END)

## Resumo

| Métrica | Valor |
| --- | --- |
| PRs total | $TOTAL |
| Merged | $MERGED |
| Open | $OPEN |
| Closed | $CLOSED |
| Linhas adicionadas | +$ADDITIONS |
| Linhas removidas | -$DELETIONS |
| Arquivos tocados | $FILES |

## PRs da Sprint $CURRENT_SPRINT

HEADER

# ── Tabela de PRs ──
echo "| # | Título | Estado | Data | +/- |" >> "$REPORT_FILE"
echo "| --- | --- | --- | --- | --- |" >> "$REPORT_FILE"

echo "$PRS_JSON" | jq -r '.[] | [
  .number,
  .title,
  .state,
  (if .mergedAt != null then .mergedAt[0:10] else .createdAt[0:10] end),
  "+\(.additions)/-\(.deletions)"
] | "| #\(.[0]) | \(.[1]) | \(.[2]) | \(.[3]) | \(.[4]) |"' >> "$REPORT_FILE"

# ── PRs abertas (ação necessária) ──
OPEN_PRS=$(echo "$PRS_JSON" | jq -r '[.[] | select(.state == "OPEN")] | sort_by(.number) | .[] | "- [ ] **#\(.number)** \(.title) — aberta em \(.createdAt[0:10]) ([ver](\(.url)))"')

if [ -n "$OPEN_PRS" ]; then
  cat >> "$REPORT_FILE" << OPEN

## Ação necessária (PRs abertas)

$OPEN_PRS
OPEN
fi

# ── PRs mergeadas (entregues) ──
MERGED_PRS=$(echo "$PRS_JSON" | jq -r '[.[] | select(.state == "MERGED")] | sort_by(.mergedAt) | .[] | "- [x] **#\(.number)** \(.title) — merged em \(.mergedAt[0:10])"')

if [ -n "$MERGED_PRS" ]; then
  cat >> "$REPORT_FILE" << DONE

## Entregues (merged)

$MERGED_PRS
DONE
fi

echo "" >> "$REPORT_FILE"
echo "Gerado automaticamente por \`scripts/github-sprint-sync.sh\`." >> "$REPORT_FILE"

echo "✅ Report atualizado: $REPORT_FILE"

# ── Auto-commit se houver mudanças ──
cd "$VAULT"
if git diff --quiet 2>/dev/null; then
  echo "📝 Sem mudanças para commitar"
else
  git add -A
  git commit -m "sync: GitHub Sprint $CURRENT_SPRINT — $MERGED merged, $OPEN open ($NOW)"
  git push origin main 2>/dev/null && echo "📤 Pushed" || echo "⚠️  Push failed (offline?)"
fi
