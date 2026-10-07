---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "Analítico - Integração com a Neural Labs"
  - "NEURAL SERVER"
  - "LPR da Neural Labs"
  - "Integração Neural Labs"
  - "Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)"
  - "Decisão - Analítico servidor Neural Labs no cadastro e mapeamento (25-09-2026)"
  - "Registro - documentação nova da Neural Labs comparada com o Attlas (28-09-2026)"
  - "Neural Labs - Arquitetura e estratégias"
atualizado: 2026-10-06
---

# Analítico - Neural Labs - Arquitetura e estratégias

Como o Attlas recebe as leituras de placa do NEURAL SERVER, o servidor da Neural Labs instalado no
cliente. No Attlas ele é um **analítico servidor**: aparece em Analítico > Instâncias e se opera na
mesma página de instância do embarcado. Regras em `docs/modules/analitico.md` seções 3.8 e 3.9;
desenho em `CROSS-149` (medição) e `CROSS-170` (associação e vínculo). Índice em [[Analítico - Neural Labs]].

## Onde mora

| Peça | Onde |
| --- | --- |
| Socket de leituras, instâncias, vínculo, medição, retenção | `ms-video-analytics`, `src/neural-lpr/`, banco `db-video-analytics` |
| Associação da câmera, capacidade LPR, rotas públicas | `ms-cameras`, `src/server-analytics/` e `src/lpr-capability/` |
| Tela | Analítico > Instâncias, a mesma página da instância embarcada |
| Simulador | `tools/simulators/neural-server` (`npm run tool:simulate-neural-server -- --help`; `--register` cadastra a instância) |

Todo o domínio fica atrás de `NEURAL_LPR_ENABLED`. A inferência é do NEURAL SERVER: o Attlas não abre
stream nem infere placa.

## Ingestão

1. O NEURAL SERVER, no "Client mode", disca para a TCP 17000 do `ms-video-analytics`
   (`NEURAL_LPR_TCP_PORT`) e manda cada leitura como `NEURAL` + tamanho + XML `<infoplate>`. Formato em
   [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]].
2. A instância é reconhecida pelo IP de origem (`NeuralInstance.sourceAddress`, IPv4, único), que é o
   endereço que o container vê (seção "Qual IP cadastrar"). Conexão de IP sem instância habilitada é
   fechada sem ler nada, e o log `neural_lpr_connection_rejected` traz o IP visto.
3. A conexão fica aberta: o Client mode não tem ACK, então o Attlas nunca fecha conexão quieta
   (`NEURAL_LPR_TCP_IDLE_TIMEOUT_MS` padrão 0) e usa keepalive TCP de 30 s para achar par morto.
4. Só o **XML completo** é aceito: o curto não traz `ComputerID`. `IncidenceID` vazio, como no exemplo do
   manual, é aceito com chave derivada (CamID, instante e impressão da placa), e `Engine` ausente conta
   como placa.
5. A câmera externa sem vínculo vira pendente (com o `CamName`) antes de a hora ser conferida, e a
   leitura é descartada. Com vínculo, a leitura é gravada na câmera do par `ComputerID` e `CamID`. Ver
   [[Analítico - Neural Labs - Vínculo de câmeras]].
6. Leitura mais de 60 s no futuro é recusada (`event_in_future`): é o sinal de fuso da instância ou
   relógio do equipamento errado. `Speed` -1 (não medida) fica nulo.
7. Mudar `enabled`, IP ou fuso da instância fecha a conexão aberta dela; o equipamento disca de novo sob
   a regra nova.

## Regras do dado

- **Leitura de placa não é incidente.** A tabela `INCIDENCE` do fabricante é leitura válida de placa.
  Os incidentes da Neural Labs são outro contrato, que ainda não chegou.
- **A placa nunca é guardada em claro**: vira impressão HMAC por Sistema (`LPR_FINGERPRINT_KEY`).
  Imagens não são trazidas. Nenhuma resposta, log ou métrica expõe placa.
- **Capacidade LPR da câmera**: uma leitura com `<Engine>LPR</Engine>` comprova; ausência de leitura não
  prova o contrário, e a declaração manual não é sobrescrita em silêncio. O `ms-video-analytics` relata a
  evidência ao `ms-cameras` no máximo a cada `LPR_OBSERVATION_REPORT_INTERVAL_MS` por câmera.
- **Releitura**: a mesma placa na mesma câmera dentro de `LPR_REREAD_WINDOW_SECONDS` (padrão 10 s) é a
  mesma passagem.
- A `NeuralInstance` não tem `systemId` de propósito: o servidor é da instalação, e o deploy é um
  cluster por cliente. O vínculo guarda o Sistema da câmera.
- O tempo de viagem está em [[Analítico - Neural Labs - Tempo de viagem]].

## Rotas internas do `ms-video-analytics`

Com `x-internal-service-token`, fora do prefixo público.

| Rota | Para quê |
| --- | --- |
| `POST`/`PATCH`/`GET /api/internal/lpr/neural-instances` | Cadastro e leitura das instâncias, com `lastFrameAt`; a tela cadastra pelo `POST /api/cameras/analytics/neural-labs/instances` do `ms-cameras` |
| `PUT .../neural-instances/:instanceId/camera-mappings` | Vínculo manual |
| `GET .../neural-instances/:instanceId/unmapped-cameras` | Câmeras externas sem vínculo |
| `GET /api/internal/lpr/camera-mappings` com `System-Id` | Vínculos do Sistema |

As rotas públicas passam pelo `ms-cameras`, listadas em [[Analítico - Neural Labs - Vínculo de câmeras#Rotas]].

## Como cadastrar a Neural Labs

A Neural Labs não aparece em "Encontrados na rede": a varredura procura câmeras com analítico embarcado,
e o NEURAL SERVER é que disca para o Attlas. O cadastro é em **Analítico > Instâncias > Adicionar
analítico > "Cadastrar servidor Neural Labs"**, a caixa abaixo de "Cadastrar manualmente".

- **Quando a caixa aparece**: só quando a leitura da Neural Labs responde `neuralAvailable = true`, ou
  seja, o `ms-video-analytics` está com `NEURAL_LPR_ENABLED=true` e o `ms-cameras` o alcança. Não depende
  de câmera, de estado da instância nem de nada na tela.
- **Campos**: nome, IP de origem (IPv4), fuso do relógio do NEURAL SERVER (vem o do navegador; trocar
  se o equipamento estiver em outro fuso) e o vínculo automático pelo nome, ligado.
- **Permissão**: `INSTANCES_MANAGE`. O cadastro deixa linha de auditoria `ANALYTIC_INSTANCE_REGISTERED`.
- IP já cadastrado volta com o erro "Já existe uma instância Neural Labs cadastrada com este endereço de
  origem". Não há rota de excluir: desligar é `enabled = false`.

## Qual IP cadastrar

O IP de origem é o endereço que o container do `ms-video-analytics` vê, e ele depende do caminho:

| Caminho até o Attlas | O que o socket vê |
| --- | --- |
| IP público, com a 17000 aberta no security group | O IP público da rede do cliente (o DNAT do Docker preserva a origem) |
| Tailnet | O gateway da rede do compose, `172.18.0.1` no dev.v2: o Tailscale do servidor mascara a conexão encaminhada ao container. Medido com tcpdump |
| O próprio servidor (`localhost:17000`) | O mesmo gateway, pelo docker-proxy |

Pela tailnet o IP não identifica o equipamento, então o NEURAL SERVER real tem de vir pelo IP público.
Na dúvida, deixar o equipamento discar e ler o IP no log `neural_lpr_connection_rejected`. Vários
servidores atrás do mesmo NAT chegam com o mesmo IP, que só uma instância pode ter: nesse caso cada
servidor precisa de `ComputerID` diferente.

## Ligar um NEURAL SERVER de verdade

1. **Decisões da empresa**: aprovar a política de dados de placa (LGPD) e definir a retenção em dias
   (1 a 365). Sem as duas, a validação de ambiente recusa o boot com o socket ligado.
2. **Ambiente** do `ms-video-analytics`: `NEURAL_LPR_ENABLED=true`, `NEURAL_LPR_TCP_LISTENER_ENABLED=true`,
   `LPR_DATA_POLICY_APPROVED=true` e `LPR_RETENTION_DAYS=30`. `LPR_FINGERPRINT_KEY` se gera uma vez por
   ambiente e nunca se troca: trocar faz as leituras de antes e de depois deixarem de parear.
   `LPR_MIN_CONFIDENCE` não é usada (ausente, toda leitura conta) e não está no `.env.example`.
3. **Porta**: o `docker-compose.yml` publica a 17000; restringir ao IP público do NEURAL SERVER no
   security group (ou na cadeia `DOCKER-USER`). O `ufw` do servidor não fecha porta publicada pelo Docker.
4. **Recriar o serviço** e conferir no log `neural_lpr_listening` na 17000.
5. **Cadastrar a instância** pela tela (seção "Como cadastrar a Neural Labs"), com o IP da seção "Qual IP
   cadastrar".
6. **Configurar o equipamento**: Client mode discando para o Attlas na 17000, XML completo (não o curto),
   "Send Image" desligado (imagem em base64 estoura o teto de 2 MiB do quadro) e um `ComputerID` por
   servidor.
7. **Conferir**: o `lastFrameAt` da instância anda e as câmeras dele aparecem em "Aguardando vínculo".
8. **Vincular as câmeras** pela lista do equipamento ou pelo nome, e acompanhar na página da instância.

No dev.v2 o socket está ligado (`NEURAL_LPR_ENABLED=true`, `NEURAL_LPR_TCP_LISTENER_ENABLED=true`,
`LPR_DATA_POLICY_APPROVED=true`, `LPR_RETENTION_DAYS=30`) e escuta na 17000. Pela tailnet
(`100.101.165.32:17000`) a porta responde; pelo IP público (`3.15.199.101:17000`) o security group
bloqueia. Nenhuma instância está cadastrada.

## Pendências

- Política de dados e retenção (decisão da empresa).
- Regra do security group e cadastro da instância, quando o IP do NEURAL SERVER for conhecido.
- Primeira captura real do equipamento: conferir `IncidenceID`, `Engine`, encoding do `CamName` e se
  ele reconecta sozinho depois de uma queda.
- Perguntas ao fornecedor: fuso das datas e sincronismo dos relógios, se o sentido é medido por veículo
  ou vem da faixa, unidade do `Speed`, amostra real das mensagens, e as de
  [[Analítico - Neural Labs - Vínculo de câmeras#O que perguntar à Neural Labs]].
- Alinhar o tempo de viagem ao documento dos gestores ([[Analítico - Neural Labs - Tempo de viagem#Pendências]]).
