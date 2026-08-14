---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
  - streaming
card: SOFTWARE-2385
clickup: https://app.clickup.com/t/86aju62ta
titulo: "[Back] Como o vídeo chega no analítico em container (banda, CPU e teto por instância)"
frente: Analítico em container
tamanho: 3 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: comprometido, primeiro card da semana (segunda). Aberto em 31/07 a partir da pergunta do planejamento - o analítico em container vai ser feito, e como o vídeo chega nele de forma performática e escalável é a decisão que ainda não existe. Validado contra a develop em 03/08, sem mudança de escopo. PR aberta em draft: [#1342](https://github.com/atmanadmin/attlas-2026/pull/1342). ClickUp movido para `in progress`.
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2385 - Alimentação de vídeo do analítico em container

O motor em container não pode subir antes de existir resposta para "de onde ele lê o vídeo". A escolha
errada não aparece como bug: aparece como dreno de banda no device e como analítico cego quando ninguém
está assistindo. Card docs-only, sem código de produção.

## Por que isso é decisão, e não detalhe de implementação

O analítico embarcado do 2134 não tinha esse problema: o motor roda dentro da câmera e lê o sensor
localmente. Fora da câmera, cada instância de analítico é **um consumidor de vídeo a mais** por câmera, e
o Attlas já tem histórico de dano nesse eixo: relay preso com `viewerCount` que nunca zerava mantinha
`ffmpeg` vivo e drenava banda do device sem ninguém assistindo.

## O que já existe, e que a decisão tem que respeitar

- **Relay por sessão, não por câmera.** `ffmpeg-session.service.ts` faz `spawn` de um `ffmpeg` por
  câmera, qualidade e codec, empurrando para um caminho do MediaMTX (`streamPathName`). Transporte RTSP
  default TCP, porque as câmeras vivem atrás de VPN e tailnet.
- **Escada de qualidade já provisionada.** `camera-stream-source.resolver.ts` tem
  `QUALITY_FALLBACK_CHAIN` e `QUALITY_RESOLUTION_LADDER`: `SECONDARY` pede 1280x720 e `TERTIARY` pede
  720x480 ao device por VAPIX quando só existe perfil grande. Ou seja, substream de baixo custo para o
  analítico é capacidade que já está no código, não trabalho novo.
- **Intervalo de keyframe é tunável** (`CAMERA_KEYFRAME_INTERVAL`, default 15). Importa para o analítico:
  GOP longo atrasa o primeiro frame utilizável depois de reconectar.
- **Telemetria existe pela metade.** Há `camera-ttff.repository` e métricas de streaming, mas o
  comparativo por câmera é justamente o que o 1363 aponta como faltando. O número que este card precisa
  medir talvez tenha que ser instrumentado na hora.
- **Ciclo de vida orientado a espectador.** A sessão nasce por demanda de quem assiste. Um analítico
  precisa de stream **permanente**, então a decisão tem que dizer o que mantém a sessão viva quando não
  há operador na tela, sem reabrir o defeito do relay que nunca morre.

## Opções a confrontar com número

1. **Analítico puxa RTSP direto de cada câmera.** Simples e independente do `ms-cameras`. Custo: N
   leituras simultâneas no device (player mais analítico), credencial da câmera espalhada para mais um
   componente, banda multiplicada por instância de analítico.
2. **Analítico consome o caminho do MediaMTX que o `ms-cameras` já mantém.** Uma leitura por câmera
   serve player e analítico, credencial fica só no `ms-cameras`, e o relay já existe. Custo: acopla o
   analítico à disponibilidade do relay e exige resolver o ciclo de vida da sessão sem espectador.
3. **Substream dedicado ao analítico** (`TERTIARY`, 720x480), em vez do stream principal. Reduz CPU de
   decodificação e banda, e o motor de detecção quase nunca precisa de 1080p. Combina com 1 ou com 2.
4. **Fan-out de frame por mensageria.** Rejeitar com motivo registrado: payload de vídeo em Kafka é
   antipadrão de tópico e estoura retenção.

## O que medir antes de decidir

- CPU e banda por stream no relay atual, por qualidade, e quantas câmeras cabem por instância de
  analítico.
- Custo de decodificação no motor por resolução, para saber se o substream muda o teto de escala ou só a
  banda.
- Tempo até o primeiro frame utilizável depois de reconexão, com o GOP atual.

## DoD

- ADR em `docs/architecture/decisions.md` com a opção escolhida, as rejeitadas e o motivo de cada
  rejeição, mais a seção de alimentação na spec do módulo.
- Câmeras por instância e custo por stream com número medido, não estimado.
- Regra explícita de quem mantém a sessão viva para o analítico, e o que acontece ao passar do teto.

## Validação 03/08

Card conferido contra a develop e permanece válido. Achados que entram na decisão:

- Câmera com analítico embarcado tem H265 recusado no relay, porque o hardware não sustenta encode
  paralelo. Um analítico em container que consuma um substream da mesma câmera esbarra na mesma
  restrição, então a opção escolhida precisa declarar essa fronteira.
- A credencial RTSP entra no argumento do processo `ffmpeg` (visível para qualquer usuário da
  máquina via `ps`). É argumento a mais contra a opção de o analítico puxar RTSP direto de cada
  câmera, porque espalharia a credencial para mais um componente.
- O relay hoje expõe só duas métricas de streaming, nenhuma por câmera. O MediaMTX tem um
  Prometheus próprio com contadores por sessão que hoje não é coletado, e é a fonte natural para
  medir o número deste card.
- O analítico embarcado já sofre do problema que este card previne: consome um tópico fora do
  registro de tópicos da plataforma, num broker separado. É a dívida que embasa a decisão de
  manter o analítico em container dentro do relay que o `ms-cameras` já mantém, em vez de abrir
  mais um canal solto.

## Encosta em

- [[SOFTWARE-2386 - Especificação do analítico de vídeo em container|2386]], que consome o que este card decidir.
- [[Pesquisa - codec, protocolo e latência]] e [[Streaming - Codecs e fallbacks]], que já mediram o eixo
  de codec para o player, mais o 1363 (instrumentação de streaming), que é onde a métrica por câmera
  deveria estar e não está.
- [[Attlas - Sprint 27]].
