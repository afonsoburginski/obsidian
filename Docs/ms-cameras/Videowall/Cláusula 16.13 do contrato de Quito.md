---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
  - contrato
aliases:
  - "Cláusula 16.13"
  - "Módulo de gestión de videowall (contrato)"
atualizado: 2026-08-14
---

# Cláusula 16.13 do contrato de Quito

O texto contratual que rege o videowall externo, obtido em 14/08/2026. Até essa data os requisitos
`RF-VW-07` em diante viviam de paráfrase: a seção 3.2 de `docs/modules/cameras.md` declarava, na própria
nota de procedência, que a cláusula não estava versionada em lugar nenhum e que fechar a lacuna exigia
obter o texto e substituir a paráfrase pela citação. Esta nota e a seção 3.2 do repositório são as duas
cópias versionadas.

## Texto literal

> **16.13. MÓDULO DE GESTIÓN DE VIDEOWALL**
>
> El módulo de gestión de videowall cumple con el requisito de integración con el módulo de planes de
> respuesta automatizados, permitiendo automatizar acciones como reproducciones predefinidas y operaciones
> programadas directamente en el videowall.
>
> **Instalación e interoperabilidad.** El módulo cumple con el requisito de permitir la gestión completa
> del videowall directamente desde la consola de operación de la plataforma semafórica, posibilitando:
> Visualización de cámaras IP en el videowall. Creación dinámica de escenarios desde la propia consola de
> operación. Requisito mínimo cumplido: gestión centralizada sin interfaces intermedias.
>
> **Compatibilidad y formatos.** El módulo cumple los requisitos de compatibilidad al: Permitir la
> integración con el videowall existente mediante puerto Ethernet/TCP/IP. Ser compatible, como mínimo, con
> los siguientes formatos y protocolos de transmisión: RTSP (Real Time Streaming Protocol); H.264 (códec de
> compresión de video).
>
> **Gestión desde la consola de operación.** El operador puede controlar íntegramente el videowall
> directamente desde la consola de operación de la plataforma, sin necesidad de dispositivos dedicados
> adicionales (como teclado o mouse específico). La solución cumple con el requisito de permitir: Definir
> layouts personalizados de visualización. Proyectar cámaras IP y páginas web. Operar el videowall
> directamente a través de la interfaz de usuario de la plataforma.

A citação fica em espanhol, sem tradução ao lado, no repositório e aqui. Traduzir produziria uma segunda
paráfrase, que é exatamente o defeito que a citação corrige, e criaria a pergunta de qual das duas
prevalece. A leitura em português é a prosa dos requisitos em `cameras.md`.

## As doze obrigações, e quem responde

| Obrigação | Responde | Estado |
| --- | --- | --- |
| Integração com planos de resposta automatizados | RF-VW-14 | Atendida pela projeção nativa |
| Reproduções predefinidas e operações programadas | RF-VW-14, RF-VW-15, RF-VW-18 | Atendida; sequência de cenas na parede fica diferida |
| Gestão completa desde a consola de operação | Faixa RF-VW-07 a RF-VW-20 | Atendida |
| Visualização de câmeras IP no videowall | RF-VW-09 | Atendida nos dois modos |
| Criação dinâmica de cenários desde a consola | RF-VW-02 com RF-VW-12 | Atendida, lendo "escenario" como cena do VMS |
| Gestão centralizada sem interfaces intermediárias | RNF-CAM-14 | Atendida |
| Integração por porta Ethernet/TCP/IP | RF-VW-07 com RNF-CAM-14 | Atendida |
| Compatível no mínimo com RTSP e H.264 | RNF-CAM-05, RF-INT-05, RNF-CAM-18 | Atendida; é o formato em que toda fonte é oferecida |
| Sem dispositivos dedicados adicionais | RNF-CAM-14 | Atendida |
| Definir layouts personalizados | RF-VW-01 com RF-VW-11 | Atendida; a geometria da parede deriva da cena |
| Projetar câmeras IP e páginas web | RF-VW-09, RF-VW-10 | Câmera atendida; página web só com operador |
| Operar o videowall pela interface da plataforma | Faixa RF-VW-07 a RF-VW-20 | Atendida |

Sete das doze já estavam cobertas antes de qualquer mudança. As cinco que colidiam com o replanejamento de
13/08 se resolveram por uma distinção só, que é a existência de um operador na consola.

## O que a cláusula obrigou a mudar

O primeiro parágrafo é o que reabriu a decisão. Ele exige ação automatizada **"directamente en el
videowall"**, e o adverbial não deixa espaço para leitura indireta: um plano de resposta dispara por
incidente, sem operador na frente, e sob espelhamento de tela não existe tela para espelhar. Não era um
requisito faltando, era um segundo modo faltando.

O painel passou a ter dois modos, e a fonte dos dois é servida pela plataforma:

| Modo | Quando | Fonte |
| --- | --- | --- |
| Espelho | Existe operador na consola | Uma por processador: a captura da tela |
| Projeção nativa | Gesto automatizado, sem operador | Uma por câmera projetada |

O detalhe que impede isso de ser um retorno ao desenho de 10/08 é de onde o equipamento puxa cada câmera:
da plataforma, nunca da câmera. Credencial de câmera continua sem trafegar para equipamento de terceiro,
que era o ganho de domínio declarado do replanejamento de 13/08.

## As leituras que ficaram registradas

**"Escenario" é a cena do VMS, não o preset do equipamento.** O termo também é o nome que a NovaStar dá a
uma composição de parede salva na interface dela. A leitura adotada é cena do VMS, por três motivos: a
cláusula nunca usa a palavra preset, o verbo aponta para a consola de operação e não para o equipamento, e
composição salva no equipamento seria um segundo modelo de composição para a plataforma reconciliar. Se o
cliente confirmar a outra leitura, `RF-VW-13` volta ao escopo e o catálogo de capacidades cresce, o que é a
única volta que alargaria a superfície de capacidade presumida.

**"Proyectar páginas web" com operador é o espelho.** A parede mostra a consola, e a consola abriu a
página. Sem operador não há caminho: nenhum card de entrada do chassi renderiza HTML, e a projeção nativa
decodifica vídeo, não página. É a única lacuna declarada da cláusula, e é muito mais estreita que a lacuna
que a revisão de 13/08 declarava.

**"RTSP e H.264 no mínimo" virou argumento a favor, não custo.** O que estava escrito como preço do
espelhamento, o vídeo passar a atravessar a plataforma, é a prova de conformidade de formato: toda fonte é
oferecida ao equipamento exatamente em RTSP com H.264, e publicação fora desse formato é recusada em vez de
convertida. Consequência de produto que precisa estar dita: câmera legada que só entrega MJPEG é espelhável
e não é projetável.

## Precedência na parede

Plano de resposta preempta o operador, com registro e com aviso a quem foi deslocado. O precedente é do
mesmo módulo: reposicionamento PTZ vindo de Emergências já tem prioridade máxima sobre sessão de operador.
Exibição programada faz o inverso e **cede** ao operador, registrando que cedeu, porque exibição programada
não é incidente e uma agenda que atropela operador vira agenda desligada.

Consequência estrutural: a posse do painel deixou de ser sessão de espelho e passou a ser ocupação com
tipo, num modelo só. Dois modelos significariam dois donos e nenhuma resposta para o que a parede está
mostrando, que é justamente o que `RF-VW-17` exige.

## Relacionados

[[Docs/ms-cameras/Videowall/index|Videowall externo (NovaStar H9)]] · [[Pesquisa - transporte do espelhamento de tela]] · [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]] · [[Attlas - Sprint 28]] · [[Edital - Attlas nova definição de módulos]]
