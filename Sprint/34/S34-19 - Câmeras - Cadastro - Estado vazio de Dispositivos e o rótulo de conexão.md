---
id: S34-19
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - estado vazio de Dispositivos com importação ativa e rótulo próprio para conexão"
frente: Câmeras
tamanho: 5 pts
pr: "#4170"
issues: "#1860, #1868, #4063"
status: "Feita. PR #4170 mergeada na develop em 23/09, fechando as issues 1860, 1868 e 4063."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Câmeras - estado vazio de Dispositivos e o rótulo de conexão"
---

# S34-19 - Câmeras - Cadastro - Estado vazio de Dispositivos e o rótulo de conexão

Três issues do mesmo bloco de tela: a grade de Dispositivos de uma organização sem nenhuma câmera
cadastrada. A 1860 e a 4063 descreviam o mesmo estado vazio de dois ângulos e fecharam juntas, como o
escopo previa; a 1868 entrou por tocar a mesma grade. Fecha as três.

## O que estava errado

Os botões "Importar Dados" e "Modelo CSV" do estado vazio estavam congelados com a dica "Em breve",
porque a spec da grade nasceu antes do fluxo de importação existir, e ninguém voltou para ligá-los
quando ele chegou. O bloco vazio divergia do Figma: busca desabilitada sem contorno, o botão de câmera
duplicado no toolbar, a frase de ajuda quebrada em duas linhas e o título em 18px em vez de 14px. E no
espanhol duas colunas se chamavam "Estado", porque a chave da coluna de conexão repetia o rótulo da de
ciclo de vida.

## O que muda

"Importar Dados" abre o painel de criação direto no seletor do envio em massa, e "Modelo CSV" baixa o
modelo pelo mesmo serviço que o botão do primeiro passo do painel usa, extraído para as duas entradas
salvarem o mesmo arquivo com o mesmo nome. O botão de câmera do toolbar some enquanto a grade está
vazia, e o foco, ao fechar o painel, vai para o botão do centro em vez de cair no corpo da página. O
componente de estado vazio ganhou um degrau intermediário de tamanho, usado pelos quatro vazios da
grade, e a busca travada volta a ter contorno. A coluna de conexão passou a se chamar "Conexão",
"Connection", "Conexión" e "Connessione", e um teste novo recusa dois rótulos iguais de coluna dentro
do mesmo idioma, caso que a checagem de paridade entre idiomas não pegava.

## O que tem de valer no fim

No estado vazio, os dois elementos fazem o que o rótulo promete, o bloco segue o Figma, e nenhum idioma
mostra duas colunas com o mesmo nome.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
- [[S34-17 - Câmeras - Cadastro - Importação em lote só com CSV e XLSX]], a outra task da importação em lote nesta semana.
