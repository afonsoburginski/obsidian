---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
  - pesquisa
aliases:
  - "Pesquisa - transporte do espelhamento de tela"
  - "Transporte do espelhamento de tela"
atualizado: 2026-08-13
---

# Pesquisa - transporte do espelhamento de tela

Levantamento feito em 13/08/2026 para decidir **como a tela da aplicação Attlas chega ao painel físico**,
depois que o propósito do videowall passou de projetar cena para espelhar a tela do cliente que está
acessando o sistema. Fonte primária: `H9 Video Wall Splicer Specifications` V1.14.0, do fabricante, mais a
documentação da Open API.

## O achado que obriga a decisão

**O H9 não aceita página web nem URL como fonte.** A interface web dele é o plano de controle, arquitetura
B/S que roda em Windows, Mac, iOS, Android e Linux sem instalar aplicação, e é isso que a folha de
especificação chama de "web control". Não existe card de entrada que renderize HTML, e nenhuma capacidade
da Open API recebe endereço de página.

Consequência direta: apontar o painel para a URL do Attlas **não é uma operação que o equipamento saiba
executar**. A tela só chega na parede como vídeo codificado, e a decisão vira qual transporte usar. Isso
também fecha, negativamente, a lacuna de requisito registrada em 31/07 sobre "página web como fonte".

## Os três caminhos, e o que cada um custa

Espelhar é sempre a mesma sequência: capturar a tela, converter a captura num sinal que algum card de
entrada entenda, e mandar o equipamento exibir aquele card em tela cheia. O terceiro passo é idêntico nos
três e é uma chamada só na Open API. O que varia é o passo do meio.

### RTSP servido pela plataforma, pelo card `H_2xRJ45 IP`

O browser captura com `getDisplayMedia`, que é a mesma API do compartilhamento de tela de qualquer
ferramenta de reunião, publica por WHIP no MediaMTX que já está no stack servindo o pipeline de HLS, e o
equipamento puxa RTSP unicast desse caminho.

Ganha em alcance e em observabilidade: funciona de qualquer cliente autenticado, de qualquer máquina, sem
instalar nada, e a plataforma continua dona do caminho do vídeo, então ela sabe se o espelho está no ar e
consegue derrubá-lo.

Custa qualidade de texto. O card impõe 8 bits com croma subamostrado, e croma subamostrado é exatamente o
que degrada borda de texto fino colorido numa parede de LED. A latência fica em torno de um segundo. Para
mosaico de câmeras isso é irrelevante; para uma tabela de horários ou um croqui com rótulos pequenos é o
risco principal, e por isso o piso de resolução e de bitrate entrou como requisito não funcional em vez de
ficar para o comissionamento descobrir.

### NDI, pelo card `H_1xNDI`

Um utilitário gratuito na máquina do operador publica a área de trabalho como fonte NDI e o card encontra
a fonte na rede sozinho. Texto sai nítido, porque o card decodifica 4:2:2, e a latência é a menor das três.

Dois obstáculos, e nenhum é de software. O card entrou na linha H9 na revisão V1.14.0 da especificação,
datada de **14/09/2024**, e o equipamento de Quito foi entregue pela acta EPMMOP VD-12407-80-10 em
**09/07/2024**, dois meses antes. Não prova que o card não está no chassi, porque os cards são hot swap,
mas é indício forte de que ele teria de ser comprado e instalado. Além disso, a descoberta de fonte NDI é
por mDNS e não atravessa sub-rede sem um servidor de descoberta, o que introduz justamente o intermediário
que o `RNF-CAM-14` veta, e derruba a premissa de espelhar de qualquer cliente.

### Cabo físico, por qualquer card de vídeo

Uma estação da sala de controle sai por HDMI ou DP direto num card de entrada. Nenhum software, nenhuma
compressão, latência zero, qualidade idêntica ao monitor. É o padrão clássico de sala de controle e é o que
sempre funciona.

O custo é conceitual: a parede espelha a tela **daquela máquina**, não de um cliente qualquer que acessa o
sistema, o que é mais estreito que o propósito pedido. E o `RNF-CAM-14` proíbe dispositivo dedicado entre a
consola e o equipamento, então usar isso como caminho principal exigiria rever aquele requisito.

## Comparação de escala

| | RTSP pela plataforma | NDI Full |
| --- | --- | --- |
| Banda por espelho a 1080p | 4 a 12 Mbps | cerca de 125 Mbps |
| Portas de rede no card | 2x Gigabit | 1x Gigabit |
| Teto de decodificação do card | 16x 2K×1K ou 4x 4K×2K | 4x 2K×1K ou 1x 4K×2K |
| Croma | 8 bits subamostrado, imposto pelo card | 8 ou 10 bits, 4:2:2 |
| Atravessa sub-rede | sim | não sem servidor de descoberta |
| Onde cai a carga de codificação | browser do operador | estação do operador |
| A plataforma observa o espelho | sim | não |

O número que decide é a banda. A especificação do card NDI diz que ele decodifica **Full NDI**, que é o
perfil de alta banda, e não o perfil comprimido. Isso importa porque o utilitário de captura publica em
Full por default: se o card só aceita Full, não existe a opção barata, e uma porta Gigabit satura com
poucas fontes.

## Decisão e as duas regras que ela impõe

**Transporte escolhido: RTSP servido pela plataforma.** É o único que entrega literalmente o pedido, a tela
do cliente que está acessando o sistema, sem exigir que esse cliente seja uma máquina específica; reusa
infraestrutura que já está de pé; e mantém a plataforma capaz de observar e derrubar o espelho, que é o que
permite escrever estado observável honesto. O cabo físico fica documentado como caminho de comissionamento,
porque no primeiro contato com o equipamento é o que prova que a parede funciona antes de qualquer software
entrar na conta.

Duas regras que precisam estar escritas, porque são onde este desenho quebra se ninguém decidir:

1. **H.264 é fixado na oferta de ingestão, e publicação fora do que o card aceita é recusada.** O
   equipamento decodifica H.264 e H.265 e nada mais. Se o browser negociar VP8, VP9 ou AV1, a única saída
   seria transcodificar por sessão, que é o penhasco de CPU deste desenho. Recusar é diagnosticável;
   transcodificar em silêncio faz o custo crescer sem ninguém decidir.
2. **O critério de vida da sessão é a presença de publicação, nunca a contagem de espectadores.** O
   equipamento puxando RTSP não se anuncia como espectador de browser, então reusar o critério do reaper de
   HLS derrubaria espelho vivo ou manteria espelho morto. É a mesma classe de vazamento que manteve relays
   de ffmpeg no ar sem ninguém assistindo e saturou o uplink no ambiente de desenvolvimento.

## O que segue em aberto, e é de campo

- **Inventário de cards do chassi de Quito.** Nenhum documento disponível diz quais cards de entrada estão
  instalados, e a foto do equipamento mostra só o painel frontal. O card IP é o mais provável e é o que o
  transporte escolhido exige, mas isso se confirma lendo o monitoramento de entradas na interface do
  equipamento. É bloqueio de comissionamento, não de escrita de spec.
- **Firmware exato**, que segue ambíguo entre `V1.9.7.1` e `V1.5.7.1` por causa do dígito borrado na foto.
- **Redundância de entrada não existe.** A especificação diz que não é possível configurar relação de
  backup para fonte NDI nem IPC, então queda do espelho é falha visível e tem de ser declarada como tal no
  estado observável, não mascarada por fonte secundária.

## Relacionados

[[Videowall externo (NovaStar H9)]] · [[VMS]] · [[Streaming]] · [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]]
