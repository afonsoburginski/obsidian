---
tags:
  - doc
  - vault
aliases:
  - "Widgets HTML"
atualizado: 2026-10-08
---

# Widgets HTML

Diagramas e visualizações interativas do vault são arquivos HTML embutidos na nota, não Mermaid nem Excalidraw. O visual é o runtime de widgets do Gemini preservado (cores, fontes, raios e componentes).

## Como embutir numa nota

````markdown
```widget
src: Docs/Infraestrutura/assets/widgets/orquestracao-swarm-vs-k8s.html
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
| `template.html` | Ponto de partida para widget novo |

## Criar um widget

1. Copiar `_widgets/template.html` para `Docs/<Módulo>/assets/widgets/<slug>.html`.
2. Manter o `<link>` e o `<script>` do runtime como estão — o caminho `../../../../_widgets/` só vale nessa profundidade de pasta.
3. Manter o elemento `.widget-container`: é ele que o runtime mede para dimensionar o iframe.
4. Usar apenas token do runtime para cor, fonte, raio e espaçamento. Hex literal no widget quebra o tema claro.
5. Expor a função global `updateViz()` se o widget pinta algo que lê token via `getComputedStyle` — o runtime a chama a cada troca de tema.
6. Embutir na nota com o bloco ```widget.

O arquivo abre direto no browser (`file://`) com o mesmo visual; dentro da nota o fundo fica transparente.

> [!warning] Fontes `Google Sans Flex` e `Google Sans Code` vêm do Google Fonts por `@import`. Offline, o fallback é a fonte sans/mono do sistema — o layout não quebra, só a tipografia muda.
