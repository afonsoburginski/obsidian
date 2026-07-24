---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2323
frente: Infra / CI
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 24/07)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/1045
---

# SOFTWARE-2323 - Governor fair-share pela ocupação real + reciclagem de swap

Achado na auditoria pós-merge da #1038: o swap da VM de CI reencheu (8/8 GB) minutos depois de reciclado, com 18 GB de RAM livre. Causa: o governor dividia a RAM pelos 3 listeners sempre, então um job de integração legítimo de ~10 GB rodando SOZINHO era espremido num `MemoryHigh` de 9 GB e o kernel empurrava as páginas dele pro swap sem necessidade. Swap esgotado é o precursor exato do job zumbi (runner perde conexão com o GitHub sob pressão).

## O que foi feito

- Governor (modo dedicated) divide a RAM pelos runners OCUPADOS (`Runner.Worker` vivo), reavaliado por minuto: job sozinho ganha ~27 GB, 3 concorrentes ~9 GB cada.
- Rotação semanal recicla o swap (`swapoff/swapon`) quando a RAM absorve com folga de 2 GB, porque página fria de pico passado não volta sozinha e deixa o buffer esgotado pro próximo pico.

Fase 2 da #1038. Deployado e validado ao vivo: com 1 job rodando, o MemoryHigh dos 3 runners foi de 9 pra 27 GB no tick seguinte do governor.
