---
tags:
  - doc
  - cameras
  - ms-cameras
  - streaming
  - qualidade-de-imagem
  - axis
  - hikvision
aliases:
  - "Câmeras - Streaming - Qualidade de imagem na câmera"
  - "Qualidade de imagem na câmera"
  - "Qualidade de imagem na origem"
  - "Ajustes nativos Axis e Hikvision"
  - "Streaming - Qualidade de imagem na câmera"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
---

# Câmeras - Streaming - Qualidade de imagem na câmera

Volta para [[Câmeras - Streaming]]. Esta nota é o lugar dos parâmetros do equipamento. O realce que roda no
navegador está em [[Câmeras - Streaming - Realce de imagem no cliente]], e a comparação dos codecs, com o suporte de
cada navegador, está em [[Câmeras - Streaming - Codecs]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que é | Os ajustes nativos das câmeras Axis e Hikvision que melhoram a imagem ao vivo na origem. O vídeo passa pelo MediaMTX sem transcodificar, então nenhum servidor melhora a imagem depois da câmera |
| O que o Attlas faz na câmera | Monta a URL RTSP de cada tier e lê o controle de taxa e a lista de codecs da Axis. Não escreve parâmetro de imagem em câmera nenhuma ([[#O que o Attlas faz na câmera hoje]]) |
| Achado principal | O SECONDARY da AXIS P1475-LE chega com cerca de 4,5 Mbps, não com os 2 Mbps pedidos: o `videobitrate` que o cadastro grava na URL não existe mais na VAPIX, e a câmera o ignora |
| Segundo achado | O TERTIARY que o cadastro grava pede 848x480, que não está na lista de resoluções da P1475-LE |
| Nunca no ao vivo | Teto MBR na URL (o RTSP leva cerca de 12 s para responder, acima dos 8 s do MediaMTX), Zipstream `storage`, GOP dinâmico, FPS dinâmico e o H.264+ ou H.265+ da Hikvision |
| Onde vale cada ajuste | Parâmetro na URL vale só para aquele stream. Ajuste de sensor vale para todos os streams, para a gravação e para o analítico ([[#Onde vale cada ajuste]]) |
| Reflexo e brilho | Defog estoura realce e esmaga sombra com sol; a recuperação de realce não muda nada medido; reflexo de para-brisa só sai com polarizador óptico ([[#Reflexo e brilho, medido na P1475-LE]]) |

## Decisões

Cada linha diz o que fazer com o ajuste na frota de hoje. A situação usa cinco valores: **Manter** (o valor atual é o
certo para o ao vivo), **Testar** (ganho provável, depende de medição; decisão do dono depois do teste),
**Recomendado** (está na [[#Recomendação priorizada]]; quem decide é o dono), **Não usar no ao vivo** (piora a
entrada, a recuperação ou a decodificação no navegador) e **Não recomendado** (o custo ou o risco não pagam o ganho).
"Inferência" marca conclusão nossa, sem fonte oficial que diga com todas as letras.

| Ajuste | Situação | Por quê | Detalhe |
| --- | --- | --- | --- |
| Zipstream, força | Manter 10 no PRIMARY; recomendado 20 nos tiers menores | A partir de 20, fundo e veículo parado perdem detalhe, e o PRIMARY é a evidência | [[#Zipstream, força]] |
| Zipstream, perfil | Manter `classic` | `storage` põe B-frame e o MediaMTX fecha a sessão WebRTC; `networkloadbalancing` soma latência | [[#Zipstream, perfil]] |
| Zipstream, GOP dinâmico | Não usar no ao vivo | A entrada e a recuperação esperam até o GOP inteiro | [[#Zipstream, GOP dinâmico]] |
| Zipstream, FPS dinâmico | Não usar no ao vivo | Parece travamento e abre buraco de tempo entre quadros | [[#Zipstream, FPS dinâmico]] |
| Controle de bitrate | Manter VBR no PRIMARY; teto nos tiers menores sem caminho definido | MBR na URL atrasa a resposta RTSP para cerca de 12 s | [[#Controle de bitrate]] |
| Compressão | Manter 30 | Valor que a Axis recomenda, mesmo com Zipstream | [[#Compressão]] |
| Intervalo de keyframe | Testar | O GOP é quanto a imagem fica parada depois de uma perda | [[#Intervalo de keyframe]] |
| Perfil do H.264 | Testar Main nas URLs `axis-media` | Main gasta menos bits e já toca no WebRTC pelo `onvif-media` | [[#Perfil do H.264]] |
| H.265 | Manter recusado em câmera com analítico embarcado | O encoder não sustenta H.265 junto com a detecção | [[#H.265]] |
| AV1 | Testar, atrás da variável `STREAM_AV1_ENABLED` | Mais qualidade na mesma resolução, com mais banda no controle de taxa da câmera | [[#AV1]] |
| Scene profile e Traffic Wizard | Testar na câmera de bancada | Muda a imagem do analítico | [[#Scene profiles e Traffic Wizard]] |
| Forensic WDR | Manter ligado | Mostra farol e sombra na mesma imagem | [[#Forensic WDR, contraste local e tone mapping]] |
| Exposição e Lightfinder | Testar junto do scene profile | É o equilíbrio entre borrão e ruído à noite | [[#Lightfinder e exposição]] |
| Ruído espacial e temporal | Testar à noite entre 50 e 100 | O filtro forte economiza bits e pode deixar rastro | [[#Redução de ruído espacial e temporal]] |
| Nitidez | Manter 50 | A nitidez de tela fica com o RCAS do cliente | [[#Nitidez]] |
| Contraste, saturação e brilho | Manter 50 | O tom e cor do cliente já ajusta pela cena | [[#Contraste, saturação e brilho]] |
| Defog | Manter desligado | Medido: estoura realce e esmaga sombra com sol | [[#Defog]] |
| Recuperação de realce | Manter em 0 | Medido: sem efeito | [[#Reflexo e brilho, medido na P1475-LE]] |
| Estabilização eletrônica | Manter, sem mexer na margem | Mudar a margem desalinha as regiões do analítico | [[#Estabilização eletrônica]] |
| Formato corredor | Não recomendado depois da instalação | Muda a geometria e desalinha todas as regiões | [[#Formato corredor]] |
| Overlays | Manter sem overlay | Texto gravado não sai mais da imagem | [[#Overlays]] |
| Modo de baixa latência | Manter desligado | Piora a imagem | [[#Modo de baixa latência]] |
| Modo de captura e frequência | Manter modo 1 a 60 Hz | O modo de 60 fps perde o WDR | [[#Modo de captura e frequência da rede elétrica]] |
| Balanço de branco | Testar de dia e de noite | A cor do veículo e do semáforo é informação | [[#Balanço de branco]] |
| Reflexo de para-brisa | Polarizador óptico na instalação | Nenhum ajuste nem software tira | [[#Reflexo e brilho, medido na P1475-LE]] |
| Hikvision, H.264+ e H.265+ | Recomendado desligar no canal ao vivo | Entrada limpa só no I-frame de fundo, a cada 8 a 12 s | [[#H.264+ e H.265+, Smart Codec]] |
| Hikvision, ROI | Não recomendado | O fundo do PRIMARY importa | [[#ROI]] |
| Hikvision, SVC | Não usar | Nenhum ganho no pull RTSP | [[#SVC]] |
| Hikvision, streams | Manter principal e sub | É o tier barato, sem transcode | [[#Streams principal, sub e terceiro]] |
| Hikvision, bitrate e GOP | Recomendado VBR com teto e I-frame curto | Segura o pico e encurta a recuperação | [[#Controle de bitrate e GOP na Hikvision]] |
| Hikvision, WDR | Ligar só em contraluz | O DWDR ganha menos que o WDR real | [[#WDR e DWDR]] |
| Hikvision, DNR | Manter moderado | O 3D alto pode deixar rastro | [[#DNR 2D e 3D]] |
| Hikvision, BLC e HLC | Ligar por cena, com teste | BLC estoura o fundo; HLC escurece a área clara | [[#BLC e HLC]] |
| Hikvision, Smart IR | Manter automático | Menos placa estourada pelo IR | [[#Smart IR]] |

## Onde vale cada ajuste

| Caminho | Vale para | Muda a imagem do analítico? | Escreve na câmera? |
| --- | --- | --- | --- |
| Parâmetro na URL RTSP (Axis) | Só a sessão que usa aquela URL | Não | Não |
| Ajuste no meio da sessão (Axis, `adjustablelivestream=1`) | Só aquela sessão, sem reiniciar o stream | Não | Não |
| Stream profile nomeado (Axis) | Toda URL que pede `streamprofile=<nome>` | Não | Sim, uma vez, no cadastro |
| Imagem do sensor (`param.cgi` `ImageSource`, ONVIF Imaging) | Todos os streams, a gravação e o analítico | Sim | Sim |
| Configuração do canal (ISAPI, Hikvision) | Todos os leitores daquele canal | Não se aplica | Sim |

Duas regras saem daí:

1. **Tudo o que é por tier vai na URL ou no stream profile.** Bitrate, Zipstream, GOP, perfil do H.264 e resolução não
   mexem no analítico.
2. **Tudo o que é de sensor é decisão de instalação.** Mexe no analítico e na evidência, e se testa antes na câmera de
   bancada com analítico (`10.1.1.80`, mesma P1475-LE).

## O que o Attlas faz na câmera hoje

| Caminho | O que faz |
| --- | --- |
| `apps/ms-cameras/src/streaming/services/camera-stream-source.resolver.ts` | Em URL `axis-media`, grava `videocodec`, `videokeyframeinterval` pelo orçamento de 300 ms, `videozgopmode=fixed`, `h264profile=baseline` no H.264 e `resolution` do perfil ou da escada. Recusa H.265 em câmera com analítico embarcado ativo. Pede AV1 só com `STREAM_AV1_ENABLED` ligado, câmera que declara AV1 e URL `axis-media`, sem `videobitrate` e sem MBR. URL `onvif-media` passa sem parâmetro novo; na Hikvision, o tier escolhe o canal |
| `apps/ms-cameras/src/streaming/helpers/stream-tier-capability.helper.ts` | Escada de resolução dos tiers (`QUALITY_RESOLUTION_LADDER`): SECONDARY 1280x720, TERTIARY 640x360. Vale quando o tier caiu em fallback ou o perfil não declara resolução |
| `apps/ms-cameras/src/cameras/services/camera-provisioning.service.ts` | No cadastro por ONVIF de URL `onvif-media` ou `axis-media`, todo tier que não é menor que o de cima vira a mesma URL com `resolution`, `fps` e `videobitrate` de `DERIVED_TIER_TARGETS`: SECONDARY 1280x720, 30 fps, 2000 kbps; TERTIARY 848x480, 30 fps, 500 kbps ([[Câmeras - Cadastro - Arquitetura e estratégias]]) |
| `apps/ms-cameras/src/health/utils/axis-rate-control.utils.ts` | Lê `Image.I0.RateControl` (modo e bitrate planejado), só leitura |
| `apps/ms-cameras/src/health/utils/axis-video-codecs.utils.ts` | Lê `Properties.Image` para saber quais codecs a câmera declara, só leitura |

O orçamento de keyframe vira quadros pela taxa do perfil: 300 ms dão 8 quadros a 25 fps e 9 a 30 fps. A variável
`CAMERA_KEYFRAME_INTERVAL_MS` troca o orçamento, e `CAMERA_KEYFRAME_INTERVAL` fixa os quadros em todo perfil. O
efeito no ao vivo está em [[Câmeras - Streaming - Codecs]].

**Na P1475-LE de referência**, as três URLs do cadastro são `onvif-media`, geradas pelo cadastro por ONVIF. Então:

- nenhum parâmetro do resolver chega a esta câmera, e o GOP é o do perfil ONVIF (32 quadros);
- o SECONDARY e o TERTIARY levam o `videobitrate` do cadastro, que não faz nada;
- o TERTIARY pede 848x480, fora da lista da câmera;
- o perfil do H.264 é Main, não baseline, e toca no WebRTC;
- o AV1 não chega, porque o resolver só o pede em URL `axis-media`.

## Câmera de referência: AXIS P1475-LE

Câmera `10.11.20.101`, SoC ARTPEC-9, AXIS OS 12.11.118, com o ACAP do analítico `atman_traffic_edge_atspm`. Cada
valor foi lido na câmera, só com leitura, por `param.cgi?action=list`, `param.cgi?action=listdefinitions`, ONVIF
`Get*` ou método de leitura das APIs JSON.

> [!warning] Os ajustes de imagem mudam pela interface web da câmera
> O registro de auditoria da câmera (`/axis-cgi/admin/auditlog.cgi`) mostra testes manuais de imagem feitos pela
> interface web e uma calibração de zoom e foco. As tabelas trazem o valor lido depois dos testes. O padrão Axis de
> SNF e TNF é 100, e o valor lido é 50. Para conferir: `param.cgi?action=list&group=ImageSource.I0.Sensor`.

### Imagem do sensor

Vale para todos os streams, para os recortes do analítico e para a gravação.

| Recurso | Parâmetro | Valor lido | Valores possíveis | Fonte |
| --- | --- | --- | --- | --- |
| Scene profile | `sceneprofile.cgi`, método `getProfiles` | `forensic` | forensic, vivid, traffic overview (datasheet) | `getProfiles`. O parâmetro `ImageSource.I0.SceneProfile` da documentação não existe neste firmware |
| Modo de captura | `ImageSource.I0.Sensor.CaptureMode` | `1`: 1080p a 30 fps com WDR | `1`; `2`: 1080p a 60 fps sem WDR | `listdefinitions` e `capturemode.cgi getCaptureModes` |
| Frequência da rede elétrica | `ImageSource.I0.CaptureFrequency` | `60Hz` | `50Hz`, `60Hz` | `listdefinitions` |
| WDR | `ImageSource.I0.Sensor.WDR` | `on` | `on`, `off` | `listdefinitions` |
| Contraste local | `ImageSource.I0.Sensor.LocalContrast` | `50` | 0 a 100 | `listdefinitions` |
| Tone mapping | `ImageSource.I0.Sensor.ToneMapping` | `35` | 0 a 100 | `listdefinitions` |
| Recuperação de realce e de sombra | `HighlightsRecovery`, `ShadowsRecovery` | `0`, `0` | 0 a 100 | `listdefinitions` |
| Nitidez | `ImageSource.I0.Sensor.Sharpness` | `50` | 0 a 100 | `listdefinitions` |
| Contraste | `ImageSource.I0.Sensor.Contrast` | `50` | 0 a 100 | `listdefinitions` |
| Saturação | `ImageSource.I0.Sensor.ColorLevel` | `50` | 0 a 100 | `listdefinitions` |
| Brilho | `ImageSource.I0.Sensor.Brightness` | `50` | 0 a 100 | `listdefinitions` |
| Ruído espacial | `ImageSource.I0.Sensor.SNF` | `50` | 0 a 100 | `listdefinitions` |
| Ruído temporal | `ImageSource.I0.Sensor.TNF` | `50` | 0 a 100 | `listdefinitions` |
| Defog | `ImageSource.I0.Sensor.Defog`, `DefogEffect` | `off`, `50` | `off`, `on`; 0 a 100 | `listdefinitions` |
| Estabilização (EIS) | `ImageSource.I0.Sensor.Stabilizer`, `StabilizerMargin` | `on`, `50` | `off`, `on`, `demo`; 0 a 9999 | `listdefinitions` |
| Modo de baixa latência | `ImageSource.I0.Sensor.LowLatencyMode` | `off` | `off`, `on` | `listdefinitions` |
| Balanço de branco | `ImageSource.I0.Sensor.WhiteBalance` | `fixed_outdoor2` | `auto`, `auto_outdoor`, `hold`, `manual`, `fixed_outdoor1`, `fixed_outdoor2`, `fixed_indoor`, `fixed_fluor1`, `fixed_fluor2` | `listdefinitions` |
| Exposição | `ImageSource.I0.Sensor.Exposure` | `auto` | `auto`, `hold`, `flickerfree50`, `flickerfree60`, `flickerreduced50`, `flickerreduced60` | `listdefinitions` |
| Tempo máximo de exposição | `ImageSource.I0.Sensor.MaxExposureTime` | `-1` | -60 a 2000000 | `listdefinitions` |
| Ganho máximo | `ImageSource.I0.Sensor.MaxGain` | `100` | 0 a 100 | `listdefinitions` |
| Prioridade entre borrão e ruído | `ImageSource.I0.Sensor.ExposurePriorityNormal` | `50` | 0 a 100 | `listdefinitions` |
| Rotação (formato corredor) | `ImageSource.I0.Rotation` | `0` | 0, 90, 180, 270 | `listdefinitions` |
| IR | `lightcontrol.cgi`, método `getLightInformation` | LED IR ligado, segue o dia e noite | - | `getLightInformation` |

### Encoder

Vale para o canal `Image.I0`. Um parâmetro na URL RTSP vence o valor do canal só naquele stream.

| Recurso | Parâmetro | Valor lido | Valores possíveis | Fonte |
| --- | --- | --- | --- | --- |
| Codecs | `Properties.Image.Format` | - | `h264`, `h265`, `av1`, `jpeg`, `mjpeg` | `param.cgi list` |
| Perfil H.264 do canal | `Image.I0.MPEG.H264.Profile` | `high` | `baseline`, `main`, `high` | `listdefinitions` |
| Perfil H.265 e AV1 | `Properties.Image.H265.Profiles`, `AV1.Profiles` | - | `Main` | `param.cgi list` |
| Compressão | `Image.I0.Appearance.Compression` | `30` | 0 a 100 | `listdefinitions` |
| GOP do canal | `Image.I0.MPEG.ICount`, `PCount` | `1`, `61`: 62 quadros, cerca de 2 s | `PCount` de 0 a 1022 | `listdefinitions` |
| Controle de bitrate | `Image.I0.RateControl.Mode` | `vbr` | `vbr`, `mbr`, `abr`, `cbr` (descontinuado) | `listdefinitions` |
| Prioridade do controle | `Image.I0.RateControl.Priority` | `framerate` | `none`, `quality`, `framerate`, `fullframerate` | `listdefinitions` |
| Teto e alvos | `RateControl.MaxBitrate`, `TargetBitrate`, `ABR.TargetBitrate` | `0`, `0`, `0` | 0 a 100000 kbps | `listdefinitions` |
| Zipstream, força | `Image.I0.MPEG.ZStrength` | `10` | `off`, `10`, `20`, `30`, `40`, `50` | `listdefinitions` e `zipstream/liststrengths.cgi` |
| Zipstream, perfil | `Image.I0.MPEG.ZProfile` | `classic` | `classic`, `storage`, `networkloadbalancing` | `listdefinitions` e `zipstream/listprofiles.cgi` |
| Zipstream, GOP dinâmico | `ZGopMode`, `ZMaxGopLength` | `fixed`, `300` | `fixed`, `dynamic`; 1 a 1023 | `listdefinitions` |
| Zipstream, FPS dinâmico | `ZFpsMode`, `ZMinFps` | `fixed`, `0` | `fixed`, `dynamic` | `listdefinitions` |
| Zipstream, atualização gradual | `ZGradualDecodeRefresh` | `auto` | `auto`, `low`, `balanced`, `extreme` | `listdefinitions` |
| Zipstream, croma | `ZChromaQPMode` | `off` | `off`, `on` | `listdefinitions`. Sem documentação oficial |
| Overlays | `Image.I0.Appearance.Overlays` e `dynamicoverlay.cgi list` | `all`, sem texto e sem imagem | `all`, `all-sync`, `off`, `text`, `image`, `application`, `application-sync` | `listdefinitions` e `list` |
| Stream profiles | `streamprofile.cgi list` | nenhum | até 26 | `list` |
| Ajuste durante a sessão | `Properties.API.RTSP.AdjustableStreamSettings` | - | `compression`, `fps`, `videokeyframeinterval`, `videomaxbitrate`, `videozstrength` | `param.cgi list` |
| Resoluções | `Properties.Image.Resolution` | - | 16:9: 1920x1080, 1280x720, 1024x576, 640x360. 4:3: de 1440x1080 a 160x120. 16:10: de 1280x800 a 320x200 | `param.cgi list` |

### Perfis ONVIF

As URLs do Attlas para esta câmera usam o perfil ONVIF `profile_1_h264`. Fonte: Media2 `GetProfiles` e
`GetVideoEncoderConfigurationOptions`.

| Perfil | Codec | Configuração |
| --- | --- | --- |
| `profile_1_h264` | H.264 Main | GOP de 32 quadros, qualidade 70 (compressão 30), 30 fps, sem teto de bitrate |
| `profile_1_h265` | H.265 Main | GOP de 32 quadros, qualidade 70, 30 fps, sem teto de bitrate |
| `profile_1_jpeg` | JPEG | qualidade 70, 30 fps |

Além do canal `Image.I0`, a câmera tem duas view areas do analítico: `Image.I1` ("ATMAN Overlay") e `Image.I2`
("ATMAN Incidents"), as duas em 1280x720 a 15 fps.

### Streams que o Attlas puxa

| Tier | URL, sem credencial | O que a câmera entrega | Bitrate |
| --- | --- | --- | --- |
| PRIMARY | `rtsp://10.11.20.101/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast` | 1920x1080, H.264 Main, GOP 32, compressão 30 | cerca de 6,2 Mbps |
| SECONDARY | a mesma, com `&resolution=1280x720&fps=30&videobitrate=2000` | 1280x720, H.264 Main, GOP 32 | **cerca de 4,5 Mbps**, medido em 60 s pelo contador de bytes do MediaMTX |
| TERTIARY | a mesma, com `&resolution=848x480&fps=30&videobitrate=500` | não conferido | - |

> [!warning] Os tiers menores não cumprem o que pedem
> - **Bitrate.** A VAPIX tirou o `videobitrate` junto com o CBR, na Rate Control API 2.0. A câmera aceita o parâmetro
>   na URL (o `streamstatus.cgi` o mostra na sessão) e não faz nada com ele. Com o canal em VBR sem teto, o SECONDARY
>   sai com mais que o dobro dos 2 Mbps do cadastro. O parâmetro vem de `DERIVED_TIER_TARGETS`, no cadastro.
> - **Resolução.** 848x480 não está em `Properties.Image.Resolution`. O próprio código do `ms-cameras` registra que
>   resolução fora da lista responde 502. Não houve teste por RTSP, porque a câmera tem analítico e a pesquisa só leu.
>   A resolução 16:9 menor da lista é 640x360, que é a da escada do resolver.
> - **GOP.** O GOP servido é o do perfil ONVIF (32 quadros, cerca de 1,07 s), não o orçamento de keyframe do Attlas,
>   que só vale para URL `axis-media`.

## Catálogo Axis

Cada recurso no mesmo modelo: o que faz, ganho de qualidade, banda, latência, navegador, risco para o analítico,
risco para evidência, se existe na P1475-LE, parâmetro, situação e fonte.

### Zipstream, força

| | |
| --- | --- |
| **O que faz** | Comprime mais as áreas da cena sem interesse (Dynamic ROI) e tira ruído do fundo. Força maior, bitrate menor. O Dynamic ROI não tem parâmetro próprio: segue a força |
| **Ganho de qualidade** | Nenhum direto. Em 10, "no visible effect in most scenes". Em 20, "slightly lower level of detail in regions of lower interest". Em 30, efeito visível em muitas cenas |
| **Banda** | O Dynamic ROI economiza de 10% a 50%, segundo a Axis |
| **Latência** | Nenhuma no perfil `classic` |
| **Navegador** | Nenhum efeito. A Axis diz que toda força é compatível com qualquer player |
| **Risco para o analítico** | Nenhum direto. O analítico embarcado lê o quadro antes do encoder (inferência) |
| **Risco para evidência** | A partir de 20, veículo parado e fundo perdem detalhe. No PRIMARY, que é a evidência, fica em 10 |
| **Na P1475-LE** | Sim, `10` |
| **Parâmetro** | `Image.I0.MPEG.ZStrength` no canal, `videozstrength` na URL |
| **Situação** | Manter 10 no PRIMARY. Recomendado 20 nos tiers menores ([[#Recomendação priorizada]], item 5) |
| **Fonte** | [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [Whitepaper Zipstream](https://whitepapers.axis.com/en-us/axis-zipstream-technology) · [Whitepaper Zipstream, PDF com a tabela de força](https://www.axis.com/dam/public/ae/ea/49/axis-zipstream-technology-en-US-396891.pdf) |

### Zipstream, perfil

| | |
| --- | --- |
| **O que faz** | `classic` é o padrão, com quadros I e P. `storage` usa até 2 B-frames por P-frame, troca o Baseline por High e liga sempre o GOP dinâmico. `networkloadbalancing` corta o pico do I-frame, espalhando os dados pelos P-frames ou trocando o I-frame por atualização gradual (GDR). Não existe perfil "live" nem "low latency" |
| **Ganho de qualidade** | Nenhum para o ao vivo |
| **Banda** | `storage` economiza mais. `networkloadbalancing` alisa o pico, para Wi-Fi e 4G |
| **Latência** | `storage` soma 1/fps por B-frame: 66,7 ms a 30 fps. A Axis diz que `networkloadbalancing` "can introduce some latency in the live view mode" |
| **Navegador** | Com B-frame, o MediaMTX fecha a sessão WebRTC. Com GDR, o leitor novo só tem quadro completo depois de uma volta inteira de atualização (inferência) |
| **Risco para o analítico** | Nenhum |
| **Risco para evidência** | Nenhum direto |
| **Na P1475-LE** | Sim, `classic`. Existem `storage` e `networkloadbalancing`. A atualização gradual está em `auto` |
| **Parâmetro** | `Image.I0.MPEG.ZProfile`, `videozprofile`. `ZGradualDecodeRefresh`, `videozgradualdecoderefresh`: `auto`, `low`, `balanced`, `extreme`, só com `networkloadbalancing` |
| **Situação** | Manter `classic`. Não usar `storage` nem `networkloadbalancing` no ao vivo |
| **Fonte** | [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [Whitepaper Zipstream](https://whitepapers.axis.com/en-us/axis-zipstream-technology) · [Manual da P1475-LE](https://help.axis.com/en-us/axis-p1475-le) · [MediaMTX, `from_stream.go`](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/from_stream.go) |

### Zipstream, GOP dinâmico

| | |
| --- | --- |
| **O que faz** | Tira I-frames quando a cena não muda. O GOP varia entre o `videokeyframeinterval` e o máximo, de até 1023 quadros |
| **Ganho de qualidade** | Nenhum |
| **Banda** | De 0% a 50% a menos, segundo a Axis |
| **Latência** | O leitor novo só mostra imagem depois do próximo keyframe, e o MediaMTX descarta o pedido de keyframe (PLI) do navegador. Com GOP longo, a entrada e a recuperação de perda esperam até o GOP inteiro: 34 s com 1023 quadros a 30 fps |
| **Navegador** | A Axis avisa que GOP longo "could cause problems" em alguns players |
| **Risco para o analítico** | Nenhum |
| **Risco para evidência** | Nenhum na imagem |
| **Na P1475-LE** | Sim, `fixed`, máximo 300 |
| **Parâmetro** | `ZGopMode`, `ZMaxGopLength`. Na URL, `videozgopmode` e `videozmaxgoplength` |
| **Situação** | Não usar no ao vivo. O Attlas já manda `videozgopmode=fixed` nas URLs `axis-media` |
| **Fonte** | [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [MediaMTX, `outbound_track.go`](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/outbound_track.go) |

### Zipstream, FPS dinâmico

| | |
| --- | --- |
| **O que faz** | Deixa de codificar quadros quando há pouco movimento. O piso é o `ZMinFps`; 0 quer dizer sem piso |
| **Ganho de qualidade** | Nenhum |
| **Banda** | De 0% a 50% a menos, segundo a Axis |
| **Latência** | Nenhuma direta. A Axis avisa que, com fps baixo, "the user may think the stream has frozen" |
| **Navegador** | O player lê fps baixo como engasgo. O modo `videoframeskipmode=empty` mantém a taxa nominal com quadro vazio e economiza menos |
| **Risco para o analítico** | Nenhum direto (inferência: o analítico lê o sensor) |
| **Risco para evidência** | Buraco de tempo entre quadros. Veículo rápido pode passar entre dois quadros |
| **Na P1475-LE** | Sim, `fixed` |
| **Parâmetro** | `ZFpsMode`, `ZMinFps`, `FrameSkipMode`. Na URL, `videozfpsmode`, `videozminfps`, `videoframeskipmode` |
| **Situação** | Não usar no ao vivo |
| **Fonte** | [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) |

### Controle de bitrate

| | |
| --- | --- |
| **O que faz** | VBR mantém a compressão escolhida e deixa o bitrate variar. MBR põe teto no bitrate instantâneo e sobe a compressão quando a cena pede mais. ABR mira uma média num período longo, em dias, para dimensionar gravação |
| **Ganho de qualidade** | VBR dá a melhor imagem por quadro. MBR com teto baixo perde detalhe em cena com movimento, e a Axis recomenda VBR ou ABR nesse caso. A prioridade `framerate` mantém a fluidez e cede na compressão |
| **Banda** | VBR sem teto acompanha a cena: chuva, noite e trânsito pesado sobem o bitrate. MBR segura o pico: medido com teto na URL, em 20 s cada, o H.264 720p com teto 2000 deu 1,69 Mbps, o AV1 720p com teto 2000 deu 1,80 Mbps e o AV1 1080p com teto 4000 deu 3,58 Mbps. ABR leva cerca de 24 h para estabilizar e não serve para gravação por evento |
| **Latência** | **Com MBR na URL (`videobitratemode=mbr&videomaxbitrate=<kbps>`), a câmera leva cerca de 12 s para responder o RTSP, contra 1,3 s sem**, acima dos 8 s de `STREAM_SOURCE_START_TIMEOUT_MS` do MediaMTX: a fonte dá timeout e o player cai em erro. Pico de VBR num link estreito vira perda de pacote, e, como o MediaMTX descarta o PLI, a perda vira congelamento até o próximo keyframe (inferência) |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Nenhum: é por stream |
| **Risco para evidência** | Teto baixo apaga placa em movimento. Por isso o PRIMARY fica em VBR |
| **Na P1475-LE** | Sim. Canal em `vbr`, prioridade `framerate`, sem teto |
| **Parâmetro** | Canal: `Image.I0.RateControl.Mode`, `Priority`, `MaxBitrate`, `ABR.TargetBitrate`, `ABR.MaxBitrate`, `ABR.RetentionTime`. URL: `videobitratemode` (`vbr`, `mbr`, `abr`), `videomaxbitrate`, `videobitratepriority`, `videoabrtargetbitrate`, `videoabrmaxbitrate`, `videoabrretentiontime`. Toda opção de rate control na URL exige `videobitratemode` na mesma URL. A prioridade só vale em MBR. `videobitrate` não existe mais |
| **Situação** | Manter VBR no PRIMARY. MBR na URL fica de fora pelo atraso da partida. O teto nos tiers menores ainda não tem caminho: testar o MBR dentro de um stream profile nomeado, medindo o tempo até o primeiro quadro ([[#Recomendação priorizada]], item 2) |
| **Fonte** | [VAPIX, Rate control](https://developer.axis.com/vapix/network-video/rate-control/) · [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) · [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) |

### Compressão

| | |
| --- | --- |
| **O que faz** | Escolhe o quanto cada quadro é comprimido, de 0 (menos) a 100 (mais). Em VBR, é ela que decide a qualidade |
| **Ganho de qualidade** | Menos compressão, mais detalhe |
| **Banda** | Sobe quando a compressão desce. A Axis recomenda 30, mesmo com Zipstream |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Nenhum: é por stream |
| **Risco para evidência** | Compressão alta apaga placa |
| **Na P1475-LE** | Sim, `30`. No ONVIF aparece como qualidade 70 |
| **Parâmetro** | `Image.I0.Appearance.Compression`, `compression` |
| **Situação** | Manter 30 |
| **Fonte** | [Whitepaper Zipstream](https://whitepapers.axis.com/en-us/axis-zipstream-technology) · [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) |

### Intervalo de keyframe

| | |
| --- | --- |
| **O que faz** | Define de quantos em quantos quadros vem um quadro completo (I-frame). O GOP fixo é esse intervalo |
| **Ganho de qualidade** | Não muda a imagem. Muda quanto tempo a imagem fica parada depois de uma perda |
| **Banda** | GOP curto custa mais, porque o I-frame é o quadro mais caro |
| **Latência** | O MediaMTX configura retransmissão (NACK) e descarta o PLI do navegador. Perda que o NACK não recupera congela a imagem até o próximo keyframe da câmera. O leitor novo também espera o próximo keyframe |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Nenhum: é por stream |
| **Risco para evidência** | Nenhum |
| **Na P1475-LE** | Canal com 62 quadros, cerca de 2 s. Perfil ONVIF `profile_1_h264` com 32 quadros, cerca de 1,07 s a 30 fps. As URLs do Attlas usam o perfil ONVIF, então o GOP servido é 32 |
| **Parâmetro** | `Image.I0.MPEG.PCount`, `videokeyframeinterval` na URL, `GovLength` no ONVIF. O Attlas grava `videokeyframeinterval` pelo orçamento de 300 ms só em URL `axis-media` |
| **Situação** | Testar ([[#Recomendação priorizada]], item 8) |
| **Fonte** | [MediaMTX, `outbound_track.go`](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/outbound_track.go) · [MediaMTX, `peer_connection.go`](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/peer_connection.go) · [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) |

### Perfil do H.264

| | |
| --- | --- |
| **O que faz** | Baseline é o perfil mais simples. Main e High acrescentam codificação aritmética (CABAC), e o High também a transformada 8x8. Na Axis, B-frame só aparece com o perfil Zipstream `storage`, não com o perfil do H.264 |
| **Ganho de qualidade** | Main e High dão mais qualidade no mesmo bitrate. A Axis não publica número; o manual Hikvision diz o mesmo sobre perfil mais complexo |
| **Banda** | Menor no mesmo nível de qualidade |
| **Latência** | Nenhuma sem B-frame |
| **Navegador** | O WebRTC exige Constrained Baseline e recomenda Constrained High (RFC 7742). O MediaMTX recusa B-frame, não o perfil. As URLs `onvif-media` desta câmera já tocam em Main no WebRTC |
| **Risco para o analítico** | Nenhum: é por stream |
| **Risco para evidência** | Nenhum |
| **Na P1475-LE** | Sim. Canal em `high`. Perfil ONVIF em Main. As URLs `axis-media` do Attlas pedem `baseline` |
| **Parâmetro** | `Image.I0.MPEG.H264.Profile`, `h264profile`: `baseline`, `main`, `high` |
| **Situação** | Testar Main nas URLs `axis-media` ([[#Recomendação priorizada]], item 8) |
| **Fonte** | [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [RFC 7742](https://www.rfc-editor.org/rfc/rfc7742.html) · [MediaMTX, `from_stream.go`](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/from_stream.go) |

### H.265

| | |
| --- | --- |
| **O que faz** | Codec mais eficiente que o H.264 |
| **Ganho de qualidade** | A mesma imagem com menos banda, ou mais detalhe na mesma banda |
| **Banda** | "More than 25%" a menos que o H.264, segundo o manual da P1475-LE |
| **Latência** | Nenhuma própria |
| **Navegador** | Só com decode por hardware ([[Câmeras - Streaming - Codecs]]) |
| **Risco para o analítico** | Alto. Com o analítico ligado, o encoder não sustenta H.265 a 30 fps e entrega quadro defeituoso. O Attlas recusa H.265 para câmera com analítico embarcado ativo |
| **Risco para evidência** | Nenhum |
| **Na P1475-LE** | Sim, Main. Perfil ONVIF `profile_1_h265` |
| **Parâmetro** | `videocodec=h265` |
| **Situação** | Manter como está: oportunístico no Attlas e recusado nesta câmera |
| **Fonte** | [Manual da P1475-LE](https://help.axis.com/en-us/axis-p1475-le) · [blink-dev, H.265 no WebRTC](https://groups.google.com/a/chromium.org/g/blink-dev/c/3h8lL8a377c) · [Microsoft, Edge sem H.265 no WebRTC](https://learn.microsoft.com/en-us/answers/questions/5875799/edge-webrtc-h265-support) · [Mozilla, posição sobre H.265 no WebRTC](https://github.com/mozilla/standards-positions/issues/1188) · [MDN, codecs de vídeo](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs) |

### AV1

| | |
| --- | --- |
| **O que faz** | Codec mais novo, que a ARTPEC-9 codifica em Main, 8 bits |
| **Ganho de qualidade** | A mesma imagem com menos banda, ou mais qualidade na mesma resolução |
| **Banda** | 24% a menos que o H.264 em cena de monitoramento de trânsito, e praticamente igual ao H.265, segundo o whitepaper de AV1 da Axis. No controle de taxa da própria câmera, sem teto, medido em 1080p na LAN: AV1 com 8,4 Mbps contra 5,3 Mbps do H.264. Na conta do mesmo tier, cerca de 60% mais banda que o H.264 |
| **Latência** | Nenhuma própria. Medido: primeiro byte em 0,5 s, contra 0,4 s do H.264. A Axis diz que o AV1 serve para WebRTC de baixa latência |
| **Navegador** | Decode em software (dav1d) quando não há hardware, e o custo cresce com cada tile. Suporte por navegador em [[Câmeras - Streaming - Codecs]] |
| **Risco para o analítico** | Baixo. Medido estável com o analítico rodando: 33 s de AV1 1080p decodificados sem erro. A Axis diz que o encoder AV1 rende "marginally lower" que o H.264 e o H.265 na ARTPEC-9 |
| **Risco para evidência** | O AV1 tem síntese de grão opcional, que o decodificador recria; grão sintético é proibido ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Grão sintético\|catálogo]]) |
| **Na P1475-LE** | Sim, Main, em todas as resoluções até 1920x1080, nos canais I0, I1 e I2 |
| **Parâmetro** | `videocodec=av1`. O Attlas manda `resolution`, `fps` e o keyframe do orçamento, sem `videobitrate` (a câmera o ignora em AV1) e sem MBR |
| **Situação** | Testar. No Attlas, atrás de `STREAM_AV1_ENABLED` (padrão `false`), e só para URL `axis-media` de câmera que declara AV1. Uma URL `onvif-media` não recebe AV1 ([[#Recomendação priorizada]], item 9) |
| **Fonte** | [Whitepaper AV1 da Axis](https://whitepapers.axis.com/en-us/av1-codec-in-video-surveillance) · [Whitepaper de desempenho de streaming da ARTPEC](https://whitepapers.axis.com/en-us/streaming-performance-for-artpec-products) · [MediaMTX, leitura por WebRTC](https://mediamtx.org/docs/read/webrtc) · [MediaMTX, leitura por HLS](https://mediamtx.org/docs/read/hls) · [MDN, codecs do WebRTC](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs) · [MDN, Firefox 136](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/136) · [WebKit, Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) |

> [!warning] Síntese de grão do AV1 não conferida
> Falta conferir se a P1475-LE liga a síntese de grão no AV1. Se ligar, o AV1 sai com ela desligada ou não é
> oferecido.

### Scene profiles e Traffic Wizard

| | |
| --- | --- |
| **O que faz** | Um scene profile aplica de uma vez um conjunto de ajustes de imagem a todos os streams: saturação, brilho, nitidez, contraste e contraste local. `traffic_overview` "optimizes image settings for vehicle traffic monitoring". A interface web tem também "Traffic overview (low bandwidth)". O AXIS Traffic Wizard pede distância da via, altura da câmera, distância do veículo e velocidade máxima, ajusta WDR, ganho em pouca luz e IR, e termina no Traffic overview |
| **Ganho de qualidade** | Provável em trânsito. A Axis não publica os valores que cada perfil aplica |
| **Banda** | Sem número oficial. O "low bandwidth" existe para isso, sem número |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Alto: muda a imagem que o analítico lê |
| **Risco para evidência** | `vivid` aumenta cor e contraste. `forensic` é o recomendado para vigilância |
| **Na P1475-LE** | `forensic` ativo. O datasheet lista forensic, vivid e traffic overview. A API `trafficcamerainstallation` aparece na descoberta de APIs da câmera, sem documentação pública; a ligação dela com o Traffic Wizard é hipótese |
| **Parâmetro** | Leitura por `sceneprofile.cgi`, método `getProfiles`. Escrita pela interface web da câmera |
| **Situação** | Testar ([[#Recomendação priorizada]], item 6) |
| **Fonte** | [VAPIX, Scene profile API](https://developer.axis.com/vapix/network-video/video-streaming/) · [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) · [Datasheet da P1475-LE](https://www.axis.com/dam/public/e0/69/b9/datasheet-axis-p1475%E2%80%93le-bullet-camera-en-US-521384.pdf) · [Traffic Wizard, manual da Q1798-LE](https://help.axis.com/en-us/axis-q1798-le) |

### Forensic WDR, contraste local e tone mapping

| | |
| --- | --- |
| **O que faz** | Combina duas exposições e realça o contraste local, para mostrar sombra e farol na mesma imagem. Contraste local e tone mapping regulam a força. Tone mapping em 0 deixa só a correção de gama padrão |
| **Ganho de qualidade** | Alto em contraluz, farol à noite e sombra de viaduto |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma documentada |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda o brilho relativo das regiões que o analítico lê |
| **Risco para evidência** | A Axis cita borrão, fantasma e ruído nas áreas de fusão das duas exposições, em objeto rápido |
| **Na P1475-LE** | Sim, até 120 dB, ligado. Com WDR o teto é 30 fps; sem WDR o modo de captura vai a 60 fps. Contraste local 50, tone mapping 35. `HighlightsRecovery` e `ShadowsRecovery` existem nos parâmetros, mas a Axis não os documenta para este modelo, e a recuperação de realce não teve efeito medido |
| **Parâmetro** | `ImageSource.I0.Sensor.WDR`, `LocalContrast`, `ToneMapping` |
| **Situação** | Manter ligado |
| **Fonte** | [Whitepaper WDR](https://whitepapers.axis.com/en-us/wide-dynamic-range) · [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) · [Datasheet da P1475-LE](https://www.axis.com/dam/public/e0/69/b9/datasheet-axis-p1475%E2%80%93le-bullet-camera-en-US-521384.pdf) |

### Lightfinder e exposição

| | |
| --- | --- |
| **O que faz** | Lightfinder 2.0 é o processamento de pouca luz da Axis, com mais sensibilidade e cor no escuro. A exposição automática escolhe obturador e ganho, dentro do tempo máximo de exposição e do ganho máximo. `ExposurePriorityNormal` puxa entre menos borrão e menos ruído |
| **Ganho de qualidade** | Alto à noite. Para tirar o borrão de movimento, a Axis manda encurtar o obturador máximo e subir o ganho máximo |
| **Banda** | Ganho mais alto dá mais ruído, e ruído custa bits (inferência; a Hikvision diz que ruído aumenta muito o tamanho do vídeo) |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Alto: muda a imagem noturna que o analítico lê |
| **Risco para evidência** | Borrão apaga placa, e ruído também. É um equilíbrio que se acerta medindo |
| **Na P1475-LE** | Sim. Exposição `auto`, tempo máximo `-1`, ganho máximo `100`, prioridade `50` |
| **Parâmetro** | `ImageSource.I0.Sensor.Exposure`, `MaxExposureTime`, `MaxGain`, `ExposurePriorityNormal` |
| **Situação** | Testar junto do scene profile ([[#Recomendação priorizada]], item 6) |
| **Fonte** | [Whitepaper Lightfinder](https://whitepapers.axis.com/en-us/lightfinder) · [Manual da Q1798-LE, borrão de movimento](https://help.axis.com/en-us/axis-q1798-le) · [Hikvision, redução de ruído](https://info.hikvision.com/noise-reduction-technology-whitepaper) |

### Redução de ruído espacial e temporal

| | |
| --- | --- |
| **O que faz** | O filtro espacial (SNF) alisa o ruído dentro de cada quadro. O temporal (TNF) compara quadros seguidos para tirar o ruído que muda de um quadro para o outro |
| **Ganho de qualidade** | Alto em pouca luz, onde o ruído domina |
| **Banda** | Menos ruído, menos bits (inferência; a Axis não publica número) |
| **Latência** | A Axis diz que filtro de ruído avançado guarda vários quadros e soma latência |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda a entrada do analítico |
| **Risco para evidência** | SNF alto borra textura fina, como letra de placa. TNF alto pode deixar rastro atrás do veículo, o mesmo motivo que proíbe o filtro temporal no cliente ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Redução de ruído temporal\|catálogo]]). As duas coisas são inferência: a Axis não documenta borrão nem rastro |
| **Na P1475-LE** | Sim. SNF 50 e TNF 50. O padrão Axis dos dois é 100 |
| **Parâmetro** | `ImageSource.I0.Sensor.SNF`, `TNF` |
| **Situação** | Testar à noite ([[#Recomendação priorizada]], item 7) |
| **Fonte** | [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) · [Whitepaper de latência](https://whitepapers.axis.com/en-us/latency-in-live-network-video-surveillance) |

### Nitidez

| | |
| --- | --- |
| **O que faz** | Realça a borda na câmera, antes da compressão |
| **Ganho de qualidade** | Borda mais marcada. Em excesso, halo e ruído realçado |
| **Banda** | "If you increase the sharpness, it may increase the bitrate", segundo a Axis |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum direto. O realce do cliente já dá nitidez com o RCAS; as duas somadas dão halo ([[Câmeras - Streaming - Realce de imagem no cliente#Nitidez\|nitidez no cliente]]) |
| **Risco para o analítico** | Muda a borda que o analítico lê |
| **Risco para evidência** | Halo em volta da letra da placa |
| **Na P1475-LE** | Sim, `50`, o padrão Axis |
| **Parâmetro** | `ImageSource.I0.Sensor.Sharpness`, `Sharpness` no ONVIF |
| **Situação** | Manter 50. A nitidez de tela fica com o RCAS do cliente |
| **Fonte** | [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) · [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) |

### Contraste, saturação e brilho

| | |
| --- | --- |
| **O que faz** | Ajustes globais de aparência. O brilho é aplicado depois da captura e "doesn't affect the information in the image" |
| **Ganho de qualidade** | Pequeno. O tom e cor do cliente já ajusta contraste e saturação pela cena ([[Câmeras - Streaming - Realce de imagem no cliente#Tom e cor\|tom e cor]]) |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda a entrada do analítico |
| **Risco para evidência** | Saturação alta distorce a cor de veículo e de semáforo |
| **Na P1475-LE** | Contraste, saturação e brilho em 50, o padrão Axis |
| **Parâmetro** | `Contrast`, `ColorLevel`, `Brightness`. No ONVIF, `Contrast`, `ColorSaturation`, `Brightness` |
| **Situação** | Manter no padrão |
| **Fonte** | [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) · [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) |

### Defog

| | |
| --- | --- |
| **O que faz** | Realça o contraste em cena com névoa |
| **Ganho de qualidade** | Alto em neblina, nulo no resto |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma documentada |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda a entrada do analítico |
| **Risco para evidência** | A Axis não recomenda em cena de pouco contraste, grande variação de luz ou foco levemente fora |
| **Na P1475-LE** | Sim, `off`, efeito 50. O `param.cgi` aceita só `on` e `off`; o ONVIF oferece também `AUTO`. Medido com sol, o defog estoura realce e esmaga sombra ([[#Reflexo e brilho, medido na P1475-LE]]) |
| **Parâmetro** | `ImageSource.I0.Sensor.Defog`, `DefogEffect`. `Defogging` no ONVIF |
| **Situação** | Manter desligado. O dehaze condicional do cliente cobre a neblina sem mexer no analítico ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Dehaze por dark channel prior\|catálogo]]) |
| **Fonte** | [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) |

### Estabilização eletrônica

| | |
| --- | --- |
| **O que faz** | Compensa a vibração do poste cortando uma margem em volta da imagem (EIS) |
| **Ganho de qualidade** | Alto com vento. Imagem parada também comprime melhor (inferência) |
| **Banda** | Menos movimento da imagem inteira, menos bits (inferência) |
| **Latência** | Sem fonte oficial |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Margem maior corta o campo de visão. Mudar a margem desalinha as regiões do analítico |
| **Risco para evidência** | Menos campo de visão |
| **Na P1475-LE** | Ligado, margem 50, que a Axis documenta como 0,5 grau |
| **Parâmetro** | `ImageSource.I0.Sensor.Stabilizer`, `StabilizerMargin`. API `image-stabilization`. `ImageStabilization` no ONVIF |
| **Situação** | Manter. Não mexer na margem sem refazer as regiões |
| **Fonte** | [VAPIX, Image stabilization API](https://developer.axis.com/vapix/network-video/image-stabilization-api/) · [Whitepaper de frame rate cheio](https://whitepapers.axis.com/en-us/controlled-full-frame-rate) |

### Formato corredor

| | |
| --- | --- |
| **O que faz** | Gira a imagem 90 ou 270 graus, para a via comprida ocupar a altura do quadro |
| **Ganho de qualidade** | Alto em via longa e estreita: mais pixels ao longo da via |
| **Banda** | Igual |
| **Latência** | A Axis diz que girar 90 ou 270 graus soma carga no encoder |
| **Navegador** | A imagem fica em pé, e o mosaico em 16:9 perde espaço |
| **Risco para o analítico** | Alto: muda a geometria, e todas as regiões precisam ser refeitas |
| **Risco para evidência** | Nenhum |
| **Na P1475-LE** | Sim, `0` |
| **Parâmetro** | `ImageSource.I0.Rotation`, `rotation` na URL |
| **Situação** | Não recomendado depois da instalação |
| **Fonte** | [VAPIX, Image source rotation](https://developer.axis.com/vapix/network-video/image-source-rotation/) · [Whitepaper de latência](https://whitepapers.axis.com/en-us/latency-in-live-network-video-surveillance) |

### Overlays

| | |
| --- | --- |
| **O que faz** | Grava texto ou imagem no vídeo, em todos os streams |
| **Ganho de qualidade** | Nenhum na imagem |
| **Banda** | Sem número oficial |
| **Latência** | As variantes `sync` fazem o vídeo esperar o overlay e podem somar atraso |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Sem efeito documentado |
| **Risco para evidência** | Texto gravado não sai mais da imagem. Nunca sobre a via |
| **Na P1475-LE** | `all`, sem texto e sem imagem configurados |
| **Parâmetro** | `Image.I0.Appearance.Overlays`, `overlays` na URL, `dynamicoverlay.cgi` |
| **Situação** | Manter sem overlay |
| **Fonte** | [VAPIX, Overlay API](https://developer.axis.com/vapix/network-video/overlay-api/) |

### Modo de baixa latência

| | |
| --- | --- |
| **O que faz** | Encurta o processamento de imagem do ao vivo |
| **Ganho de qualidade** | Negativo: "the image quality is lower than usual", segundo a Axis |
| **Banda** | Sem fonte oficial |
| **Latência** | Menor no processamento da câmera. Perto do atraso da rede, é pouco (inferência) |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda a entrada do analítico |
| **Risco para evidência** | Imagem pior |
| **Na P1475-LE** | Sim, `off` |
| **Parâmetro** | `ImageSource.I0.Sensor.LowLatencyMode`, nome lido na câmera. A VAPIX não o documenta |
| **Situação** | Manter desligado |
| **Fonte** | [Manual da P1475-LE](https://help.axis.com/en-us/axis-p1475-le) · [Datasheet da P1475-LE](https://www.axis.com/dam/public/e0/69/b9/datasheet-axis-p1475%E2%80%93le-bullet-camera-en-US-521384.pdf) |

### Modo de captura e frequência da rede elétrica

| | |
| --- | --- |
| **O que faz** | O modo de captura fixa a resolução e o fps máximos do sensor. A frequência casa a exposição com a rede elétrica, contra a cintilação de lâmpada. Os modos flicker-free e flicker-reduced prendem o obturador nessa frequência |
| **Ganho de qualidade** | O modo com WDR mostra farol e sombra. O de 60 fps dá movimento mais liso, sem WDR |
| **Banda** | 60 fps custa mais |
| **Latência** | 60 fps encurta o intervalo entre quadros |
| **Navegador** | 60 fps dobra o decode |
| **Risco para o analítico** | A troca de modo exige reinício da câmera e pode mudar o campo de visão |
| **Risco para evidência** | Obturador preso na frequência da rede aumenta o borrão de veículo (inferência) |
| **Na P1475-LE** | Modo 1 (1080p a 30 fps com WDR), 60 Hz, exposição `auto` |
| **Parâmetro** | `capturemode.cgi` (`getCaptureModes`, `setCaptureMode`), `ImageSource.I0.CaptureFrequency`, `Exposure` |
| **Situação** | Manter |
| **Fonte** | [VAPIX, Capture mode](https://developer.axis.com/vapix/network-video/capture-mode/) · [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help) |

### Balanço de branco

| | |
| --- | --- |
| **O que faz** | Corrige a cor da luz da cena. O automático acompanha a luz. O fixo prende uma temperatura de cor |
| **Ganho de qualidade** | Cor de veículo e de sinalização mais perto do real |
| **Banda** | Nenhum |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Muda a cor que o analítico lê |
| **Risco para evidência** | A cor do veículo e do semáforo é informação. O fixo pode errar sob lâmpada de sódio ou LED à noite (inferência) |
| **Na P1475-LE** | `fixed_outdoor2` |
| **Parâmetro** | `ImageSource.I0.Sensor.WhiteBalance`, `WhiteBalance` no ONVIF |
| **Situação** | Testar de dia e de noite, decisão do dono |
| **Fonte** | [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) |

### Reflexo e brilho, medido na P1475-LE

Medido na P1475-LE, com sol, por snapshot da câmera: a porcentagem de pixels estourados (realce) e esmagados
(sombra) em cada valor.

| Ajuste | Valor | Realce estourado | Sombra esmagada | Conclusão |
| --- | --- | --- | --- | --- |
| Defog (`Defog=on`) | `DefogEffect` 25 | 1,4% | 1,8% | Sobe o contraste, mas estoura realce e esmaga sombra |
| Defog (`Defog=on`) | `DefogEffect` 50 | 4,5% | 3,4% | Pior: fica desligado |
| Recuperação de realce | `HighlightsRecovery` 0, 50 e 100 | de 0,43% a 0,75%, variando com a cena | - | Sem efeito mensurável: fica em 0 |

**Reflexo do céu no para-brisa.** Nenhum ajuste de câmera nem filtro de software tira esse reflexo. O sensor não
registra a polarização da luz, então o efeito de um filtro polarizador "cannot be replicated in software". Só um
polarizador óptico na frente da lente reduz o reflexo de vidro e de água. É decisão de instalação e de hardware, não
de configuração.

Fonte: [Polarizing filter (photography)](https://en.wikipedia.org/wiki/Polarizing_filter_(photography)).

## Catálogo Hikvision

### O que a frota tem

| Campo | Valor |
| --- | --- |
| Câmera | HKV, Hikvision DS-2CD1023G0E-I, firmware V5.7.12, em `192.168.210.80` ([[Câmeras - Integração com dispositivo - Runbook]]) |
| Streams no cadastro | PRIMARY `Streaming/Channels/101`: 1920x1080, H.264, 4096 kbps, 25 fps, VBR. SECONDARY `Streaming/Channels/102`: 640x360, H.264, 1024 kbps, 25 fps |
| Como o Attlas puxa | Sem parâmetro na URL: a Hikvision os ignora. O tier escolhe o canal, e o TERTIARY cai no SECONDARY ([[Câmeras - Streaming - Arquitetura e estratégias]]) |
| Recursos no datasheet | H.264+ e H.265+ só no main stream, ROI com 1 região fixa só no main stream, WDR só digital (DWDR), BLC, 3D DNR, Smart Supplement Light e IR EXIR 2.0 de 30 m. H.264 Baseline, Main e High; H.265 Main. Bitrate de 32 kbps a 8 Mbps. Main stream em 1080p ou 720p a 25 fps; sub-stream em 640x480 ou 640x360 a 25 fps |
| Fora do datasheet | HLC, Defog, third stream e SVC. Só se confirmam pelas capacidades ISAPI ([[#ISAPI para ler e configurar]]) |
| Sondada | Não. A frota de hoje é Axis |

Fonte: [datasheet da DS-2CD1023G0E-I](https://assets.hikvision.com/prd/public/all/doc/m000007714/DS-2CD1023G0E-I-C_Datasheet_20250617.pdf).

### H.264+ e H.265+, Smart Codec

| | |
| --- | --- |
| **O que faz** | Modela o fundo da cena e o comprime forte. Manda um I-frame "de fundo" a cada 8 a 12 s e um quadro de atualização a cada 2 s, que referencia esse fundo. A média de bitrate é controlada num período de cerca de 24 h |
| **Ganho de qualidade** | Nenhum. O fundo perde detalhe |
| **Banda** | A Hikvision declara 66,8% a menos que o H.265 e 83,7% a menos que o H.264, em 1080p a 25 fps. Em rua movimentada, 53,8% a menos que o H.265 |
| **Latência** | O leitor novo só tem ponto de entrada limpo no próximo I-frame de fundo, até 8 a 12 s depois (inferência). O MediaMTX não pede keyframe à câmera |
| **Navegador** | A Hikvision diz que o fluxo segue o padrão. O decoder do Chromium implementa referência de longo prazo. Não há bug conhecido |
| **Risco para o analítico** | Não se aplica: a Hikvision da frota não tem analítico embarcado |
| **Risco para evidência** | Veículo parado e placa estacionada perdem detalhe no fundo comprimido (inferência) |
| **Na DS-2CD1023G0E-I** | Sim, só no main stream. Ligar ou desligar reinicia a câmera. Ligado, trava o intervalo de I-frame, o perfil, a qualidade e o SVC |
| **Parâmetro** | `GET` e `PUT /ISAPI/Streaming/channels/101`, nó `<Video><SmartCodec><enabled>`, com `<vbrAverageCap>`. Capacidade em `GET /ISAPI/Streaming/channels/101/dynamicCap`, nó `<SmartCodecCap>` |
| **Situação** | Não usar no stream ao vivo ([[#Recomendação priorizada]], item 4) |
| **Fonte** | [Whitepaper H.265+](https://www.hikvision.com/content/dam/hikvision/en/brochures-download/product-brochures/White-Paper_H.265-Plus-Brochure.pdf) · [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) · [Chromium, `h265_decoder.h`](https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/gpu/h265_decoder.h) |

### ROI

| | |
| --- | --- |
| **O que faz** | Dá mais bits à região de interesse e menos ao fundo. Cada stream tem uma região fixa, desenhada à mão, com um nível de qualidade |
| **Ganho de qualidade** | Médio na região escolhida, se ela cobre a via |
| **Banda** | Redistribui os bits dentro do mesmo bitrate |
| **Latência** | Nenhuma: o fluxo continua padrão (inferência) |
| **Navegador** | Nenhum (inferência) |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | O fundo fica pior por definição. Região fixa não acompanha o veículo |
| **Na DS-2CD1023G0E-I** | Sim, 1 região fixa, só no main stream. Só com H.264 ou H.265 |
| **Parâmetro** | Suporte em `GET /ISAPI/Smart/capabilities`, nó `<isSupportROI>`. O caminho de configuração não tem fonte oficial pública |
| **Situação** | Não recomendado: o PRIMARY é a evidência, e o fundo dele importa |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### SVC

| | |
| --- | --- |
| **O que faz** | Escalabilidade temporal: o fluxo tem camadas, e no modo automático a câmera descarta quadros quando falta banda |
| **Ganho de qualidade** | Nenhum |
| **Banda** | Nenhum ganho no pull RTSP pelo MediaMTX, porque ninguém descarta camada no caminho (inferência) |
| **Latência** | Nenhuma documentada |
| **Navegador** | Sem fonte oficial sobre o decoder do navegador |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | Perda de quadros no modo automático |
| **Na DS-2CD1023G0E-I** | Não consta no datasheet. Fica travado com H.264+ e H.265+ |
| **Parâmetro** | `GET` e `PUT /ISAPI/Streaming/channels/<ID>`, nós `<Video><SVC><enabled>` e `<SVCMode>`. Suporte em `.../dynamicCap`, nó `<isSupportSVC>` |
| **Situação** | Não usar |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### Streams principal, sub e terceiro

| | |
| --- | --- |
| **O que faz** | Cada canal tem até três streams independentes: principal (`101`), sub (`102`) e terceiro (`103`). O ID é canal vezes 100 mais o tipo |
| **Ganho de qualidade** | É o tier barato: o tier pequeno vem de um stream nativo, sem transcode |
| **Banda** | Cada stream tem o próprio bitrate |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | Nenhum |
| **Na DS-2CD1023G0E-I** | Principal e sub. O terceiro não consta no datasheet. Com o terceiro ligado, o H.264+ e o H.265+ não funcionam |
| **Parâmetro** | URL `rtsp://<ip>:554/Streaming/Channels/101`. Configuração em `GET` e `PUT /ISAPI/Streaming/channels/<ID>`. Terceiro stream em `/ISAPI/System/Software/channels/<ID>`, nó `<ThirdStream><enabled>` |
| **Situação** | Manter |
| **Fonte** | [Hikvision, URL RTSP](https://supportusa.hikvision.com/support/solutions/articles/17000129064-how-do-i-get-my-rtsp-stream-) · [ISAPI, IDs de stream](https://enpinfo.hikvision.com/unzip/20201110210551_77443_doc/GUID-515FF2B5-5E01-4F03-8B81-4CA5BD621965.html) |

### Controle de bitrate e GOP na Hikvision

| | |
| --- | --- |
| **O que faz** | CBR fixa o bitrate. VBR fixa a qualidade (6 níveis) e limita o pico por `vbrUpperCap`. O intervalo de I-frame vai de 1 a 400 quadros |
| **Ganho de qualidade** | A Hikvision diz que no CBR "mosaic may occur" e que o VBR "guarantees the image quality of complex scenes" |
| **Banda** | VBR com teto segura o pico e economiza em cena parada |
| **Latência** | Intervalo de I-frame curto encurta a entrada e a recuperação, pelo mesmo motivo da Axis ([[#Intervalo de keyframe]]) |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | Teto baixo apaga placa em movimento |
| **Na DS-2CD1023G0E-I** | Sim. O cadastro lê VBR no principal |
| **Parâmetro** | `/ISAPI/Streaming/channels/<ID>`: `<videoQualityControlType>` (CBR, VBR), `<constantBitRate>`, `<vbrUpperCap>`, `<fixedQuality>`, `<maxFrameRate>` (fps vezes 100), `<GovLength>`, `<keyFrameInterval>` (ms), `<H264Profile>`, `<enableCABAC>` |
| **Situação** | Recomendado VBR com teto e intervalo de I-frame curto ([[#Recomendação priorizada]], item 4) |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) · [ISAPI, guia de 2019 (portal com login)](https://tpp.hikvision.com/download/ISAPI_OTAP) |

### WDR e DWDR

| | |
| --- | --- |
| **O que faz** | WDR real usa toda a faixa do sensor. O DWDR (digital) só aplica tone mapping local e não amplia a faixa |
| **Ganho de qualidade** | Médio em contraluz. O DWDR ganha menos que o WDR real |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma documentada |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | O manual avisa que, ligado, "some other functions may be not supported" |
| **Na DS-2CD1023G0E-I** | Só DWDR |
| **Parâmetro** | `GET` e `PUT /ISAPI/Image/channels/<ID>/WDR`, com `<mode>` (open, close, auto) e `<WDRLevel>` |
| **Situação** | Ligar só em cena com contraluz |
| **Fonte** | [Whitepaper WDR da Hikvision](https://www.hikvision.com/content/dam/hikvision/usa/white-papers/hikvision_wide_dynamic_range_final.pdf) · [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### DNR 2D e 3D

| | |
| --- | --- |
| **O que faz** | Redução de ruído espacial (2D) e temporal (3D). Modo normal com um nível; modo especialista com nível espacial e temporal separados, de 0 a 100 |
| **Ganho de qualidade** | Alto em pouca luz |
| **Banda** | A Hikvision diz que o ruído "significantly increases the data size". Menos ruído, menos bits |
| **Latência** | Sem fonte oficial |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | O 3D alto pode deixar rastro em objeto rápido (inferência, como na Axis: [[#Redução de ruído espacial e temporal]]) |
| **Na DS-2CD1023G0E-I** | Sim, 3D DNR |
| **Parâmetro** | `GET` e `PUT /ISAPI/Image/channels/<ID>/noiseReduce`: `<mode>` (close, general, advanced), `<GeneralMode><generalLevel>`, `<AdvancedMode><FrameNoiseReduceLevel>` e `<InterFrameNoiseReduceLevel>` |
| **Situação** | Manter moderado |
| **Fonte** | [Hikvision, redução de ruído](https://info.hikvision.com/noise-reduction-technology-whitepaper) · [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### Defog na Hikvision

| | |
| --- | --- |
| **O que faz** | Realça o contraste em cena com névoa, "enhances the subtle details" |
| **Ganho de qualidade** | Alto em neblina, nulo no resto |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma documentada |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | Muda o contraste da cena gravada |
| **Na DS-2CD1023G0E-I** | Não consta no datasheet |
| **Parâmetro** | `GET` e `PUT /ISAPI/Image/channels/<ID>/dehaze`, com `<DehazeMode>` (open, close, auto) e `<DehazeLevel>` |
| **Situação** | Não se aplica a este modelo |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### BLC e HLC

| | |
| --- | --- |
| **O que faz** | BLC clareia o objeto à frente de um fundo claro, por área escolhida. HLC "identify and suppress the strong light sources", como farol |
| **Ganho de qualidade** | Médio em contraluz (BLC) e em farol à noite (HLC). Nenhuma fonte oficial cita farol de veículo |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma documentada |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | BLC estoura o fundo. HLC escurece a área clara |
| **Na DS-2CD1023G0E-I** | BLC sim. HLC não consta no datasheet |
| **Parâmetro** | `GET` e `PUT /ISAPI/Image/channels/<ID>/BLC`: `<enabled>`, `<BLCMode>`, `<BLCLevel>`. HLC só como nó `<HLC/>` em `/ISAPI/Image/channels/<ID>` |
| **Situação** | Ligar só por cena, com teste |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### Smart IR

| | |
| --- | --- |
| **O que faz** | Ajusta a força do IR (Smart Supplement Light) para não estourar o que está perto, pela luminância (automático) ou pela distância (manual) |
| **Ganho de qualidade** | Médio à noite: menos placa estourada pelo IR |
| **Banda** | Sem número oficial |
| **Latência** | Nenhuma |
| **Navegador** | Nenhum |
| **Risco para o analítico** | Não se aplica |
| **Risco para evidência** | Nenhum |
| **Na DS-2CD1023G0E-I** | Sim |
| **Parâmetro** | `GET` e `PUT /ISAPI/Image/channels/<ID>/SupplementLight`: `<mode>`, `<brightnessLimit>`, `<supplementLightMode>`, `<irLightBrightness>` |
| **Situação** | Manter automático |
| **Fonte** | [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) |

### ISAPI para ler e configurar

Todo caminho abaixo aceita `GET` para leitura. A escrita é `PUT` no mesmo caminho e vale para todos os leitores
daquele canal.

| O que | Caminho |
| --- | --- |
| Configuração de um stream | `/ISAPI/Streaming/channels/<ID>` |
| Capacidades de um stream | `/ISAPI/Streaming/channels/<ID>/capabilities` e `/dynamicCap` |
| Sessões abertas | `/ISAPI/Streaming/channels/<ID>/status`, nó `<totalStreamingSessions>` |
| Imagem inteira | `/ISAPI/Image/channels/<ID>` |
| Capacidades de imagem | `/ISAPI/Image/channels/<ID>/capabilities`; a presença do nó indica suporte (`<WDR/>`, `<BLC/>`, `<HLC/>`, `<Dehaze/>`, `<NoiseReduce/>`) |
| Ajustes de imagem | `/WDR`, `/BLC`, `/noiseReduce`, `/sharpness`, `/color`, `/IrcutFilter`, `/dehaze`, `/SupplementLight`, `/exposure`, `/shutter`, `/gain`, `/whiteBalance`, abaixo de `/ISAPI/Image/channels/<ID>` |
| Modos de imagem | `/ISAPI/Image/channels/<ID>/imageModes`: standard, indoor, outdoor e dimLight. Não há modo de trânsito |

O guia ISAPI oficial fica no portal da Hikvision, com login ([TPP](https://tpp.hikvision.com/download/ISAPI_OTAP)).
A Hikvision não tem modo de baixa latência no encoder. O Smooth Streaming exige o protocolo próprio dela (NPQ) e não
vale para o pull RTSP do MediaMTX.

## Como aplicar ajustes

### Parâmetros da URL RTSP da Axis

O caminho documentado é `axis-media/media.amp`. Para `onvif-media/media.amp`, a Axis só documenta o `profile=`.

| Parâmetro | Valores | O que faz | Em `onvif-media` |
| --- | --- | --- | --- |
| `resolution` | uma da lista da câmera | Tamanho do quadro | Funciona: a sessão sai no tamanho pedido (`streamstatus.cgi`) |
| `fps` | 0 é o máximo | Taxa de quadros | Aparece na sessão |
| `compression` | 0 a 100 | Compressão ([[#Compressão]]) | Sem fonte e sem teste |
| `videocodec` | `h264`, `h265`, `av1`, `jpeg` | Codec | O perfil ONVIF fixa o codec |
| `h264profile` | `baseline`, `main`, `high` | Perfil do H.264 ([[#Perfil do H.264]]) | Sem fonte e sem teste |
| `videokeyframeinterval` | quadros | GOP fixo ([[#Intervalo de keyframe]]); com GOP dinâmico, é o mínimo | Sem fonte e sem teste |
| `videobitratemode` | `vbr`, `mbr`, `abr` | Modo de rate control; obrigatório para qualquer outra opção de rate control na URL. Com `mbr`, a resposta RTSP leva cerca de 12 s | Sem fonte e sem teste |
| `videomaxbitrate` | kbps | Teto do MBR | Sem fonte e sem teste |
| `videobitratepriority` | `none`, `framerate`, `quality`, `fullframerate` | O que ceder no teto; só em MBR | Sem fonte e sem teste |
| `videoabrtargetbitrate`, `videoabrmaxbitrate`, `videoabrretentiontime` | kbps e dias | ABR, para gravação | Sem fonte e sem teste |
| `videozstrength` | `off`, `10` a `50` | Força do Zipstream ([[#Zipstream, força]]) | Sem fonte e sem teste |
| `videozprofile`, `videozprofilelevel`, `videozgradualdecoderefresh` | ver [[#Zipstream, perfil]] | Perfil do Zipstream | Sem fonte e sem teste |
| `videozgopmode`, `videozmaxgoplength` | `fixed`, `dynamic`; 1 a 1023 | GOP dinâmico ([[#Zipstream, GOP dinâmico]]) | Sem fonte e sem teste |
| `videozfpsmode`, `videozminfps`, `videoframeskipmode` | ver [[#Zipstream, FPS dinâmico]] | FPS dinâmico | Sem fonte e sem teste |
| `rotation`, `overlays` | ver [[#Formato corredor]] e [[#Overlays]] | Rotação e overlays | Sem fonte e sem teste |
| `streamprofile` | nome | Carrega um stream profile. Opção escrita depois dele vence o perfil | Sem fonte e sem teste |
| `adjustablelivestream=1` | - | Permite trocar `compression`, `fps`, `videokeyframeinterval`, `videomaxbitrate` e `videozstrength` no meio da sessão, por `SET_PARAMETER`. A Axis não recomenda subir acima do valor inicial | Sem fonte e sem teste |
| `videobitrate` | - | **Não existe mais.** Saiu com o CBR na Rate Control API 2.0 | A câmera aceita e ignora: SECONDARY com `videobitrate=2000` entrega cerca de 4,5 Mbps |

Fontes: [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) ·
[VAPIX, Video streaming](https://developer.axis.com/vapix/network-video/video-streaming/) ·
[VAPIX, RTSP adjustable live stream](https://developer.axis.com/vapix/network-video/rtsp-adjustable-live-stream/) ·
[VAPIX, Rate control](https://developer.axis.com/vapix/network-video/rate-control/).

### Stream profiles nomeados

Um stream profile guarda, na câmera, um conjunto de opções de URL com um nome. A URL passa a ser
`axis-media/media.amp?streamprofile=<nome>`, e o que vier escrito depois do nome vence o perfil.

| Campo | Valor |
| --- | --- |
| API | `/axis-cgi/streamprofile.cgi`, JSON, métodos `list`, `create`, `update`, `remove` e `getSupportedVersions` |
| Formato | `{"name": "...", "description": "...", "parameters": "resolution=1280x720&fps=30"}`. O campo `parameters` é uma query string com as opções de [[#Parâmetros da URL RTSP da Axis]] |
| Limite | 26 perfis (`maxProfiles` no `list`) |
| Na P1475-LE | Nenhum criado |
| Por que vale a pena | A mesma configuração por tier para todos os tenants e todos os consumidores, num lugar só da câmera. A Axis recomenda no máximo 3 streams únicos por câmera, e cada combinação diferente de parâmetros é um stream único a mais no encoder |

Exemplo de perfil do SECONDARY, para o dono validar os números. O teto MBR dentro do perfil não foi medido; se ele
também atrasar a partida, sai do perfil:
`resolution=1280x720&fps=30&videocodec=h264&h264profile=main&videokeyframeinterval=9&videozgopmode=fixed&videozfpsmode=fixed&videozprofile=classic&videozstrength=20&videobitratemode=mbr&videomaxbitrate=2000&videobitratepriority=framerate`.

Fonte: [VAPIX, Stream profiles](https://developer.axis.com/vapix/network-video/stream-profiles/) ·
[Datasheet da P1475-LE](https://www.axis.com/dam/public/e0/69/b9/datasheet-axis-p1475%E2%80%93le-bullet-camera-en-US-521384.pdf).

### ONVIF Imaging

Vale para qualquer câmera com ONVIF ligado, inclusive a Hikvision depois do cadastro. Escrever pelo ONVIF
(`SetImagingSettings`) muda o sensor: todos os streams, a gravação e o analítico.

| Na P1475-LE, o ONVIF expõe | O ONVIF não expõe |
| --- | --- |
| Brilho, saturação, contraste e nitidez, de 0 a 100 | SNF e TNF |
| WDR ligado ou desligado | Scene profile |
| Balanço de branco automático ou manual | Zipstream |
| Exposição automática ou manual, com prioridade `LowNoise` ou `FrameRate` e limites de tempo e ganho | Modo de captura |
| Filtro de IR | Contraste local e tone mapping separados |
| Estabilização, com nível de 0 a 9999 | |
| Compensação de tom, com nível | |
| Defog desligado, ligado ou automático, com nível | |

Fonte: ONVIF `GetOptions` e `GetImagingSettings` na câmera ·
[ONVIF, Imaging Service](https://www.onvif.org/specs/srv/img/ONVIF-Imaging-Service-Spec.pdf) ·
[ONVIF, Media2 Service](https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf).

### Hikvision

A Hikvision ignora parâmetro na URL. O que o Attlas pode fazer é escolher o canal (já faz) e escrever a configuração
do canal por ISAPI ([[#ISAPI para ler e configurar]]) ou a imagem por ONVIF. Toda escrita vale para todos os leitores
daquele canal. Ligar ou desligar o Smart Codec reinicia a câmera.

## Riscos para o analítico e para a evidência

| Mudança | Analítico embarcado | Evidência |
| --- | --- | --- |
| Parâmetro de um tier na URL ou no stream profile | Não muda a imagem que o analítico lê. Cada combinação nova de parâmetros é mais um stream único no encoder, que a câmera divide com a detecção | Só o tier menor perde detalhe. O PRIMARY fica intacto |
| Teto MBR na URL | Nenhum efeito na imagem do analítico | A câmera leva cerca de 12 s para responder o RTSP, o MediaMTX dá timeout em 8 s e o player cai em erro |
| Imagem do sensor: scene profile, exposição, ruído, nitidez, WDR, cor | Muda o que o analítico lê. Testar na câmera de bancada antes | Muda o que fica gravado |
| Vários ajustes de sensor em sequência | Trocar defog e recuperação de realce em seguida derrubou o pipeline de vídeo da câmera ("VDO stream lost" no ACAP). Mexer uma vez, medir e parar | Vídeo perdido até o reinício |
| Geometria: rotação, margem do EIS, zoom, foco, modo de captura | Desalinha as regiões do analítico, que precisam ser refeitas | Muda o campo de visão |
| Codec: H.265 | Encoder sob carga do analítico já entregou H.265 defeituoso | Nenhum |
| Codec: AV1 | Medido estável com o analítico | Conferir a síntese de grão |
| Configuração do ACAP | Escrever na configuração do analítico desliga o produtor do device. Conferir o produtor depois de qualquer mudança | Nenhum |

> [!warning] Houve calibração de zoom e foco pela interface web
> O registro de auditoria da câmera mostra `opticscontrol.calibrate` com zoom e foco. Se o enquadramento mudou, as
> regiões do analítico precisam ser conferidas.

**Como recuperar a câmera quando o vídeo cai depois de um ajuste.** Reiniciar a câmera e religar o produtor do ACAP,
que volta desligado depois do reinício:

```bash
curl --digest -u "$CRED" -X POST "http://<ip-da-camera>/axis-cgi/restart.cgi"
curl --digest -u "$CRED" "http://<ip-da-camera>/local/atman_traffic_edge_atspm/api/producer"
curl --digest -u "$CRED" -X POST "http://<ip-da-camera>/local/atman_traffic_edge_atspm/api/producer?enable=true"
```

A segunda linha lê o estado do produtor; `enabled: false` pede a terceira.

Três cuidados de evidência que valem para qualquer ajuste:

- **O PRIMARY é a evidência.** Ele fica em VBR, Zipstream 10, GOP fixo e FPS fixo.
- **Nada que invente ou misture quadros.** FPS dinâmico abre buraco de tempo; filtro temporal forte pode deixar
  rastro. É o mesmo princípio do realce no cliente ([[Câmeras - Streaming - Realce de imagem no cliente#O que não entra na imagem|o que não entra na imagem]]).
- **Vídeo assinado existe e está desligado.** A P1475-LE tem `Image.I0.MPEG.SignedVideo.Enabled` (`videosigned` na
  URL), que assina o vídeo na origem ([VAPIX, Signed video](https://developer.axis.com/vapix/network-video/signed-video/)).
  Não melhora a imagem; prova que ela não foi alterada.

## Recomendação priorizada

Ordem sugerida, para o dono decidir. Ganho, banda e risco em três níveis: baixo, médio e alto.

| # | O que mudar | Ganho | Banda | Desempenho | Risco | Detalhe |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TERTIARY com resolução da lista da câmera: 640x360 em `DERIVED_TIER_TARGETS` (`camera-provisioning.service.ts`) e no cadastro das câmeras já provisionadas. A escada do resolver já usa 640x360 | Alto, se o tier hoje falha | Menor | Nenhum | Baixo | [[#Streams que o Attlas puxa]], [[#O que o Attlas faz na câmera hoje]] |
| 2 | Teto real nos tiers menores da Axis sem atrasar a partida. O `videobitrate` que o cadastro grava não faz nada e sai; o MBR na URL atrasa o RTSP. Testar o MBR dentro de um stream profile nomeado, medindo o tempo até o primeiro quadro | Médio: o tier menor para de vir com rajada | Alto: o SECONDARY cai de cerca de 4,5 para cerca de 2 Mbps | Nenhum | Médio: se o stream profile também atrasar a partida, o tier cai em erro | [[#Controle de bitrate]], [[#Stream profiles nomeados]] |
| 3 | Uma URL igual por tier em todos os tenants, de preferência com stream profile nomeado criado no cadastro | Médio: encoder estável e todos os leitores no mesmo stream | Neutra | Menos encodes na câmera | Baixo: escreve na câmera uma vez, sem tocar o sensor | [[#Stream profiles nomeados]], [[#Riscos para o analítico e para a evidência]] |
| 4 | Hikvision: Smart Codec desligado no canal puxado ao vivo, VBR com `vbrUpperCap` e intervalo de I-frame curto | Alto na entrada e na recuperação do tile | Sobe em relação ao Smart Codec | Nenhum | Baixo: exige reinício da câmera | [[#H.264+ e H.265+, Smart Codec]], [[#Controle de bitrate e GOP na Hikvision]] |
| 5 | Zipstream 20 nos tiers menores da Axis, pela URL (`videozstrength=20`). O PRIMARY fica em 10 | Neutro no tile pequeno. Sob teto, sobra bit para o que se move | Menor | Nenhum | Baixo | [[#Zipstream, força]] |
| 6 | Borrão noturno: scene profile Traffic overview (ou o Traffic Wizard) e obturador máximo mais curto, testados na câmera de bancada | Alto à noite | Sobe à noite: mais ganho, mais ruído | Nenhum | Alto: muda a imagem do analítico e da gravação | [[#Scene profiles e Traffic Wizard]], [[#Lightfinder e exposição]] |
| 7 | Ruído: escolher entre o padrão Axis (SNF e TNF em 100) e o valor atual (50), medindo à noite o bitrate e a leitura de placa em movimento | Médio | O filtro mais forte tende a economizar (inferência) | Nenhum | Médio: TNF alto pode deixar rastro | [[#Redução de ruído espacial e temporal]] |
| 8 | GOP e perfil das URLs Axis: levar o orçamento de keyframe também ao `onvif-media`, ou trocar o cadastro para `axis-media` (o que também abre o caminho do AV1); testar Main no lugar de baseline | Médio: o congelamento depois de uma perda fica mais curto | Sobe com GOP curto; o Main compensa parte | Nenhum | Baixo | [[#Intervalo de keyframe]], [[#Perfil do H.264]] |
| 9 | AV1 em teste controlado: `STREAM_AV1_ENABLED` só onde o enlace comporta, com o perfil em `axis-media`, e a síntese de grão conferida antes | Médio: mais qualidade na mesma resolução | Sobe: cerca de 60% mais que o H.264 do mesmo tier, no controle de taxa da câmera | Alto sem hardware: decode em software por tile | Médio | [[#AV1]] |

**Por que nesta ordem.**

- Os itens 1 a 3 corrigem o que hoje não faz o que promete. São por stream e não mexem no analítico.
- O item 4 tira da Hikvision o único recurso que atrapalha o ao vivo de forma estrutural.
- O item 5 é ganho de banda barato e por stream.
- Os itens 6 e 7 mexem no sensor, então pedem teste com o analítico ligado.
- O item 8 troca banda por recuperação mais rápida, e o número certo sai de medição.
- O item 9 é experimento.

**Manter como está, de propósito.**

- Zipstream `classic`, GOP fixo e FPS fixo: `storage` põe B-frame e o MediaMTX fecha a sessão WebRTC; GOP e FPS
  dinâmicos atrasam a entrada e parecem travamento.
- VBR e compressão 30 no PRIMARY, que é a evidência.
- Sem MBR na URL: a partida passa do timeout do MediaMTX.
- Forensic WDR ligado e modo de captura em 30 fps com WDR.
- Nitidez, contraste, saturação e brilho em 50, o padrão Axis. A nitidez de tela é do RCAS do cliente.
- Defog desligado e recuperação de realce em 0, pelo que foi medido.
- Estabilização ligada, sem mexer na margem.
- Modo de baixa latência desligado: ele piora a imagem.
- Sem overlay.
- H.265 recusado nesta câmera, por causa do analítico.

**Fora da lista, de propósito.**

- Formato corredor: muda a geometria e desalinha todas as regiões.
- Defog na câmera: a Axis não recomenda em cena de luz variável, e o dehaze do cliente não mexe no analítico.
- Modo de captura de 60 fps: perde o WDR.
- ROI e SVC da Hikvision: piora o fundo do PRIMARY e não traz ganho no pull RTSP.
- `networkloadbalancing` e atualização gradual: somam latência no ao vivo.

## Documentação oficial

**Axis**

- [VAPIX, Zipstream](https://developer.axis.com/vapix/network-video/zipstream-technology/) · [Whitepaper Zipstream](https://whitepapers.axis.com/en-us/axis-zipstream-technology) · [Whitepaper Zipstream, PDF](https://www.axis.com/dam/public/ae/ea/49/axis-zipstream-technology-en-US-396891.pdf)
- [VAPIX, Image API](https://developer.axis.com/vapix/network-video/parameter-management/image-api/) · [VAPIX, Rate control](https://developer.axis.com/vapix/network-video/rate-control/) · [VAPIX, Video streaming e Scene profile API](https://developer.axis.com/vapix/network-video/video-streaming/)
- [VAPIX, Stream profiles](https://developer.axis.com/vapix/network-video/stream-profiles/) · [VAPIX, RTSP adjustable live stream](https://developer.axis.com/vapix/network-video/rtsp-adjustable-live-stream/)
- [VAPIX, Imaging API](https://developer.axis.com/vapix/network-video/imaging-api/) · [VAPIX, Capture mode](https://developer.axis.com/vapix/network-video/capture-mode/) · [VAPIX, Image stabilization API](https://developer.axis.com/vapix/network-video/image-stabilization-api/) · [VAPIX, Image source rotation](https://developer.axis.com/vapix/network-video/image-source-rotation/) · [VAPIX, Overlay API](https://developer.axis.com/vapix/network-video/overlay-api/) · [VAPIX, Signed video](https://developer.axis.com/vapix/network-video/signed-video/)
- [Manual da P1475-LE](https://help.axis.com/en-us/axis-p1475-le) · [Manual da P1475-LE, PDF](https://help.axis.com/download/um_p1475_le_t10234591_2511.pdf) · [Datasheet da P1475-LE](https://www.axis.com/dam/public/e0/69/b9/datasheet-axis-p1475%E2%80%93le-bullet-camera-en-US-521384.pdf) · [AXIS OS, ajuda da interface web](https://help.axis.com/en-us/axis-os-web-interface-help)
- Whitepapers: [WDR](https://whitepapers.axis.com/en-us/wide-dynamic-range) · [Lightfinder](https://whitepapers.axis.com/en-us/lightfinder) · [Latência](https://whitepapers.axis.com/en-us/latency-in-live-network-video-surveillance) · [Frame rate cheio](https://whitepapers.axis.com/en-us/controlled-full-frame-rate) · [AV1](https://whitepapers.axis.com/en-us/av1-codec-in-video-surveillance) · [Desempenho de streaming da ARTPEC](https://whitepapers.axis.com/en-us/streaming-performance-for-artpec-products)
- [Traffic Wizard, manual da Q1798-LE](https://help.axis.com/en-us/axis-q1798-le)

**Hikvision**

- [Datasheet da DS-2CD1023G0E-I](https://assets.hikvision.com/prd/public/all/doc/m000007714/DS-2CD1023G0E-I-C_Datasheet_20250617.pdf)
- [Manual de câmera de rede 5.5.121](https://assets.hikvision.com/prd/public/all/doc/sm000080304/UD19492B-D_Network-Camera_User-Manual_5.5.121_20240205.pdf) · [Manual de câmera de rede 5.6.10](https://assets.hikvision.com/prd/public/all/doc/m000012235/UD16429B-B_Baseline_User-Manual-of-Network-Camera_V5.6.10_20221223.pdf)
- [Whitepaper H.265+](https://www.hikvision.com/content/dam/hikvision/en/brochures-download/product-brochures/White-Paper_H.265-Plus-Brochure.pdf) · [Whitepaper WDR](https://www.hikvision.com/content/dam/hikvision/usa/white-papers/hikvision_wide_dynamic_range_final.pdf) · [Redução de ruído](https://info.hikvision.com/noise-reduction-technology-whitepaper)
- [ISAPI, portal oficial (com login)](https://tpp.hikvision.com/download/ISAPI_OTAP) · [ISAPI, IDs de stream](https://enpinfo.hikvision.com/unzip/20201110210551_77443_doc/GUID-515FF2B5-5E01-4F03-8B81-4CA5BD621965.html) · [URL RTSP](https://supportusa.hikvision.com/support/solutions/articles/17000129064-how-do-i-get-my-rtsp-stream-)

**Navegador e MediaMTX**

- [MediaMTX, leitura por WebRTC](https://mediamtx.org/docs/read/webrtc) · [MediaMTX, leitura por HLS](https://mediamtx.org/docs/read/hls) · [MediaMTX, arquivo de configuração](https://mediamtx.org/docs/references/configuration-file)
- MediaMTX no código: [`from_stream.go`, recusa de B-frame](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/from_stream.go) · [`outbound_track.go`, PLI descartado](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/outbound_track.go) · [`peer_connection.go`, NACK](https://raw.githubusercontent.com/bluenviron/mediamtx/main/internal/protocols/webrtc/peer_connection.go)
- H.265: [blink-dev, WebRTC no Chrome 136](https://groups.google.com/a/chromium.org/g/blink-dev/c/3h8lL8a377c) · [Chrome Platform Status, HEVC por hardware](https://chromestatus.com/feature/5186511939567616) · [Microsoft, Edge sem H.265 no WebRTC](https://learn.microsoft.com/en-us/answers/questions/5875799/edge-webrtc-h265-support) · [Mozilla, posição sobre H.265 no WebRTC](https://github.com/mozilla/standards-positions/issues/1188)
- AV1: [Chrome 90, AV1 no WebRTC](https://developer.chrome.com/blog/new-in-chrome-90) · [WebRTC M104, dav1d](https://groups.google.com/g/discuss-webrtc/c/PZxgk-aUFhw/m/5CkxzxUMAgAJ) · [MDN, Firefox 136](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/136) · [WebKit, Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- [MDN, codecs do WebRTC](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs) · [MDN, codecs de vídeo](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs) · [RFC 7742, H.264 no WebRTC](https://www.rfc-editor.org/rfc/rfc7742.html) · [Apple, HLS Authoring Specification](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)

**ONVIF**

- [Imaging Service](https://www.onvif.org/specs/srv/img/ONVIF-Imaging-Service-Spec.pdf) · [Media2 Service](https://www.onvif.org/specs/srv/media/ONVIF-Media2-Service-Spec.pdf)

## Glossário

| Termo | O que é |
| --- | --- |
| I-frame ou keyframe | Quadro completo, que o decoder entende sozinho. É o mais caro em bits |
| P-frame | Quadro que guarda só a diferença para o anterior |
| B-frame | Quadro que usa o anterior e o seguinte. Obriga a reordenar quadros, e o MediaMTX recusa no WebRTC |
| GOP | Intervalo entre dois I-frames |
| PLI | Pedido de keyframe que o navegador manda depois de perder imagem. O MediaMTX o descarta |
| NACK | Pedido de reenvio de um pacote perdido |
| VBR, MBR, ABR | Bitrate variável pela qualidade, bitrate com teto, e bitrate médio num período longo |
| Stream único | Combinação própria de parâmetros que a câmera codifica à parte. Leitores da mesma combinação dividem o mesmo stream |
| Zipstream | Conjunto de técnicas da Axis que corta bitrate dentro do encoder |
| GDR | Atualização gradual: troca o I-frame por faixas de atualização espalhadas em vários quadros |
| WDR | Faixa dinâmica ampla: sombra e luz forte visíveis na mesma imagem |
| SNF e TNF | Filtro de ruído espacial (dentro do quadro) e temporal (entre quadros) |
| EIS | Estabilização eletrônica, que corta uma margem para compensar a vibração |
| Scene profile | Conjunto pronto de ajustes de imagem da Axis |
| Stream profile | Conjunto nomeado de opções de URL, guardado na câmera Axis |
| Smart Codec | O H.264+ e o H.265+ da Hikvision |
| ACAP | Aplicativo que roda dentro da câmera Axis; aqui, o analítico embarcado |
| VAPIX, ISAPI, ONVIF | API da Axis, API da Hikvision e padrão comum entre fabricantes |
