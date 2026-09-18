---
tags:
  - attlas
  - sprint-33
  - validacao
  - prompt
aliases:
  - "Prompt de handoff da validação da Sprint 33"
  - "Continuar a validação das PRs da Sprint 33"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "CRIADO em 14/09 quando os prompts da sessão A acabaram no meio da conferência. É o handoff para outra sessão (Codex) terminar: 3 PRs nunca validadas (#3432, #3433, #3480) e a prova de tela de 5 outras. Traz o estado do ambiente e as armadilhas que já custaram tempo."
atualizado: 2026-09-14
---

# Prompt - continuar a validação das PRs da Sprint 33

Você continua uma validação já em andamento. Não escrever feature nova, **não mergear** - o merge é do usuário.

## Regras duras (do usuário, valem à risca)

1. **NUNCA mergear.**
2. **PROIBIDO `nx test`, `nx lint`, `nx build`, `tsc` e jest.** O PC é fraco e já travou duas vezes hoje. O CI é o gate. Isso não é negociável e não é "perda de tempo" só por opinião: rodar suíte aqui derruba a máquina do usuário.
3. **Um ambiente por vez.** Máximo **um** `nx serve` de cada vez e ~10 containers. Ao terminar cada PR, derrubar o que subiu e matar processo órfão (`ss -ltnp | grep :3300`, `kill -9`).
4. **Tela se prova no navegador (Playwright MCP), não com `curl`.** `curl` dá 200 com build quebrado.
5. **EC2 (`ubuntu@100.101.165.32`, Tailscale) é SOMENTE LEITURA.** Não aplicar o `ec2-analytics-enable-all.sql`.
6. **Achado de verdade vira `gh pr comment`**, não nota solta.
7. **O usuário não valida nada.** Ele não sabe apontar o front para worktree e não quer saber. Você sobe, você derruba. Só chame ele se for percepção visual ("essa tela parece certa?") ou performance sentida.
8. Resposta ao usuário: **curta e numerada**. Ele tem Asperger e lê mal texto corrido. Formato por PR:

```
PR #NNNN - <título em 5 palavras>
1. Entrega o valor do card? SIM / NÃO / PARCIAL
2. Como provei: <uma linha>
3. Quebrado: <uma linha, ou "nada">
4. Preciso de você: <uma linha, ou "nada">
```

## Fonte de verdade

Vault Obsidian em `~/Área de trabalho/obsidian` (MCP `obsidian`, vault `attlas`):
- `Sprint/33/index.md` - as 22 tasks e o que cada uma entrega
- `Sprint/33/Validação - as 34 PRs, uma a uma.md` - o checklist, uma linha por PR

E o corpo de cada PR (`gh pr view <n> --json body`) diz o que ela promete. **Medir contra o que ela promete**, não contra o que seria bom ter.

---

## O que JÁ está validado (não repetir)

| PR | Veredito | Comentário postado? |
| --- | --- | --- |
| #3447 | SIM | sim - a regra nova do `workflow.md` não fecha: `db-controllers`, `redis-controllers`, `redis-pmv`, `db-selective-priority`, `redis-video-analytics` são de serviço real e continuam atrás do profile `full` |
| #3441 | SIM | sim - salvar região apaga o `virtualLoop` do `metadata` (pré-existente, fix é um spread no `toRegionUpsert`); corpo do `PUT` sem classe de validação aceita `incidentsSettings.type` fora do enum |
| #3443 | SIM | não (nada a reportar) |
| #3449 | PARCIAL | sim - a tradução está certa, mas **nada no app lê `statusCounts`**: os tiles da fila são por criticidade, e o único lugar que desenha status é a face de Métricas, que lê outro endpoint |
| #3452 | SIM | não |
| #3478 | SIM | não |
| #3462 | SIM | não |
| #3459 | SIM (por leitura) | não - falta a prova de tela |
| #3451 | SIM (por leitura) | não - falta a prova de tela |
| #3438 | PARCIAL | não - falta provar que o transporte reporta `captureTime` de fato |
| #3437 | SIM | não |
| #3465 | SIM | não |
| #3482 | SIM | sim - `cachedRegions` não filtra por analítico: na PTZ, abrir a config de Laço Virtual antes de ela ter região mostra a geometria do ATSPM |
| #3439 | SIM | não |
| #3469 | SIM | não |

---

## O QUE FALTA (é o seu trabalho)

### 1. Três PRs nunca validadas - prioridade

- **#3432** - a inferência cabe num orçamento de CPU (`intraOpNumThreads`, teto no Compose). Worktree pronta: `.claude/worktrees/s33-t3f1` (`analytics/feat/SOFTWARE-3176-fase-1`).
- **#3433** - entrada do modelo medível, primeira caixa da câmera de volta. Worktree: `.claude/worktrees/s33-t3f2` (`-fase-2`). **Fase de stack traz a de baixo: teste a f2 e você testa as duas.**
- **#3480** - sessão por câmera e perfil, encerramento só no último espectador. Worktree: `.claude/worktrees/s33-t7f2` (`cameras/feat/SOFTWARE-3180-fase-2`).

Para #3480 o teste que importa: abrir a mesma câmera em **duas** abas/players e verificar que existe **uma** sessão `ffmpeg`/path no MediaMTX, e que fechar a primeira **não** derruba a segunda. O `ms-cameras` expõe isso; a contagem de sessão vive no `FfmpegSessionService` / registry de streaming.

### 2. A prova de tela que ficou pendente

O front **já está subindo** na worktree da #3459 quando este handoff foi escrito (`.claude/worktrees/s33-t1`). Verifique com `curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/` e siga.

- **#3459** - trocar de aba ATSPM ↔ Laço Virtual e provar que a face que sai **fica no DOM** (`document.querySelector('app-atspm-panel')` continua existindo, com `hidden` true) e que voltar **não** remonta. E contar as requisições de miniatura ao abrir a lateral: deve abrir na **lista**, não no stream. Use `mcp__playwright__browser_network_requests` com filtro `thumbnail`.
- **#3451** - abrir uma tela com câmera fora do ar, contar quantos `GET .../thumbnail` saem, navegar para outra tela e voltar: **não deve pedir de novo** dentro de 5 min.
- **#3452** - abrir a árvore de classes na Detecção e a lista de classes do incidente de Anomalia/Animal: nenhum código cru (`stones`, `traffic_light`, `feline`) na tela, tudo traduzido.
- **#3478 / #3462** - abrir a ACOM (Controladores) com câmera que tenha laço e ver o laço desenhado, mesma cor e mesmo número no cartão e no modal.
- **#3438** - só se prova com WebRTC do path do analítico. Se não der, diga isso e siga: é premissa das fases #3472/#3489.

### 3. Se sobrar tempo

Nada mais foi pedido. As PRs 3402, 3431, 3444, 3453, 3460, 3461, 3464, 3471, 3472, 3474, 3476, 3487, 3489, 3490, 3492 eram da fatia estática de outra sessão (chat B) - **não são suas** a menos que o usuário peça.

---

## Como o ambiente funciona (economize as horas que isso custou a descobrir)

### Estado atual
- Containers de pé: `attlas-kong`, `attlas-kafka`, `attlas-zookeeper`, `attlas-db-cameras`, `attlas-db-organization`, `attlas-db-detector-history`, `attlas-redis-cameras`, `attlas-redis-organization`, `attlas-ms-organization`, `attlas-ms-cameras`, `attlas-ms-detector-history`.
- Worktrees das branches da sprint já existem em `.claude/worktrees/s33-t*`. `git worktree list` mostra qual é qual.

### Subir o front numa branch
```bash
pkill -f "nx serve web-attlas"          # só um por vez
cd .claude/worktrees/<a-worktree-da-PR>
ln -sfn "/home/afonso/Área de trabalho/Developer/attlas-2026/node_modules" node_modules
nohup npx nx serve web-attlas > /tmp/front.log 2>&1 &
# leva ~2,5 min até o :4200 responder 200
```
O `:4200` serve **a árvore de onde o serve foi iniciado**. É por isso que a `develop` local (que está atrás do `origin/develop`) não mostra o código das branches.

### Logar no Attlas web
O formulário de login já vem **pré-preenchido** (`admin@atmansystems.com` / `change-me`). Só clicar **Entrar**. Depois: clicar na organização **Atman** → botão **Acessar** no sistema **Quito**. Sem esse passo, toda rota de módulo devolve para `/organizations`.

Não tente injetar token em `localStorage` - o classificador do harness bloqueia, e o login por clique é mais rápido.

### Subir um microsserviço
Container (mais leve):
```bash
docker compose -p attlas-2026 --project-directory "$PWD" \
  -f docker-compose.yml -f docker-compose.override.yml up -d --no-deps ms-cameras
```
Da branch (quando o diff é do ms):
```bash
cd .claude/worktrees/<w> && ln -sfn <repo>/node_modules node_modules
cp <repo>/apps/ms-cameras/.env apps/ms-cameras/.env
(cd apps/ms-cameras && npx prisma generate)     # SEM isso o seed falha com MODULE_NOT_FOUND
nohup npx nx serve ms-cameras > /tmp/ms.log 2>&1 &
```
Portas: `ms-cameras` 3300, `ms-detector-history` 3103, `ms-organization` 3001, Kong 8000, MediaMTX control 9997.

### Chamar rota autenticada por fora do navegador
Precisa de **três** coisas, e faltando qualquer uma o erro engana:
1. JWT HS256 assinado com o `JWT_SECRET` do `.env` da raiz, com `iss: 'attlas-platform'` e **`tokenType: 'access'`** (sem isso: 401 `TOKEN_TYPE_MISMATCH`), campos `sub`, `sid`, `organizationId`, `duty`.
2. Header **`system-id: 6ecb354a-0f33-4220-b49f-5ac320f3b04c`** (sem isso: 403 "Não foi possível determinar o Sistema alvo").
3. O `sub` tem de ser membro real: **`8fcfea83-c647-4036-b1af-f7c9b6735f7f`** (`admin@atmansystems.com`). Outro id: 403 "Você não é membro deste Sistema". E o `attlas-ms-organization` tem de estar **de pé**, senão 403 "econnrefused".

Rota interna S2S (`/api/internal/...`): header `x-internal-service-token` com o `INTERNAL_SERVICE_TOKEN` de `apps/ms-cameras/.env`, direto na porta do ms (não pelo Kong).

### Armadilhas conhecidas
- **`attlas-kafka` morre no boot do stack** com `Error while creating ephemeral at /brokers/ids/1, node already exists` (sessão ZK anterior ainda não expirou, 18 s). Cura: `docker restart attlas-kafka`. Não é bug de PR nenhuma.
- **Memória**: 15 GiB total, e WebStorm + Chrome já comem ~5. Com `infra:up` inteiro + 2 `nx serve` a máquina **trava**. Já aconteceu. Cheque `free -h` antes de subir qualquer coisa.
- **Processo órfão**: `pkill -f "nx serve"` não sempre mata o filho. Confirme com `ss -ltnp | grep :3300` e `kill -9` o pid.
- **Postgres órfão de testcontainer** pode ficar de pé por horas; `docker ps` e remova.

### Dados da base local (seed do `ms-cameras`)
| Câmera | id | analítico | tipo / modo |
| --- | --- | --- | --- |
| ATMN - DEMO | `...000010` | `...005001` | VIRTUAL_LOOP / SERVER |
| ATMN - PTZ | `...000011` | `...005008` | ATSPM / SERVER |
| ATMN - EMBEDDED 101 | `...000101` | `...005101` | ATSPM / EMBEDDED |

Prefixo de todos: `00000000-0000-4000-8000-0000000`. Sistema: `6ecb354a-0f33-4220-b49f-5ac320f3b04c`. 22 incidentes na base, 13 com tratamento.

Se mexer em dado para testar (criar analítico, gravar região), **desfaça ao terminar** e confirme por SQL. O usuário usa essa base.

### Três coisas que o usuário já sabe
1. O EC2 está com os quatro blocos de configuração da Detecção **desabilitados**. O SQL que resolve está em `ec2-analytics-enable-all.sql`, na raiz, e **não deve ser aplicado**.
2. A fila de CI tem 4 runners para a empresa toda. Check vermelho pode ser fila, ou o testcontainer do mediamtx morrendo no Ryuk. **Confira antes de reprovar.**
3. Várias suítes do `web-attlas` já estavam vermelhas na `develop` antes desta sprint. Suíte vermelha não reprova PR por si só.

---

## Ao terminar

Uma lista numerada, curta:
```
1. Validadas: #NNNN, #NNNN, ...
2. Parciais: #NNNN - <o que falta, uma linha cada>
3. Reprovadas: #NNNN - <o que quebrou, uma linha cada>
4. Preciso de você: <o que só o usuário pode fazer, uma linha cada>
```
E derrube o que subiu: `pkill -f "nx serve"`, `docker stop` dos ms, e confira que sobrou só a infra.
