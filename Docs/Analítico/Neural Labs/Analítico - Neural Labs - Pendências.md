---
tags:
  - doc
  - analitico
  - neural-labs
  - pendencias
aliases:
  - "Analítico - Neural Labs - Pendências"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Pendências

Volta para [[Analítico - Neural Labs]].

## Resumo

Seis itens faltam na integração com a Neural Labs: duas decisões da empresa, a primeira captura de um equipamento real, as perguntas ao fornecedor e dois ajustes de produto. Como ligar o socket está em [[Analítico - Neural Labs - Runbook]]. O que falta em todo o [[Analítico]] está em [[Analítico - Pendências]].

## O que falta

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Aprovar a política de dados de placa e a retenção para produção | sem as duas o socket não abre | decisão da empresa |
| Regra do security group e cadastro da instância | o equipamento só conecta pelo IP público liberado | quando o IP do NEURAL SERVER for conhecido |
| Primeira captura real do equipamento: `IncidenceID`, `Engine`, encoding do `CamName` e reconexão depois de uma queda | o socket foi provado com simulador e com o exemplo do manual, não com o equipamento | dev.v2, com o NEURAL SERVER do cliente |
| Perguntas ao fornecedor: fuso das datas e sincronismo dos relógios, se o sentido é medido por veículo ou vem da faixa, unidade do `Speed`, amostra real das mensagens | definem a conversão da hora e o uso do sentido e da velocidade | Neural Labs, junto com [[Analítico - Neural Labs - Vínculo de câmeras#O que perguntar à Neural Labs]] |
| Mostrar na tela as divergências entre associação e vínculo | a regra do módulo pede, e a API já devolve | [[Analítico - Neural Labs - Vínculo de câmeras#Divergências]] |
| Alinhar o tempo de viagem ao documento dos gestores | o cálculo atual diverge em mediana, mínimo de veículos, limites e sentido | [[Analítico - Neural Labs - Tempo de viagem#Pendências]] |
