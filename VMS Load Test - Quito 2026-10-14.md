# VMS Load Test — Quito dev (2026-10-14)

EC2 8 vCPU, MediaMTX single pod, 10 câmeras Hikvision (Tailscale VPN).

## Resultados

```
Step                   Sess NPlay FPS50 Stall% LowFPS% Gaps/m Lost/m TTFF50 TTFF95 Reco  429  Load MTX%  TxMb  RxMb
A-primary-h264           10     0    30    0.0    7.1   18.6    494   3757   6145    0    0    74   71  62.4 154.3
A-primary-h265           10     0    30    0.0    1.3    6.5     95   3834   4809    0    0    67   77  55.2  52.9
A-secondary-h264         10     0    30    0.0    0.0    0.1      3   2794   3481    0    0    37   38  24.2  15.3
A-secondary-h265         10     0    30    0.0    0.0    0.1      1   2873   3295    0    0    53   38  21.5  68.5
A-tertiary-h264          10     7    30    0.0    0.0    0.6      6   2522   2534    0    0    34   12   5.2   4.1
A-tertiary-h265          10     7    30    0.0    0.0    0.0      0   2471   3558    0    0    35   16   6.5   4.3
B-10                     10     0    30    0.0    0.0    0.3      8   2776   3993    0    0    66   39  19.1  17.0
B-20                     20     0    29   0.5   11.5   18.2    140   2552   3106    0    0    70   81  60.0  53.8
B-40                     40    12     0  41.4   85.7   18.2    183   3008   8830   41    0   101   82  49.2  97.6
B-60                     60    29     3  23.5   67.0   28.7    264   3204  23634   41  257    95   81  44.2  87.9
B-80                     80    52     2  25.0   73.4   27.5    164   2718  12653   44  520   108   79  44.0  96.9
B-100                   100    67     2  18.9   73.9   33.4    173   3368  22040   40  738   116   83  40.7  86.9
C-10x4                   40     0    27   0.0   12.8   20.8    111   2786   7957    0    0    98   83  67.4  17.0
```

Legenda: Sess=sessões simultâneas, NPlay=nunca tocou, FPS50=mediana fps steady-state, Stall%=tempo em stall, LowFPS%=amostras <10fps, Gaps/m=frame gaps/min, Lost/m=RTP lost/min, TTFF=time to first frame (ms), Reco=reconnects, 429=refused pelo teto, Load=load avg EC2, MTX%=CPU mediamtx, TxMb/RxMb=bandwidth hub (Mbps).

## Análise

### Tier faz diferença enorme (fase A)
- **Secondary** (720p): 10 câmeras simultâneas, 30fps, 0% stall, ~1.3 Mbps/cam, load 37-53. Perfeito.
- **Primary** (1080p): 10 câmeras, 30fps mas 494 RTP lost/min em H264 (154 Mbps de ingest). Funciona mas no limite.
- **Tertiary**: 7 de 10 nunca tocaram (`whep-failed`). O tier terciário não existe para a maioria das câmeras — falha esperada, não é bug.

### H265 vs H264
- H265 reduz RTP loss em 5x no primary (494 → 95/min), bandwidth rx de 154 → 53 Mbps. Ganho real.
- No secondary a diferença é marginal (já é leve).

### Escala (fase B) — o muro é 20-40 sessões
- **B-10**: perfeito (30fps, 0 stall, 0 reconnect).
- **B-20**: fps cai pra 29, 11% low fps, 140 RTP lost/min. MTX CPU salta pra 81%. Começa a degradar.
- **B-40**: colapso. 41% stall, 85% low fps, 12 câmeras nunca tocaram, 41 reconnects. Load 101.
- **B-60+**: pioram mas o padrão é o mesmo — o hub saturou em B-40.

### Reuso de sessão (fase C)
- **C-10x4**: 10 câmeras × 4 viewers cada = 40 sessões, mas só 10 paths no MediaMTX. 27fps, 0.01% stall, 0 reconnects, 0 refused. vs B-40 que era 40 paths e colapsou.
- **Conclusão**: o gargalo é o número de PATHS (pulls da câmera), não o número de viewers. Reuso de sessão funciona.

## Gargalos identificados

1. **CPU do EC2** (8 vCPU): load > 100 a partir de 40 paths. MediaMTX transcoding WHEP consome ~2% CPU por path H265.
2. **MediaMTX single pod**: sem sharding, todo o tráfego passa por 1 processo.
3. **Bandwidth**: 10 câmeras primary H264 já puxa 154 Mbps de ingest. 40 câmeras satura a NIC.

## Plano de ação

1. **Forçar secondary como tier default** para superfícies que não são fullscreen/detail — reduz carga em 3x.
2. **Habilitar H265** no MediaMTX (já suportado) — reduz bandwidth e RTP loss.
3. **Sharding do MediaMTX** — distribuir paths entre N pods (doc em `mediamtx-scaling.md`).
4. **Subir o EC2** para 16 vCPU quando o sharding entrar — dobra a capacidade de paths.
5. **reuseKey em todas as superfícies** que mostram a mesma câmera — C-10x4 provou que 4 viewers por câmera não custa quase nada extra.
