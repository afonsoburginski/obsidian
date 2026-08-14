---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2472
clickup: https://app.clickup.com/t/86ajyp9kb
titulo: "[Front] Videowall externo: cadastro do processador"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: backlog na Sprint 28. Front; execução pelo dev de backend só com confirmação.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-13
---

# SOFTWARE-2472 - Cadastro do processador no frontend

> [!warning] Superfície revisada em 13/08: a rota de configuração morreu
> A rota `/cameras/vms/videowall` com abas virou um **dialog compartilhado** aberto pelo lançador radial
> sobre o mosaico, com quatro views: espelhar, processador, brilho e estado. Este card passa a entregar a view de processador dentro do dialog; o formulário entregue na PR #1529 é reaproveitado sem fork, e a page e a rota saem no card da casca (2437). Spec: `UF-025`.

Aba de processador da configuração: nome, endereço de rede, porta, modelo, resolução do painel e
credencial, mais a declaração de quais sistemas podem projetar naquele painel.

É a porta de entrada de toda a frente. Enquanto ela não é usada, as outras cinco abas ficam
desabilitadas.

## O que precisa de cuidado

**A credencial é somente escrita, e o formulário tem de ser desenhado para isso.** Em cadastro os dois
campos são obrigatórios; em edição aparecem vazios com o rótulo dizendo que o valor atual permanece se
nada for digitado; depois do envio bem-sucedido são limpos e o valor não fica em nenhum signal nem em
armazenamento do browser. O raio de dano de uma chave vazada é o mural inteiro da sala de controle.

**A resolução é declarada pelo operador**, porque lê-la do equipamento é capacidade ainda não confirmada.
O campo carrega texto de ajuda explicando que ela é o que a projeção usa, senão lê como burocracia.

**Não existe exclusão de processador**, porque o backend não tem exclusão nem exclusão lógica nessa
tabela, que é justamente o que permite a unicidade simples de endereço e porta. Trocar de equipamento é
editar o cadastro. Isso está escrito na spec de propósito, porque um botão de excluir é o tipo de coisa
que se acrescenta por simetria com outras telas de cadastro.

**A unicidade não é validada no cliente.** O frontend não tem a lista de processadores, e adivinhar
produziria falso negativo. Quem decide é o servidor, e a tela traduz o conflito nos dois campos.

## DoD

Cadastro conclui com o equipamento desligado, sem nenhuma tentativa de conexão. Nenhuma resposta exibe a
chave, e o identificador aparece mascarado. Gestos de escrita atenuados com o motivo para quem não tem
autoridade administrativa, nunca escondidos.

## Dependência

[[SOFTWARE-2437 - Tela do processador de videowall|2437]] e
[[SOFTWARE-2432 - Cadastro do processador H9|2432]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
