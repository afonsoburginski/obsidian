---
tags:
  - hermes
  - engenharia
  - harness
aliases:
  - Hermes harness
atualizado: 2026-10-16
---

# Hermes - Levantamento de harness

Volta para [[Acesso rápido]]

## Resumo

| Aspecto | Estado atual | O que melhorar |
|---|---|---|
| Skin/tema | midnight customizado, emojis vazios | Emojis corrigidos, spinners geometricos |
| Visibilidade de tools | Comandos ocultos, sem preview | tool_progress_command + preview 120 chars |
| Pensamento | Cinza apagado, estilo code | Borda azul, texto mais claro, estilo bordered |
| Custo por turno | Oculto | Visivel |
| Timestamps | Sem | Com |
| Compact mode | Ligado (escondia detalhe) | Desligado |
| Footer de runtime | Desligado | Ligado (modelo, contexto, cwd) |

## Mudancas aplicadas nesta sessao

1. `display.compact = false` (mais espaco entre blocos, labels completas)
2. `display.tool_progress_command = true` (mostra o comando/path do tool executado)
3. `display.tool_preview_length = 120` (preview do input do tool antes de rodar)
4. `display.show_cost = true` (custo por turno visivel)
5. `display.timestamps = true` (hora em cada mensagem)
6. `display.reasoning_style = bordered` (caixa visivel ao redor do pensamento)
7. `display.runtime_footer.enabled = true` (barra de info persistente)
8. `reasoning_border` de #1A1A1A (invisivel) para #1E3355 (azul escuro visivel)
9. `reasoning_text` de #6B7280 (cinza apagado) para #8B95A5 (mais legivel)
10. Emojis de tool reescritos (estavam vazios no YAML)
11. Spinners geometricos (◐◓◑◒ e ◜◝◞◟) em vez dos dots

## Levantamento para engenharia de harness

### 1. Versao desatualizada

Versao instalada: v0.21.5+8304 (24/set/2026). Tem update disponivel. Atualizar antes de qualquer outra coisa pode resolver bugs de renderizacao ja corrigidos upstream.

Acao: `hermes update`

### 2. Rendering de emojis no terminal

O YAML do skin perdia emojis (salvava string vazia). Causa provavel: o YAML dumper do Python descarta caracteres fora do BMP ou o editor de config nao preserva. Corrigido manualmente mas pode acontecer de novo se usar `hermes skin set` com emoji multi-byte.

Acao: testar se `hermes skin set tool_emojis.terminal "🖥️"` preserva o emoji. Se nao, abrir issue.

### 3. Reasoning box pouco visivel

O estilo `code` renderiza pensamento como bloco de codigo cinza. O estilo `bordered` desenha uma caixa com borda. A cor da borda era #1A1A1A (quase igual ao fundo #0A0A0A), entao era invisivel. Corrigido para azul escuro #1E3355.

### 4. Tool output sem contexto

Com `compact: true` + `tool_progress_command: false` + `tool_preview_length: 0`, o output dos tools aparecia sem indicar o que estava rodando. Agora mostra:
- Nome do tool com emoji
- Comando ou path sendo executado
- Preview de 120 chars do input

### 5. Falta de status persistente

O runtime footer estava desligado. Agora mostra modelo ativo, percentual de contexto usado e diretorio atual, o que ajuda a saber em que estado o agente esta.

### 6. Coisas que NAO da pra mudar (limitacoes do Hermes CLI)

- **Animacao de spinner**: limitada ao conjunto de chars do skin. Nao tem animacao frame-a-frame real com cores. O spinner e texto puro rodando num ciclo.
- **Rich output dos tools**: o conteudo de read_file, terminal, etc chega como texto plano. Nao tem syntax highlight inline no output (so no bloco de resposta do modelo).
- **Progresso de tools longos**: nao tem barra de progresso. So spinner + verbo ("thinking", "reading").
- **Layout de diff**: inline_diffs esta ligado, mas o rendering depende do terminal suportar 256 cores.

### 7. Proximos passos para harness completo

1. **Atualizar Hermes** (`hermes update`) e verificar se bugs de renderizacao foram corrigidos.
2. **Testar a TUI** (`hermes --tui`): interface mais rica com paineis, mouse, widgets dockaveis. Pode resolver varias limitacoes do CLI puro.
3. **Testar o Desktop** (`hermes desktop`): rendering HTML/CSS, sem limitacao de terminal.
4. **Avaliar LSP** (`hermes tools enable coding`): diagnosticos semanticos no post-write, mostra erros do pyright/tsc inline.
5. **Experimentar status_bar.fields** com campos customizados se o runtime footer nao for suficiente.
6. **Consolidar skin como "distribuicao"** para replicar em outras maquinas/profiles.
