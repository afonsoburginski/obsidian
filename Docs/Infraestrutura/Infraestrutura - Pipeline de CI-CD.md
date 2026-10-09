---
tags:
  - doc
  - infra
  - ci-cd
  - argocd
  - versionamento
aliases:
  - "Pipeline de CI/CD"
  - "Versionamento"
atualizado: 2026-10-09
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Pipeline de CI/CD

Volta para [[Infraestrutura]] · plano em [[Infraestrutura - Atman Platform - Plano e bootstrap]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| CI (build, testes, imagem) | **GitHub Actions**, como hoje. Sem CircleCI, Jenkins ou CI de outra ferramenta |
| CD (deploy, rollback) | **Atman Platform** grava a versão no repositório **GitOps**; o **Argo CD** aplica no cluster |
| Dev | Ambiente com sync automático: o que entra no Git é aplicado sozinho |
| Cliente | Ambiente com sync manual: a plataforma dispara o sync no deploy (ADR 25) |
| Versão | **Semver independente por microsserviço**, calculada pelos commits convencionais |
| Rollback | Botão **Rollback** na plataforma, para qualquer release anterior (commit `rollback(<env>)`) |
| Impacto no CI | `ci-pr` e o build não mudam; entra um job de release que grava o catálogo |

Por que não trocar o CI: o `ci-develop` já faz o que é caro de reconstruir (runners self-hosted, `nx affected`, pulo de imagem por hash).

## Visão geral

```widget
src: _widgets/diagrams/infra-pipeline-argocd.html
```

## Do commit ao cluster

1. **PR.** O `ci-pr` roda lint, testes e validadores dos projetos afetados. Sem mudança.
2. **Merge na `develop`.** O `ci-develop` constrói só os afetados e publica `atmanadmin/attlas-<ms>:<sha>` (e `:dev`, até o corte). Sem mudança.
3. **Release.** A versão semver do serviço entra em `catalog/<serviço>.yaml` no GitOps (hoje por commit; planejado: job no CI).
4. **Deploy.** Na plataforma, escolher serviço, ambiente e release. Vira um commit em `apps/<ambiente>/<serviço>.yaml` (`deploy(<env>): <serviço> v1.2.0 (era v1.1.0)`).
5. **Argo CD.** Ambiente automático aplica em segundos; manual recebe o sync disparado pela plataforma. Rolling update sem queda.
6. **Acompanhar.** Status, pods, logs e métricas mudam na tela em tempo real; volta com **Rollback** se precisar.

## Quem faz o quê

| Peça | Responsabilidade |
| --- | --- |
| GitHub Actions | Testa, constrói, publica a imagem; versiona (planejado) |
| Docker Hub (`atmanadmin`) | Guarda `:<sha>` e `:<versão>`; credencial de leitura nos clusters |
| Repositório GitOps | Fonte da verdade: templates, ambientes, infraestrutura, serviços, versões implantadas, catálogo |
| Argo CD | Aplica o GitOps nos clusters (ApplicationSets `attlas` e `attlas-infra`), corrige drift |
| Atman Platform | Deploy, promoção, rollback, ambientes, templates, clusters, observabilidade e docs |
| Kubernetes | Roda os serviços; um cluster por cliente |

## Versionamento

| Identificador | Exemplo | Para que serve |
| --- | --- | --- |
| Imagem `:<sha>` | `attlas-ms-cameras:3a5045d` | Identidade exata do build |
| Release no catálogo | `v1.4.0` → `3a5045d` | O que aparece para deploy na plataforma |
| Imagem `:<versão>` | `attlas-ms-cameras:1.4.0` | Retag do `:<sha>`, sem rebuild (planejado) |
| Tag git | `ms-cameras@1.4.0` | Base do próximo cálculo (planejado) |
| `:dev` | `attlas-ms-cameras:dev` | Legado do compose; o ambiente dev do k8s usa enquanto o catálogo não cobre todos |

| Commit | Efeito na versão |
| --- | --- |
| `feat:` | minor (`1.4.0` → `1.5.0`) |
| `fix:` | patch (`1.4.0` → `1.4.1`) |
| `feat!:` ou `BREAKING CHANGE:` | major (`1.4.0` → `2.0.0`) |
| `refactor:`, `test:`, `docs:`, `chore:` | nenhuma |

## Templates por ambiente

O template define escala e política; o ambiente aplica o template num cluster. `dev` e `prod` são os iniciais.

| | dev | prod |
| --- | --- | --- |
| Pods por serviço | 1 a 3 (HPA) | 2 a 6 (HPA) |
| Alvo de CPU | 60% | 70% |
| Descida | 1 pod a cada 30 s depois de 60 s calmo | até metade por minuto depois de 5 min calmo |
| PodDisruptionBudget | não | ao menos 1 pod de pé |
| Deploy | automático | manual |
| Terraform | 1 EC2 com RKE2 de nó único | RKE2 em servidores existentes do cliente, por SSH |

Bancos, Redis e Kafka **não escalam**: ficam no chart `atman-infra` com réplica fixa. Conectores com TCP de hardware e o `ms-reports-worker` têm o HPA desligado.

**Teste no EC2 (09/10/2026):** `web-attlas` foi de 1 a 3 pods em ~20 s com carga e voltou a 1 seguindo a janela de descida; no ambiente completo, o `ms-detector-history` escalou para 3 sozinho.

## Como usar a plataforma (o essencial)

| Quero | Onde |
| --- | --- |
| Fazer deploy | Botão **Fazer deploy** (topo) ou Serviço → Releases |
| Promover dev → prod | Visão geral → Esteira → **Promover** |
| Voltar uma versão | Serviço → Releases → **Rollback** |
| Ver logs e métricas | Serviço → Observar |
| Criar ambiente | Ambientes → **Novo ambiente** |
| Conectar cluster de cliente | Clusters → **Conectar cluster** |
| Acompanhar o CI | Pipelines (precisa do token do GitHub em Configurações) |

## Impacto no que existe hoje

| Parte | Muda? |
| --- | --- |
| `ci-pr` | Não |
| `ci-develop` build e push | Não; ganha o job de release (planejado) |
| `push-images.sh` | Pequeno: expor a lista do que publicou |
| Commits | Já são convencionais |
| `deploy.yml` (SSH + compose) | Fica até o corte do dev |

## Próximos passos

1. Job de release no CI gravando `catalog/<serviço>.yaml` e o retag `:<versão>`.
2. Deploy automático no dev a cada merge (commit em `apps/dev/` pelo CI).
3. Repositório `attlas-gitops` no GitHub com deploy key para a plataforma e o CI.
4. Ambiente do primeiro cliente com sync manual.
5. Corte do dev e desligamento do `deploy.yml`.
