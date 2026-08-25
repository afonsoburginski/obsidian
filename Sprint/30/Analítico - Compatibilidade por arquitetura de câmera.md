---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2678
clickup: https://app.clickup.com/t/86ak5dx60
titulo: "[Full] Compatibilidade do analítico por arquitetura de câmera"
frente: Analítico
tamanho: 8 pts
status: comprometido na Sprint 30. Reestimado DUAS VEZES em 25/08: primeiro quebrei a tela num card [Front] separado (2732), depois o user apontou que ARTPEC é lógica de backend - o card voltou a ser um só, agora [Full] de 8 pts, e o 2732 foi fechado. PR #2002. Bloqueado por acesso a device ARTPEC real para confirmar o parâmetro VAPIX.
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Compatibilidade por arquitetura de câmera

Modelar a arquitetura do processador da câmera (não-Axis, ARTPEC 7, ARTPEC 8/9) e aplicar a matriz de
compatibilidade no cadastro, para o operador só receber a oferta do que aquele modelo realmente executa.
**A arquitetura é identificada automaticamente pelo backend, não é campo de seleção manual do operador**
(requisito do user, 25/08) - ver a seção própria abaixo.

## O front vai neste card, não em card separado

Eu tinha criado um card `[Front]` irmão (`SOFTWARE-2732`) para a tela de cadastro. O user desfez a
divisão em 25/08, e o argumento está certo: **a identificação da arquitetura é lógica de backend**, e o
que sobra do lado do operador não é tela - é um campo a mais e uma regra de habilitação no wizard de
cadastro que já existe e roda em produção. Card `[Front]` se justifica quando há tela, e aqui não há.

Então este card carrega as duas pontas:

1. **Backend** - detecção automática da arquitetura (lookup de `hardwareId` com sonda VAPIX de
   fallback) e a matriz aplicada como regra de domínio, com a exclusão mútua VL/ATSPM.
2. **Frontend** - o wizard exibe a arquitetura detectada como leitura (o operador nunca escolhe),
   desabilita o que a matriz proíbe **com o motivo legível ao lado**, barra a exclusão mútua no ato da
   escolha (não no envio), e mostra estado explícito de "não identificada" em vez de assumir a linha
   mais permissiva. A compatibilidade vem apurada do backend; a matriz **não** é reimplementada no
   cliente, senão divergem na primeira mudança de modelo.

Nada vem do `attlas-design`: "ARTPEC" tem zero ocorrência no protótipo inteiro. O
`instance-creation-panel` de lá tem `compatibleTypes`/`compatibilityLine`, mas trata da exclusividade
entre tipos de analítico, não da matriz por geração de chip - serve de referência de layout para a
linha de motivo, nada além.

## A matriz, como está em [[Analítico - Embarcado x Servidor]]

| Forma de execução | Não-Axis | Axis ARTPEC 7 (antigo) | Axis ARTPEC 8/9 (novo) |
| --- | --- | --- | --- |
| VL, app na câmera | Não | Sim | Sim |
| VL, servidor analítico | Sim | Sim | Sim |
| VL embutido no ATSPM | Só servidor | Não | Sim (app ou servidor) |
| ATSPM, app na câmera | Não | Não | Sim |
| ATSPM, servidor analítico | Sim | Sim | Sim |

Duas restrições resumem a tabela: câmera não-Axis nunca executa app embarcado, e o ARTPEC 7 não executa o
app de ATSPM, logo também não alcança o VL embutido dentro da própria câmera. E uma exclusão que vale só no
ARTPEC 8/9: **o app de VL e o app de ATSPM nunca rodam juntos na mesma câmera**.

## Estado hoje: nada disso existe no código

**Não há campo de arquitetura.** `ARTPEC` aparece uma única vez no repositório, em
`apps/ms-cameras/docs/modules/MOD-004-hls-streaming-pipeline.md`, e é sobre **codec de streaming**, nunca
sobre analítico. Nem `Camera` nem `CameraManufacturer` têm arquitetura de processador -
`CameraManufacturer` tem só `id`, `name`, `code`, `active`, `createdAt` e `updatedAt`, e `Camera.model` é
`String` livre, não normalizado. Existe `Camera.hardwareId` (`String?`, nullable) - candidato natural a
carregar a identificação, ver seção abaixo -, mas hoje é só armazenado, nunca interpretado.

**As flags de capacidade estão em três representações incoerentes.** `capabilities.dai` e
`capabilities.virtualLoop` existem como objeto estruturado (`EnumAnalyticStatus`: `ACTIVE`/`INACTIVE`/
`UNAVAILABLE`) em `libs/contracts/src/lib/camera/i-camera-response.ts`, como booleanos soltos em
`libs/contracts/src/lib/camera/i-list-camera-item.ts`, e como `Json` cru (sempre booleano) na coluna
`Camera.analyticsCapabilities`. Três formas do mesmo dado, e nenhuma é a fonte.

**A auto-detecção do cadastro não detecta capacidade, detecta só presença de app.**
`CameraProvisioningService.buildCameraUpdate()` (`apps/ms-cameras/src/cameras/services/camera-provisioning.service.ts:135-159`)
seta `dai` e `virtualLoop` com o **mesmo valor**: `hasEmbeddedAnalytics`, que
`CameraCredentialProbeService.detectEmbeddedAnalytics()` mede batendo no ACAP via `probeDeviceBase()`
(`apps/ms-cameras/src/analytics-realtime/atman-endpoint.resolver.ts`). Presença de aplicação instalada não
é capacidade de arquitetura - nada aqui sonda o chip da câmera, e o resultado é que DAI e VL nunca
divergem.

**Não há nenhuma noção de exclusão mútua**, então nada impede hoje cadastrar VL e ATSPM embarcados na mesma
câmera ARTPEC 8/9.

## Identificação automática da arquitetura (requisito fechado em 25/08)

O user fechou em 25/08: a arquitetura não pode ser seleção manual no cadastro, tem que ser identificada
automaticamente pelo backend. Duas fontes deterministas já existem no código auditado em 25/08, então
fechar isso **não exige nenhuma chamada de rede nova por padrão**:

1. **Primária: lookup sobre `Camera.hardwareId`, já capturado e já ignorado.** O probe ONVIF que roda em
   `CameraCredentialProbeService` já lê o `HardwareId` do device
   (`camera-credential-probe.service.ts:143`) e `CameraProvisioningService` já persiste o valor em
   `Camera.hardwareId` (o seed usa valores reais tipo `'950.1'`, `'7D8.2'`) - são os "Axis Hardware ID",
   que a própria Axis publica com o mapeamento produto → geração de chip. Uma tabela de lookup
   `hardwareId → geração ARTPEC`, aplicada no mesmo `buildCameraUpdate()` que já seta `dai`/`virtualLoop`,
   resolve a maioria dos casos **sem bater no device de novo**: o dado já vem na resposta ONVIF que a
   provisão já faz hoje.
2. **Fallback: sonda VAPIX nativa, só quando o hardware ID não mapear.** `AxisDigestClient`
   (`apps/ms-cameras/src/health/utils/digest-auth.utils.ts`) é o client que todo o resto do VAPIX do
   serviço já reusa (PTZ, zoom, bitrate configurado em `axis-rate-control.utils.ts`, thumbnail). O mesmo
   padrão (`GET /axis-cgi/param.cgi?action=list&group=<grupo>`, parse `key=value`, best-effort, nunca
   lança) resolveria o grupo `Properties.System` do jeito que `readAxisRateControl()` resolve
   `Image.I0.RateControl` hoje. **Nenhuma chamada a esse grupo existe no repo** - o parâmetro exato que
   devolve a geração ARTPEC (`Soc`, `Architecture`, ou o equivalente na Basic Device Info API,
   `/axis-cgi/basicdeviceinfo.cgi`) precisa ser **confirmado contra um device ARTPEC 7 e um ARTPEC 8/9
   reais** antes de fechar o parser - não presumido a partir de documentação genérica da Axis.
3. **Câmera não-Axis resolve trivial.** Sem `hardwareId` Axis (ou `manufacturer.code` ≠ `AXIS`), cai
   direto na primeira linha da matriz - sem app embarcado, tudo em servidor - sem sondar nada.

O ponto de escrita continua sendo `CameraProvisioningService.buildCameraUpdate()`, no mesmo
read-modify-write que já protege `ptz` hoje (INT-010).

> [!question] Decisão em aberto: existe escape hatch manual?
> Não fechado pelo user em 25/08: se o lookup de `hardwareId` falhar (hardware ID novo, fora da tabela) e
> o fallback VAPIX também não responder, o cadastro trava até a tabela ser atualizada, ou o operador pode
> sobrescrever manualmente como último recurso? Nem a Sprint 27 nem as notas de alinhamento respondem
> isso. Fica como pergunta do card, não resposta inventada aqui.

## DoD

Arquitetura do processador **identificada automaticamente** no cadastro - lookup de `Camera.hardwareId`
(ONVIF) com fallback de sonda VAPIX via `AxisDigestClient` para o que não mapear, sem campo de seleção
manual como caminho principal -, matriz aplicada como validação de domínio (não só como filtro de tela),
exclusão mútua VL/ATSPM embarcados barrada, e as três representações de `capabilities` reduzidas a uma
fonte. Teste de integração cobrindo pelo menos uma linha "Não" da matriz e o caminho de fallback quando o
`hardwareId` não mapear.

## Encosta em

- [[Analítico - Embarcado x Servidor]], que é a fonte da matriz.
- [[Analítico - Entidade, persistência de região e unicidade]], que precisa existir antes: a
  compatibilidade restringe o que pode ser cadastrado, e sem entidade não há cadastro a restringir.
- [[Attlas - Sprint 30]], que carrega o prazo externo de 18/09 para a entrega do Analítico de vídeo.
