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
atualizado: 2026-10-01
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
2. A instância é reconhecida pelo IP de origem (`NeuralInstance.sourceAddress`, único). Conexão de IP
   sem instância habilitada é fechada sem ler nada.
3. Só o **XML completo** é aceito: o curto não traz `ComputerID` nem `IncidenceID`.
4. A leitura é gravada na câmera vinculada ao par `ComputerID` e `CamID`. Sem vínculo, é descartada e o
   par fica como câmera pendente. Ver [[Analítico - Neural Labs - Vínculo de câmeras]].

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
| `POST`/`PATCH`/`GET /api/internal/lpr/neural-instances` | Cadastro e leitura das instâncias, com `lastFrameAt` |
| `PUT .../neural-instances/:instanceId/camera-mappings` | Vínculo manual |
| `GET .../neural-instances/:instanceId/unmapped-cameras` | Câmeras externas sem vínculo |
| `GET /api/internal/lpr/camera-mappings` com `System-Id` | Vínculos do Sistema |

As rotas públicas passam pelo `ms-cameras`, listadas em [[Analítico - Neural Labs - Vínculo de câmeras#Rotas]].

## Ligar um NEURAL SERVER de verdade

1. **Decisões da empresa**: aprovar a política de dados de placa (LGPD) e definir a retenção em dias
   (1 a 365). Sem as duas, a validação de ambiente recusa o boot com o socket ligado.
2. **Ambiente** do `ms-video-analytics`: `NEURAL_LPR_ENABLED=true`, `NEURAL_LPR_TCP_LISTENER_ENABLED=true`,
   `LPR_DATA_POLICY_APPROVED=true`, `LPR_RETENTION_DAYS=<dias>`; `LPR_MIN_CONFIDENCE` é opcional.
   `LPR_FINGERPRINT_KEY` se gera uma vez por ambiente e nunca se troca: trocar faz as leituras de antes e
   de depois deixarem de parear.
3. **Porta**: publicar a 17000 no `docker-compose.yml` (hoje só a 3302 está publicada) e abrir a TCP
   17000 no security group só para o IP público do NEURAL SERVER.
4. **Recriar o serviço** e conferir no log que o socket abriu.
5. **Cadastrar a instância**: `POST /api/internal/lpr/neural-instances` com nome, `sourceAddress` (o IP
   de onde a conexão chega; atrás de NAT, o público do cliente), fuso IANA e `enabled`.
6. **Configurar o equipamento** no modo cliente, discando para o Attlas na 17000, com XML completo.
7. **Vincular as câmeras** pela lista do equipamento ou pelo nome, e acompanhar na página da instância.

No dev.v2 o domínio está ligado (`NEURAL_LPR_ENABLED=true`, chave gerada), o socket desligado e a
política não aprovada; não há instância cadastrada.

## Pendências

- Política de dados e retenção (decisão da empresa).
- Porta 17000 no compose e regra do security group, quando o IP do equipamento for conhecido.
- Cadastro da instância pela tela: hoje só pela rota interna ou pelo `--register` do simulador.
- `Speed` igual a -1 (velocidade não detectada) é gravado como -1; tem de virar nulo.
- Perguntas ao fornecedor: fuso das datas e sincronismo dos relógios, se o sentido é medido por veículo
  ou vem da faixa, unidade do `Speed`, amostra real das mensagens, e as de
  [[Analítico - Neural Labs - Vínculo de câmeras#O que perguntar à Neural Labs]].
- Alinhar o tempo de viagem ao documento dos gestores ([[Analítico - Neural Labs - Tempo de viagem#Pendências]]).
