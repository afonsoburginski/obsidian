---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2436
clickup: https://app.clickup.com/t/86ajycf84
titulo: "[Back] Videowall externo: brilho e estado observável"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: code review na [PR #1718](https://github.com/atmanadmin/attlas-2026/pull/1718), aberta em 18/08, com correção pedida pelo felipeaquino no mesmo dia. Conferido em 19/08 que o serviço de câmeras não tem nenhum endpoint de brilho na develop, então nada disso entrou por outra task. Em 14/08 o estado observável ganhou o tipo de ocupação e a origem da projeção.
pr: "[#1754](https://github.com/atmanadmin/attlas-2026/pull/1754)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
---

# SOFTWARE-2436 - Brilho e estado observável

O ajuste de brilho do contrato mais o requisito que faltava: saber o que o Attlas realmente conhece
do equipamento, e com que frescor.

> [!info] Revisão de 14/08: o estado passa a dizer o tipo de ocupação
> Com os dois modos, o estado observável do painel deixa de falar só do espelho: ele diz **o ocupante
> vigente com o tipo**, e na projeção nativa diz também qual cena está na parede e o que a originou, um
> operador, um plano ou uma programação. O brilho não muda, e o brilho agendado deixou de depender de
> capacidade de agenda do equipamento, porque quem conta o tempo passou a ser a plataforma.

## Escopo acoplado em 18/08: descoberta da geometria do painel

Decisão de produto do dia (sem card novo, regra do user): a conexão do painel não pede mais largura
e altura. As colunas viraram anuláveis (migration `20260818130000_videowall_processor_nullable_geometry`,
ciclo shadow validado) e o contrato de registro aceita a ausência. Este card passa a preencher a
geometria: a leitura de estado consulta a screen list da Open API do H9 e grava `panelWidth`/`panelHeight`
no cadastro. Enquanto isso, a tela desenha o contorno genérico, nunca proporção inventada.

## O que a implementação de 18/08 decidiu

O alcance tem três estados, e é isso que permite a leitura responder 200 com o portão de capacidade
recusando, que é o default de produção: respondeu, contato tentado e falhado, e ninguém perguntou. Nenhuma
das três formas de desconhecido devolve o valor guardado, só a hora da última leitura válida.

A escrita de brilho valida contra a faixa lida na mesma requisição, nunca contra a coluna persistida, e faixa
que não pôde ser lida recusa a escrita em vez de escrever no escuro. A leitura é uma unidade: recusa em
qualquer das duas chamadas reporta o estado como não lido, em vez de misturar meia resposta com frescor novo.

Dois recortes ficaram declarados na atômica em vez de resolvidos:

- **Firmware declarado não existe como coluna.** O registro do processador nunca pediu firmware, só modelo,
  então o critério "aparece separado quando os dois divergem" não é implementável hoje.
- **Ocupação de projeção nativa não é reportada no campo de espelho.** O ocupante com tipo exige campo novo
  no contrato e ficou para o card da projeção.

## Escopo (1 PR)

Brilho do mural via `screen/brightness` (RF-6). Estado observável do processador: alcançabilidade,
firmware lido, mapa de janelas conhecido e o frescor de cada informação, que é a lacuna de requisito
achada no confronto com o contrato e o pré-requisito do estado vazio honesto na tela. Sem polling
agressivo: um equipamento por cidade, HTTP stateless.

## DoD

Brilho aplicável (ou capacidade não verificada), estado do processador exposto com timestamps de
frescor por informação.

## Dependência

[[SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API|2433]].

## Referências

- [[Videowall externo (NovaStar H9)]], RF-6 e a lacuna "Estado observável do processador".
- [[Attlas - Sprint 28]].
