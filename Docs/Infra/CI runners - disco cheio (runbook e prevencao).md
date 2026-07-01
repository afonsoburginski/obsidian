---
tags:
  - infra
  - ci
  - runbook
  - attlas
status: ativo
data: 2026-06-29
---

# CI runners - disco cheio (runbook e prevencao)

Plano para o incidente de "No space left on device" nos runners self-hosted do GitHub Actions, e a prevencao para nao repetir.

## Os dois runners

| Runner | Onde | Acesso | Disco | Papel |
|--------|------|--------|-------|-------|
| `sumo-ci-runner` (maquina `ci-runner`) | VM libvirt no host sumo | `ssh sumo` -> `ssh ubuntu@192.168.122.66` | 145G (vda1) | runner dedicado, label `ci-sumo`, build-and-push |
| `aws-attlas-26` | EC2 (`ip-172-31-46-250`, IP publico 3.15.199.101) | `ssh aws-attlas-26` (ubuntu) | 193G (/dev/root) | runner + dev stack compartilhada (63 containers, 124 volumes) |

## O que aconteceu (29/06/2026)

O job de Lint falhou em 6s com `No space left on device` em `/home/ubuntu/actions-runner/_diag/...`. O runner que estourou foi o `sumo-ci-runner`.

**Causa raiz:** o `docker:build` dos microsservicos acumula imagens e build cache a cada run de CI e nada limpa. Medido no momento do incidente:

- **Sumo ci-runner:** disco 100% (9.2M livre). Docker com 210 imagens = 129.5GB e 23GB de build cache. Zero containers ativos, zero volumes.
- **EC2:** 73% (53G livre), ainda nao critico, mas 62GB de build cache e 54 imagens orfas acumuladas, alem da dev stack legitima.

## Correcao aplicada (resolvido)

Limpeza segura: build cache + imagens nao usadas por nenhum container. Nunca volumes, nunca containers em execucao.

```bash
# Sumo ci-runner (dedicado, pode limpar tudo que nao esta em uso)
sudo docker image prune -af
sudo docker builder prune -af
sudo docker container prune -f

# EC2 (compartilhado: preservar a dev stack)
sudo docker builder prune -af      # build cache: seguro, nao toca imagem/container/volume
sudo docker image prune -af        # so imagens SEM container; as 37 em uso ficam
# NAO rodar prune de volumes nem de containers na EC2
```

**Resultado:**

| Runner | Antes | Depois | Liberado |
|--------|-------|--------|----------|
| Sumo ci-runner | 100% (9.2M) | 17% (121G livres) | ~121GB |
| EC2 | 73% (53G) | 31% (134G livres) | ~80GB |

Dev stack da EC2 intacta: 63 containers e 124 volumes preservados.

## Prevencao (IMPLEMENTADO em 29/06/2026)

Causa = acumulo sem teto nem GC. Solucao em duas frentes ja aplicadas: **teto de armazenamento** (cap duro no Docker) + **limpeza periodica** com escalada por limiar. Caps diferenciados: a VM do sumo (hardware limitado, 145G) e mais apertada que a EC2.

| Host | Cap de build cache | Janela de imagens | Watermark | Frequencia do timer | GC no daemon |
|------|--------------------|-------------------|-----------|---------------------|--------------|
| Sumo ci-runner (VM) | 8GB | 24h | 70% | a cada 2h | sim (`daemon.json` BuildKit GC keepStorage 8GB) |
| EC2 aws-attlas-26 | 20GB | 72h | 85% | a cada 4h | nao (evita reiniciar docker e derrubar a dev stack; cap via timer) |

O cap de cache e imposto em runtime por `docker builder prune -af --keep-storage <CAP>` (sem reiniciar nada). Na VM do sumo soma-se o BuildKit GC no `daemon.json`, que mantem o cache abaixo de 8GB continuamente (nao depende do timer). Na EC2 nao se mexe no daemon para nao bouncar os 63 containers da stack.

### Camada 1 (principal): timer systemd em cada runner

Limpeza periodica, segura (nunca volumes nem containers em execucao), com cap de cache e escalada agressiva acima do watermark.

`/usr/local/bin/ci-docker-cleanup.sh` (valores `CACHE_CAP`/`IMAGE_UNTIL`/`WATERMARK` por host conforme a tabela acima):

```bash
#!/usr/bin/env bash
# CI runner disk guard com TETO de armazenamento.
# Seguro: nunca toca containers em execucao nem volumes.
set -uo pipefail
LOG=/var/log/ci-docker-cleanup.log
CACHE_CAP="8GB"     # EC2 usa 20GB
IMAGE_UNTIL="24h"   # EC2 usa 72h
WATERMARK=70        # EC2 usa 85
{
  echo "=== $(date -u) cleanup (cap=$CACHE_CAP until=$IMAGE_UNTIL wm=${WATERMARK}%) ==="
  df -h / | tail -1
  docker builder prune -af --keep-storage "$CACHE_CAP" || true
  docker image prune -af --filter "until=$IMAGE_UNTIL" || true
  USE=$(df --output=pcent / | tail -1 | tr -dc '0-9')
  if [ "${USE:-0}" -ge "$WATERMARK" ]; then
    echo "high watermark ${USE}% -> prune agressivo"
    docker builder prune -af || true
    docker image prune -af || true
  fi
  echo "--- after ---"; df -h / | tail -1
  echo "=== done ==="
} >> "$LOG" 2>&1
```

GC do daemon na VM do sumo, `/etc/docker/daemon.json` (requer `systemctl restart docker`, so quando a VM estiver ociosa):

```json
{ "builder": { "gc": { "enabled": true, "defaultKeepStorage": "8GB",
  "policy": [ { "keepStorage": "8GB", "all": true } ] } } }
```

`/etc/systemd/system/ci-docker-cleanup.service`:

```ini
[Unit]
Description=CI Docker cleanup (build cache + unused images, never volumes/running)
[Service]
Type=oneshot
ExecStart=/usr/local/bin/ci-docker-cleanup.sh
```

`/etc/systemd/system/ci-docker-cleanup.timer`:

```ini
[Unit]
Description=Periodic CI Docker cleanup (every 4h)
[Timer]
OnCalendar=*-*-* 00/4:00:00
Persistent=true
RandomizedDelaySec=300
[Install]
WantedBy=timers.target
```

Ativar:

```bash
sudo chmod +x /usr/local/bin/ci-docker-cleanup.sh
sudo systemctl daemon-reload
sudo systemctl enable --now ci-docker-cleanup.timer
sudo systemctl start ci-docker-cleanup.service   # roda uma vez agora
systemctl list-timers ci-docker-cleanup.timer
```

As janelas `until=24h`/`until=72h` preservam cache e imagens recentes (CI segue rapido); a escalada >85% so dispara em emergencia. Identico nos dois hosts: como a EC2 e compartilhada, o filtro nunca remove imagens em uso pelos 63 containers nem volumes.

### Camada 2: passo de cleanup no workflow de CI

Backup, caso o timer falhe ou um run unico estoure o disco. Um step `if: always()` no fim dos jobs de build, ou um `pre-job` que checa o disco:

```yaml
- name: Reclaim disk if low
  if: always()
  run: |
    USE=$(df --output=pcent / | tail -1 | tr -dc '0-9')
    echo "disk ${USE}%"
    if [ "$USE" -ge 80 ]; then
      docker builder prune -af
      docker image prune -af --filter until=72h
    fi
```

### Camada 3: alerta de disco

Ja existe Rancher Monitoring (Prometheus/Grafana) no quito. Adicionar alerta de `node_filesystem_avail < 15%` para o host sumo e para a EC2, avisando antes de chegar a 100%. A VM ci-runner nao esta no cluster monitorado; alternativa e exportar via node_exporter ou um cron simples que posta no chat se `>85%`.

## Notas de capacidade

- O disco da VM ci-runner e so 145G. Se mesmo com a Camada 1 ficar apertado, crescer o qcow2 (`qemu-img resize` + `growpart`/`resize2fs` no guest) e uma opcao, mas a limpeza periodica deve bastar.
- Na EC2 o disco e dividido com a dev stack; a Camada 1 segura nunca ameaca os dados da stack.

## Status de implementacao

- [x] Limpeza imediata nos dois runners (29/06/2026): sumo 100%->17%, EC2 73%->31%
- [x] Teto de armazenamento + timer systemd nos dois runners (cap de cache, watermark, frequencia por host)
- [x] BuildKit GC no `daemon.json` da VM do sumo (cap continuo de 8GB)
- [x] CI revalidado: Lint verde nos dois; Integration Test passou do setup (que antes morria por disco)
- [ ] Camada 2 (step de cleanup no workflow) - opcional, backup
- [ ] Camada 3 (alerta de disco <15% no Rancher Monitoring) - recomendado
