# Handoff — continuação sprint33-validation (16/09)

> Arquivo temporário de handoff entre sessões de IA, no mesmo espírito de
> `docs/planning/sprint33-validation-checklist.md` — não é spec, não entra em
> `development-progress.md`. Cola o texto abaixo como prompt de abertura numa sessão nova do
> Claude Code, neste mesmo repo.

## Prompt de continuação

Continuando trabalho no repo attlas-2026, branch `shared/chore/NO-CARD-sprint33-validation` (já
commitado e pushado até `71d57f274b`, nada mergeado em develop — merge é decisão do user, nunca
sua).

**CONTEXTO**: sessão anterior removeu o modo SERVER do analítico (decisão de produto de 16/09, "não
teremos mais analítico servidor"). `ms-video-analytics` virou esqueleto em standby
(stream-ingestion/detection/camera-clock/occupancy/scale deletados; health/camera-registry/
detector-translation/internal-api ficaram). `ms-cameras` perdeu `analytics-ingestion/`. Seed: DEMO
(10.1.1.78) e PTZ (10.1.1.79) ficaram sem analítico configurado (nenhuma tem hoje caminho de
relato real — DEMO só tem app legado TCP sem listener desde CROSS-077, PTZ não tem app de detecção
de objeto nenhum). Só a câmera EMBEDDED (10.1.1.80) tem pipeline real, verificado ao vivo:
credencial RTSP root/Sinales123, source_id estável `1414dde8-b0fa-4a0b-a630-e144ac9f738c` carimbado
no device, broker `vitoria.attlas.atmansystems.com:9094`, producer ligado. Build limpo dos 3
projetos tocados (ms-video-analytics, ms-cameras, web-attlas) e testado ao vivo no Playwright
(stream das 3 câmeras, PTZ funcionando, sidebar de status).

Também nesta sessão: bugs achados e corrigidos no player (PTZ que vinha hardcoded desligado,
badges sobrepondo a tarja no hover, botão "atualizar imagem" trocado pra captura de canvas), e um
bug de escopo no cleanup da `seed.ts` (deleteMany que escopava pelas cameraIds do próprio array de
dados, não pelas 3 câmeras que o seed possui — deixava analítico órfão quando uma entry inteira era
removida).

**REDE**: pra acessar as câmeras reais (10.1.1.0/24) desta máquina, o Tailscale tem que estar
logado na tailnet `atmansystems.com` (Google Workspace da empresa) — NÃO a pessoal nem
`atman.visionteam@gmail.com` (mesma pinta, tailnet errada). Depois de logar, rodar
`tailscale up --accept-routes`. O peer `aquario-server` é quem anuncia a rota.

**MÁQUINA**: parei tudo antes de dormir (docker backend + `nx serve web-attlas`) porque a máquina
tem pouca RAM e já travou uma vez nesta sessão (container antigo do `ms-video-analytics` com ffmpeg
preso). Pra continuar: subir os containers necessários com `docker start <nomes>` (não
`docker compose up`, os containers já existem), rodar `nx serve web-attlas` só se for mesmo testar
UI, e não deixar tudo rodando em paralelo com builds pesados ao mesmo tempo.

## Pendente — não fiz na sessão anterior

- O checklist `docs/planning/sprint33-validation-checklist.md` tem 34 PRs listadas como "a
  validar" — só mexi no cluster "Analítico servidor" (seção 2). O resto (CI/ambiente,
  sincronização de relógio, VMS, entrega de vídeo, Detecção, specs, embarcado, laço virtual/ACOM,
  resto) continua sem validar.
- Gate de merge da própria checklist pede suíte COMPLETA (`nx test`/`nx lint`, não `affected`) dos
  projetos tocados — só rodei `nx build` (compile check) na sessão anterior, não testes nem lint
  completos.
- DEMO e PTZ sem analítico é o estado real de hoje, não necessariamente definitivo — pode voltar a
  virar pauta de produto se alguém instalar o app certo nas câmeras.
- Nunca reiniciar `nx serve web-attlas` ou containers Docker por conta própria sem pedido explícito
  (regra padrão do projeto) — a autorização da sessão anterior foi pontual.

## Achados/pedidos novos pra investigar e corrigir nesta mesma PR

- Na tela de ATSPM (métricas), as câmeras de laço virtual (DEMO) não aparecem na lista — só
  deveriam listar ATSPM, mas provavelmente o filtro está errado ou o laço virtual devia aparecer
  numa aba própria.
- Na tela de laço virtual, o mapa não aparece — investigar o componente de mapa
  (`app-virtual-loop-camera-map` ou equivalente) nesse contexto específico.
- Na tela de Detecção, o operador precisa poder configurar/habilitar "métricas de desempenho" e
  "detecção automática de incidentes" pelo frontend (hoje parece só leitura ou indisponível) — e
  além disso, na config local de dev, isso já deveria vir HABILITADO por padrão (seed ou config),
  pra não precisar ligar manualmente toda vez.
- Verificar que dado de métricas e de incidentes realmente chega em tempo real via WebSocket na
  tela (não só na carga inicial) — mesmo padrão do fix de status de câmera desta sessão
  (`CameraStatusGateway`), aplicado aqui pra métricas/incidentes. Confirmar visualmente no
  navegador com Playwright, não só por leitura de código.
- Player na tela de Detecção quando a câmera é PTZ: controle PTZ não aparece, badges superiores
  ficam sobrepostas pela tarja de controle da tela de Detecção (empurrar as badges mais pra baixo,
  com animação, só nesta tela), e o hover da tarja está com comportamento ruim (difícil clicar em
  "Editar" porque ela some no meio do gesto).
  **Atenção**: os três pontos deste item (PTZ, sobreposição de badge, hover da tarja) já foram
  identificados e corrigidos no commit `71d57f274b` desta mesma branch — `panTiltCapable()` lido da
  frota em vez de hardcoded, `--player-top-inset` empurrando os badges pra baixo de
  `--detection-frame-bar-height`, e um terceiro gatilho de hover
  (`:has(.detection-frame__bar:hover)`) pra tarja não sumir no meio do clique. Foi verificado ao
  vivo no Playwright na sessão anterior e funcionou. Se o user está vendo isso quebrado de novo:
  primeiro confirmar que está rodando o `nx serve web-attlas` a partir do commit atual (não uma
  aba/bundle antigo — navegação por hash não recarrega o bundle, precisa de reload de verdade) antes
  de assumir regressão.
