---
tags:
  - attlas
  - task
  - sprint-34
  - anpr
  - integracao
titulo: "[Full] ANPR - consumir o NEURAL SERVER da Neural Labs, o analítico de placas do cliente"
frente: ANPR
tamanho: sem estimativa
pr: "https://github.com/atmanadmin/attlas-2026/pull/4403, https://github.com/atmanadmin/attlas-2026/pull/4816, https://github.com/atmanadmin/attlas-2026/pull/4887, https://github.com/atmanadmin/attlas-2026/pull/5075"
status: "Backend da integração mergeado na PR #4403 em 24/09. Em 25/09 abriu a PR #4816: câmera nasce associada ao analítico servidor Neural Labs, catálogo de tipos embarcado e servidor, tela Analítico, Neural Labs com mapeamento e divergência, e simulador do NEURAL SERVER. Validada ponta a ponta em 26/09 (76 de 76 verificações em ambiente isolado), review de felipe e igor atendido, mergeada em 26/09 às 12:44 e no dev.v2 desde o deploy das 13:00, com a frente ligada e o socket de placas desligado até haver servidor, política de dados e retenção (passo a passo em [[Analítico - Integração com a Neural Labs]]). Sem acesso à instalação externa; HTTP e payload de incidentes dependem do fornecedor. Na noite de 26/09 a PR #4887 (mergeada às 18:45) tirou do front a tela Analítico, Neural Labs e o switch do cadastro e da edição, por decisão do dono: a Neural Labs é serviço externo que aponta para o Attlas, e o vínculo e as regras vão para a tela de Instâncias. O backend segue igual."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-28
---

# ANPR - integração com o NEURAL SERVER

O cliente tem um servidor físico Neural Labs para leitura de placas e incidentes. A integração no
Attlas pertence ao `ms-video-analytics`; `ms-cameras` é dono da capacidade LPR de cada câmera e
`ms-traffic-model` define os Trajetos. A decisão atual e o exercício estão em
[[Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)]].

## Implementação e limites de evidência

As atômicas e contratos estão na PR #4403. O manual do fabricante documenta TCP/XML e leitura do
SQL Server para LPR. Não fornece API HTTP nem payload da funcionalidade separada de incidentes.
Essas partes só podem ser homologadas com evidência do fornecedor/cliente.

## Regra de negócio

O Attlas permite declarar manualmente se a câmera tem LPR, registra evidência automática positiva,
mapeia a câmera Neural Labs à câmera cadastrada e mede tempo/velocidade por pares de origem e destino
eleitos no Trajeto. `Speed` do XML é instantâneo; a velocidade média do trecho é derivada da distância
e do tempo de viagem. Falta de evento nunca significa ausência de LPR.

## Switch de LPR no cadastro e na edição (24/09)

Pedido do user na PR #4403: flag de LPR no cadastro da câmera, automática, com ligar/desligar manual.

- A câmera nasce no **automático**: o switch liga sozinho na primeira leitura de placa recebida dela.
  Câmera recém-cadastrada nunca tem leitura ainda (a Neural Labs identifica a câmera por `CamID`, que
  só casa depois do mapeamento), então nasce desligada, salvo escolha do operador.
- Ligar ou desligar à mão vira declaração manual (`SUPPORTED`/`NOT_SUPPORTED`), sem justificativa
  obrigatória; "Voltar ao automático" retira a declaração. Desligado à mão com leitura recebida mostra
  conflito.
- Backend: `lprCapability?` no item do `POST /api/cameras`, gravado na mesma transação da câmera e
  auditado; recadastro pelo mesmo IP apaga a evidência da vida anterior. `reason` virou opcional no
  `PUT .../lpr-capability/manual`.
- Frontend: componente `app-camera-lpr-switch` no passo "Configurações" do wizard, na revisão e na
  seção "Capacidades" da edição.
- Specs: `cameras.md` seção 3.1, UC-082 e UF-723 (seção 1 implementada; ficha, Trajeto e
  administração Neural seguem pendentes).

## Analítico servidor Neural Labs no cadastro, mapeamento e simulador (25/09)

> [!warning] Estado em 26/09: a tela e o switch saíram do front
> A PR #4887 removeu a aba Analítico, Neural Labs e o switch do analítico servidor no cadastro, na
> edição e na aba Analítico da câmera. A Neural Labs é um serviço externo, como um servidor, que aponta
> para o Attlas; vincular as câmeras, à mão ou automaticamente conforme os dados de detecção chegam, e
> qualquer regra ficam na tela de Instâncias, em entrega própria. A associação automática, a decisão
> manual, o mapeamento e o simulador seguem no backend, como descrito abaixo.

Pedido do dono do produto em 25/09, na PR #4816 (CROSS-170):

- Toda câmera nasce associada ao analítico servidor Neural Labs (automático) e o operador liga ou
  desliga à mão no cadastro e na edição, com volta ao automático. Só a decisão manual vira linha, na
  tabela `CameraServerAnalytic` do `ms-cameras`.
- O analítico servidor Atman, descontinuado em 16/09, deixou de se confundir com o da Neural Labs:
  catálogo de tipos por família no `libs/contracts` (`EnumCameraAnalyticType` embarcado,
  `EnumServerAnalyticType` servidor de terceiro, `EnumAnalyticProvider`, `AnalyticTypeCatalog`). A tela
  rotula o modo SERVER legado como "Servidor Atman".
- A aba Analítico, Neural Labs cruza embarcado e associação por câmera (cobertura), aponta associada
  sem vínculo e vinculada sem associação (divergência), lista as câmeras externas sem vínculo com o
  `CamName` e faz o vínculo explícito.
- Simulador do NEURAL SERVER em `tools/simulators/neural-server`, a partir do manual v1.17: 148 de 148
  quadros aceitos pelo decoder e parser reais do `ms-video-analytics`, trigger 73 respondendo.
- Decisão registrada em [[Decisão - Analítico servidor Neural Labs no cadastro e mapeamento (25-09-2026)]].
- Validado ponta a ponta na madrugada de 26/09 em ambiente isolado: 76 de 76 verificações, com três
  defeitos achados e corrigidos na própria PR. Detalhe e defeitos anteriores à PR na nota de decisão.

## Vínculo automático e manual na tela de Instâncias (28/09)

Pedido do dono em 28/09, pensando no cenário de produção (800 câmeras, 100 com embarcado e 700 na Neural Labs). A PR #5075 faz a associação automática deixar de fora a câmera com embarcado, cria o vínculo automático pelo nome (um interruptor por instância), permite desvincular e mostra a instância Neural Labs na tela de Instâncias, com as listas de vinculadas, aguardando vínculo e câmeras do Attlas. Como tudo funciona, com exemplos e o passo a passo: [[Analítico - Associação e vínculo de câmeras com a Neural Labs]] (tem também a versão em PDF na mesma pasta).

## O que depende do equipamento

Versão instalada, modo e enquadramento TCP, acesso SQL de leitura, vínculo dos IDs externos com as
câmeras Attlas, eventual API HTTP, payload real de incidentes, volume de eventos, sincronismo de
relógios e política de retenção.

## Relacionado

- [[Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)]] - decisão atual.
- [[Neural Labs]] - referência técnica do fabricante, transcrita no vault.
