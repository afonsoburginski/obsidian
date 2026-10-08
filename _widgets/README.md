---
tags:
  - doc
  - vault
aliases:
  - "Widgets HTML"
  - "Diagramas"
atualizado: 2026-10-08
---

# Widgets HTML

Diagrama no vault é **HTML embutido na nota**, não Mermaid nem Excalidraw. O visual é o runtime de widgets do Gemini preservado (cores, fontes, raios e componentes).

## Como embutir numa nota

````markdown
```widget
src: _widgets/diagrams/videowall-caminho-do-video.html
```
````

| Chave | Obrigatória | Efeito |
| --- | --- | --- |
| `src` | sim | Caminho a partir da raiz do vault ou relativo à pasta da nota |
| `height` | não | Altura fixa em px. Sem ela o widget publica a própria altura e o iframe acompanha |
| `max-height` | não | Teto da altura automática |

Uma linha solta sem `chave:` também vale como `src`.

Renderização: plugin `attlas-widgets` (`.obsidian/plugins/attlas-widgets/`), desktop apenas. O tema do iframe segue o tema do Obsidian em tempo real.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `lumi-runtime.css` | Tokens e componentes `.lumi-*`. Fonte única — widget nunca redeclara token |
| `widget-runtime.js` | Tema, altura publicada ao host, modo embed, normalização de slider |
| `flow.js` + `flow.css` | Renderizador declarativo de diagrama de fluxo — foi o que substituiu o Mermaid |
| `template.html` | Base para widget sob medida, fora do formato de fluxo |
| `diagrams/` | Um arquivo por diagrama. Todo widget mora aqui: a profundidade fixa é o que faz `../lumi-runtime.css` valer para todos |

## Diagrama novo

Copiar um arquivo de `diagrams/`, trocar o conteúdo de `#flow-spec` e embutir na nota. O arquivo inteiro é:

```html
<link rel="stylesheet" href="../lumi-runtime.css">
<link rel="stylesheet" href="../flow.css">
<script src="../widget-runtime.js"></script>
<div class="widget-container"></div>
<script type="application/json" id="flow-spec"> { ... } </script>
<script src="../flow.js"></script>
```

### Spec

| Campo | Valor |
| --- | --- |
| `direction` | `LR` (default) ou `TB` |
| `title` / `subtitle` | Cabeçalho opcional |
| `nodes[]` | `{ id, label, sub, kind, group, detail, tag, width }` |
| `edges[]` | `{ from, to, label, dashed }` |
| `groups[]` | `{ id, label }` — caixa em volta dos nós daquele grupo |

`kind`: `default`, `accent` (azul, caminho principal), `store` (tópico/banco), `decision` (hexágono), `muted` (fora do caminho principal).

`label` e `sub` aceitam `\n` e linha longa quebra sozinha. Nó com `detail` vira clicável e o texto aparece no painel abaixo do diagrama.

### Regras aprendidas

- **Grupo só organiza o layout em `LR`.** Em `TB` ele é apenas uma caixa em volta dos membros e pode englobar um nó vizinho: em `TB`, carregue o dono no próprio label (`ms-cameras · DeviceStreamConsumer`).
- O rótulo de aresta define o vão entre camadas. Rótulo longo estica o diagrama inteiro — 2 a 4 palavras.
- Nada de hex literal no widget: cor vem de token, senão o tema claro quebra.

## Widget sob medida

Para algo que não é fluxo (toggle, comparação, HUD), partir de `template.html`, manter `.widget-container` (é o elemento medido para a altura) e expor `updateViz()` se o widget pinta algo que lê token via `getComputedStyle` — o runtime chama essa função a cada troca de tema.

O arquivo abre direto no browser (`file://`) com o mesmo visual; dentro da nota o fundo fica transparente.

> [!warning] Fontes `Google Sans Flex` e `Google Sans Code` vêm do Google Fonts por `@import`. Offline, o fallback é a fonte sans/mono do sistema — o layout não quebra, só a tipografia muda.
