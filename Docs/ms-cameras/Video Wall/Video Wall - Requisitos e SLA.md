---
tags: [doc, cameras, ms-cameras, video-wall]
---

# Video Wall — Requisitos e SLA

> Parte do [[00 - Video Wall]] (MOD-006/MOD-008). Requisitos de `docs/modules/cameras.md` §8.2/§9 cruzados com o estado real do código.

## Requisitos funcionais

| ID | Requisito | Critério (domínio) | Estado |
| --- | --- | --- | --- |
| RF-VW-01 | Layouts configuráveis | Predefinidos 1x1..4x4 + custom, salváveis como templates | **Backend** — `VideoWallLayout`, globais + custom por org (`GET /video-wall/layouts`) |
| RF-VW-02 | Gestão de cenas | Conjunto de câmeras num layout, ativável com ação única | **Backend** — CRUD + `activate` (um POST) |
| RF-VW-03 | Rotação automática | Alterna entre cenas, tempo por cena/sessão, sem intervenção | **Frontend** — backend serve as cenas + toggle `activate`/`deactivate`; a temporização é do cliente |
| RF-VW-04 | PTZ inline | Overlay PTZ em qualquer célula, sem trocar de tela; estado por célula | **Frontend** — comandos/estado via [[00 - PTZ e presets]]; estado por célula é do cliente |
| RF-VW-05 | Popup detalhe / tela cheia | Expandir célula com dados técnicos, localização e histórico | **Parcial** — backend provê `GET /video-wall/scenes/:id` + status/detalhe da câmera; o popup é frontend |
| RF-VW-06 | Monitoramento de banda | Consumo por câmera e total da sessão + alerta proativo | **Parcial** — backend agrega total + nível de alerta (ver ressalva em [[Video Wall - Banda e alertas]]) |

## Requisitos não-funcionais

| ID | Requisito | Critério | Estado |
| --- | --- | --- | --- |
| RNF-CAM-04 | Desempenho do Video Wall | Layouts até 4x4 e custom sem degradação, qualquer nº de células | **Parcial** — ver abaixo |
| RNF-CAM-12 | Alertas de banda | Proativos, por câmera e por sessão total, configuráveis por limite | **Parcial** — total + `alertLevel` no backend; por-câmera e a proatividade são do frontend (ver [[Video Wall - Banda e alertas]]) |

## Desempenho (RNF-CAM-04)

O backend contribui para o desempenho por **desenho de dados**, não por otimização de vídeo (vídeo é do mediamtx/player — [[00 - Streaming]]):

- **Respostas slim**: listagem e ativação usam `VideoWallSceneResult` (escalares + 2 contadores), **sem URL de stream** nem payload por frame — o custo de rede é O(nº de cenas), não O(nº de câmeras × frames).
- **Validação limitada**: sobreposição O(n²) sobre no máx. **100 células** (`VideoWallSceneValidation.cells.max`), desacoplada da resolução da grade (até 1000×1000) — barata mesmo em mosaicos densos.
- **Carga de vídeo fora do ms-cameras**: cada célula abre o stream **secundário** (baixa resolução) direto no mediamtx; adicionar células não sobrecarrega o backend de negócio.
- **Limite prático**: a responsividade "independente do nº de células" (RNF-CAM-04) é majoritariamente **frontend** (nº de players WebRTC/HLS simultâneos, GPU). O backend não impõe teto de células por cena além do 100 de validação.

## Rastreabilidade

- Contexto de negócio: `docs/modules/cameras.md` §3.2, §8.2, §9.
- Specs: UC-015 (layouts, SOFTWARE-1368), UC-016 (cenas, SOFTWARE-1370), UC-019 (banda, MOD-008); BRs `BR-VWL-*`, `BR-VWS-*`, `BR-BW-*` citadas no código.

## Relacionados

[[00 - Video Wall]] · [[Video Wall - Arquitetura e estratégias]] · [[Video Wall - Banda e alertas]] · [[Video Wall - Fluxos]] · [[00 - Streaming]]
</content>
