---
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - frontend
titulo: "[Full] Analítico - 409 do tratamento, releitura da fila, ATSPM sem vínculo e ir até a câmera"
frente: Analítico
tamanho: 3 pts
pr: "#3932"
status: "PR #3932 mergeada em 23/09 às 13h37, aprovada por dois revisores e com as 23 threads de review resolvidas. Aberta em 18/09, na Sprint 33, era o único resíduo da semana anterior."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Analítico - 409 do tratamento, releitura da fila e ATSPM sem vínculo

Resíduo da [[Attlas - Sprint 33]], fechado nesta semana. São cinco correções das telas de Incidentes
e de Métricas do Analítico, todas levantadas em uso no `dev2`, mais a infraestrutura local do
connector do Laço Virtual, declarada no corpo da PR depois do review.

> [!warning] Estado em 23/09: a versão anterior desta nota descrevia mal o 409
> Ela dizia que o conflito vinha de tratar um incidente que outro operador já tinha tratado. Não é
> isso: o menu da linha oferecia "Descartar" também para incidente em estado terminal, e o servidor
> recusava a transição, como deve. Também eram cinco correções, não quatro.

## O que a PR entrega

1. **O 409 ao tratar incidente.** O menu da linha da fila oferecia todas as ações para toda linha, e
   "Descartar" a partir de um estado terminal recebe 409 do servidor, corretamente. As ações passam a
   sair da mesma tabela de próximos estados que os botões de tratamento, o editor de status e a
   página de detalhe já usavam. O backend não mudou.
2. **A releitura da fila inteira a cada troca de status.** A linha passa a receber o status que o
   servidor confirmou na resposta da escrita, o que não é atualização otimista. A fila só é relida
   quando a transição tira o incidente do filtro de status em vigor, e deixa de jogar fora o que o
   "carregar mais" já tinha empilhado.
3. **A lista de vínculos relida no ritmo dos eventos da câmera.** O vínculo é configuração e viajava
   junto da série, que muda o tempo todo. A lista passa a ser cacheada por câmera no próprio serviço,
   compartilhada entre Métricas e Detecção; as escritas de vínculo derrubam a entrada e falha não fica
   no cache.
4. **A face de ATSPM vazia sem dizer por quê.** Câmera sem vínculo ganha estado próprio, com a saída
   para a Detecção, na mesma forma que a face do Laço Virtual já tinha, e detector de que o histórico
   nunca ouviu lê como janela vazia, não como falha. Isto não enche os gráficos do `dev2`: lá o que
   falta é vínculo de região embarcada, e a tela passou a dizer isso em vez de parecer quebrada.
5. **"Ir até a câmera" abrindo guia nova e caindo no login.** Vira navegação na mesma aba, fechando o
   diálogo antes, porque é o fechamento dele que devolve a sessão de stream ao servidor.

A infraestrutura que veio junto é o serviço `ms-connector-virtual-loop` e o Redis dele no
`docker-compose.yml` e no `setup-env.sh`. Cinco commits da branch ficaram sem o rodapé `Spec:`, e a
pendência foi assumida na própria PR em vez de reescrever histórico com PR aberta.

## Relacionado

- [[Attlas - Sprint 33]], a sprint de origem.
- [[Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes]], a frente de telas de que esta PR saiu.
- [[Analítico - Tela de Métricas no web-attlas]].
