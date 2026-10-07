---
id: S35-08
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - issues
  - frontend
titulo: "[Front] Botões secundários com contorno, ícones de mapa e do menu de ações, e busca e máscara de IP no Substituir câmera"
frente: Cadastro
pr: "#5137, #5141, #5142, #5144"
issues: "#4878, #4351, #4966, #4967"
status: "Feita. As quatro PRs mergeadas em 29/09 entre 13h39 e 13h50, e as quatro issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-08 - Câmeras - Cadastro - Botões, ícones e máscara de IP em Dispositivos

Quatro issues de tela do rótulo `cameras`, uma PR cada.

## O que estava errado e o que cada PR entregou

| Issue | O que estava errado | PR | O que mudou |
| --- | --- | --- | --- |
| #4878 | Cancelar do cadastro de preset, Voltar do erro do detalhe e Cancelar da importação em lote sem contorno, como texto solto | #5137 | Os três passam a `outline`, o padrão de botão secundário |
| #4351 | O olho do botão de mapa no detalhe do dispositivo mostrava o estado invertido | #5141 | Mapa oculto mostra o olho fechado e mapa visível o olho aberto, como em Elementos do Modelo de Tráfego |
| #4966 | "Ver detalhes", "Editar" e "Substituir" sem ícone no menu de ações da linha | #5142 | Os dois menus (três pontos e clique direito) com ícone em todas as opções |
| #4967 | Substituir câmera: busca do estoque sem botão de limpar e IP sem máscara | #5144 | Botão de limpar na busca e a máscara de IP dos outros campos do sistema |

## Estado

As quatro PRs mergeadas e as quatro issues fechadas em 29/09. A aba "Nova câmera" do Substituir, onde a
#5144 pôs a máscara de IP, saiu no dia seguinte com a [[S35-23 - Câmeras - Cadastro - Substituição pelo estoque e os bugs do cadastro, edição e lista|S35-23]].
