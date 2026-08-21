---
tags:
  - attlas
  - sprint-29
  - task
  - videowall
  - frontend
card: SOFTWARE-2475
clickup: https://app.clickup.com/t/86ajyp9wr
titulo: "[Front] Videowall externo: prévia da geometria projetada"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: reaberto e reescopado. Estava retirado desde 13/08; a cláusula 16.13 devolveu a projeção nativa e a atômica foi reescrita em 14/08 para prévia em leitura. Descrição do ClickUp corrigida em 18/08, que ainda dizia "retirado, fechado sem entrega".
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-18
---

# SOFTWARE-2475 - Prévia da geometria projetada

Qual célula da cena virou qual camada do painel, em pixels. É leitura, sem editor.

> [!info] Reaberto em 14/08, e a nota foi renomeada em 18/08
> O card nasceu como "janelas e presets de composição" e foi retirado em 13/08, quando o replanejamento do
> [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]] tirou da plataforma a composição da
> parede. Com a cláusula 16.13 do contrato citada, a projeção nativa voltou, a geometria das camadas passou
> a derivar da cena projetada, e o card voltou com escopo cortado. O título antigo ficou pendurado na nota
> por quatro dias, o que é exatamente o tipo de defasagem que faz alguém reabrir a task achando que ela
> ainda entrega um editor.

## O que ficou de fora, e é a maior parte

Sai o editor inteiro: arrastar, redimensionar e trocar a fonte de uma camada à mão. Layout se monta no
mosaico e o painel reproduz. Sai a aba de presets, porque preset salvo no equipamento continua fora do
escopo por decisão de domínio.

Com o editor fora, saem também as regras que só existiam por causa dele: movimento otimista, confirmação
proporcional por gesto de edição e a mensagem própria de lease tomado na escrita. Nada disso tem sentido
numa tela que só lê.

## Escopo (1 PR)

Prévia da geometria derivada, com as duas regras que já estavam certas na spec desde o começo.

**A tela não desenha nada sem a resolução do painel e a geometria lida.** Faltando um dos dois, nada é
desenhado e a tela diz qual falta. Um retângulo vazio do tamanho certo lê como painel apagado, e isso é uma
afirmação sobre o mundo que a plataforma não pode fazer. Painel sem camada reportada e painel não lido são
estados visualmente distintos.

**Os números vêm do equipamento e o frontend não os recalcula.** A projeção arredonda as bordas e subtrai,
em vez de arredondar posição e tamanho separadamente, para que células adjacentes compartilhem a mesma
fronteira. Uma segunda implementação no frontend produziria diferença de um pixel nas costuras, e a tela
discordaria do equipamento.

Camada sobrepõe camada, e a prévia respeita a ordem reportada. Não existe caminho de volta: composição
montada direto no equipamento não se converte em cena, porque camada sobreposta não tem representação em
célula de grade, e a tela não sugere que exista. A alternativa textual da prévia é a tabela de camadas.

## DoD

Resolução do painel como entrada obrigatória, geometria vinda do equipamento, sobreposição respeitada,
alternativa textual pela tabela, e os dois estados de ausência visualmente distintos.

## Dependência

[[SOFTWARE-2516 - Câmeras da cena como fontes servidas pela plataforma|2516]] e
[[SOFTWARE-2517 - Projetar e liberar cena pelo alvo VIDEOWALL|2517]], que são a origem da geometria
derivada. A atômica é a `UF-028`, reescrita, e não uma nova.

## Referências

- [[Attlas - Sprint 29]] e [[Videowall externo (NovaStar H9)]].
- [[Cláusula 16.13 do contrato de Quito]].
