---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
  - frontend
card: SOFTWARE-2733
titulo: "[Front] Desenho de região sobre frame congelado do preset"
clickup: https://app.clickup.com/t/86ak5verw
frente: Analítico
tamanho: 3 pts
status: card criado na reestimativa de 25/08. Irmão de [[Analítico - Preset PTZ com snapshot de região]] (o backend). Spec UF-036 escrita em 25/08, PR #2024 aberta. Corrigido em 25/08: HÁ o que portar (detection-frame), a leitura anterior estava errada.
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Desenho de região sobre frame congelado (front)

Hoje o operador desenha a região sobre o **vídeo ao vivo**. Com o vínculo preset-região que o card
irmão cria, o desenho passa a ser sobre o **frame congelado daquele preset** - que é o único
enquadramento em que aquela geometria faz sentido.

## O que portar - correção de 25/08

> [!warning] A versão anterior desta nota dizia "nada a portar". Estava errada.
> Eu tinha olhado só o `camera-ptz-control/`, que de fato trata preset como lista estática e declara
> "Sem serviço de PTZ nesta entrega". Mas o componente certo é outro: **`components/detection-frame/`**
> (963 linhas entre `.ts`, `.html` e `.css`), e ele resolve exatamente este card.

O que o `detection-frame` já tem, verificado no fonte em 25/08:

| No protótipo | Serve para |
| --- | --- |
| frame congelado em modo de edição, **com aviso na superfície** de que está congelado | o substrato do desenho |
| `presets` / `activePreset` / `presetChange` | o seletor de preset |
| `frameCapturedAt` + rótulo formatado | a data da captura, que é o que denuncia geometria defasada |
| vértices normalizados 0-1 em `viewBox="0 0 1 1"` | o modelo de coordenada - **o mesmo do produto**, então a troca de substrato não mexe em dado |
| `backdropRegions` - regiões vizinhas atrás, clicáveis | navegar entre conjuntos sem sair da imagem |
| desenho por teclado no mesmo espaço do ponteiro | acessibilidade, que a `UF-033` hoje não cobre |

O aviso de congelamento vale trazer literalmente: imagem parada sem aviso lê como analítico que
morreu.

O que **não** vem: captura e persistência do snapshot, que são do card irmão no backend.

E o alvo continua sendo **código de produto que já funciona**: o desenho de região do `web-attlas`
está integrado de verdade desde 14/07 (aba Analíticos, `UF-033`), e é ele que ganha o modo "frame
congelado".

## O que muda na tela

1. **Seletor de preset** ao entrar no desenho de região, quando a câmera é PTZ com mais de um preset.
2. **Trocar o substrato do desenho**: o SVG de região passa a ser sobreposto ao frame congelado
   servido pelo backend em vez de ao `<video>` ao vivo.
3. **Deixar visível a qual preset o conjunto pertence** - hoje mover a câmera invalida a geometria em
   silêncio; o ganho de produto do card é justamente acabar com esse silêncio.

## Câmera sem PTZ / com um preset só

Não regride: sem preset ou com um só, o fluxo continua o de hoje (desenho direto), sem seletor. O
card não pode transformar o caminho simples num caminho com passo extra.

## DoD

Desenho de região sobre frame congelado do preset escolhido, com seletor quando houver mais de um
preset, indicação clara de qual preset o conjunto pertence, e o caminho sem PTZ inalterado. i18n nos
3 locales e teste de componente.

## Encosta em

- [[Analítico - Preset PTZ com snapshot de região]] - **dependência dura**: é o backend que persiste o
  vínculo e serve o frame congelado.
- `UF-036` - a spec deste card, em [PR #2024](https://github.com/atmanadmin/attlas-2026/pull/2024).
- `UF-033` (aba Analíticos, já em produção) - o componente de desenho que este card evolui.
- [[Analítico - Frontend do attlas-design]] · [[Attlas - Sprint 30]].
