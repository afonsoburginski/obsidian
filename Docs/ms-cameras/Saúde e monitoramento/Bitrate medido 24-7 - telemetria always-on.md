---
tags:
  - doc
  - ms-cameras
  - cameras
  - saude
  - telemetria
atualizado: 2026-08-03
---

# Bitrate medido 24/7 - telemetria always-on

> Por que o bitrate medido vem do MediaMTX e não da câmera, o que foi provado contra hardware real em 03/08/2026, e os números de custo de cada configuração. Hub: [[Saúde e monitoramento/index|Saúde e monitoramento]]. Entregue na PR #1318 (SOFTWARE-2384).

## O problema que originou tudo

A série de bitrate do card de saúde vinha em ilhas: em sete dias de janelas de cinco minutos, só 0,3% tinham valor (8 de 2960). A medição dependia do relay de streaming, que só existe enquanto alguém assiste à câmera. O widget de consumo de banda do dashboard lê a mesma coluna, então o buraco aparecia nos dois lugares.

## O fato físico que decide a arquitetura

**Não existe bitrate para ler de uma câmera ociosa.** RTSP é consumo sob demanda: sem cliente, a câmera não codifica nem transmite vídeo. Isso foi provado contra a câmera real 10.1.1.79, superfície por superfície:

| Via testada | Resultado |
|---|---|
| streamstatus.cgi (getAllStreams) | Só metadados de conexão, sem campo de throughput; vazio com a câmera ociosa |
| param.cgi (árvore completa) | Só configuração, nenhum contador; VBR sem teto (MaxBitrate=0, TargetBitrate=0) |
| Catálogo completo de eventos (SOAP) | Único tópico de bitrate é um boolean de degradação (ABR), sem valor |
| MQTT | Publica o mesmo catálogo de eventos; é transporte, não fonte nova |
| SNMP | Desligado na frota; mediria o total da placa de rede, não o stream |
| API de monitoramento de rede | Não existe nesta câmera (404) |
| SDP via DESCRIBE | Sem campo de banda |
| Relatório interno do device | Zero streams de mídia saindo; 3,7 GB transmitidos em 3,5 dias de uptime, média de vida de 0,098 Mbps |

A média de vida de 0,098 Mbps encerra a discussão: vídeo 24/7 a 5 Mbps teria transmitido 40 vezes mais. A câmera fica ligada 24/7 como servidor de prontidão, com o encoder parado.

## A solução

O MediaMTX vira o consumidor permanente: um path por dispositivo físico com consumo contínuo (sourceOnDemand desligado), que ele mantém e reconecta sozinho, sem processo ffmpeg. O contador de bytes desse path vira a série. Reconciliador de paths com lease de réplica única, dedup por stream físico (a mesma câmera é replicada por tenant, então o agrupamento é pela URL do stream, não por linha da tabela).

Depois da virada, a cobertura das janelas foi de 0,3% para 100% sem ninguém assistindo.

### Camadas de persistência

1. Amostra fina por tick (2 a 5 segundos, configurável), tabela própria, retenção de 48 horas, limpeza horária com lock, escrita por uma réplica só via lease.
2. Janela de cinco minutos (média), como antes.
3. Rollup diário de 90 dias, como antes.

O push para o frontend acontece no mesmo tick da escrita, pelo canal ao vivo que quem está com a câmera aberta já recebe. Cadência configurável por ambiente.

## Custos medidos em campo (13 câmeras locais)

| Configuração da telemetria | Banda agregada |
|---|---|
| Stream principal (1080p) | 63,4 Mbps |
| Sub-stream 720p | 28,4 Mbps |
| Modelagem mínima (320x180 a 5 fps) | 2,6 Mbps |

A modelagem mínima só se aplica a URL no formato VAPIX, que aceita resolução e fps por requisição. URL ONVIF presa a profile passa intacta e fica no custo nativo do profile (é o caso da 10.1.1.79, que usa onvif-media com profile fixo). Hikvision seleciona stream por canal, também sem modelagem por requisição.

O trade declarado: com a modelagem mínima, a série mede o stream de telemetria, virando sinal de vida e variação do dispositivo, não aproximação do consumo de um espectador.

## Impacto no dispositivo (medido antes e depois na 10.1.1.79)

- Carga: 1,72 para 1,78 em dois núcleos, cerca de 3% a mais.
- Memória: inalterada.
- Rede: 1,8% do link com o sub-stream; 0,05% com a modelagem mínima.
- O encode H264 é em silício dedicado (ARTPEC-7), não passa pela CPU. O processo que domina a CPU da câmera em repouso é o analisador de cena da própria Axis, que roda sempre.

## Capacidade de banda da câmera (o que limita o quê)

1. A placa de rede da câmera: 100 Mbps, sem porta gigabit. É o teto de hardware.
2. Limite de banda configurável no device: existe e está desligado (Bandwidth.Limit=0).
3. O encoder limita perfis simultâneos com parâmetros distintos (tipicamente 2 a 4 em resolução cheia), não taxa de bits. Vários clientes do mesmo perfil custam só banda.
4. VBR sem teto por stream: cena complexa em 1080p pode picar 10 a 20 Mbps.

## Armadilhas descobertas no caminho

- O campo de contador do MediaMTX mudou de nome e o antigo está descontinuado desde a versão que rodamos; ler só o antigo zeraria a série em silêncio num upgrade. O leitor único com fallback resolve.
- A API de controle do MediaMTX expõe a URL de origem dos paths com credenciais das câmeras. A porta dela saiu do host no Compose de produção; em desenvolvimento o override republica, porque o serviço roda fora do Compose.
- O card de saúde da página do dispositivo não reagia ao sinal de mudança do servidor, enquanto o painel lateral (outra cópia do mesmo card) reagia. As duas cópias agora seguem o mesmo padrão de refetch silencioso.
- A nota do gráfico nos quatro idiomas afirmava que o bitrate só era medido durante transmissão; deixou de ser verdade e foi corrigida.
- No ambiente local, o login de validação é o usuário administrador padrão com a senha padrão de desenvolvimento; o WebSocket de câmeras usa caminho próprio (api/cameras/status/realtime), então não aparece filtrando por socket.io no navegador.

## Relacionado

- [[Saúde e monitoramento - Arquitetura e estratégias]], as duas camadas de monitoramento.
- [[Saúde da câmera - regras de negócio e contratos]], regras da série e dos cards.
- [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]], outro caso de custo por conexão contra as câmeras.
