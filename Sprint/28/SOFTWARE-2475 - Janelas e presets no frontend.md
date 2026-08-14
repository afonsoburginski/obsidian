---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2475
clickup: https://app.clickup.com/t/86ajyp9wr
titulo: "[Front] Videowall externo: janelas e presets de composição"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: retirado em 13/08 pelo replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]]. Estava em backlog na Sprint 28. Em 14/08 marcado para reabrir e reescopar como prévia em leitura, sem editor e sem presets.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2475 - Janelas e presets no frontend

> [!warning] Retirado em 13/08
> As duas abas pressupõem que a plataforma componha a parede, e ela deixou de compor: o painel passou a
> exibir a tela da aplicação numa janela única em tela cheia. Compor a parede continua possível, mas na
> interface do próprio equipamento, por quem o administra, e a plataforma não duplica nem disputa isso. A
> geometria vigente segue observável na aba de estado, para o operador saber se a parede foi alterada por
> fora. A atômica `UF-028` fica retirada com o motivo no cabeçalho, em vez de deletada.

> [!info] Revisão de 14/08: precisa ser reaberto e reescopado como leitura
> A tela volta, mas como **prévia da geometria projetada**: qual célula da cena virou qual camada do painel,
> em pixels. Sai o editor inteiro, arrastar, redimensionar e trocar fonte à mão, porque layout se monta no
> mosaico e o painel reproduz. Sai a aba de presets, porque preset no equipamento continua fora do escopo.
> Ficam as duas regras que já estavam certas na spec: a tela não desenha nada sem a resolução do painel e a
> geometria lida, e a geometria mostrada é a que o equipamento reporta, nunca uma recalculada no frontend.

Duas abas entregues juntas, porque a de presets opera sobre o resultado da de janelas. Criar, remover e
reposicionar janelas, trocar a fonte de uma janela sem recriá-la, e salvar, listar e aplicar preset.

## A prévia do mural só existe com dado real

Desenhar exige a resolução cadastrada e o mapa de janelas lido do equipamento. Faltando um dos dois, nada
é desenhado, e a tela diz qual falta. Um retângulo vazio do tamanho certo lê como painel apagado, o que é
uma afirmação sobre o mundo que a plataforma não pode fazer. Painel sem janela reportada e painel não lido
são estados visualmente distintos.

**Os números de geometria vêm do equipamento, e o frontend não os recalcula.** A projeção arredonda as
bordas e subtrai, em vez de arredondar posição e tamanho separadamente, para que células adjacentes
compartilhem a mesma fronteira. Uma segunda implementação no frontend produziria diferença de um pixel nas
costuras e a tela discordaria do equipamento.

Janela sobrepõe janela, e a prévia respeita a ordem reportada. Não existe caminho de volta: composição
montada direto no equipamento não se converte em cena, porque janela sobreposta não tem representação em
célula de grade. A tela não sugere que exista.

## Detalhes que a spec fixa

**Sem movimento otimista.** Arrastar não move a janela na prévia antes da confirmação do equipamento.
Arraste otimista é o esperado num editor de layout, e aqui mentiria sobre a parede. Durante o envio a
janela mostra pendente na posição antiga.

**Trocar fonte é uma escrita, não duas.** Remover e criar são duas escritas não idempotentes, e uma falha
entre elas deixaria o painel com um buraco.

**Confirmação proporcional.** Aplicar preset e remover janela confirmam; criar janela e trocar fonte não.
Pedir confirmação em tudo treina o operador a confirmar sem ler.

**Lease tomado tem mensagem própria.** O painel tem bloqueio de escrita por processador, então a mensagem
diz que outro operador está escrevendo, e não conflito genérico: o operador precisa saber que basta
esperar.

## DoD

Prévia com resolução como input obrigatório, geometria vinda do equipamento, sobreposição respeitada,
presets sempre lidos do equipamento, e alternativa textual da prévia pela tabela de janelas.

## Dependência

[[SOFTWARE-2474 - Câmeras e página web como fontes no frontend|2474]] e
[[SOFTWARE-2435 - Layout, janelas e presets|2435]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
