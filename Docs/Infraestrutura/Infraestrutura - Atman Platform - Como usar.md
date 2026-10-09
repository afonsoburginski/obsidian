---
tags:
  - doc
  - infra
  - kubernetes
  - argocd
aliases:
  - "Como usar a Atman Platform"
  - "Deploy em servidor remoto"
atualizado: 2026-10-09
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Atman Platform - Como usar

Volta para [[Infraestrutura]] · plano em [[Infraestrutura - Atman Platform - Plano e bootstrap]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Fluxo | Cluster + Template → **Ambiente** → **Deploy** de releases |
| Ambiente | A instalação do Attlas num cluster: namespace, domínio, serviços e bancos próprios |
| Deploy | Um serviço (Deploy, Promover, Rollback) ou todos (**Deploy do ambiente**). Cada clique é um commit no GitOps; o Argo CD aplica |
| Automático x manual | Vem do template (dev automático, prod manual) e pode ser trocado por serviço no switch **CD** |
| Switch CI | Desligado: releases novas do serviço ficam retidas, não aparecem para deploy |
| Servidor novo | Precisa de Kubernetes (RKE2) e de rede até o hub na porta 6443. Só Docker não serve |
| Endereço do ambiente | Botão no topo da tela, ao lado do seletor de ambiente, e chips na coluna do ambiente |

## As cinco peças

```widget
src: _widgets/diagrams/infra-atman-conceitos.html
```

## Exemplo: servidor remoto do zero

```widget
src: _widgets/diagrams/infra-atman-servidor-remoto.html
```

| Passo | Onde | Frequência |
| --- | --- | --- |
| 1. RKE2 | servidor | uma vez por servidor |
| 2. Rede até o hub | servidor e hub | uma vez por servidor |
| 3. JSON de registro | servidor | uma vez por servidor |
| 4. Conectar cluster | plataforma | uma vez por servidor |
| 5. Novo ambiente | plataforma | uma vez por instalação |
| 6. Deploy | plataforma | a cada versão |

## Uso do dia a dia

| Situação | Onde clicar |
| --- | --- |
| Versão nova chegou no dev | Nada: dev é automático |
| Levar a versão do dev para o prod | Serviço → **Promover**, ou Ambiente prod → **Deploy do ambiente** com "Igual ao dev" |
| Voltar uma versão | Serviço → Releases → **Rollback** na versão anterior |
| Algo caiu | Clicar no aviso (toast): abre Observar → Eventos do serviço |
| Abrir o Attlas de um ambiente | Botão com o endereço no topo da tela |

> [!warning] Ambiente novo nasce com os bancos vazios. Não há seed de bootstrap nas imagens; a cópia de dados de outro ambiente é manual (pg_dump/pg_restore por banco). Os Secrets `<serviço>-env` do namespace novo também não são copiados: rodar `local/env-secrets.sh <namespace> <compose-dir>` no hub.
