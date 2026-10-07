---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
  - codecs
aliases:
  - "Câmeras - Streaming - Codecs"
  - "Codecs de vídeo"
  - "AV1, H.265 e H.264"
  - "Streaming - Codecs"
atualizado: 2026-10-05
---

# Câmeras - Streaming - Codecs

Volta para [[Câmeras - Streaming]]. Esta nota é o lugar único dos codecs de vídeo do Attlas: quais existem, quanto de
banda usam, quantos bits por pixel precisam, o que cada câmera e cada navegador suporta, e as decisões com o
mapeamento para as specs. O mecanismo de negociação no código (`negotiateEffectiveCodec`, fallback H.265 para H.264,
sonda do navegador) está em [[Câmeras - Streaming - Arquitetura e estratégias#Codecs]]. Banda provisionada e bitrate
medido estão em [[Câmeras - Streaming - Banda e bitrate]].

## 1. Resumo

| Pergunta | Resposta |
| --- | --- |
| Quais codecs o Attlas serve hoje | H.264 sempre, H.265 só para quem detectou decode por hardware. Nenhum outro |
| Quais codecs ficam decididos | AV1, H.265 e H.264, nessa ordem, sempre detectando antes de usar |
| Alguém transcodifica | Não. O vídeo sai da câmera e chega ao navegador no mesmo codec (passthrough) |
| Codec mais eficiente na câmera Axis | AV1 e H.265 empatam; os dois gastam cerca de 24% menos que o H.264 na cena de trânsito da Axis |
| Bits por pixel para imagem boa em trânsito | Estimativa: cerca de 0,10 no H.264 e 0,075 no H.265 e no AV1, em 1080p a 30 fps (seção 7.3) |
| Banda do AV1 | A mesma do tier H.264, sempre com MBR; ganha qualidade, não banda (seção 7.5) |
| Navegador que recebe AV1 por WebRTC | Chrome (medido no 150) e Firefox 136 ou mais novo. Safari só com decoder AV1 de hardware |
| Navegador que recebe H.265 por WebRTC | Chrome 136 ou mais novo, só com hardware. No Chrome 150 do Linux, medido: não |

> [!warning] AV1 ainda não está no código
> As decisões de AV1 da seção 9 estão em implementação numa PR nova (branch
> `cameras/feat/NO-CARD-av1-camera-native`). Na `develop`, `normalizeStreamCodec`
> (`apps/ms-cameras/src/streaming/helpers/stream-codec.helper.ts`) transforma qualquer codec que não é HEVC em
> H.264, `NegotiableCodec` (`libs/contracts/src/lib/camera/negotiable-codec.type.ts`) é só `'H264' | 'H265'`, e o path
> `-av1` é recusado pelo parser de nome de path.

## 2. Unidades

| Unidade | O que é |
| --- | --- |
| kbps, Mbps | Mil e um milhão de bits por segundo. 1 Mbps = 1000 kbps |
| fps | Quadros por segundo |
| bpp | Bits por pixel: `bitrate / (largura x altura x fps)`. Quanto de informação cada pixel de cada quadro recebe |
| GOP | Distância entre dois keyframes, em quadros ou em milissegundos |

Exemplo: 4 Mbps em 1280x720 a 30 fps dá `4.000.000 / (1280 x 720 x 30) = 0,145 bpp`.

## 3. Os codecs, no mesmo modelo

### 3.1 H.264 (AVC)

| Item | Resposta |
| --- | --- |
| O que é | Padrão ITU-T H.264 e ISO/IEC 14496-10, de 2003. A base universal do vídeo na web |
| Licença | Patentes em pool (Via LA). No WebRTC do Firefox, a Cisco distribui o OpenH264 e paga a licença |
| Eficiência | A referência: os outros codecs se medem contra ele |
| Encode na câmera | Barato; toda câmera IP faz |
| Decode no navegador | Hardware em toda GPU dos últimos dez anos (seção 5); software barato quando não há |
| Latência | Sem B-frame, nenhum atraso de reordenação. O perfil baseline (sem B-frame e sem CABAC) gasta mais bits que o High para a mesma imagem |
| WebRTC | Obrigatório: todo navegador implementa o perfil Constrained Baseline (RFC 7742). B-frame não é suportado por navegador nenhum no WebRTC (MediaMTX) |
| LL-HLS fMP4 | Sim |
| MediaMTX | Lê do RTSP e serve por WebRTC e HLS |
| Risco forense | Abaixo da faixa boa vira bloco quadrado de 16x16 pixels nas áreas em movimento; a placa vira mosaico |
| No Attlas hoje | Padrão de toda sessão (`codec` ausente vira H.264). Nas Axis sai em `h264profile=baseline`. É o único codec do espelho do videowall H9 (`VideowallMirrorCodecEnforcerService`) |

### 3.2 H.265 (HEVC)

| Item | Resposta |
| --- | --- |
| O que é | Padrão ITU-T H.265 e ISO/IEC 23008-2, de 2013 |
| Licença | Vários pools de patentes (Via LA, Access Advance) e titulares avulsos. É a razão do suporte irregular nos navegadores |
| Eficiência | Cerca de 50% menos bits que o H.264 para a mesma qualidade subjetiva com encoders de referência (Ohm e outros, IEEE, 2012). Em produção a economia é menor: a Apple recomenda cerca de 25% menos (HLS Authoring Specification) e a Axis mede 23% menos na cena de trânsito |
| Encode na câmera | Cerca de 2 vezes o custo do H.264 (INT-008). Câmera com analítico embarcado não sustenta H.265 junto com a detecção |
| Decode no navegador | Só por hardware no Chrome, no Edge e no WebRTC; o Chrome não tem decoder H.265 de software |
| Latência | Igual ao H.264 quando não há B-frame |
| WebRTC | Chrome 136 ou mais novo, só com hardware (MDN). O MediaMTX documenta só Windows com GPU capaz. Medido no Chrome 150 do Linux: não suportado |
| LL-HLS fMP4 | Sim, como `hvc1`. A sonda do player usa `hvc1.1.6.L93.B0`, perfil Main, nível 3.1 (cobre 720p) |
| MediaMTX | Lê do RTSP e serve por WebRTC e HLS |
| Risco forense | Abaixo da faixa boa a imagem borra em vez de quadricular, porque os blocos são maiores e o filtro de bloco é mais forte; letra parecida (8 e B) se confunde |
| No Attlas hoje | Só para quem pediu `codec=h265` e passou na sonda `supported && smooth && powerEfficient`. Recusado a câmera com analítico embarcado. Na Axis, recusa RTSP 4xx da câmera reaponta o path para H.264 |

### 3.3 AV1

| Item | Resposta |
| --- | --- |
| O que é | Codec da Alliance for Open Media (AOMedia), versão 1.0 de 2018. Na Axis, perfil Main, 8 bits, a partir do ARTPEC-9 |
| Licença | Livre de royalty pela AOMedia Patent License 1.0 |
| Eficiência | Na câmera Axis, igual ao H.265 e 18% a 33% menor que o H.264, conforme a cena; na cena de trânsito, 24% menor que o H.264 e 0,7% menor que o H.265 (white paper Axis, junho de 2026). O MDN cita até 50% sobre o H.264 com encoder de referência |
| Encode na câmera | O ARTPEC-9 codifica AV1 em tempo real sem carga extra de CPU, e entrega H.264, H.265 e AV1 ao mesmo tempo (Axis) |
| Decode no navegador | Hardware a partir de Intel Tiger Lake, AMD RX 6000, NVIDIA RTX 30 e Apple M3 (seção 5). Sem hardware, software pelo dav1d: medido fluido em 1080p30 a 4 Mbps, mas não `powerEfficient` |
| Latência | Os quadros inter da Axis referenciam até seis quadros já decodificados, sem B-frame. Latência ponta a ponta não medida |
| WebRTC | Chrome 113 ou mais novo e Firefox 136 ou mais novo (MDN); Firefox 157 passa a usar hardware. Safari só em aparelho com decoder AV1 de hardware. Medido no Chrome 150 do Linux: recebe |
| LL-HLS fMP4 | Sim. Medido: o MediaMTX 1.21.1 anuncia `av01.0.08M.08` (perfil Main, nível 4.0, tier Main, 8 bits) |
| MediaMTX | Lê do RTSP e serve por WebRTC e HLS. Medido: repassa o AV1 da câmera; 33 s de 1080p decodificados pelo dav1d sem erro, com o analítico embarcado ligado |
| Risco forense | Abaixo da faixa boa borra como o H.265. Tem síntese de grão opcional, em que o decodificador acrescenta ruído artificial; a Axis diz que o recurso é para cinema e não para vigilância |
| No Attlas hoje | Não negociado. Decidido e em implementação (seção 9) |

### 3.4 VP9

| Item | Resposta |
| --- | --- |
| O que é | Codec do Google, de 2013 |
| Licença | Livre de royalty |
| Eficiência | Parecida com a do H.265 na mesma taxa (MDN) |
| Encode na câmera | As câmeras do parque não codificam VP9 |
| Decode no navegador | Hardware em Intel desde Kaby Lake, NVIDIA desde Pascal e AMD desde VCN 2.0 |
| Latência | Sem reordenação no modo tempo real |
| WebRTC | Chrome 48 ou mais novo e Firefox (MDN); RTP pela RFC 9628 |
| LL-HLS fMP4 | O MediaMTX aceita |
| MediaMTX | Lê e serve por WebRTC e HLS |
| Risco forense | Igual ao H.265 |
| No Attlas hoje | Fora: nenhuma câmera do parque entrega VP9, e ninguém transcodifica |

### 3.5 MJPEG

| Item | Resposta |
| --- | --- |
| O que é | Sequência de imagens JPEG, sem compressão entre quadros |
| Licença | Livre |
| Eficiência | Muito ineficiente; a Axis limita a vazão total de MJPEG da câmera por isso |
| Encode na câmera | Barato, mas a banda é alta |
| Decode no navegador | Barato |
| Latência | Mínima: todo quadro é independente |
| WebRTC | Não. O MediaMTX não serve MJPEG por WebRTC |
| LL-HLS fMP4 | Não. O MediaMTX não serve MJPEG por HLS |
| MediaMTX | Lê do RTSP, mas não tem saída para o navegador |
| Risco forense | Bloco de JPEG quadro a quadro, sem borrão de movimento entre quadros |
| No Attlas hoje | Não convertido. Numa Axis o codec negociado vence o do perfil e a câmera entrega H.264. Câmera de outro fabricante que só entrega MJPEG não chega ao navegador |

## 4. Suporte por navegador

| Codec e caminho | Chrome | Edge | Firefox | Safari |
| --- | --- | --- | --- | --- |
| H.264 WebRTC | sim | sim | sim | sim |
| H.264 HLS (MSE ou nativo) | sim | sim | sim, pelo codec do sistema | sim |
| H.265 WebRTC | 136 ou mais novo, só hardware; medido no Linux: não | base Chromium, sem medição | não | empacotamento RFC 7798 desde o Safari 18.0, sem validação no Attlas |
| H.265 HLS | 107 ou mais novo com hardware (Linux a partir do 108, por VA-API) | 18 ou mais novo com hardware | Windows 134, macOS 136, Linux e Android 137 | 11 ou mais novo |
| AV1 WebRTC | 113 ou mais novo; medido no 150 | base Chromium, sem medição | 136 ou mais novo; hardware desde o 157 | só com decoder AV1 de hardware, sem validação no Attlas |
| AV1 HLS (MSE) | 70 ou mais novo | 121 ou mais novo | 67 ou mais novo | 17 ou mais novo, só M3, A17 Pro, M4 e mais novos |

Fontes: MDN (codecs do WebRTC e guia de codecs da web), MediaMTX, WebKit, notas do Firefox 157 e bug 1944878 da
Mozilla. Medição de 05/10/2026: Chrome 150 no Linux, Intel Raptor Lake-U.

## 5. Suporte por GPU (decode por hardware)

| Fabricante | H.264 | H.265 | AV1 | Fonte |
| --- | --- | --- | --- | --- |
| Intel | desde Broadwell (2014) | 8 bits desde Skylake, 10 bits desde Kaby Lake | decode desde Tiger Lake (inclui Alder Lake e Raptor Lake); encode desde Arc e Meteor Lake | intel/media-driver |
| AMD | VCN 2.0 em diante | VCN 2.0 em diante | decode desde VCN 3.0 (RX 6000, Ryzen 6000 e 7000); encode desde VCN 4.0 (RX 7000, Ryzen 8000) | AMD AMF |
| NVIDIA | desde Maxwell 1ª geração (GTX 750) | 8 bits desde Maxwell 2ª geração, 10 bits desde Pascal (GTX 10) | decode desde Ampere (RTX 30); encode desde Ada (RTX 40) | NVIDIA NVDEC |
| Apple | todos | Safari 11 ou mais novo | decode desde M3 e A17 Pro | Apple, MDN |

> [!info] Raptor Lake-U decodifica AV1 por hardware, mas o Chrome do Linux não usou
> A GPU da estação medida tem decode AV1 (família Tiger Lake no driver da Intel, build Full-Feature). O Chrome
> do Linux só usa a GPU para vídeo com VA-API ligado por flag, então decodificou pelo dav1d. Como ligar:
> [[Câmeras - Streaming - Realce de imagem no cliente#13.3 Como ligar a aceleração por hardware numa estação Linux com Intel]].

## 6. O que cada câmera suporta

| Câmera | Codecs | Observação |
| --- | --- | --- |
| AXIS P1475-LE `10.11.20.101`, ARTPEC-9, firmware 12.11.118 | `av1, h264, h265, jpeg, mjpeg` | AV1 perfil Main até 1920x1080 nos canais I0, I1 e I2. Com AV1, ignora `videobitrate`; o teto só vale com MBR |
| Axis ARTPEC-8 e anteriores | H.264, H.265, MJPEG | Sem AV1 (a Axis suporta AV1 só a partir do ARTPEC-9) |
| Hikvision DS-2CD1023G0E-I (INT-018) | canal 101 H.264 1920x1080 e 102 H.264 640x360, VBR, GOP 50 | Codec e GOP vivem no canal do equipamento; o Attlas não manda parâmetro na URL |
| Fabricante genérico | o que o perfil publica | URL do perfil sem mudança |

Decidido e ainda não no código: **a câmera declara no cadastro os codecs que suporta**. Hoje o cadastro guarda um
codec só (`Camera.videoCodec` e `CameraStreamProfile.codec`, texto livre).

## 7. Banda e bits por pixel

### 7.1 Medições

Medição de 05/10/2026 na estação e no dev.v2, janela de 20 s, a 30 fps. Os tiers cadastrados não informam fps aqui;
o bpp deles está a 30 fps, e a 25 fps fica 20% maior.

| Stream | Codec e modo | Banda | bpp |
| --- | --- | --- | --- |
| 1080p30, teto 4000 kbps | AV1 MBR | 3,58 Mbps | 0,058 |
| 720p30, teto 2000 kbps | AV1 MBR | 1,80 Mbps | 0,065 |
| 720p30, teto 2000 kbps | H.264 MBR | 1,69 Mbps | 0,061 |
| 1080p30, sem teto | AV1 VBR | cerca de 15 Mbps (12,5 a 14,4 anunciados no HLS) | 0,24 (0,20 a 0,23) |
| PRIMARY 1080p | H.264 VBR | cerca de 6,2 Mbps | 0,100 |
| SECONDARY 720p | H.264 | 2 Mbps (4 Mbps nesta câmera) | 0,072 (0,145) |
| TERTIARY 848x480 | H.264 | 500 kbps | 0,041 |
| 720p30 de bancada, GOP 300 ms (INT-024, 21/09) | H.264 baseline | 2,57 Mbps | 0,093 |

O que as medições mostram:

- Com MBR, a média fica entre 85% e 90% do teto.
- AV1 sem teto gasta quase 4 vezes o mesmo stream com teto 4000, e passa dos 12 Mbps que o próprio nível
  anunciado (`av01.0.08M.08`, nível 4.0, tier Main) permite pela especificação AV1. O dav1d decodificou; um
  decodificador estrito pode não aceitar. Por isso o AV1 vai sempre com MBR.

### 7.2 Referência oficial

A Apple publica uma escada de bitrate para conteúdo típico a 30 fps, com keyframe a cada 2 s (HLS Authoring
Specification):

| Resolução | H.264 | bpp | H.265 | bpp |
| --- | --- | --- | --- | --- |
| 1920x1080 | 6000 a 7800 kbps | 0,097 a 0,125 | 4500 a 5800 kbps | 0,072 a 0,093 |
| 1280x720 | 3000 a 4500 kbps | 0,109 a 0,163 | 2400 a 3400 kbps | 0,087 a 0,123 |
| 960x540 | 2000 kbps | 0,129 | 1600 kbps | 0,103 |

Imagem menor precisa de mais bpp para o mesmo aspecto, porque cada pixel carrega mais detalhe da cena.

### 7.3 Faixa de bpp para imagem boa em trânsito

**Estimativa**, não medição. Raciocínio: o piso da escada da Apple é a "boa" do H.264 (0,10 em 1080p, 0,11 em 720p,
0,12 em 480p); H.265 e AV1 levam 77% disso, a razão que a Axis mediu na cena de trânsito. Dois fatores do Attlas puxam
para cima e não têm medida: o H.264 em baseline e o GOP de 300 ms (cerca de 3 keyframes por segundo, contra 1 a cada
2 s na Apple). Um puxa para baixo: o fundo da cena de trânsito é parado. A faixa só se confirma no olho, com placa de
veículo em movimento.

| Codec | Boa (1080p30) | Aceitável | Abaixo do aceitável |
| --- | --- | --- | --- |
| H.264 baseline | 0,10 ou mais | 0,07 a 0,10 | bloco de 16x16 no movimento; placa de carro rápido vira mosaico |
| H.265 | 0,075 ou mais | 0,05 a 0,075 | borrão no movimento; caractere de placa se confunde |
| AV1 | 0,075 ou mais | 0,05 a 0,075 | borrão no movimento, como o H.265 |

Em 720p some 10% e em 480p some 20% aos números. Com MBR, o defeito aparece no pico de movimento (hora de rush),
quando o encoder sobe a compressão para caber no teto, e não na média.

Lendo as medições contra a faixa: AV1 1080p a 4 Mbps e AV1 720p a 2 Mbps ficam no aceitável; H.264 720p a 2 Mbps
fica abaixo dele, e a 4 Mbps fica bom; o TERTIARY a 500 kbps é miniatura, sem leitura de placa.

### 7.4 Banda por tier e por codec para a mesma qualidade (boa)

Estimativa da seção 7.3, a 30 fps.

| Tier | H.264 | H.265 | AV1 |
| --- | --- | --- | --- |
| PRIMARY 1920x1080 | 6,2 Mbps | 4,8 Mbps | 4,7 Mbps |
| SECONDARY 1280x720 | 3,0 Mbps | 2,3 Mbps | 2,3 Mbps |
| TERTIARY 848x480 | 1,5 Mbps | 1,1 Mbps | 1,1 Mbps |

### 7.5 O que eu ganho com a mesma banda

A decisão é dar ao AV1 o mesmo teto do tier H.264. Com a razão da Axis (trânsito 0,763, cidade movimentada 0,673), a
banda do AV1 vale a do H.264 multiplicada por 1,3 a 1,5. Sobre o nosso H.264 baseline o ganho tende a ser maior, sem
medição que diga quanto.

| Teto do tier | Qualidade do AV1 equivale a H.264 com | O que muda na tela |
| --- | --- | --- |
| 6,2 Mbps (PRIMARY) | 8,1 a 9,2 Mbps | de boa para folgada; sobra margem no pico de movimento |
| 4 Mbps (SECONDARY desta câmera) | 5,2 a 5,9 Mbps | boa com margem |
| 2 Mbps (SECONDARY padrão) | 2,6 a 3,0 Mbps | de abaixo do aceitável para perto de boa |
| 500 kbps (TERTIARY) | 0,66 a 0,74 Mbps | continua miniatura |

## 8. Parâmetros de câmera que mexem em codec e banda

### 8.1 VAPIX (Axis, na URL `/axis-media/media.amp`)

| Parâmetro | Valores | Efeito em banda e qualidade | O Attlas manda hoje |
| --- | --- | --- | --- |
| `videocodec` | `h264`, `h265`, `av1`, `jpeg` | escolhe o codec do stream | sim, o codec negociado |
| `resolution` | ex. `1280x720` | menos pixels, menos banda | sim, do perfil ou da escada (1280x720 e 720x480) |
| `fps` | inteiro, 0 é ilimitado | banda cai quase em proporção | não |
| `compression` | 0 a 100, maior comprime mais | em VBR é quem decide a banda | não |
| `videobitratemode` | `vbr`, `mbr`, `abr` | VBR mantém a compressão e a banda varia; MBR põe teto e sobe a compressão no pico; ABR mira uma média ao longo de dias | não |
| `videomaxbitrate` | kbps | teto do MBR | não |
| `videobitrate` | kbps | parâmetro antigo; a P1475-LE ignora em AV1 | não |
| `videokeyframeinterval` | quadros | keyframe mais frequente custa banda e encurta a entrada do tile | sim, `round(fps x 300 / 1000)` |
| `videozstrength` | `off`, `10` a `50` | Zipstream: mais forte, menos banda e menos detalhe fora da área de interesse | não |
| `videozgopmode` | `fixed`, `dynamic` | dinâmico corta keyframe em cena parada e alonga a entrada do tile | sim, `fixed` |
| `videozfpsmode` | `fixed`, `dynamic` | dinâmico corta quadro em cena parada; o tile parece travar | não |
| `h264profile` | `baseline`, `main`, `high` | High comprime mais; baseline tira B-frame e reordenação | sim, `baseline` no H.264 |

O perfil Zipstream `storage` usa B-frame e soma 1/fps de atraso por B-frame (Axis).

### 8.2 ISAPI (Hikvision, `/ISAPI/Streaming/channels/<id>`)

O Attlas só lê o canal (`hikvision-isapi-probe.util.ts`, `hikvision-rate-control.utils.ts`); não escreve.

| Campo | Efeito |
| --- | --- |
| `videoCodecType` | codec do canal (`H.264`, `H.265`) |
| `videoResolutionWidth`, `videoResolutionHeight` | resolução do canal |
| `videoQualityControlType` | `cbr` (banda fixa) ou `vbr` (qualidade fixa, banda varia) |
| `constantBitRate`, `vbrUpperCap` | banda do CBR e teto do VBR, em kbps; o teto vence |
| `maxFrameRate` | fps vezes 100 (2500 é 25 fps) |
| `GovLength` | GOP em quadros |
| `SmartCodec` | H.264+ e H.265+: keyframe de fundo a cada 8 a 12 s e quadro de atualização a cada 2 s (white paper Hikvision H.265+) |

### 8.3 GOP, keyframe e latência de entrada (INT-024)

O MediaMTX só alimenta um leitor WHEP novo a partir do próximo keyframe. Então o GOP é a espera de entrada e de
recuperação de cada tile:

| Câmera | GOP | Espera máxima de entrada |
| --- | --- | --- |
| Axis com o orçamento do Attlas | 300 ms (9 quadros a 30 fps, 8 a 25 fps) | 0,3 s |
| Hikvision DS-2CD1023G0E-I | 50 quadros a 25 fps | 2 s |
| Hikvision com H.265+ | quadro de atualização a cada 2 s | 2 s |
| Axis com `videozgopmode=dynamic` | até `videozmaxgoplength` | segundos |

Cada keyframe é uma imagem inteira, então GOP curto custa banda; é a troca certa para o videowall (INT-024).

## 9. Decisões e onde estão escritas

| Decisão | Onde está escrita | Estado no código |
| --- | --- | --- |
| Nunca transcodificar; o MediaMTX repassa o codec da câmera | `docs/architecture/video-delivery.md`, INT-027 | implementado |
| H.264 é a base universal e sempre alcançável | INT-008 seções 2 e 6 | implementado |
| H.265 oportunístico: só com `supported && smooth && powerEfficient` | INT-008 seção 2 | implementado (`stream-codec.service.ts`) |
| Câmera com analítico embarcado não recebe H.265 | INT-008, introdução e seção 2 | implementado (`negotiateEffectiveCodec`) |
| Pedido H.265 entra no H.264 que já está no ar, nunca o contrário | INT-008 seção 13, INT-027 | implementado (`joinsOnlineH264`) |
| Fallback H.265 para H.264 na Axis por recusa RTSP 4xx | INT-008 seção 6, INT-027 seção 7 | implementado |
| H.264 em baseline nas Axis | INT-008 seção 4 | implementado |
| Keyframe por orçamento de 300 ms | INT-024 seção 4 | implementado |
| Política de qualidade só por evidência de rede; troca de codec segura o último quadro | UF-047 seção 4.7 | spec `in-review`; FrameHold e monitor de rede no código |
| Videowall H9 só H.264 | INT-016, RNF-CAM-18 | implementado (`VideowallMirrorCodecEnforcerService`) |
| AV1 nativo da câmera em passthrough, nunca codificado no backend | PR nova de AV1 | em implementação |
| Ordem AV1, H.265, H.264, sempre detectando antes de usar | PR nova de AV1 | em implementação |
| AV1 por software limitado a cerca de 4 sessões por aba | PR nova de AV1 | em implementação |
| Câmera declara os codecs suportados no cadastro | PR nova de AV1 | em implementação |
| Path `<cameraId>-<tier>-av1` | PR nova de AV1 | em implementação; o parser de hoje recusa |
| AV1 com o mesmo teto do tier H.264, sempre com MBR | PR nova de AV1 | em implementação |
| Analítico embarcado recusa H.265 mas aceita AV1 | PR nova de AV1 | em implementação |
| Fallback AV1 para H.264 no servidor e no player | PR nova de AV1 | em implementação |

> [!warning] Specs do repositório que dizem o contrário
> INT-008 (introdução) e MOD-004 (fora de escopo) dizem que AV1 fica fora do ao vivo e que o WHEP não negocia AV1.
> O MediaMTX 1.21.1 serve AV1 por WebRTC e o Chrome 150 recebe. A PR nova de AV1 é quem atualiza as duas.

## 10. Pendências

- Medir a latência ponta a ponta do AV1 por WebRTC e o custo de CPU por tile no dav1d, que sustenta o teto de 4
  sessões.
- Confirmar no olho, com placa em movimento, a faixa de bpp da seção 7.3 para cada codec.
- Medir o ganho do AV1 sobre o nosso H.264 baseline, e não sobre o H.264 do teste da Axis.
- Confirmar que a câmera não liga síntese de grão no AV1 (`film_grain_params_present`).
- Ligar VA-API numa estação Linux e medir AV1 por hardware.
- Validar H.265 e AV1 no Safari e no Edge.
- Levantar quais Hikvision do parque codificam AV1, se alguma.

## 11. Glossário

| Termo | O que é |
| --- | --- |
| Bitrate | Quantos bits por segundo o vídeo usa |
| bpp | Bits por pixel por quadro; mede quanta informação a imagem recebe, independente da resolução |
| GOP | Grupo de quadros entre dois keyframes |
| Keyframe | Quadro completo, que decodifica sozinho; é onde um espectador novo começa |
| MBR | Taxa máxima: a câmera nunca passa do teto e comprime mais quando a cena pesa |
| VBR | Taxa variável: a câmera mantém a compressão e a banda sobe e desce com a cena |
| Perfil | Conjunto de ferramentas do codec que o encoder usa (baseline, main, high) |
| Nível | Limite de resolução, quadros e bitrate que o decodificador precisa aguentar |
| Passthrough | O servidor repassa o vídeo sem decodificar nem recodificar |
| Transcodificação | Decodificar e codificar de novo, em outro codec ou banda; custa CPU por stream |

## 12. Fontes

- Padrões: [ITU-T H.264](https://www.itu.int/rec/T-REC-H.264), [ITU-T H.265](https://www.itu.int/rec/T-REC-H.265),
  [especificação AV1](https://aomediacodec.github.io/av1-spec/av1-spec.pdf) (anexo A, níveis),
  [AV1 em ISOBMFF](https://aomediacodec.github.io/av1-isobmff/), [AV1 em RTP](https://aomediacodec.github.io/av1-rtp-spec/),
  [AOMedia Patent License 1.0](https://aomedia.org/license/patent-license/).
- IETF: [RFC 7742](https://www.rfc-editor.org/rfc/rfc7742), [RFC 6184](https://www.rfc-editor.org/rfc/rfc6184),
  [RFC 7798](https://www.rfc-editor.org/rfc/rfc7798), [RFC 9628](https://www.rfc-editor.org/rfc/rfc9628).
- W3C e navegadores: [Media Capabilities](https://www.w3.org/TR/media-capabilities/),
  [WebRTC](https://www.w3.org/TR/webrtc/),
  [MDN, codecs do WebRTC](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs),
  [MDN, guia de codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs),
  [MDN, parâmetro codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/codecs_parameter),
  [WebKit no Safari 18.0](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/),
  [Firefox 157](https://www.firefox.com/en-US/firefox/157.0/releasenotes/),
  [Mozilla bug 1944878](https://bugzilla.mozilla.org/show_bug.cgi?id=1944878),
  [Chromium, VA-API](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/vaapi.md),
  [dav1d](https://code.videolan.org/videolan/dav1d).
- MediaMTX: [leitura por WebRTC](https://mediamtx.org/docs/read/webrtc), [leitura por HLS](https://mediamtx.org/docs/read/hls),
  [recursos do WebRTC](https://mediamtx.org/docs/features/webrtc-specific-features),
  [câmeras RTSP](https://mediamtx.org/docs/publish/rtsp-cameras-and-servers).
- Axis: [white paper AV1](https://whitepapers.axis.com/en-us/av1-codec-in-video-surveillance),
  [white paper Zipstream](https://whitepapers.axis.com/en-us/axis-zipstream-technology),
  [integração AV1](https://developer.axis.com/video-streaming-and-recording/av1/how-to-guides/integration-guide-av1/),
  [controle de taxa](https://developer.axis.com/vapix/network-video/rate-control/),
  [Zipstream na VAPIX](https://developer.axis.com/vapix/network-video/zipstream-technology/),
  [parâmetros de stream](https://developer.axis.com/vapix/network-video/media-stream-over-http/).
- Hikvision: [white paper H.265+](https://www.hikvision.com/content/dam/hikvision/en/brochures-download/product-brochures/White-Paper_H.265-Plus-Brochure.pdf).
- Eficiência: Ohm, Sullivan, Schwarz, Tan e Wiegand, "Comparison of the Coding Efficiency of Video Coding Standards",
  IEEE TCSVT, dezembro de 2012;
  [Apple HLS Authoring Specification](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices).
- GPU: [Intel media-driver](https://github.com/intel/media-driver),
  [AMD AMF](https://github.com/GPUOpen-LibrariesAndSDKs/AMF/wiki/GPU%20and%20APU%20HW%20Features%20and%20Support),
  [NVIDIA NVDEC](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new),
  [Apple M3](https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/).
- Licença: [Via LA AVC](https://www.via-la.com/licensing-programs/avc-h-264/), [Via LA HEVC](https://www.via-la.com/licensing-programs/hevc-vvc/),
  [Access Advance](https://accessadvance.com/licensing-programs/hevc-advance/), [OpenH264](https://www.openh264.org/).
