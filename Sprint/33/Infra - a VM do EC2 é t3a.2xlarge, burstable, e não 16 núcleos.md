---
tags:
  - attlas
  - task
  - sprint-33
  - infra
  - analitico
card: SOFTWARE-3175
clickup: https://app.clickup.com/t/86akhn8q4
titulo: "[Infra] A VM de desenvolvimento é uma t3a.2xlarge burstable: redimensionar para o analítico rodar 24/7"
frente: Plataforma
tamanho: 2 pts
pr: "#3431 - aberta, CI rodando"
status: "PR #3431 aberta com o registro do que a máquina é, a consequência de ser burstable, o tipo alvo (`c7a.4xlarge`/`c7i.4xlarge`) e o procedimento da troca, em `docs/architecture/dev-environment.md`. A troca de tipo em si depende do console da AWS e de uma janela combinada - é o que falta para o critério de aceite fechar. Medições reconferidas no box em 14/09 por IMDS e `lscpu`."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-27
---

# Infra - a VM do EC2 é t3a.2xlarge, burstable, e não 16 núcleos

> [!info] Estado em 26/09: modo `unlimited` confirmado
> O Zanini confirmou que a instância está em `unlimited`. A CPU não é estrangulada por crédito, e o uso
> acima do baseline sai como custo excedente. O passo "confirmar o modo `unlimited` no console" abaixo
> está feito. O Hadson também leu o CloudWatch pelo CloudShell, que usa a sessão do console e não pede
> chave de acesso. A CPU ficou em 70,2% de média na semana de 12/09 e em 54,0% na de 19/09. O
> `CPUCreditBalance` está zerado e o excedente no teto de 4.608, cerca de US$ 9,41 em 7 dias (uns
> US$ 40 por mês). A troca de família se justifica pelo steal (média de 8%, picos de 18% a 22%), não
> pela lentidão percebida, que em 26/09 se provou ser do front e da rede.

Verificado direto no box em 14/09 (`i-06e8f8cf75102367e`, `us-east-2c`):

| O que | Valor |
| --- | --- |
| Tipo (IMDS) | **t3a.2xlarge** |
| CPU | 8 vCPU = 4 núcleos físicos AMD EPYC 7571 (Zen 1) com SMT, todos online (`0-7`), nenhum offline |
| Memória | 32 GiB, 19 livres |
| Limites | nenhum cpuset; só o container `attlas-asm` tem `cpus: 3.0` |
| Uso no instante | 82% user, 13% sys, **0% idle**, 0% steal |
| Conjunto de instruções | AVX2; sem AVX-512, sem VNNI |

**Não há o que habilitar**: os 8 vCPU são tudo que a instância tem. Uma t3a.2xlarge é da família
**T, burstable**: o baseline é 40% por vCPU (cerca de 3,2 vCPU sustentados) e o resto é crédito de
CPU. Com 0% de idle o dia inteiro, ou a conta está em modo `unlimited` pagando excedente, ou os
créditos acabam e o hypervisor estrangula a CPU - e isso aparece na tela exatamente como "trava do
nada". Não deu para ler o saldo de créditos (`CPUCreditBalance`) porque nem o box nem esta máquina têm
AWS CLI com credencial; é a primeira coisa a olhar no console.

## O que o card decide

- **Redimensionar** para família de computação, não burstable, escolhida pela carga do analítico:
  `c7a.4xlarge` (16 vCPU AMD Zen 4, com AVX-512 e VNNI, que fazem o INT8 do estudo valer) ou
  `c7i.4xlarge` (16 vCPU Intel, AVX-512 VNNI e AMX). É stop, troca de tipo, start - minutos de
  indisponibilidade, janela combinada.
- Enquanto não trocar: confirmar o modo `unlimited` no console e ler `CPUCreditBalance` e
  `CPUSurplusCreditBalance` no CloudWatch para saber se o box já foi estrangulado.
- Depois da troca, refazer a medição da seção 1 do estudo e recalibrar o orçamento de CPU do analítico
  (`cpus:` no compose, `intraOpNumThreads`, shards).

## Critério de aceite

Instância de computação com 16 vCPU e 0% de steal em 24 h; carga do host abaixo de 8 com o analítico e
o videowall ligados; a medição nova registrada no estudo.
