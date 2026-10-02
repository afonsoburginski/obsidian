---
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - frontend
titulo: "[Full] Analítico - a faixa da via se associa na Detecção, por select"
frente: Vínculo região e detector
tamanho: 5 pts
pr: "#4292"
status: "PR #4292 mergeada em 23/09 às 15h30."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-24
---

# Analítico - a faixa da via associada na Detecção

> [!info] Estado em 24/09: o card ficou igual à referência e a região ATSPM passou a vincular
> No working tree da branch `analytics/feat/NO-CARD-instancias-vinculo-e-recuo-do-laco`, sem commit.
> O bloco ganhou os três campos do attlas-design (Via travada, Faixa, Detector travado até a faixa),
> o switch passou a ser o próprio vínculo (desligar solta, ligar em edição abre os selects) e o aviso
> lista a cadeia que o sistema confere. O `POST` de vínculo do `ms-cameras` recusava região ATSPM
> (404 na câmera 080) e agora usa a mesma lista de tipos do caderno de endereços. Emendas na `UF-722`
> seção 8 e na `UC-064` seção 13. Testado na tela local com a DEMO: gravar e soltar funcionam.

Terceira PR da frente 4. Resolve o mesmo relato da [[Controladores - a fiação da ACOM cria o vínculo região-detector|#4256]]
pelo lado oposto: aquela faz a fiação da ACOM criar o vínculo, esta dá ao operador a superfície para
criá-lo na tela onde ele desenha a região. A atômica é a `UF-722`.

## O que estava errado

O campo "Faixa associada" do bloco de desempenho da Detecção era um texto somente leitura, e a tela
dizia em prosa que o vínculo se fazia na tela de Métricas, sem oferecer caminho até lá. Quem desenhava
a região ali ficava com o selo "Sem faixa vinculada" e com a certeza de que a tela estava quebrada.

## O que muda

O campo vira um select com os detectores da interseção da câmera, rotulados por via e detector, e
escolher um grava o vínculo na hora. A nota que apontava para a tela de Métricas some quando o select
está na tela; câmera cuja interseção não oferece detector nenhum continua com a leitura e com a nota.

As opções saem de uma cadeia de quatro leituras: a câmera nomeia a interseção, a listagem de vias é
filtrada por ela (filtro novo no `ms-traffic-model`), cada via sobrevivente é lida inteira para trazer
faixas e detectores, e a lista de controladores diz o protocolo, que define a dimensão do endereço.
Detector sem controlador, controlador sem protocolo e endereço que não lineariza ficam fora da lista,
porque um índice derivado pela dimensão errada aponta para o trânsito de outra faixa e se lê como
medição plausível.

A escrita fica fora do Salvar do rascunho, porque o vínculo não mora na região: dobrá-lo no rascunho
faria o Descartar prometer desfazer algo que nunca tocou. Região que já tinha vínculo solta o endereço
antigo antes de tomar o novo, porque o endereço tem unicidade viva. O diálogo da tela de Métricas
continua existindo e escrevendo o mesmo vínculo.

A PR também devolveu ao verde duas specs de serviço da Detecção que estavam vermelhas na develop desde
que a gravação de regiões ganhou o tipo de analítico como parâmetro.

## O que tem de valer no fim

Escolher uma faixa na Detecção tira a região de "Sem faixa vinculada" na mesma tela, sem sair dela, e
a região de outro analítico continua fora desse estado.

## Relacionado

- [[Plano - o vínculo da região do analítico com o detector]], o diagnóstico da frente.
- [[Analítico - célula do detector pelo vínculo do laço]], a primeira PR da frente.
- [[Attlas - Sprint 34]].
