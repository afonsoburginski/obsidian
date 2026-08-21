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
status: Closed em 18/08. As duas PRs empilhadas mergearam: [#1659](https://github.com/atmanadmin/attlas-2026/pull/1659) em 17/08 (colunas mirrorSourceId/mirrorLayerId, repositório, payloads presumidos) e [#1661](https://github.com/atmanadmin/attlas-2026/pull/1661) em 18/08 (adaptador NovastarVideowallMirrorEquipmentPort real no lugar do no-op, leitura autenticada do H9 no mediamtx via usuário estático, enforcement de H.264 por poll+kick, testes de integração contra fake mediamtx + fake H9). As duas pendências sinalizadas nas PRs entraram na develop e continuam a cobrar: a migration foi escrita à mão (sem Postgres local para rodar o CLI) e a credencial do leitor não está propagada por `docker-compose.yml`/`setup-env.sh` para o container do mediamtx, só o `.env.example` documenta as envs novas.
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
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
