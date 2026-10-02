---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - ci
  - infra
titulo: "[Back] CI profissional: runner scale set em Kubernetes com ARC"
frente: CI
tamanho: a estimar
status: "Criada em 23/09, sem prazo. A fase 1 não depende de hardware e pode entrar em qualquer semana; as fases 2 a 5 dependem da compra de 6 pentes de 64 GB e, para ter redundância, de um segundo servidor."
atualizado: 2026-09-23
---

# CI - runner profissional em Kubernetes com ARC

Levar o CI de uma VM configurada à mão para um serviço profissional: autoescalável entre servidores,
declarado no repositório, com credencial mínima e com alerta. O desenho, os custos e os riscos estão
em [[Plano - CI profissional em Kubernetes com ARC]], e o estado de partida em
[[Registro - CI em 23 de setembro, VM ampliada e scale set]].

## O que fazer

- [ ] **Fase 1, sem hardware.** Versionar no `scripts/ci/` o serviço `ci-scaleset`, o governador, o
  orçamento de CPU e o provisionamento da VM, numa PR com base `develop`.
- [ ] **Fase 1, sem hardware.** Criar o GitHub App com permissão de administrar runners do repositório
  e trocar o token pessoal por ele.
- [ ] **Fase 1, sem hardware.** Alerta para fila parada e para o serviço do scale set fora do ar.
- [ ] **Fase 2.** Comprar e instalar os 6 pentes DDR5 RDIMM de 64 GB e 5600 MT/s.
- [ ] **Fase 3.** Cluster RKE2 só de CI com o ARC em modo Docker-in-Docker, cache em volume persistente,
  rodando em paralelo à VM.
- [ ] **Fase 4.** Virar o scale set `sumo-ci-runner` para o cluster.
- [ ] **Fase 5.** Segundo servidor como nó do cluster.

## Pronto quando

O CI sobrevive à queda de um servidor, cresce sozinho quando a fila aumenta, se recria a partir do
repositório e avisa quando para.
