---
tags:
  - doc
  - infraestrutura
  - ci-cd
aliases:
  - "Infraestrutura - CI-CD de ponta a ponta"
  - "CI/CD de ponta a ponta"
  - "Pipeline completo"
  - "Infraestrutura - Pipeline de CI-CD"
  - "Pipeline de CI/CD"
  - "Versionamento"
atualizado: 2026-10-14
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Infraestrutura - CI-CD de ponta a ponta

Volta para [[Infraestrutura]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| CI | GitHub Actions em runners self-hosted da VM `ci-runner`, dois scale sets: um para PRs (até 8 vagas) e um reservado para a `develop` (até 2). Operação em [[Infraestrutura - CI e runners]] |
| Gate de merge | Lint, validadores e build. Nenhuma suíte de teste roda no CI: a integração está desligada e o unitário não é job |
| Imagens | `atmanadmin/attlas-<ms>:<sha>` (e `:dev`) no Docker Hub; o push pula a imagem cujo conteúdo de build não mudou |
| Release | O Orbit lê cada run verde do `ci-develop`, confere a imagem no Docker Hub e grava a versão semver em `catalog/<serviço>.yaml` do GitOps |
| CD | O Orbit aplica a release mais nova no ambiente `dev` em ondas de 4 serviços, com health gate; o Argo CD aplica no cluster |
| Rollback | Releases, Rollback na tela do Orbit (commit `rollback(<env>)`); crash loop depois de uma onda reverte sozinho |
| Deploy por Docker Compose | não existe: o CI não tem workflow de deploy, e o dev é entregue só pelo Orbit |
| Fonte no código | `CROSS-012` (pipeline) e `CROSS-022` (redução de fan-out) em `docs/specs/cross-service/` |

## Visão geral

```widget
src: _widgets/diagrams/infra-cicd-ponta-a-ponta.html
```

## Do commit ao pod

1. **PR.** O `ci-pr` roda lint, validadores e build dos projetos afetados. Lint verde e build verde liberam o merge.
2. **Merge na `develop`.** O `ci-develop` roda lint, constrói só o que o `nx affected` aponta desde o último Build e Push verde e publica as imagens. Os runs entram em fila e o que está rodando termina; o seguinte publica tudo que o anterior, substituído, publicaria.
3. **Release.** A cada 2 minutos o Orbit lista os runs verdes do `ci-develop`, confere cada imagem no Docker Hub e commita a versão no GitOps. A autoria da release é a do autor da PR, não de quem apertou o merge.
4. **Deploy.** No ambiente com deploy automático, o Orbit troca as tags em `apps/dev/<serviço>.yaml` por onda, e o Argo CD aplica cada onda. Ambiente com deploy manual só registra a release.
5. **Acompanhamento.** Pipelines, Releases e Monitoramento no Orbit mostram o caminho; OOM e crash loop disparam a autocorreção ([[Infraestrutura - Orbit#Entrega e autocorreção]]).

Run em fila acumulada gera um deploy só, no mais novo: cada deploy intermediário recriaria todos os serviços.

## Versionamento

| Identificador | Exemplo | Para que serve |
| --- | --- | --- |
| Imagem `:<sha>` | `attlas-ms-cameras:3a5045d` | identidade exata do build |
| Imagem `:dev` | `attlas-ms-cameras:dev` | carrega o hash do contexto de build usado para pular imagem igual |
| Release no catálogo | `1.4.0` com a tag `3a5045d` | o que aparece para deploy no Orbit |

| Título do commit do run | Efeito na versão |
| --- | --- |
| `feat:` | minor (`1.4.0` para `1.5.0`) |
| `!` depois do tipo, ou `BREAKING CHANGE` | major |
| qualquer outro tipo | patch |

A versão sai do commit que disparou o run, não de cada serviço separado: um merge que muda um serviço gera release de todo serviço cuja imagem foi publicada nesse run.

## Imagens

O `push-images.sh` calcula o `sha256` de tudo que entra na imagem (`dist/apps/<ms>`, Dockerfile, configuração e migrations do Prisma, `.dockerignore`) e compara com o label `attlas.build-sha256` da `:dev` no registry. Iguais, pula build e push. Diferente, constrói com o hash como label, sobe `scripts/ci/smoke-image-boot.sh` (a imagem precisa resolver os módulos de runtime) e publica `:dev` e `:<sha>`, até 4 imagens em paralelo. Serviços esqueleto (`.github/skeleton-services.txt`) ficam fora de lint, build e push.

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| todo merge redeploya cerca de 23 serviços | o build é determinístico, mas todo backend embute todos os catálogos de tradução (`TRANSLATION_CATALOGS`) e o `ErrorCode` compartilhado: uma mensagem nova muda o `main.js` de todos, e o pulo por hash não dispara | o CD em ondas segura a estabilidade enquanto isso; solução de fundo em Pendências |
| release que o Orbit não registra | token do GitHub do Orbit sem acesso, ou tag ausente no Docker Hub | Configurações, Integrações no Orbit; conferir `docker buildx imagetools inspect atmanadmin/attlas-<ms>:<sha>` |
| PR empilhada sem checks | o `ci-pr` confere `base.ref == develop` | `gh workflow run ci-pr.yml --ref <branch>` |

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Decidir se cada backend embute só o `core.json` e os catálogos do próprio módulo (notifications, reports e audit seguiriam com todos) | tira o redeploy em massa a cada merge; muda a regra do `CLAUDE.md` e do `contracts.md`, então exige spec cross-service | `libs/contracts`, `CLAUDE.md` |
| Religar a integração no CI | nenhuma suíte de teste é gate de merge | seção 14.5 de `CROSS-022` |
| CI em Kubernetes com ARC | ver [[Infraestrutura - CI e runners#Pendências]] | [[SP-01 - Infraestrutura - CI - Runner profissional em Kubernetes com ARC]] |
| Reduzir o que cada merge afeta: a lib de contratos é um projeto só, `package-lock.json`, `tsconfig.base.json` e qualquer `project.json` marcam todos os projetos | cada merge publica cerca de 21 imagens | spec da pipeline por serviço em rascunho: [[S35-31 - Infraestrutura - CI - Plano da pipeline de CI e CD por serviço]] |
| Segundo ambiente (cliente ou produção) em cluster real | o hub dev tem 8 vCPU e não comporta um segundo ambiente completo | [[Infraestrutura - Orbit#Servidor novo]] |

## Secrets do repositório

| Secret | Usado em | Descrição |
| --- | --- | --- |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Build e Push | conta `atmanadmin` do Docker Hub |
| `NX_REMOTE_CACHE_TOKEN` | CI | cache remoto do Nx |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude-code-review.yml` | review automático |

O token do GitHub que o Orbit usa para ler runs e gravar o runner fica em `/secrets/github-token` no hub, não nos secrets do repositório.

## Comandos úteis

```bash
npm run ci:trigger:services --projects=ms-cameras
gh run watch $(gh run list --workflow=ci-develop.yml --limit=1 --json databaseId -q '.[0].databaseId')
ssh ec2-attlas 'export PATH=$HOME/bin:$PATH; kubectl --context kind-attlas -n argocd get applications'
```

O primeiro dispara o `ci-develop` para projetos específicos; o segundo acompanha o último run; o terceiro lista o estado dos aplicativos no Argo CD do hub.

## Glossário

| Termo | O que é |
| --- | --- |
| `nx affected` | projetos que o Nx considera tocados pelo diff entre a base e o commit |
| health gate | espera Synced e Healthy no Argo CD antes de aplicar a onda seguinte |
| onda | grupo de serviços trocados num mesmo commit do GitOps |
| catálogo | `catalog/<serviço>.yaml`, a lista de releases de um serviço |
| fan-out | quantidade de projetos que uma mudança marca como afetados |
