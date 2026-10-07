---
tags:
  - attlas
  - sprint-35
  - moc
  - cameras
  - analitico
  - infraestrutura
aliases:
  - "Attlas - Sprint 35"
  - "Sprint 35 - o que entrega"
sprint: Sprint 35 (28/9/26 - 4/10/26)
status: "FECHADA em 04/10 com 48 PRs mergeadas em 31 tasks e as 19 issues que elas atacavam fechadas em 29/09. Uma entrega foi revertida no dia seguinte (S35-19), e o plano da pipeline de CI e CD (S35-31) segue aberto em rascunho. Sete PRs abertas nesta semana foram mergeadas na Sprint 36."
atualizado: 2026-10-07
---

# Sprint 35 - o que entrega

Porta de entrada da semana de **28/09 a 04/10**. A semana não teve planejamento prévio no vault: esta
nota foi montada em 07/10, a partir das PRs do GitHub e dos reports diários.

> [!info] Nenhuma task desta semana tem card no ClickUp
> A lista "Sprint 35 (28/9/26 - 4/10/26)" do ClickUp só tem cards de Hellius e DER-DF, de outras pessoas,
> e nenhum card com a tag `squad 2` ou atribuído ao Afonso. Por isso as tasks abaixo são grupos de PRs da
> mesma entrega, e a coluna Pts fica vazia.

## O que a semana entregou

**48 PRs mergeadas e 19 issues fechadas.** As frentes:

- **Issues abertas, em 29/09.** Dezenove PRs, uma por issue, fecharam as 19 issues no mesmo dia: botões,
  ícones e máscaras em Dispositivos, preset e automação, detalhe do evento, permissões com tooltip,
  marcadores de Incidentes, Desfazer e camada Interseções na Detecção, cadastro manual de analítico, o
  vínculo de laço com o id do Detector, o deploy do dev.v2, os logs no Loki e o guard único das rotas
  internas.
- **Analítico.** O vínculo das câmeras com a Neural Labs pelo nome e pela lista do equipamento (S35-07); as
  Métricas mostrando o que a câmera embarcada mede, leves e com o ATSPM em cache (S35-21 e S35-25); o
  feedback de teste em Incidentes, criticidade, regiões e ACOM (S35-20); e a caixa da Detecção estável com
  Kalman, com cards de métricas avançadas e visão salva por câmera (S35-30). O novo desenho da caixa e das
  faixas entrou em 29/09 e foi revertido em 30/09 por ser esboço (S35-19).
- **Câmeras.** Substituição de câmera pelo estoque, que nunca tinha funcionado (S35-23); o monitor de
  saúde que parava de reconectar (S35-22); o dashboard com banda e disponibilidade reais (S35-27); o
  NovaStar H9 pela Open API oficial (S35-29); a rotação dos grupos salvos e o Espelhar no estado atual do
  painel (S35-24 e S35-04).
- **Infraestrutura.** O deploy do dev.v2 com a imagem certa e sem env faltando (S35-12), os logs no Grafana
  com Loki (S35-16), o review do @claude no runner próprio e o build com 8 GiB (S35-03), e o plano da
  pipeline de CI e CD por serviço, ainda aberto (S35-31).

## As tasks da semana

Uma linha por task, uma nota por linha, na ordem do primeiro merge. As datas de merge estão no horário de
Brasília.

| ID | Task (1 task = 1 ou mais PRs) | Natureza | Pts | PRs | Estado |
| --- | --- | --- | --- | --- | --- |
| S35-01 | [[S35-01 - Câmeras - Detalhe da câmera - O cabeçalho de todas as telas no recuo de 24 px\|O cabeçalho de todas as telas no recuo de 24 px]] | `[Front]` | - | #4988 | **feita**, mergeada (28/09) |
| S35-02 | [[S35-02 - Câmeras - VMS - Grupo com câmera aposentada volta a salvar\|Grupo do VMS com câmera aposentada volta a salvar]] | `[Full]` | - | #4989 | **feita**, mergeada (28/09) |
| S35-03 | [[S35-03 - Infraestrutura - CI - O review automático no runner próprio e o build do web-attlas com 8 GiB\|O review do @claude no runner próprio e o build do web-attlas com 8 GiB]] | `[Infra]` | - | #4991, #5419 | **feita**, mergeadas (28/09 e 30/09) |
| S35-04 | [[S35-04 - Câmeras - Videowall - O Espelhar abre no estado atual do painel\|O Espelhar abre no estado atual do painel]] | `[Front]` | - | #4994 | **feita**, mergeada (28/09) |
| S35-05 | [[S35-05 - Analítico - Detecção - A linha do laço da DEMO, a caixa no vídeo do incidente e as duas mãos da via\|A linha do laço da DEMO, a caixa no vídeo do incidente e as duas mãos da via]] | `[Full]` | - | #4990, #5109 | **feita**, mergeadas (28/09 e 29/09) |
| S35-06 | [[S35-06 - Analítico - Detecção - O quadro pedido junto da configuração e o botão flutuante só por clique\|O quadro pedido junto da configuração e o botão flutuante só por clique]] | `[Front]` | - | #5099, #5127 | **feita**, mergeadas (29/09) |
| S35-07 | [[S35-07 - Analítico - Neural Labs - Vínculo das câmeras pelo nome e pela lista do equipamento\|Vínculo das câmeras com a Neural Labs pelo nome e pela lista do equipamento]] | `[Full]` | - | #5075, #5225, #5409 | **feita**, mergeadas (29/09 e 30/09) |
| S35-08 | [[S35-08 - Câmeras - Cadastro - Botões, ícones e máscara de IP em Dispositivos\|Botões, ícones e máscara de IP em Dispositivos]] | `[Front]` | - | #5137, #5141, #5142, #5144 | **feita**, mergeadas (29/09); fecham 4878, 4351, 4966 e 4967 |
| S35-09 | [[S35-09 - Analítico - Incidentes - Marcador Não reconhecido e o selo de três dígitos\|Marcador "Não reconhecido" e o selo de três dígitos]] | `[Front]` | - | #5140, #5146 | **feita**, mergeadas (29/09); fecham 4963 e 4965 |
| S35-10 | [[S35-10 - Analítico - Detecção - Desfazer por passo, camada Interseções e um só botão de limpar\|Desfazer por passo, camada Interseções e um só botão de limpar]] | `[Full]` | - | #5143, #5147, #5163 | **feita**, mergeadas (29/09); fecham 4691, 4690 e 4954 |
| S35-11 | [[S35-11 - Câmeras - PTZ e presets - Preset e automação com obrigatórios e erro que nomeia o campo\|Preset e automação com obrigatórios e erro que nomeia o campo]] | `[Front]` | - | #5148, #5154 | **feita**, mergeadas (29/09); fecham 4328 e 4326 |
| S35-12 | [[S35-12 - Infraestrutura - Ambientes - Deploy do dev.v2 com a imagem certa e sem env faltando\|Deploy do dev.v2 com a imagem certa e sem env faltando]] | `[Infra]` | - | #5151, #5152 | **feita**, mergeadas (29/09); fecham 3608 e 3609 |
| S35-13 | [[S35-13 - Analítico - Instâncias - Cadastro manual de analítico com obrigatórios e endereço validado\|Cadastro manual de analítico com obrigatórios e endereço validado]] | `[Front]` | - | #5155 | **feita**, mergeada (29/09); fecha 4955 |
| S35-14 | [[S35-14 - Câmeras - Eventos, incidentes e alarmes - Detalhe do evento sem variável crua e com o pino em azul\|Detalhe do evento sem variável crua e com o pino em azul]] | `[Front]` | - | #5156 | **feita**, mergeada (29/09); fecha 4915 |
| S35-15 | [[S35-15 - Infraestrutura - Autenticação interna - Um guard só para as rotas internas\|Um guard só para as rotas internas]] | `[Back]` | - | #5157 | **feita**, mergeada (29/09); fecha 3375 |
| S35-16 | [[S35-16 - Infraestrutura - Observabilidade - Logs no Grafana com Loki\|Logs no Grafana com Loki]] | `[Infra]` | - | #5158 | **feita**, mergeada (29/09); fecha 4997 |
| S35-17 | [[S35-17 - Câmeras - Permissões - Controles sem permissão bloqueados com tooltip\|Controles sem permissão bloqueados com tooltip]] | `[Front]` | - | #5166 | **feita**, mergeada (29/09); fecha 4741 |
| S35-18 | [[S35-18 - Analítico - Laço virtual - O vínculo guarda o id do Detector do modelo de tráfego\|O vínculo de laço guarda o id do Detector do modelo de tráfego]] | `[Full]` | - | #5167 | **feita**, mergeada (29/09); fecha 4350 |
| S35-19 | [[S35-19 - Analítico - Detecção - Caixa em sólido e regiões em faixa, revertidas por serem esboço\|Caixa em sólido e regiões em faixa, revertidas por serem esboço]] | `[Full]` | - | #5187, #5306, #5307 | **revertida**: #5187 mergeada (29/09) e desfeita pela #5306 (30/09); #5307 fechada sem merge (05/10) |
| S35-20 | [[S35-20 - Analítico - Incidentes - Feedback de teste em Incidentes, criticidade, Métricas, regiões e ACOM\|Feedback de teste em Incidentes, criticidade, Métricas, regiões e ACOM]] | `[Full]` | - | #5259 | **feita**, mergeada (29/09) |
| S35-21 | [[S35-21 - Analítico - Métricas - As Métricas abrem leves e mostram o que a câmera mede\|As Métricas abrem leves e mostram o que a câmera mede]] | `[Full]` | - | #5273, #5331 | **feita**, mergeadas (29/09 e 30/09) |
| S35-22 | [[S35-22 - Câmeras - Saúde e monitoramento - O monitor de saúde volta a reconectar\|O monitor de saúde volta a reconectar]] | `[Back]` | - | #5305 | **feita**, mergeada (30/09) |
| S35-23 | [[S35-23 - Câmeras - Cadastro - Substituição pelo estoque e os bugs do cadastro, edição e lista\|Substituição pelo estoque e os bugs do cadastro, edição e lista]] | `[Full]` | - | #5420 | **feita**, mergeada (30/09) |
| S35-24 | [[S35-24 - Câmeras - Videowall - Rotação dos grupos salvos no painel\|Rotação dos grupos salvos no painel]] | `[Front]` | - | #5429 | **feita**, mergeada (30/09) |
| S35-25 | [[S35-25 - Analítico - Métricas - ATSPM instantâneo, telemetria de toda câmera e embarcado vinculado no cadastro\|ATSPM instantâneo, telemetria de toda câmera e embarcado vinculado no cadastro]] | `[Full]` | - | #5479 | **feita**, mergeada (30/09) |
| S35-26 | [[S35-26 - Câmeras - Streaming - Perfis derivados da Axis a 30 fps\|Perfis derivados da Axis a 30 fps]] | `[Back]` | - | #5495 | **feita**, mergeada (30/09) |
| S35-27 | [[S35-27 - Câmeras - Dashboard - Banda, disponibilidade e vínculo de detector com números reais\|Banda, disponibilidade e vínculo de detector com números reais]] | `[Full]` | - | #5526 | **feita**, mergeada (01/10) |
| S35-28 | [[S35-28 - Analítico - Detecção - Badges da Detecção com o vídeo pausado\|Badges da Detecção com o vídeo pausado]] | `[Front]` | - | #5531 | **feita**, mergeada (01/10) |
| S35-29 | [[S35-29 - Câmeras - Videowall - NovaStar H9 pela Open API oficial\|NovaStar H9 pela Open API oficial]] | `[Back]` | - | #5584, #5586, #5589 | **feita**, mergeadas (01/10) |
| S35-30 | [[S35-30 - Analítico - Detecção - Caixa estável com Kalman, cards de métricas e visão salva por câmera\|Caixa estável com Kalman, cards de métricas e visão salva por câmera]] | `[Full]` | - | #5576, #5765 | **feita**, mergeadas (02/10) |
| S35-31 | [[S35-31 - Infraestrutura - CI - Plano da pipeline de CI e CD por serviço\|Plano da pipeline de CI e CD por serviço]] | `[Infra]` | - | #5666 | **aberta**, rascunho com pedido de mudança |

**29 de 31 tasks feitas.** A S35-19 foi revertida e está fora da develop, e a S35-31 segue aberta.

### PRs abertas nesta semana e mergeadas na Sprint 36

| PR | Task |
| --- | --- |
| #5662, #5664 | [[S36-04 - Analítico - Detecção - Escala da caixa estável sobre o Kalman\|S36-04]], abertas em 01/10 |
| #5740, #5742 | [[S36-01 - Analítico - Incidentes - Um só botão de limpar e marcadores que mantêm o total\|S36-01]], abertas em 02/10 |
| #5741 | [[S36-02 - Câmeras - Detalhe da câmera - Câmera inexistente mostra só o erro\|S36-02]], aberta em 02/10 |
| #5743 | [[S36-03 - Câmeras - Eventos, incidentes e alarmes - Colunas, visualização e data da tela de Eventos\|S36-03]], aberta em 02/10 |
| #5757 | [[S36-05 - Câmeras - PTZ e presets - A automação de presets sobrevive a restart\|S36-05]], aberta em 02/10 |

## Fontes

- GitHub: PRs do autor `afonsoburginski` criadas ou mergeadas entre 28/09 e 04/10, e as issues que elas
  fecham.
- ClickUp: lista "Sprint 35 (28/9/26 - 4/10/26)", sem card do squad 2.
- Reports diários: [[2026-09-28]], [[2026-09-29]], [[2026-09-30]], [[2026-10-01]] e [[2026-10-02]].
- [[Attlas - Sprint 34]], a semana anterior, e [[Attlas - Sprint 36]], a seguinte.
