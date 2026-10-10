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
| Endereço do Orbit | https://orbit.3-15-199-101.sslip.io (login próprio, sem Tailscale) |
| Automático x manual | Interruptor **Deploy automático** no template (vale para ambientes novos) e no ambiente (vale para o ambiente inteiro). Por serviço: interruptor **CD** |
| Switch CI | Desligado: releases novas do serviço ficam retidas, não aparecem para deploy |
| Seeds | Templates → aba **Seeds**: pacote de `.sql` por serviço, privado no hub. O template aponta o pacote padrão |
| Dados de um ambiente novo | Escolhidos no diálogo **Novo ambiente** (ver [[#Dados iniciais]]) |
| Servidor novo | Kubernetes (RKE2) com rede até o hub na porta 6443, ou servidor Docker com template Docker Compose |
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
| Ajustar um seed | Templates → Seeds → arquivo → editar → **Salvar…** (mostra o diff, pede nota, guarda a versão anterior) |
| Subir um seed novo | Templates → Seeds → arrastar o `.sql` (o nome do arquivo vira o serviço) |
| Reaplicar seeds num ambiente | Templates → Seeds → **Aplicar em ambiente** (backup antes, confirmação com o nome do ambiente) |
| Mudar a máquina de um template | Template → Dimensionamento → **Máquina de destino** |

## Dados iniciais

Escolha feita no diálogo **Novo ambiente**, seção "Infraestrutura e dados". O padrão vem do template.

| Opção | O que acontece | Quando usar |
| --- | --- | --- |
| Pacote de seeds | Bancos novos, migrations, depois o `.sql` de cada serviço do pacote (modo substituir, com backup) e a senha do master | Padrão: o template aponta o pacote. Só no cluster do hub |
| Copiar de outro ambiente | Job copia cada banco do ambiente de referência (`pg_dump` → `psql`) | Reproduzir um problema com dados reais. Só no mesmo cluster |
| Bancos vazios | Só migrations, sem usuário | Teste do zero |

| Pacote | Template | Conteúdo |
| --- | --- | --- |
| `dev` (Dev) | dev | Configuração e cadastros do dev, 15 serviços, extraídos em 08/10/2026. Tem nomes e e-mails reais |
| `prod` (Bootstrap de produção) | prod | Gerado pelos `seed.ts` dos serviços: organização Atman, master `admin@atmansystems.com`, módulos, licença padrão, provedores de API, templates de notificação, definições de relatório, fabricantes (câmeras, controladores), fontes de PMV. Sem demonstração |

> [!warning] As imagens não trazem `seed.js` (o `seed.ts` roda só com `tsx` no monorepo), então não existe bootstrap automático no deploy. O bootstrap de um ambiente novo é o pacote `prod`. Para regenerar: Postgres descartável, `prisma migrate deploy` + `npx tsx <seed.ts>` de cada serviço, `pg_dump --data-only --disable-triggers` e enviar pela aba Seeds.

"Infraestrutura de dados" é separada: define tamanhos e versões de bancos, Redis, Kafka, Kong e MinIO copiando a configuração de outro ambiente, ou nenhuma infraestrutura.

> [!warning] Seeds contêm nomes e e-mails reais: ficam só em `~/atman-platform/secrets/seeds/` no hub, nunca no Git. No modo pacote de seeds, o e-mail do master precisa existir no seed do `organization`.

> [!warning] Os Secrets `<serviço>-env` só são copiados quando há ambiente de referência na infraestrutura. Sem referência: `local/env-secrets.sh <namespace> <compose-dir>` no hub.
