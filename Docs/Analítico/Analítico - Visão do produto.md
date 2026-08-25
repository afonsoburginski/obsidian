---
tags:
  - doc
  - analitico
atualizado: 2026-08-25
servico: ms-cameras (hoje), ms-virtual-loop, ms-connector-virtual-loop, ms-atspm, ms-dai (planejados)
fonte: síntese das notas deste domínio + auditoria de código de 25/08 + as 16 decisões tomadas nas Sprints 30, 31 e 32
---

# Analítico - Visão do produto

A nota de entrada para **entender o módulo por inteiro**: o que ele é, onde roda, por onde o dado passa,
com o que se relaciona, e as decisões que o desenharam. É a vista de cima; cada faceta tem nota própria
com a profundidade.

> [!note] O que esta nota NÃO substitui
> Ela é síntese de arquitetura e decisão. As **regras de negócio** das anotações de alinhamento vivem em
> [[Analítico - Requisitos e SLA]], com o estado real auditado contra o código - inclusive requisitos que
> esta nota nem menciona (grupo semafórico 1x1, snapshot de configuração, limites do ACOM, nomenclatura
> "Periféricos ACOM"). Ler as duas: esta responde *como funciona*, aquela responde *o que foi pedido e o
> que existe de fato*.

---

## 1. O que o Analítico é

Módulo próprio do edital, **não submódulo de** [[ms-cameras]]. A relação com Câmeras é de dependência,
não de posse. Duas capacidades de produto, e cada uma pode rodar de duas formas.

| Peça | O que é | Detalhe que costuma confundir |
| --- | --- | --- |
| **Laço virtual (VL)** | Detecção de cruzamento por laço desenhado sobre o vídeo - o substituto do laço indutivo no asfalto | **Não tem geometria própria**: reaproveita as regiões de detecção de objeto da DAI |
| **ATSPM** | Pacote de quatro: Tracker, DAI, TPM e o laço virtual embutido | Onde há ATSPM, o app de VL separado é dispensável. Cada uma das quatro é sub-produto endereçável |
| **ACOM** | **Não é capacidade, é transporte**: a placa que converte laço virtual em contato seco para o controlador legado ler como laço físico | Vive em `ms-controllers/src/acom/` (DD-20). O serviço `ms-acom` existe como scaffold e é **esqueleto morto** |

O ACOM tem CRUD, TCP, codec e pollers reais - e **falta o caller que atua**. É a peça mais pronta que
ainda não faz nada. Requisitos de ACOM (relação 1x1 com controlador, até 4 analíticos por ACOM, até 4
laços por câmera, nomenclatura) estão em [[Analítico - Requisitos e SLA]].

---

## 2. Onde o analítico roda, e por que existem dois caminhos

Não é escolha entre dois caminhos: são dois que **coexistem por tempo indeterminado**, porque o parque de
câmeras é misto. Detalhe completo em [[Analítico - Embarcado x Servidor]], a nota central do domínio.

```
ONDE RODA                        O QUE EMITE                 QUEM CONSOME

EMBARCADO (existe)          ┐
ACAP dentro da câmera Axis  │
só ARTPEC 7 e 8/9           ├──► Ocupação de região  ──►  Cadeia de detectores
zero servidor, zero banda   │    domínio `analytics`       mesmo tópico do laço FÍSICO
                            │    em @attlas/contracts
SERVIDOR (Sprint 31)        │                              o controlador não distingue
ms-virtual-loop container   ┘    quem consome NÃO sabe     laço de asfalto de laço de
qualquer câmera, comum       ►   de onde a ocupação veio    vídeo - é o ponto
lê o relay do mediamtx           publica só na transição
```

O contrato é o que impede as duas origens de virarem dois sistemas. Sem ele, cada consumidor precisaria
de um ramo por origem.

> [!warning] O embarcado ainda não fala o contrato comum
> Ele emite formato próprio hoje. Fazer ele migrar é card da [[Sprint 31 - o que entrega|Sprint 31]] - e
> sem isso o contrato não cumpre o papel, porque o consumidor volta a precisar de um ramo por origem.

### A matriz que decide onde roda

| Forma de execução | Não-Axis | ARTPEC 7 | ARTPEC 8/9 |
| --- | --- | --- | --- |
| Laço virtual, app na câmera | Não | Sim | Sim |
| Laço virtual, servidor analítico | Sim | Sim | Sim |
| ATSPM, app na câmera | Não | Não | Sim |
| ATSPM, servidor analítico | Sim | Sim | Sim |

Duas restrições resumem a tabela: **não-Axis nunca roda app embarcado** e **ARTPEC 7 não roda o app de
ATSPM**. Mais uma exclusão que vale só no 8/9 - os dois apps existem, nunca juntos na mesma câmera, e é
liberável: remover o primeiro libera o outro. A coluna "servidor" ser toda "Sim" é o que torna o parque
misto atendível por inteiro.

---

## 3. Os três caminhos do dado

O módulo tem três pipelines distintos, e confundi-los é a origem da maioria das dúvidas sobre "onde isso
é gravado". Fluxos detalhados em [[Analítico - Fluxos]].

| # | Pipeline | O que é | Para quem |
| --- | --- | --- | --- |
| 1 | **Tela ao vivo** | WebSocket, efêmero, acende a região na aba Analíticos | Operador olhando a câmera. Nada é gravado - saiu da tela, deixou de existir |
| 2 | **Incidente contável** | `CameraEventLog` com categoria `ANALYTICS`, dedup por câmera + região + tipo | Fila de incidentes, e daí para Alarmes, Inventário e Notificações |
| 3 | **Ocupação de laço** | Evento de detector, só na transição, com histerese | Controlador de semáforo, via ACOM ou direto, e o `ms-detector-history` |

O mesmo frame alimenta os três. **O metadado do device nunca carrega pixel** - é 100% número (`labels`,
`bboxes`, `ids`, `curr_speeds`), e é essa a razão de a imagem de evidência precisar de caminho próprio.

---

## 4. Com o que o Analítico se relaciona

| Depende de | Para que |
| --- | --- |
| [[Cameras]] / [[ms-cameras]] | a câmera, a credencial, o `hardwareId` |
| [[PTZ e presets]] | o enquadramento a que a geometria pertence |
| [[Streaming]] (mediamtx) | o relay que alimenta o analítico servidor |
| Object storage | evidência de detecção e frame de preset |

| Entrega para | O que |
| --- | --- |
| Detectores e histórico de detecção | contagem, ocupação, timeline |
| Controladores | evento de detector, via ACOM ou direto |
| Alarmes | incidente crítico virando alarme |
| Inventário e Notificações | ocorrência e envio - **declarados, sem produtor ainda** |

A dependência de Câmeras é a mais forte e a mais mal entendida: o Analítico **vive hoje dentro do
`ms-cameras`**, mas é módulo próprio. O `ms-virtual-loop` existir é o que separa os dois de fato.

---

## 5. Estado real de cada peça

Auditado contra o código em 25/08, não contra o plano. Mapa de código detalhado no
[[Analítico|índice do domínio]].

| Peça | Estado |
| --- | --- |
| Pipeline embarcado ao vivo, aba Analíticos, contratos de região e detecção | Real |
| Contratos de detector e histórico de detecção | Real e maduro - aceita o evento do laço virtual sem mudança |
| ACOM: CRUD, TCP, codec, pollers | Real, **falta o caller** |
| Entidade Analítico, região em banco, unicidade, saúde, ARTPEC, incidente contável, preset com snapshot, evidência | **Entregue na Sprint 30** |
| Fila de incidentes, galeria de evidência, frame congelado | **Entregue na Sprint 30** |
| Analítico servidor e tradutor de endereço | Scaffold - [[Sprint 31 - o que entrega\|Sprint 31]] |
| Telas de métricas ATSPM e Laço Virtual | Prontas no `attlas-design` (~11.000 linhas), **sem card em nenhuma sprint** |
| `ms-atspm`, `ms-dai` | Nem spec existe |
| OTA do app embarcado | Não existe gestão nenhuma no device |

---

## 6. As decisões que desenharam isso

Dezesseis decisões nas três sprints, cada uma com o motivo. Decisão sem motivo é preferência, e a
alternativa recusada é o que impede de reabrir a discussão depois. As de arquitetura e as preservadas das
14 PRs fechadas estão em [[Analítico - Arquitetura e estratégias]].

### Sprint 30 - gestão do embarcado (todas em código)

| # | Decisão | Porque |
| --- | --- | --- |
| D-01 | Analítico é **entidade de banco**, não flag no JSON da câmera | Flag não tem tipo, unicidade nem região. A regra "um embarcado por tipo por câmera" virou índice único parcial - rede de segurança, não caminho feliz |
| D-02 | A arquitetura da câmera é **descoberta, nunca escolhida** | O operador não tem como saber, e erraria. Rejeitados: campo de seleção, e sobrescrita manual (deixaria resposta errada sobreviver ao conserto da tabela) |
| D-03 | Arquitetura não identificada é **fail-closed** | Dizer que uma câmera Axis não roda ACAP é fato errado, não fato ausente. Cair na linha mais permissiva ofertaria o que talvez não funcione |
| D-04 | Incidente é **evento contável com janela de dedup** | O incidente fica levantado por muitos frames. Sem janela por (câmera, região, tipo), cada frame seria uma linha e a contagem não significaria nada |
| D-05 | Geometria **pertence a um enquadramento** | Mover o preset mudava o enquadramento e a geometria seguia apontando para outro pedaço da via, **em silêncio**. O vídeo ao vivo não pertence a enquadramento nenhum: é sempre o de agora |
| D-06 | "Device caiu" e "ninguém configurou" são **estados diferentes** | Os dois devolvem região vazia, e o operador não distingue equipamento com problema de câmera nunca configurada. São duas ações diferentes |
| D-07 | A fila de incidentes é **o log filtrado**, não um segundo sistema | O protótipo tem ~7.900 linhas de fila e detalhe; o produto já tinha 2.314 de tratamento em produção. Duas implementações do mesmo assunto divergem |

### Sprint 31 - o analítico servidor (nenhuma tela, é o caminho do dado)

| # | Decisão | Porque |
| --- | --- | --- |
| D-08 | O vídeo vem do **relay, no substream de menor resolução** | O custo de inferência escala com resolução, e é esse número que define o teto por instância. Rejeitados: ler a câmera direto (multiplicaria sessão RTSP e espalharia credencial) e vídeo por Kafka (antipadrão de retenção e tamanho) |
| D-09 | Ocupação é **domínio próprio** em contracts, não subtipo de câmera | Ocupação de região é assunto do analítico, e quem consome é a cadeia de detectores. Em `camera` também bateria no guard da lista de tópicos |
| D-10 | Publica **só na transição**, com histerese | Laço físico funciona assim: ocupou, desocupou. Emitir por frame entregaria ao controlador um fluxo que ele não sabe ler, e a histerese evita tremer na borda |
| D-11 | O container **nunca recebe credencial** de câmera | Cada processo que guarda credencial de campo é superfície nova. O relay já existe e já a tem |
| D-12 | Câmera com embarcado **e** servidor é **caso conhecido** | O hardware não sustenta dois encodes junto com a inferência. A combinação vai existir - melhor documentada que descoberta com o trânsito parado |
| D-13 | O embarcado **também migra** para o contrato comum | Se só o servidor falar o contrato novo, o consumidor volta a precisar de um ramo por origem |
| D-14 | A sessão do analítico tem **contador próprio** | Precedente concreto: relay preso mantendo `ffmpeg` vivo porque o `viewerCount` nunca zerava. No mesmo contador, o analítico nunca desliga |

### Sprint 32 - escala e prova

| # | Decisão | Porque |
| --- | --- | --- |
| D-15 | O teto de câmeras por instância é **medido, não estimado**, com política de saturação declarada | Estimativa de capacidade de inferência erra por múltiplos, não por percentual. Sem política, saturar significa "alguma câmera para de detectar" sem ninguém saber qual |
| D-16 | A prova é **ponta a ponta, com contador coerente** | Cada elo passar isolado não prova a cadeia. O critério é o número no fim bater - o único que um operador consegue conferir |

---

## 7. O que está aberto

| # | Pendência | Impacto se mudar |
| --- | --- | --- |
| A-01 | **De onde vem o pixel da evidência**. Implementado na opção recomendada (reler o device em resolução cheia), isolado num seam de um método. As outras: extrair frame do relay, ou pedir ao fornecedor do ACAP que publique a imagem | Muda o shape do que a galeria lista - uma imagem por incidente, sequência de frames, ou trecho de vídeo |
| A-02 | **Qual chave do VAPIX carrega a geração do chip**. Nenhum ARTPEC 7 nem 8/9 estava disponível; o parser varre todos os valores do grupo em vez de apostar num nome de chave | Nenhum no contrato: quando um device real confirmar, o que estreita é um regex |
| A-03 | **As telas de métricas não estão em nenhuma sprint** (~11.000 linhas prontas no `attlas-design`, dependentes do backend da Sprint 31) | Se precisam estar no ar em 18/09, a Sprint 32 é a última semana em que caberiam |
| A-04 | **ACOM e ATSPM entram no prazo de 18/09?** 28 pontos somados, no backlog sem prazo | É mais de uma sprint inteira entrando três semanas antes do prazo |

> [!danger] A pendência que não é nossa
> O contrato de ocupação precisa que a forma do evento seja conferida com quem consome do outro lado. É o
> único ponto da cadeia que não se resolve dentro do time - e fica no caminho crítico da Sprint 31, não
> numa ponta solta.

---

## Ver também

[[Analítico]] (índice do domínio) · [[Analítico - Embarcado x Servidor]] ·
[[Analítico - Requisitos e SLA]] · [[Analítico - Arquitetura e estratégias]] · [[Analítico - Fluxos]] ·
[[Analítico - Frontend do attlas-design]] · [[Sprint 30 - o que entrega]] ·
[[Sprint 31 - o que entrega]] · [[Sprint 32 - o que entrega]]
