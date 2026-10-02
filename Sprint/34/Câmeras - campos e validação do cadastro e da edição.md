---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - campos e validação do cadastro e da edição de câmera"
frente: Câmeras
tamanho: 5 pts
pr: "#4173"
issues: "#1866, #1877, #3029"
status: "Feita. PR #4173 mergeada na develop em 22/09, fechando as issues 1866, 1877 e 3029."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Câmeras - campos e validação do cadastro e da edição

Três correções nos campos do cadastro e da edição de câmera. A 1877 estava marcada para reproduzir
antes de estimar, porque a tela tinha mudado desde a abertura da issue; reproduziu, e a causa era
outra. Fecha as três.

## O que estava errado

No cadastro, excluir a "Câmera 01" vazia fazia a "Câmera 02" preenchida acusar campo obrigatório. O
formulário reconciliava a lista de grupos pelo comprimento e, quando ela encolhia, removia o último:
apagava o grupo preenchido do segundo cartão e deixava o grupo vazio do primeiro no lugar dele. Na
edição, o "IP Local" aceitava `11`, porque usava o padrão do contrato, que também admite uma sequência
hexadecimal curta como IPv6 simplificado, enquanto o cadastro já usava o validador de IPv4
compartilhado. E o campo de busca de endereço, que a issue chama de "Buscar direção", era um atalho
deliberado da spec, um botão vazio com a dica "Em breve", embora o componente compartilhado de
busca de endereço já servisse PMV, controladores e organização.

## O que muda

A lista de grupos do formulário passa a ser alinhada pelo identificador de cada cartão, preservando
valor, toque e edição de quem sobrevive. A edição passa a usar o mesmo validador de IPv4 do cadastro;
o contrato de câmeras ficou intocado, porque estreitá-lo altera a API e pede PR própria. A edição e o
modal de localização passam a usar a busca de endereço compartilhada, como as telas de PMV: escolher
uma sugestão move o pino e preenche latitude e longitude pelo mesmo caminho do arraste, e o endereço
reescrito pela geocodificação reversa não arma o botão de salvar sozinho.

## O que tem de valer no fim

Excluir um cartão não deixa validação órfã nos outros, a edição recusa o que o cadastro recusa, e
digitar um endereço mostra sugestões que posicionam a câmera no mapa.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
- [[Câmeras - navegação do cadastro e o dropdown de Modelo]], a outra task do cadastro nesta semana.
