---
id: S34-12
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - navegação do cadastro alinhada à de controladores e dropdown Modelo corrigido"
frente: Câmeras
tamanho: 3 pts
pr: "#4150"
issues: "#1870, #1874"
status: "Feita. PR #4150 mergeada na develop em 22/09, fechando as issues 1870 e 1874."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Câmeras - navegação do cadastro e o dropdown de Modelo"
---

# S34-12 - Câmeras - Cadastro - Navegação do cadastro e o dropdown de Modelo

Duas correções na mesma área: o modal de cadastro de câmera e o campo "Modelo", que aparece no
cadastro e na edição. Fecha as issues 1870 e 1874.

## Navegação (issue 1870)

Nas etapas Credenciais, Configurações e Conclusão o cabeçalho deve trazer a seta de voltar antes do
stepper e o rodapé deve dizer "Cancelar", como o cadastro de controlador já faz. O botão de voltar
saiu do rodapé e virou seta no início da navegação do stepper, o rodapé passou a renderizar
"Cancelar" nas quatro etapas, e a spec da tela ganhou a revisão datada, porque descrevia o
comportamento antigo.

## Dropdown Modelo (issue 1874)

O texto "Modelo da câmera" aparecia dentro da lista aberta porque os dois templates passavam o
placeholder do campo para a caixa de busca interna do combobox. Essa caixa deixou de existir na
develop, então o sintoma já não reproduz, mas a ligação errada continuava no código e voltaria com
qualquer busca interna nova. O segundo critério, desabilitar o campo enquanto a marca não estiver
escolhida, não existia em lugar nenhum.

O achado que importa está no componente compartilhado: o estado desabilitado do combobox era semeado
uma única vez, e o `setDisabledState(false)` que o reactive forms dispara no setup do controle
sobrescrevia o valor em definitivo. Um `zDisabled` ligado a campo de formulário era descartado em
silêncio. As duas fontes passam a ser conjugadas, senão a correção acima seria inerte justamente no
estado inicial.

## O que tem de valer no fim

A seta volta uma etapa e o rodapé mostra "Cancelar" nas quatro; "Modelo" abre desabilitado até a
marca resolver e a lista nunca mostra o texto de placeholder como item.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
