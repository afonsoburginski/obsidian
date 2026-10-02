---
tags:
  - doc
  - analitico
  - acom
aliases:
  - "Vínculo ACOM e analítico"
  - "Portas 81 e 82 da ACOM"
  - "Analítico - ACOM"
atualizado: 2026-10-01
---

# Analítico - Vínculo com a ACOM

A ACOM é a placa que entrega o laço virtual a um controlador legado como contato seco, para ele ler a
detecção como leria um laço indutivo. Não é capacidade analítica, é transporte (`RF-ACOM-01`). Parte do
[[Analítico]]; contrato no repositório em `docs/specs/cross-service/CROSS-168-acom-analytic-link.md`.

## Quem é dono de quê

- **A placa é do módulo Controladores** (`RF-ACOM-02`), em `apps/ms-controllers/src/acom/`: nasce
  dentro de um controlador e nunca troca de dono (`Acom.controllerId`), e cada saída física tem uma
  linha de fiação (`AcomOutputWiring`) com a entrada do controlador (`slot`, `channel`) e a origem no
  vídeo (`cameraId`, `analyticId`, `regionIndex`). O CRUD fica em `/api/controllers/:id/acoms`. O
  `ms-acom` é esqueleto sem uso.
- **O analítico e a credencial são do `ms-cameras`**, que lê e grava o destino da placa no app
  (`src/analytic-acom-destination/`); na build de laço, pelo `ms-connector-virtual-loop`.
- **O `ms-video-analytics` orquestra o vínculo** (`src/acom-link/`, tabelas `AcomLinkBoard` e
  `AcomAnalyticLink`, chave `ACOM_ANALYTIC_LINK_ENABLED`): guarda o estado, lê o destino, grava só o que
  difere, relê para confirmar e repete com espera crescente. Não fala com o equipamento.

## Como o contato fecha

O próprio app embarcado sinaliza a placa: ele empurra `set AcomObj { users: [{ id, lps_state }] }`
para a porta de sinal, com o estado dos laços numa máscara. A placa avalia a lógica de cada saída
(termos AND e OR com o `analytic_id` do app e a máscara de laços, mais a inversão) e fecha o contato no
controlador. O Attlas não fica no caminho do sinal: ele grava a lógica na placa e o destino no app.

## As portas são da placa

O firmware da placa escuta em 80, 81 e 82, em TCP cru com JSON enquadrado por seis dígitos de tamanho
entre aspas. Nenhuma das portas é HTTP.

- **81 é a gestão**: o `ms-controllers` faz `get` e `set` do `AcomObj` ali.
- **82 é onde a placa recebe o sinal do analítico.**
- A porta de sinal é a porta cadastrada mais um (regra do attlas-2025, `RF-ACOM-04`). Placa cadastrada
  na 82 não tem porta de sinal.

## Onde o app guarda o destino

| Build | Onde | Como o Attlas grava |
| --- | --- | --- |
| ATSPM atual | `/config`: `acom_enabled`, `acom_host`, `acom_port` | `PUT /config` só com o que difere |
| ATSPM 0.1.1 | `/infra`, mesmos campos | `PUT /infra` só com o que difere |
| SDCT | `/config`, mesmos campos | `PUT /config` |
| Laço por TCP | `config.network.acom` ou `config.network.clients.acom` | `set properties` com `submit: true`, pelo conector |

O `ms-cameras` descobre onde o campo mora pela presença das chaves.

## Regras

- Um analítico sinaliza uma placa só, porque o app guarda um destino. A segunda placa que nomear o
  mesmo analítico recebe o conflito e nada muda.
- Só a releitura do equipamento confirma o vínculo.
- Soltar desliga o destino só se ele ainda apontava para aquela placa.
- O `ms-controllers` manda o retrato inteiro da placa a cada escrita, com o instante da leitura; retrato
  mais velho que o aplicado é ignorado.
- A placa casa `users[].id` com o `analytic_id` do app (`ATMAN-...`), e não com o `CameraAnalytic.id`:
  o `acomLogicToDevice` traduz um no outro ao gravar a lógica.
- Salvar a fiação também cria o vínculo região-detector no `ms-cameras` (ver
  [[Analítico - Fluxos#Vínculo região-detector]]).

## Na tela

- **Controladores**, sub-aba ACOMs do controlador: placa, fiação por saída e lógica num diálogo.
- **Detecção**, campo Detector do bloco "Métricas de desempenho": uma linha de leitura com o nome da
  placa como link para ela (só para quem vê Controladores), um "?" com IP, porta de sinal, porta de
  gestão e modelo, e o estado do vínculo numa pílula (Confirmado, Pendente, Falhou, Sem suporte,
  Indisponível). O vínculo é do analítico inteiro, então a linha é a mesma em qualquer região.
- **Instâncias**: a página e o painel da instância mostram a placa vinculada.

## Pendências

- **Build de laço por TCP fica `UNSUPPORTED`** enquanto o `ms-cameras` não gravar o `deviceId` do
  handshake.
- **Desligar o destino no app de laço**: nenhuma fonte documenta como; o vínculo sai e o equipamento
  fica como está.
- **Retrato perdido depois do teto de repetição** só se recupera na próxima escrita da placa; não há
  ressincronização periódica.
