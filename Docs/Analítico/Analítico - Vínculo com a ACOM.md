---
tags:
  - doc
  - analitico
  - acom
aliases:
  - "Vínculo ACOM e analítico"
  - "Portas 81 e 82 da ACOM"
  - "Analítico - ACOM"
atualizado: 2026-10-07
---

# Analítico - Vínculo com a ACOM

Volta para [[Analítico]].

## Resumo

A ACOM é a placa que entrega o laço virtual a um controlador legado como contato seco, para ele ler a detecção como
leria um laço indutivo. Não é capacidade analítica, é transporte (`RF-ACOM-01`). O próprio app embarcado sinaliza a
placa; o Attlas grava a lógica na placa e o destino no app, e não fica no caminho do sinal. O contrato no repositório
está em `docs/specs/cross-service/CROSS-168-acom-analytic-link.md`.

| Peça | Dono |
| --- | --- |
| A placa, a fiação de cada saída e a lógica | `ms-controllers` (`apps/ms-controllers/src/acom/`) |
| O analítico, a credencial e o destino gravado no app | `ms-cameras` (`apps/ms-cameras/src/analytic-acom-destination/`) |
| O estado do vínculo entre placa e analítico | `ms-video-analytics` (`apps/ms-video-analytics/src/acom-link/`) |

## Quem é dono de quê

- **A placa é do módulo Controladores** (`RF-ACOM-02`). Ela nasce dentro de um controlador e nunca troca de dono
  (`Acom.controllerId`). O CRUD fica em `/api/controllers/:id/acoms`, e a fiação de cada saída física é uma linha de
  `AcomOutputWiring` com a origem no vídeo (`cameraId`, `analyticId`, `regionIndex`) e a entrada do controlador
  (`slot`, `channel`).
- **A entrada do controlador é derivada do vínculo região-detector.** A tela de fiação não envia `slot` nem
  `channel`: o `ms-controllers` lê o vínculo da região no `ms-cameras` e tira dele a entrada. Laço sem vínculo não
  ocupa entrada nenhuma, e a aba ACOM mostra "Sem detector". O vínculo em si nasce na Detecção ou nas Métricas
  ([[Analítico - Fluxos#Vínculo região-detector]]).
- **O analítico e a credencial são do `ms-cameras`**, que lê e grava o destino da placa no app; na build de laço por
  TCP, pelo `ms-connector-virtual-loop`.
- **O `ms-video-analytics` orquestra o vínculo** (tabelas `AcomLinkBoard` e `AcomAnalyticLink`, chave
  `ACOM_ANALYTIC_LINK_ENABLED`): guarda o estado, lê o destino, grava só o que difere, relê para confirmar e repete com
  espera crescente. Não fala com o equipamento; tudo passa pelo `ms-cameras`. Os prazos da repetição estão em
  [[Analítico - Requisitos e SLA#Variáveis de ambiente]].
- O `ms-acom` é esqueleto sem uso.

## Como o contato fecha

1. O app embarcado empurra `set AcomObj { users: [{ id, lps_state }] }` para a porta de sinal da placa, com o estado
   dos laços numa máscara.
2. A placa avalia a lógica de cada saída: termos AND e OR com o `analytic_id` do app e a máscara de laços, mais a
   inversão.
3. A placa fecha o contato na entrada do controlador ligada àquela saída.

A placa casa `users[].id` com o `analytic_id` do app (`ATMAN-...`), não com o `CameraAnalytic.id`. O `ms-controllers`
guarda o par em `Acom.analyticDeviceIds`, e o `acomLogicToDevice` traduz um no outro ao gravar a lógica.

## As portas são da placa

O firmware da placa escuta em 80, 81 e 82, em TCP cru com JSON enquadrado por seis dígitos de tamanho entre aspas.
Nenhuma das portas é HTTP.

| Porta | Papel |
| --- | --- |
| 81 | Gestão: o `ms-controllers` faz `get` e `set` do `AcomObj` ali |
| 82 | Sinal: onde a placa recebe o estado dos laços do analítico |

A porta de sinal é a porta cadastrada mais um, e só existe se as duas estão entre as portas que o firmware escuta
(`AcomSignalPort`). Placa cadastrada na 82 não tem porta de sinal, e o vínculo falha com `SIGNAL_PORT_UNRESOLVED`.

## Onde o app guarda o destino

| Build | Onde | Como o Attlas grava |
| --- | --- | --- |
| ATSPM atual | `/config`: `acom_enabled`, `acom_host`, `acom_port` | `PUT /config` só com o que difere |
| ATSPM 0.1.1 | `/infra`, mesmos campos | `PUT /infra` só com o que difere |
| SDCT | `/config`, mesmos campos | `PUT /config` |
| Laço por TCP | `config.network.acom` ou `config.network.clients.acom` | `set properties` com `submit: true`, pelo conector |

O `ms-cameras` descobre onde o campo mora pela presença das chaves. A build de laço por TCP não tem chave de liga e
desliga: o destino conta como ligado quando tem endereço e porta.

## Regras do vínculo

- Um analítico sinaliza uma placa só, porque o app guarda um destino. A segunda placa do Sistema que nomear o mesmo
  analítico recebe o conflito e nada muda.
- Duas saídas não podem cair na mesma entrada do controlador, nem em placas diferentes do mesmo controlador.
- Só a releitura do equipamento confirma o vínculo.
- Soltar desliga o destino só se ele ainda apontava para aquela placa.
- O `ms-controllers` manda o retrato inteiro da placa a cada escrita, com o instante da leitura; retrato mais velho
  que o aplicado é ignorado.
- Com o `ms-cameras` fora, a escrita da fiação responde 503 `ACOM_BINDING_PROVIDER_UNAVAILABLE` e nada é gravado.

## Na tela

- **Controladores**, sub-aba ACOMs do controlador: placa, fiação por saída e lógica num diálogo.
- **Detecção**, campo Detector do bloco "Métricas de desempenho": uma linha de leitura com o nome da placa como link
  para ela (só para quem vê Controladores), um "?" com IP, porta de sinal, porta de gestão e modelo, e o estado do
  vínculo numa pílula (Confirmado, Pendente, Falhou, Sem suporte, Indisponível). O vínculo é do analítico inteiro,
  então a linha é a mesma em qualquer região.
- **Instâncias**: a página e o painel da instância mostram a placa vinculada.

O que falta na placa ACOM está em [[Analítico - Pendências#Placa ACOM]].

## Glossário

| Termo | O que é |
| --- | --- |
| Contato seco | Saída elétrica liga e desliga, que o controlador lê como lê um laço físico |
| `AcomObj` | O objeto de estado da placa, lido e gravado pela porta de gestão |
| Máscara de laços | Os bits de estado dos laços de um analítico, um por região |
| Retrato da placa | O estado inteiro da placa que o `ms-controllers` manda ao `ms-video-analytics` a cada escrita |
| `analytic_id` | Identidade do app embarcado (`ATMAN-...`), que muda a cada reinstalação |
