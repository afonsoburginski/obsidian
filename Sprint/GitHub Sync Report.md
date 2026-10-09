---
tags:
  - attlas
  - github-sync
  - sprint-36
aliases:
  - "GitHub Sync"
atualizado: 2026-10-09
banner: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=1200"
---

# GitHub Sync Report

Última sincronização: **2026-10-09 19:14**
Sprint: **36** (2026-10-05 → 2026-10-11)

## Resumo

| Métrica | Valor |
| --- | --- |
| PRs total | 65 |
| Merged | 44 |
| Open | 19 |
| Closed | 2 |
| Linhas adicionadas | +113273 |
| Linhas removidas | -25197 |
| Arquivos tocados | 3503 |

## PRs da Sprint 36

| # | Título | Estado | Data | +/- |
| --- | --- | --- | --- | --- |
| #6651 | fix: switch de LPR liberado na edição da câmera quando a leitura de placa não carrega | MERGED | 2026-10-09 | +14/-6 |
| #6647 | feat: criar, editar e excluir perfis de mídia | OPEN | 2026-10-09 | +624/-12 |
| #6646 | fix: provision and drop ms-audit partitions without bind params in DO block | OPEN | 2026-10-09 | +138/-38 |
| #6642 | chore: remove o workflow de deploy por docker compose | OPEN | 2026-10-09 | +12/-311 |
| #6640 | fix: estado vazio do Log de Eventos no painel lateral igual ao protótipo | OPEN | 2026-10-09 | +103/-23 |
| #6622 | fix: linha do tempo do incidente exibe eventos de conectividade da câmera | OPEN | 2026-10-09 | +1330/-248 |
| #6619 | fix: Reportar ocorrência permite registrar o mesmo evento várias vezes | OPEN | 2026-10-09 | +1010/-213 |
| #6618 | fix: aplicar grupo salvo falha com painel em uso enquanto a tela o indica livre | OPEN | 2026-10-09 | +849/-65 |
| #6617 | fix: contador de "Todas" não passa mais a contar o resultado filtrado ao selecionar um marcador, inclusive "Não reconhecido" | MERGED | 2026-10-09 | +220/-64 |
| #6616 | fix: camada Interseções do mapa da Detecção mostra só as interseções com câmera e abre a interseção clicada | MERGED | 2026-10-09 | +474/-45 |
| #6615 | fix: dashboard de Câmeras alinhado ao protótipo (abas de conectividade, heatmap, rótulos e tooltips) | OPEN | 2026-10-09 | +1562/-985 |
| #6614 | fix: estado vazio do Log de Eventos igual ao protótipo (reteste da busca da coluna Descrição) | OPEN | 2026-10-09 | +158/-15 |
| #6613 | fix: janela de expandir o gráfico do ATSPM com título traduzido, gráfico alinhado e dentro da tela | OPEN | 2026-10-09 | +270/-143 |
| #6609 | fix: detalhe de câmera com identificador inválido mostra "não encontrada" e o botão Editar só aparece com a câmera carregada | MERGED | 2026-10-09 | +161/-92 |
| #6608 | fix: substituir câmera com estoque vazio deixa o modal sem saída e sem explicação | MERGED | 2026-10-09 | +85/-13 |
| #6607 | fix: região excluída pela lixeira reaparece ao criar uma nova região | OPEN | 2026-10-09 | +154/-12 |
| #6606 | fix: Tela de Eventos das câmeras: busca, filtro de câmera e colunas alinhados ao protótipo | OPEN | 2026-10-09 | +151/-240 |
| #6605 | fix: abas do painel de perfil de mídia divergem do protótipo | OPEN | 2026-10-09 | +1233/-235 |
| #6604 | fix: painel de edição de automação alinhado ao protótipo | OPEN | 2026-10-09 | +158/-67 |
| #6603 | fix: detalhe da instância com trilha pelo identificador e legenda de limite só quando há limite | OPEN | 2026-10-09 | +43/-7 |
| #6602 | fix: painel Saúde da Câmera da grid de conectividade fora do padrão | OPEN | 2026-10-09 | +58/-126 |
| #6601 | fix: marcador de câmera em contorno nos mapas e ícone de Acionamentos relacionados | OPEN | 2026-10-09 | +56/-34 |
| #6552 | chore: ship the prisma seed as seed.js in the service images | OPEN | 2026-10-09 | +21/-1 |
| #6535 | chore: dependabot para npm, imagens docker e github actions | OPEN | 2026-10-09 | +105/-0 |
| #6474 | feat: atman platform (deploy do attlas sobre argo cd com gitops) | CLOSED | 2026-10-08 | +26204/-0 |
| #6336 | docs: migração do object storage, MinIO na Chainguard e proposta SeaweedFS | MERGED | 2026-10-08 | +312/-27 |
| #6306 | refactor: analítico sai do ms-cameras e roda só no ms-video-analytics (CROSS-200 passos 10 a 13) | MERGED | 2026-10-09 | +20257/-9776 |
| #6225 | feat: Neural Labs de ponta a ponta - socket aceita JSON e o LPR chega no trajeto do painel de operação | MERGED | 2026-10-08 | +4575/-465 |
| #6213 | fix(ms-cameras): ajustes do review da #6171 no outbox de sincronização de câmera | MERGED | 2026-10-07 | +308/-300 |
| #6212 | fix(ms-cameras): ajustes do review da #6171 no outbox de sincronização de câmera | CLOSED | 2026-10-07 | +233/-216 |
| #6198 | feat: mecanismo de handoff do analítico entre ms-cameras e ms-video-analytics, sem fatia registrada | MERGED | 2026-10-07 | +10988/-201 |
| #6193 | feat(ms-video-analytics): tabelas do analítico criadas vazias, com os mesmos nomes do ms-cameras | MERGED | 2026-10-07 | +8504/-198 |
| #6183 | feat(ms-video-analytics): cópia local de câmera, preset e credencial, com carga inicial e reconciliação que repara | MERGED | 2026-10-07 | +7708/-197 |
| #6177 | feat(ms-cameras): aviso de ciclo de vida da câmera sai pelo outbox, sem o buffer Redis | MERGED | 2026-10-07 | +4413/-2992 |
| #6171 | feat(ms-cameras): câmera, preset e aviso de credencial publicados pelo outbox, com sync-feed e rota de credencial restrita | MERGED | 2026-10-07 | +3277/-116 |
| #6167 | feat: menu de três pontos no detalhe da câmera e dialog de substituição igual ao Figma | MERGED | 2026-10-07 | +963/-297 |
| #6159 | feat(web-attlas): telas do analítico chamam /api/video-analytics | MERGED | 2026-10-07 | +127/-45 |
| #6158 | feat(kong): rotas /api/video-analytics encaminhadas ao ms-cameras durante a separação do analítico | MERGED | 2026-10-07 | +37/-0 |
| #6155 | feat(core-messaging): kit de outbox transacional para ms-cameras e ms-video-analytics | MERGED | 2026-10-07 | +2030/-0 |
| #6154 | feat(ms-video-analytics): plataforma para receber o analítico (CoreAuth, Redis próprio, object storage, socket) | MERGED | 2026-10-07 | +551/-668 |
| #6153 | fix: documentação do ms-cameras e do analítico alinhada ao código | MERGED | 2026-10-07 | +232/-231 |
| #6152 | fix: rotas de saúde das câmeras exigem pertencimento ao Sistema | MERGED | 2026-10-07 | +39/-12 |
| #6149 | docs: o analítico de vídeo passa ao ms-video-analytics, com banco próprio e cópia local de câmera | MERGED | 2026-10-07 | +892/-638 |
| #6147 | refactor(ms-video-analytics): módulo raiz na raiz do src e sem as sobras do pipeline removido | MERGED | 2026-10-07 | +91/-654 |
| #6146 | chore: setup:env deixa de gravar backup .bak e os backups versionados saem do repo | MERGED | 2026-10-07 | +2/-114 |
| #6009 | fix(cameras): busca do Log de Eventos encontra a descrição exibida no idioma da tela | MERGED | 2026-10-07 | +1246/-163 |
| #6006 | fix: rótulos das colunas dos perfis de mídia em cinza e ajuda no token da origem | MERGED | 2026-10-07 | +170/-103 |
| #6004 | fix: tela de Eventos de câmera abre agrupada, Total com ícone de câmera e data com o "às" | MERGED | 2026-10-06 | +235/-97 |
| #6003 | fix: código de incidente nos acionamentos do evento abre o incidente no analítico | MERGED | 2026-10-06 | +318/-176 |
| #6001 | fix: estado vazio do log de eventos do painel lateral igual ao da tela cheia | MERGED | 2026-10-06 | +16/-71 |
| #5998 | chore: arquivos de ambiente padronizados por seção, com a explicação de cada variável no docs/ENV.md | MERGED | 2026-10-06 | +4223/-2870 |
| #5997 | fix: reprovisiona câmera sem perfil de stream ao salvar o endereço na edição | MERGED | 2026-10-06 | +692/-80 |
| #5990 | feat: cadastro da Neural Labs pela tela de Instâncias e socket LPR pronto para o equipamento real | MERGED | 2026-10-06 | +1381/-97 |
| #5920 | fix: detalhe da câmera alinhado ao Figma e PTZ obedece ao toque | MERGED | 2026-10-06 | +1116/-795 |
| #5913 | feat: menu de imagem diz se o realce automático está ativo e em qual motor e GPU | MERGED | 2026-10-06 | +159/-22 |
| #5879 | feat: consumir o AV1 nativo da câmera no ao vivo, com sonda de codec, teto MBR e fallback H.264 | MERGED | 2026-10-05 | +1356/-336 |
| #5853 | docs: documenta o que a borda na frente do Kong precisa para os streams de tempo real | MERGED | 2026-10-05 | +175/-2 |
| #5846 | fix: tela de Eventos de câmera abre na tabela ampla com as colunas Câmera, Área e Subárea | MERGED | 2026-10-05 | +385/-105 |
| #5757 | fix: automação de presets PTZ continua rodando depois de deploy, restart ou queda do ms-cameras | MERGED | 2026-10-05 | +472/-38 |
| #5743 | fix: "Ocultar colunas" dos Eventos de câmera lista só as colunas da visualização na tela | MERGED | 2026-10-05 | +62/-9 |
| #5742 | fix: marcadores de criticidade de Incidentes mantêm o total e a contagem de cada nível com um nível escolhido | MERGED | 2026-10-05 | +149/-15 |
| #5741 | fix: detalhe de câmera inexistente mostra só o erro, sem cabeçalho, botão Editar nem trilha repetida | MERGED | 2026-10-05 | +48/-18 |
| #5740 | fix: busca do Analítico com um único botão de limpar e o campo de Incidentes desenhado inteiro | MERGED | 2026-10-05 | +62/-2 |
| #5664 | fix: escala da caixa da Detecção estável sobre o Kalman, com a banda medida até a estimativa | MERGED | 2026-10-06 | +273/-56 |
| #5662 | fix(cameras): stabilize live detection box scale | MERGED | 2026-10-05 | +3/-0 |

## Ação necessária (PRs abertas)

- [ ] **#6535** chore: dependabot para npm, imagens docker e github actions — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6535))
- [ ] **#6552** chore: ship the prisma seed as seed.js in the service images — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6552))
- [ ] **#6601** fix: marcador de câmera em contorno nos mapas e ícone de Acionamentos relacionados — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6601))
- [ ] **#6602** fix: painel Saúde da Câmera da grid de conectividade fora do padrão — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6602))
- [ ] **#6603** fix: detalhe da instância com trilha pelo identificador e legenda de limite só quando há limite — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6603))
- [ ] **#6604** fix: painel de edição de automação alinhado ao protótipo — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6604))
- [ ] **#6605** fix: abas do painel de perfil de mídia divergem do protótipo — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6605))
- [ ] **#6606** fix: Tela de Eventos das câmeras: busca, filtro de câmera e colunas alinhados ao protótipo — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6606))
- [ ] **#6607** fix: região excluída pela lixeira reaparece ao criar uma nova região — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6607))
- [ ] **#6613** fix: janela de expandir o gráfico do ATSPM com título traduzido, gráfico alinhado e dentro da tela — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6613))
- [ ] **#6614** fix: estado vazio do Log de Eventos igual ao protótipo (reteste da busca da coluna Descrição) — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6614))
- [ ] **#6615** fix: dashboard de Câmeras alinhado ao protótipo (abas de conectividade, heatmap, rótulos e tooltips) — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6615))
- [ ] **#6618** fix: aplicar grupo salvo falha com painel em uso enquanto a tela o indica livre — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6618))
- [ ] **#6619** fix: Reportar ocorrência permite registrar o mesmo evento várias vezes — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6619))
- [ ] **#6622** fix: linha do tempo do incidente exibe eventos de conectividade da câmera — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6622))
- [ ] **#6640** fix: estado vazio do Log de Eventos no painel lateral igual ao protótipo — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6640))
- [ ] **#6642** chore: remove o workflow de deploy por docker compose — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6642))
- [ ] **#6646** fix: provision and drop ms-audit partitions without bind params in DO block — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6646))
- [ ] **#6647** feat: criar, editar e excluir perfis de mídia — aberta em 2026-10-09 ([ver](https://github.com/atmanadmin/attlas-2026/pull/6647))

## Entregues (merged)

- [x] **#5740** fix: busca do Analítico com um único botão de limpar e o campo de Incidentes desenhado inteiro — merged em 2026-10-05
- [x] **#5741** fix: detalhe de câmera inexistente mostra só o erro, sem cabeçalho, botão Editar nem trilha repetida — merged em 2026-10-05
- [x] **#5742** fix: marcadores de criticidade de Incidentes mantêm o total e a contagem de cada nível com um nível escolhido — merged em 2026-10-05
- [x] **#5743** fix: "Ocultar colunas" dos Eventos de câmera lista só as colunas da visualização na tela — merged em 2026-10-05
- [x] **#5662** fix(cameras): stabilize live detection box scale — merged em 2026-10-05
- [x] **#5757** fix: automação de presets PTZ continua rodando depois de deploy, restart ou queda do ms-cameras — merged em 2026-10-05
- [x] **#5853** docs: documenta o que a borda na frente do Kong precisa para os streams de tempo real — merged em 2026-10-05
- [x] **#5846** fix: tela de Eventos de câmera abre na tabela ampla com as colunas Câmera, Área e Subárea — merged em 2026-10-05
- [x] **#5879** feat: consumir o AV1 nativo da câmera no ao vivo, com sonda de codec, teto MBR e fallback H.264 — merged em 2026-10-05
- [x] **#5913** feat: menu de imagem diz se o realce automático está ativo e em qual motor e GPU — merged em 2026-10-06
- [x] **#5664** fix: escala da caixa da Detecção estável sobre o Kalman, com a banda medida até a estimativa — merged em 2026-10-06
- [x] **#5990** feat: cadastro da Neural Labs pela tela de Instâncias e socket LPR pronto para o equipamento real — merged em 2026-10-06
- [x] **#5920** fix: detalhe da câmera alinhado ao Figma e PTZ obedece ao toque — merged em 2026-10-06
- [x] **#5997** fix: reprovisiona câmera sem perfil de stream ao salvar o endereço na edição — merged em 2026-10-06
- [x] **#6001** fix: estado vazio do log de eventos do painel lateral igual ao da tela cheia — merged em 2026-10-06
- [x] **#6003** fix: código de incidente nos acionamentos do evento abre o incidente no analítico — merged em 2026-10-06
- [x] **#5998** chore: arquivos de ambiente padronizados por seção, com a explicação de cada variável no docs/ENV.md — merged em 2026-10-06
- [x] **#6004** fix: tela de Eventos de câmera abre agrupada, Total com ícone de câmera e data com o "às" — merged em 2026-10-06
- [x] **#6009** fix(cameras): busca do Log de Eventos encontra a descrição exibida no idioma da tela — merged em 2026-10-07
- [x] **#6006** fix: rótulos das colunas dos perfis de mídia em cinza e ajuda no token da origem — merged em 2026-10-07
- [x] **#6146** chore: setup:env deixa de gravar backup .bak e os backups versionados saem do repo — merged em 2026-10-07
- [x] **#6147** refactor(ms-video-analytics): módulo raiz na raiz do src e sem as sobras do pipeline removido — merged em 2026-10-07
- [x] **#6149** docs: o analítico de vídeo passa ao ms-video-analytics, com banco próprio e cópia local de câmera — merged em 2026-10-07
- [x] **#6158** feat(kong): rotas /api/video-analytics encaminhadas ao ms-cameras durante a separação do analítico — merged em 2026-10-07
- [x] **#6154** feat(ms-video-analytics): plataforma para receber o analítico (CoreAuth, Redis próprio, object storage, socket) — merged em 2026-10-07
- [x] **#6155** feat(core-messaging): kit de outbox transacional para ms-cameras e ms-video-analytics — merged em 2026-10-07
- [x] **#6159** feat(web-attlas): telas do analítico chamam /api/video-analytics — merged em 2026-10-07
- [x] **#6152** fix: rotas de saúde das câmeras exigem pertencimento ao Sistema — merged em 2026-10-07
- [x] **#6153** fix: documentação do ms-cameras e do analítico alinhada ao código — merged em 2026-10-07
- [x] **#6171** feat(ms-cameras): câmera, preset e aviso de credencial publicados pelo outbox, com sync-feed e rota de credencial restrita — merged em 2026-10-07
- [x] **#6177** feat(ms-cameras): aviso de ciclo de vida da câmera sai pelo outbox, sem o buffer Redis — merged em 2026-10-07
- [x] **#6183** feat(ms-video-analytics): cópia local de câmera, preset e credencial, com carga inicial e reconciliação que repara — merged em 2026-10-07
- [x] **#6193** feat(ms-video-analytics): tabelas do analítico criadas vazias, com os mesmos nomes do ms-cameras — merged em 2026-10-07
- [x] **#6198** feat: mecanismo de handoff do analítico entre ms-cameras e ms-video-analytics, sem fatia registrada — merged em 2026-10-07
- [x] **#6167** feat: menu de três pontos no detalhe da câmera e dialog de substituição igual ao Figma — merged em 2026-10-07
- [x] **#6213** fix(ms-cameras): ajustes do review da #6171 no outbox de sincronização de câmera — merged em 2026-10-07
- [x] **#6225** feat: Neural Labs de ponta a ponta - socket aceita JSON e o LPR chega no trajeto do painel de operação — merged em 2026-10-08
- [x] **#6336** docs: migração do object storage, MinIO na Chainguard e proposta SeaweedFS — merged em 2026-10-08
- [x] **#6306** refactor: analítico sai do ms-cameras e roda só no ms-video-analytics (CROSS-200 passos 10 a 13) — merged em 2026-10-09
- [x] **#6608** fix: substituir câmera com estoque vazio deixa o modal sem saída e sem explicação — merged em 2026-10-09
- [x] **#6609** fix: detalhe de câmera com identificador inválido mostra "não encontrada" e o botão Editar só aparece com a câmera carregada — merged em 2026-10-09
- [x] **#6616** fix: camada Interseções do mapa da Detecção mostra só as interseções com câmera e abre a interseção clicada — merged em 2026-10-09
- [x] **#6617** fix: contador de "Todas" não passa mais a contar o resultado filtrado ao selecionar um marcador, inclusive "Não reconhecido" — merged em 2026-10-09
- [x] **#6651** fix: switch de LPR liberado na edição da câmera quando a leitura de placa não carrega — merged em 2026-10-09

Gerado automaticamente por `scripts/github-sprint-sync.sh`.
