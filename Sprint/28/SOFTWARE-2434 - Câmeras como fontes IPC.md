---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2434
clickup: https://app.clickup.com/t/86ajycf3k
titulo: "[Back] Videowall externo: a tela espelhada como fonte do painel"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: fila da Sprint 28 (to do no ClickUp). Reescopado em 13/08 pelo replanejamento do 2201: era publicar câmeras como fontes IPC, e passou a ser publicar o caminho do espelho como fonte única. Em 14/08 ficou restrito ao modo espelho: as fontes de câmera da projeção nativa vão para um card novo.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2434 - A tela espelhada como fonte do painel

Prepara o caminho por onde a tela do operador trafega, registra esse caminho no equipamento como a fonte
única do painel e aponta a camada em tela cheia para ela.

> [!info] Revisão de 14/08: este card fica com o espelho, e a projeção nativa nasce em card novo
> Com os dois modos de exibição, este card continua sendo a fonte do **modo espelho**, uma por processador,
> como o replanejamento de 13/08 deixou. As fontes de câmera do modo de projeção nativa, que são uma por
> câmera projetada e também servidas pela plataforma, são entrega de um card novo a criar. A atômica antiga
> de publicar câmera como fonte IPC, que puxava direto da câmera, voltou ao repositório com `superseded`
> apontando para a substituta, em vez de deletada.

> [!warning] Reescopado em 13/08
> O escopo anterior era publicar as câmeras do Attlas como fontes que o H9 puxava direto por RTSP. Com o
> replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]], a parede passou a
> exibir a tela da aplicação, então fonte por câmera deixou de existir. O card fica com o mesmo lugar na
> escada de dependências e troca de conteúdo, porque a fonte do espelho ocupa exatamente o lugar que a
> fonte por câmera ocupava. A atômica `INT-013` foi deletada e substituída pela `INT-016`.

## Escopo (1 PR)

Criar o caminho de ingestão no MediaMTX que já serve o pipeline de HLS deste serviço, devolver o endereço
de publicação, registrar esse caminho no equipamento como fonte (`ipc/create`, `ipc/update`, `ipc/delete`,
uma por processador e não uma por câmera) e apontar a camada em tela cheia para ela (`layer/add`,
`layer/setInfo`, `layer/changeSource`).

Três regras que são o conteúdo real do card:

1. **O caminho de ingestão nasce antes de o equipamento ser mandado puxar dele.** Na ordem inversa o
   equipamento tenta puxar de um caminho que ainda não aceita publicação e registra falha de fonte na
   primeira tentativa. O custo de acertar a ordem é zero e o de errar aparece só em campo, então tem teste
   de ordem.
2. **H.264 fixado na oferta, e publicação fora do que o card aceita é recusada, nunca transcodificada.**
   Transcodificar por sessão é o único jeito de o custo de CPU desta frente crescer sem ninguém decidir.
3. **O endereço do caminho é o segredo do card.** Quem o alcança vê a tela de um operador. Nome não
   adivinhável, leitura restrita ao equipamento, e fora de log, métrica e de toda resposta que não seja a
   da tomada. A configuração atual do MediaMTX concede leitura sem autenticação na rede interna, o que é
   aceitável para câmera e não é aqui, e fechar isso é entrega deste card.

## DoD

Fonte única registrada e reaproveitada entre tomadas, camada em tela cheia apontada para ela, ordem provada
por teste, codec fora do aceito recusado, e caminho removido quando a escrita no equipamento falha.

## Dependência

[[SOFTWARE-2432 - Cadastro do processador H9|2432]] e
[[SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API|2433]].

## Referências

- [[Videowall externo (NovaStar H9)]] e [[Pesquisa - transporte do espelhamento de tela]].
- [[Attlas - Sprint 28]].
