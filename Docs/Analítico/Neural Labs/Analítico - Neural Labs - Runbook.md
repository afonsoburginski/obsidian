---
tags:
  - doc
  - analitico
  - neural-labs
  - runbook
aliases:
  - "Analítico - Neural Labs - Runbook"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Runbook

Volta para [[Analítico - Neural Labs]].

## Resumo

| Pergunta | Seção |
| --- | --- |
| Como ligo um NEURAL SERVER real ao Attlas? | Como ligo um NEURAL SERVER real |

## Como ligo um NEURAL SERVER real

Pré-requisitos: a empresa aprovou a política de dados de placa (LGPD) e definiu a retenção em dias, de 1 a 365. Sem as duas, a validação de ambiente recusa o boot com o socket ligado.

1. **Ambiente** do `ms-video-analytics`: `NEURAL_LPR_ENABLED=true`, `NEURAL_LPR_TCP_LISTENER_ENABLED=true`, `LPR_DATA_POLICY_APPROVED=true` e `LPR_RETENTION_DAYS=30`. A `LPR_FINGERPRINT_KEY` já vem do `setup:env` e não se troca.
2. **Porta**: o `docker-compose.yml` publica a 17000. Restrinja ao IP público do NEURAL SERVER no security group ou na cadeia `DOCKER-USER`.
3. **Recriar o serviço** e conferir o log:

   ```bash
   docker compose up -d --force-recreate ms-video-analytics
   docker logs attlas-ms-video-analytics 2>&1 | grep neural_lpr_listening
   ```

4. **Cadastrar a instância** pela tela, com o IP descrito em [[Analítico - Neural Labs - Arquitetura e estratégias#Qual IP cadastrar]].
5. **Configurar o equipamento**: Client mode discando para o Attlas na 17000, formato XML completo (não o curto; o JSON é aceito, mas só depois de capturar e conferir um quadro real), "Send Image" desligado e um `ComputerID` por servidor.
6. **Conferir**: o `lastFrameAt` da instância anda e as câmeras do equipamento aparecem em "Aguardando vínculo".
7. **Vincular as câmeras** pela lista do equipamento ou pelo nome, e acompanhar na página da instância.

Leitura do resultado: o log `neural_lpr_listening` com a porta 17000 confirma o passo 3, e o `lastFrameAt` andando confirma que o equipamento conecta e envia. Câmeras fora de "Aguardando vínculo" com `lastFrameAt` parado indicam equipamento parado ou IP cadastrado errado; fuso errado na instância empurra a hora para o futuro e as leituras caem em `event_in_future`.

No dev.v2 o socket está ligado (`NEURAL_LPR_ENABLED=true`, `NEURAL_LPR_TCP_LISTENER_ENABLED=true`, `LPR_DATA_POLICY_APPROVED=true`, `LPR_RETENTION_DAYS=30`) e escuta na 17000. Pela tailnet (`100.101.165.32:17000`) a porta responde; pelo IP público (`3.15.199.101:17000`) o security group bloqueia. Nenhuma instância está cadastrada.

O que ainda falta para produção está em [[Analítico - Neural Labs - Pendências]].
