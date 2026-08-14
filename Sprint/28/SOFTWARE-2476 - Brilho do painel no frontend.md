---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2476
clickup: https://app.clickup.com/t/86ajyp9yf
titulo: "[Front] Videowall externo: brilho do painel"
frente: Videowall externo (NovaStar H9)
tamanho: 1 pt
status: backlog na Sprint 28. Front; execução pelo dev de backend só com confirmação.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-13
---

# SOFTWARE-2476 - Brilho do painel no frontend

> [!warning] Superfície revisada em 13/08: a rota de configuração morreu
> A rota `/cameras/vms/videowall` com abas virou um **dialog compartilhado** aberto pelo lançador radial
> sobre o mosaico, com quatro views: espelhar, processador, brilho e estado. Este card passa a entregar a view de brilho dentro do dialog. O conteúdo não muda: faixa vinda do equipamento, um envio por gesto. Spec: `UF-029`.

Aba de brilho: ajuste dentro da faixa que o equipamento aceita, com o valor vigente observável.

É a aba menor da frente, e a que mais fácil se escreve errado por hábito, porque a solução preguiçosa é um
controle de zero a cem que sempre parece funcionar.

## Três regras

**Zero a cem é palpite.** A faixa é dado do equipamento. Enquanto não puder ser lida, o controle fica
atenuado com o motivo, em vez de assumir intervalo e enviar valor que o equipamento recusaria, o que o
operador leria como defeito da plataforma. É por isso que a aba é card próprio: o comportamento correto
quando a faixa é desconhecida é metade do trabalho.

**Um envio por gesto, no fim do gesto.** Durante o arraste a tela mostra o valor pendente e não envia
nada. Debounce por tempo foi recusado, porque com debounce um arraste longo ainda envia valores
intermediários que ninguém pediu e o brilho da parede oscila durante o ajuste.

**Três valores, distintos na tela**: o último confirmado pelo equipamento, o pendente durante o gesto, e o
enviado esperando resposta. Sem essa distinção, um envio que falha deixaria a tela afirmando um brilho que
a parede não tem.

Brilho é a única escrita idempotente da frente, e por isso o tratamento de falha aqui difere: volta ao
último valor confirmado e oferece o gesto de novo, em vez do estado de resultado desconhecido das outras
abas. Ainda assim não existe reenvio automático, porque a regra vale para a frente inteira e um retry aqui
abriria precedente.

Vale saber que o brilho é capacidade marcada como presumida a partir das notas de versão do firmware,
então recusa por capacidade não verificada é o caminho mais provável antes do primeiro contato com o
equipamento. A aba precisa ser boa nesse estado, não só no estado feliz.

## DoD

Nenhum intervalo default no componente, um arraste completo gerando exatamente uma requisição, e falha
devolvendo o controle ao último valor confirmado.

## Dependência

[[SOFTWARE-2437 - Tela do processador de videowall|2437]] e
[[SOFTWARE-2436 - Brilho e estado observável|2436]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
