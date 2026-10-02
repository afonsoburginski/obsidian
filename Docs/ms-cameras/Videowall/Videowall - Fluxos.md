---
tags:
  - doc
  - ms-cameras
  - cameras
  - videowall
atualizado: 2026-10-01
---

# Videowall - Fluxos

Volta para [[Videowall externo (NovaStar H9)]]. Mecanismos e rotas em
[[Videowall - Arquitetura e estratégias]]; regras de precedência em [[Videowall - Requisitos e SLA]].

## Espelhar a tela da consola (UC-050, INT-016)

1. O operador abre Espelhar no lançador radial; o dialog mostra o estado atual do painel e deixa escolher
   layout e posição.
2. "Enviar ao painel" pede ao navegador a captura da própria aba (a confirmação do navegador é obrigatória).
   Recusada, o painel fica intocado.
3. Liberada a captura, o front chama `POST /api/vms/videowall/mirror` (slot opcional). O backend arbitra a
   ocupação: painel ocupado por outro é recusado dizendo quem o detém e desde quando, salvo `takeover`
   administrativo, que avisa o deslocado (`cameras.videowallMirror.takenOver`).
4. O front publica por WHIP em `<MEDIAMTX_WEBRTC_BASE_URL>/videowall-mirror-<caminho>/whip` e avisa
   `POST /mirror/publishing` quando a conexão sobe. O codec enforcer derruba publicação fora de H.264.
5. O equipamento puxa `rtsp://<MEDIAMTX_RTSP_URL>/videowall-mirror-<caminho>` com a credencial de leitor do
   espelho e mostra a fonte na camada em tela cheia.
6. Sem sessão prévia, a divisão escolhida é gravada logo depois do envio (`PUT /mirror/arrangement`).
7. Todo passo empurra `videowall:occupancy:updated` às outras telas do sistema.

**Liberar**: `DELETE /mirror`, ou encerrar o compartilhamento pelo controle do navegador. **Expirar**: o
reaper devolve o painel quando o caminho fica 60 s sem publicação.

## Projetar uma cena (UC-051)

1. No VMS, "Enviar ao painel" salva a cena se há edição pendente e chama
   `POST /api/vms/scenes/:id/activate` com `target: VIDEOWALL`.
2. O `NovastarH9DisplayTarget` confere o vínculo do sistema e a geometria do painel, passa pelo portão de
   formato (`VideowallProjectionFormatGate`) e pelo árbitro de ocupação.
3. Para cada câmera, garante o path `videowall-projection-*` sob demanda e a `VideowallProjectionSource`
   reaproveitada, e monta as camadas a partir da geometria da cena (`videowall-projection-geometry.ts`).
4. Grava a ocupação `NATIVE_SCENE`, empurra a ocupação e dispara a reaplicação do brilho. `isActive` da
   cena não muda.

`deactivate` com o mesmo alvo limpa a parede.

## Plano de resposta (PROJ-004 e PROJ-020)

1. O `ms-execution-plans` publica `attlas.execution-plans.videowall-command` com `project-scene` ou
   `release-panel`.
2. O `ms-cameras` consome com ator `PLAN_EXECUTION`, que tem precedência sobre o espelho: toma o painel de
   quem estiver espelhando.
3. O desfecho ecoa em `attlas.cameras.videowall-command-executed` ou `attlas.cameras.videowall-command-rejected`.
   A projeção por plano não emite auditoria de operador.

## Grupos salvos e rotação (UC-052)

- **Salvar grupo**: guarda geometria e curadoria da parede, nunca stream; grupo salvo sobre uma cena leva as
  câmeras dela.
- **Aplicar** (`POST /groups/:groupId/apply`): projeta como cena nativa, pela mesma arbitragem; grupo só com
  geometria recebe as câmeras da cena em exibição na ordem de leitura. A cena guardada no VMS não é
  reescrita.
- **Rotação**: a consola aplica um grupo por vez com a mesma chamada do Aplicar, no tempo de cada grupo, e
  para quando plano ou programação assume, na troca de sistema, depois de três recusas seguidas, em
  "Retirar do painel" e na troca de layout.

## Brilho (INT-015)

`PATCH /brightness` (operador `SYSTEM_ADMIN` com `operate`) grava o setpoint e escreve no equipamento. O
reconciliador reafirma o setpoint quando uma leitura diverge e quando o painel é tomado ou projetado.
