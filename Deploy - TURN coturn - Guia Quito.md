---
tags:
  - deploy
  - infra
  - coturn
  - turn
  - quito
aliases:
  - TURN Quito
  - coturn deploy
atualizado: 2026-10-08
---

# Deploy — TURN (coturn) — Guia Quito

## Resumo

| Item                | Valor                                         |
| ------------------- | --------------------------------------------- |
| Serviço             | coturn/coturn:4.6.2                           |
| Função              | Relay STUN/TURN para WebRTC público de câmeras |
| Referência no EC2   | Ambiente de dev (3.15.199.101) — mesmo modelo |
| Spec                | CROSS-063-public-webrtc-turn                  |
| Network mode        | host (obrigatório — relay precisa de IPs reais) |

## O que é e por que existe

O coturn é o servidor TURN/STUN do Attlas. Permite que navegadores fora da rede interna assistam ao streaming WebRTC das câmeras. Sem ele, qualquer rede que bloqueie UDP de saída (corporativa, hotel, aeroporto) não consegue receber vídeo.

No EC2 de dev já roda e funciona. Em Quito vamos usar exatamente o mesmo modelo.

## Arquivos do repositório

Todos vivem em `docker/` na raiz do monorepo:

| Arquivo                      | Destino no container                    | Observação                                   |
| ---------------------------- | --------------------------------------- | -------------------------------------------- |
| `docker/turnserver.conf`     | `/etc/coturn/turnserver.conf`           | Config estrutural, versionada, sem segredos  |
| `docker/coturn-certs/`       | `/etc/coturn/certs/`                    | No repo só tem README — cert real no servidor |

Para copiar pro servidor:

```
scp -r docker/turnserver.conf docker/coturn-certs/ usuario@<ip-quito>:~/docker/
```

> [!warning] coturn-certs
> O repo não versiona certificados. No servidor precisa existir:
> - `~/docker/coturn-certs/fullchain.pem`
> - `~/docker/coturn-certs/privkey.pem`
>
> Origem: Let's Encrypt do domínio público ou mesmo certificado do ingress.

## Configuração estrutural (turnserver.conf)

O arquivo é versionado e não contém segredos. Destaques:

| Parâmetro             | Valor         | Função                                              |
| --------------------- | ------------- | --------------------------------------------------- |
| `listening-port`      | 3478          | STUN/TURN padrão                                    |
| `tls-listening-port`  | 5349          | TURN over TLS (atravessa firewall corporativo)      |
| `min-port`/`max-port` | 49160–49200   | Faixa de relay (~40 sessões simultâneas)             |
| `use-auth-secret`     | —             | Credencial HMAC por segredo compartilhado           |
| `no-tlsv1/1_1`        | —             | Só TLS 1.2+                                         |
| `no-tcp-relay`        | —             | Relay só UDP (TLS é pro signaling, não pro payload) |
| `total-quota`         | 40            | Alinhado à faixa de relay                           |
| `user-quota`          | 6             | Máx alocações por usuário                           |
| `max-bps`             | 6000000       | ~6 Mbps por sessão                                  |
| `denied-peer-ip`      | redes privadas | Impede usar o relay como pivô pra rede interna     |

## Segredos e valores por servidor

Entram pelo `docker-compose.override.yml` do servidor (nunca no repo), sobrepondo o command do coturn:

```yaml
coturn:
  command:
    - '-c'
    - '/etc/coturn/turnserver.conf'
    - '--static-auth-secret=$TURN_SECRET'
    - '--external-ip=$TURN_PUBLIC_IP'
    - '--realm=$TURN_REALM'
```

| Variável          | O que é                                | Exemplo              |
| ----------------- | -------------------------------------- | -------------------- |
| `TURN_SECRET`     | Segredo compartilhado pra auth HMAC    | string aleatória longa |
| `TURN_PUBLIC_IP`  | IP público do servidor de Quito        | 203.0.113.50         |
| `TURN_REALM`      | Domínio de autenticação público        | turn.attlas.io       |

Para gerar um segredo:

```bash
openssl rand -hex 32
```

## Portas — firewall do servidor

Todas precisam estar abertas para inbound público:

| Porta         | Protocolo | Função                |
| ------------- | --------- | --------------------- |
| 3478          | UDP + TCP | STUN/TURN             |
| 5349          | TCP       | TURN over TLS         |
| 49160–49200   | UDP       | Relay range do coturn  |

> [!warning] Sobre abrir portas
> A spec CROSS-063 determina que as portas públicas só devem ser abertas **após** a autenticação do stream estar implementada e validada (WHEP autenticado via token assinado pelo ms-cameras). Sem isso, qualquer pessoa com o UUID de uma câmera assiste sem login.
>
> No EC2 de dev isso é aceitável. Em produção (Quito), respeitar a sequência do runbook.

## Docker Compose

O serviço já está definido no `docker-compose.yml` do repo:

```yaml
coturn:
  image: coturn/coturn:4.6.2
  profiles: ['full']
  container_name: attlas-coturn
  network_mode: host
  volumes:
    - ./docker/turnserver.conf:/etc/coturn/turnserver.conf:ro
    - ./docker/coturn-certs:/etc/coturn/certs:ro
  command: ['-c', '/etc/coturn/turnserver.conf']
  restart: unless-stopped
```

`network_mode: host` é obrigatório — o relay TURN precisa enxergar endereços reais e a faixa de portas não funciona em bridge.

## Dependências no ecossistema

O coturn não funciona sozinho — o mediamtx precisa saber que ele existe:

| Config do mediamtx             | Função                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `webrtcAdditionalHosts`        | IP/DNS público, pra anunciar candidato host roteável       |
| `webrtcICEServers2`            | Lista de STUN+TURN que o mediamtx repassa ao navegador     |

Ambos entram por env no servidor (`MTX_WEBRTCADDITIONALHOSTS`, `MTX_WEBRTCICESERVERS2`), não no repo.

## Checklist de deploy

- [ ] Copiar `turnserver.conf` e `coturn-certs/` pro servidor
- [ ] Gerar `TURN_SECRET` e definir no override
- [ ] Definir `TURN_PUBLIC_IP` (IP público do servidor de Quito)
- [ ] Definir `TURN_REALM` (domínio público)
- [ ] Colocar certificado TLS real em `coturn-certs/` (`fullchain.pem` + `privkey.pem`)
- [ ] Configurar `webrtcICEServers2` no mediamtx com o TURN
- [ ] Abrir portas 3478, 5349, 49160-49200 no firewall
- [ ] Testar de rede externa sem VPN
- [ ] Testar de rede com UDP bloqueado (deve cair no relay TLS 5349)

## Rollback

Fechar as portas no firewall reverte a exposição pública imediatamente. O coturn e a config de ICE podem permanecer sem efeito colateral — sem portas abertas não há tráfego externo.
