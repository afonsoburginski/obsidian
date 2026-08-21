---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2477
clickup: https://app.clickup.com/t/86ajypa18
titulo: "[Front] VMS: lançador radial do alvo de exibição"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: backlog na Sprint 28. Front; execução pelo dev de backend só com confirmação. Semântica revisada em 13/08 pelo replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]]: a estrutura fica, os gestos mudam.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-13
---

# SOFTWARE-2477 - Lançador radial do alvo de exibição

> [!warning] Superfície revisada em 13/08: a rota de configuração morreu
> A rota `/cameras/vms/videowall` com abas virou um **dialog compartilhado** aberto pelo lançador radial
> sobre o mosaico, com quatro views: espelhar, processador, brilho e estado. Os itens do arco deixam de navegar e passam a abrir o dialog na view correspondente; o item de cenas sai e o arco fica com cinco itens: Espelhar, Liberar, Brilho, Estado e Configurar. O indicador persistente de espelho ativo vive no lançador. Spec: `UF-030`.

Botão flutuante sobre o mosaico do VMS que abre em arco os gestos do painel físico: **tomar o painel para
espelhar a tela**, liberar, brilho, estado do mural e configurar.

É a superfície de operação do alvo videowall, e a de configuração é a rota do 2437. Configurar é raro e
cabe numa tela própria; tomar e liberar é frequente e tem de acontecer sem sair do mosaico.

> [!info] Revisado em 13/08: a estrutura sobrevive, os gestos mudam
> O primitivo, o arrastar, a persistência de posição e a exigência de autoridade continuam valendo sem uma
> linha de diferença. O que muda é o significado: **projetar cena virou tomar o painel para espelhar**, e o
> item de presets sai, porque a plataforma deixou de compor a parede. Ganha-se de graça a regra que mais
> incomodava no desenho anterior: cena com edição não salva não era projetável, porque o backend projetava
> a cena persistida. Com espelhamento a parede mostra a tela como ela está, edição pendente incluída, e a
> restrição desaparece.
>
> O gesto de tomar precisa tratar dois estados que não existiam, e os dois são do usuário: recusar o
> diálogo de compartilhamento do browser, e encerrar o compartilhamento pelo controle do browser sem passar
> pela aplicação. Nos dois casos a tela libera o painel.

## Por que um lançador e não mais botões na toolbar

A toolbar do VMS já carrega nome da cena, indicador de exibição, contador de posições, cronômetro de
rotação, seletor de layout, quatro controles de rotação, descartar, excluir, salvar e tela cheia, e já tem
menu de overflow que colapsa itens por medição de largura. Somar seis gestos ali empurraria o conjunto para
o overflow em qualquer viewport realista, e o gesto novo passaria a custar dois cliques dentro de um menu
de reticências. Nenhum item é movido da toolbar nesta entrega.

## A regra menos óbvia da entrega

**Cena com edição não salva não é projetável.** O backend projeta a cena persistida, então o painel
receberia a versão salva enquanto o operador olha a versão editada, e as duas seriam diferentes. O
operador concluiria que a projeção está errada, quando o errado foi o gesto ter sido oferecido. O item fica
atenuado pedindo para salvar antes.

Salvar automaticamente antes de projetar foi recusado: escreveria a cena do operador sem ele pedir, no meio
de um gesto que ele acha que é só de exibição.

## Outros pontos

**Confirmação proporcional.** Projetar com o painel livre não confirma, porque é o gesto principal e é
reversível por liberar. Projetar sobre composição existente confirma, nomeando as duas cenas. Liberar
confirma sempre, porque apagar a parede nunca é gesto casual. Estado do painel desconhecido faz a
confirmação dizer que não é possível saber o que está lá.

**O alvo nasce indisponível.** Sem processador cadastrado o item fica atenuado com o motivo, e não
escondido. É o estado em que a frente inteira nasce.

**Sem endpoint novo.** Projetar reusa a ativação de cena informando o alvo, resolvida por strategy no
backend.

**Ausente em viewport de telefone**, onde o mosaico vira grade paginada por deslize e um botão no canto
competiria com o gesto. Mesma decisão que já desliga o PTZ inline lá.

Detalhe verificado no código: a tela do VMS pede tela cheia no elemento raiz do documento, e não no
contêiner da grade, então a sobreposição do CDK continua visível em tela cheia. Se o alvo da tela cheia
mudar, isso quebra em silêncio, e por isso há teste cobrindo o caso.

## DoD

Consome o primitivo compartilhado sem componente de menu próprio, sete chaves de ícone novas no catálogo,
bloqueio de projeção com cena suja sem gravação implícita, e indicador persistente na toolbar para projeção
ativa e para resultado desconhecido.

## Dependência

[[SOFTWARE-2471 - Primitivo compartilhado de menu radial|2471]],
[[SOFTWARE-2437 - Tela do processador de videowall|2437]] e
[[SOFTWARE-2435 - Layout, janelas e presets|2435]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
