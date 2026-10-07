---
tags:
  - attlas
  - sprint-36
  - moc
  - cameras
  - analitico
  - infraestrutura
aliases:
  - "Attlas - Sprint 36"
  - "Sprint 36 - o que entrega"
sprint: Sprint 36 (5/10/26 - 11/10/26)
status: "ABERTA em 05/10. Em 07/10 de manhã: 21 PRs mergeadas em 16 tasks, 14 delas com todas as PRs mergeadas, e duas PRs abertas (#6146 e #6147). Seis issues fechadas; a #5469 foi fechada em 05/10 e reaberta pelo QA em 06/10."
atualizado: 2026-10-07
---

# Sprint 36 - o que entrega

Porta de entrada da semana de **05 a 11/10**, a semana corrente. Esta nota foi montada em 07/10, a partir
das PRs do GitHub e dos reports diários, e reflete o estado da manhã de 07/10.

> [!info] Nenhuma task desta semana tem card no ClickUp
> A lista "Sprint 36 (5/10/26 - 11/10/26)" do ClickUp só tem cards de Hellius, de outra pessoa, e nenhum
> card com a tag `squad 2` ou atribuído ao Afonso. Por isso as tasks abaixo são grupos de PRs da mesma
> entrega, e a coluna Pts fica vazia.

## O que a semana entrega

**Até 07/10 de manhã: 21 PRs mergeadas e 2 abertas.** Sete das 21 foram abertas na Sprint 35. As frentes:

- **Telas de Câmeras e issues do QA.** A tela de Eventos com Câmera, Área e Subárea, a visualização do
  protótipo e a data com "às" (S36-03); o Log de Eventos com o estado vazio certo e a busca pela descrição
  traduzida (S36-13); o código de incidente que abre o Analítico (S36-12); a câmera inexistente que mostra
  só o erro (S36-02); o detalhe da câmera alinhado ao Figma, com o PTZ obedecendo ao toque (S36-10); e os
  rótulos dos Perfis de Mídia (S36-15).
- **Vídeo.** O realce de imagem no player com o indicador do realce automático (S36-08) e o AV1 nativo da
  câmera, atrás de flag desligada (S36-07).
- **Analítico.** O cadastro da Neural Labs pela tela, com o socket pronto para o equipamento real (S36-09);
  a escala da caixa da Detecção estável sobre o Kalman (S36-04); os marcadores de criticidade e a busca de
  Incidentes (S36-01); e o primeiro passo da separação do analítico entre serviços, ainda aberto (S36-16).
- **Câmeras, backend.** A automação de presets que sobrevive a restart (S36-05) e a câmera sem perfil de
  stream reprovisionada ao corrigir o endereço (S36-11).
- **Infraestrutura.** Os arquivos de ambiente padronizados, com o fim dos backups com segredo ainda aberto
  (S36-14), e o documento do que a borda na frente do Kong precisa para os streams de tempo real de Quito
  (S36-06).

## As tasks da semana

Uma linha por task, uma nota por linha, na ordem do primeiro merge. As datas de merge estão no horário de
Brasília.

| ID | Task (1 task = 1 ou mais PRs) | Natureza | Pts | PRs | Estado |
| --- | --- | --- | --- | --- | --- |
| S36-01 | [[S36-01 - Analítico - Incidentes - Um só botão de limpar e marcadores que mantêm o total\|Um só botão de limpar e marcadores de criticidade que mantêm o total]] | `[Front]` | - | #5740, #5742 | **feita**, mergeadas (05/10); fecham 5255 e 5257 |
| S36-02 | [[S36-02 - Câmeras - Detalhe da câmera - Câmera inexistente mostra só o erro\|Câmera inexistente mostra só o erro]] | `[Front]` | - | #5741 | mergeada (05/10); a issue 5469 foi reaberta pelo QA em 06/10 |
| S36-03 | [[S36-03 - Câmeras - Eventos, incidentes e alarmes - Colunas, visualização e data da tela de Eventos\|Colunas, visualização e data da tela de Eventos]] | `[Front]` | - | #5743, #5846, #6004 | **feita**, mergeadas (05/10 e 06/10); fecham 1875 e 5999 |
| S36-04 | [[S36-04 - Analítico - Detecção - Escala da caixa estável sobre o Kalman\|Escala da caixa estável sobre o Kalman]] | `[Front]` | - | #5662, #5664 | **feita**, mergeadas (05/10 e 06/10) |
| S36-05 | [[S36-05 - Câmeras - PTZ e presets - A automação de presets sobrevive a restart\|A automação de presets sobrevive a restart]] | `[Back]` | - | #5757 | **feita**, mergeada (05/10) |
| S36-06 | [[S36-06 - Infraestrutura - Ambientes - A borda na frente do Kong para os streams de tempo real\|A borda na frente do Kong para os streams de tempo real]] | `[Infra]` | - | #5853 | mergeada (05/10); a issue 5808 segue aberta |
| S36-07 | [[S36-07 - Câmeras - Streaming - AV1 nativo da câmera no ao vivo\|AV1 nativo da câmera no ao vivo]] | `[Full]` | - | #5879 | **feita**, mergeada (05/10), atrás de flag desligada |
| S36-08 | [[S36-08 - Câmeras - Streaming - Realce de imagem no player e o indicador do realce automático\|Realce de imagem no player e o indicador do realce automático]] | `[Front]` | - | #4280, #5913 | **feita**, mergeadas (05/10 e 06/10) |
| S36-09 | [[S36-09 - Analítico - Neural Labs - Cadastro pela tela e socket pronto para o equipamento real\|Cadastro da Neural Labs pela tela e socket pronto para o equipamento real]] | `[Full]` | - | #5990 | **feita**, mergeada (06/10) |
| S36-10 | [[S36-10 - Câmeras - Detalhe da câmera - Detalhe alinhado ao Figma e PTZ que obedece ao toque\|Detalhe alinhado ao Figma e PTZ que obedece ao toque]] | `[Full]` | - | #5920 | **feita**, mergeada (06/10) |
| S36-11 | [[S36-11 - Câmeras - Cadastro - Câmera sem perfil de stream reprovisionada ao corrigir o endereço\|Câmera sem perfil de stream reprovisionada ao corrigir o endereço]] | `[Back]` | - | #5997 | **feita**, mergeada (06/10) |
| S36-12 | [[S36-12 - Câmeras - Eventos, incidentes e alarmes - Código de incidente nos acionamentos abre o Analítico\|Código de incidente nos acionamentos abre o Analítico]] | `[Front]` | - | #6003 | **feita**, mergeada (06/10) |
| S36-13 | [[S36-13 - Câmeras - Eventos, incidentes e alarmes - Log de Eventos com o estado vazio certo e a busca pela descrição\|Log de Eventos com o estado vazio certo e a busca pela descrição]] | `[Full]` | - | #6001, #6009 | **feita**, mergeadas (06/10 e 07/10); fecham 5988 e 5978 |
| S36-14 | [[S36-14 - Infraestrutura - Ambientes - Arquivos de ambiente padronizados e sem backup com segredo\|Arquivos de ambiente padronizados e sem backup com segredo]] | `[Infra]` | - | #5998, #6146 | #5998 mergeada (06/10); #6146 aberta |
| S36-15 | [[S36-15 - Câmeras - Detalhe da câmera - Rótulos dos Perfis de Mídia e ajuda no token da origem\|Rótulos dos Perfis de Mídia e ajuda no token da origem]] | `[Front]` | - | #6006 | mergeada (07/10); atende parte da issue 5977, que segue aberta |
| S36-16 | [[S36-16 - Analítico - Separação de serviços - O ms-video-analytics sem as sobras do pipeline removido\|O ms-video-analytics sem as sobras do pipeline removido]] | `[Back]` | - | #6147 | **aberta**, sem review |

**14 de 16 tasks com todas as PRs mergeadas.** A S36-14 tem uma de duas, e a S36-16 está aberta. Das
issues que as PRs atacam, seis estão fechadas (1875, 5255, 5257, 5978, 5988 e 5999); a 5469 foi reaberta
pelo QA, e a 5808 e a 5977 seguem abertas, atendidas em parte.

## Fontes

- GitHub: PRs do autor `afonsoburginski` criadas ou mergeadas a partir de 05/10, e as issues que elas
  fecham.
- ClickUp: lista "Sprint 36 (5/10/26 - 11/10/26)", sem card do squad 2.
- Reports diários: [[2026-10-05]], [[2026-10-06]] e [[2026-10-07]].
- [[Attlas - Sprint 35]], a semana anterior.
