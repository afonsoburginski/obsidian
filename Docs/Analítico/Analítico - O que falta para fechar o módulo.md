---
tags:
  - doc
  - analitico
  - escopo
aliases:
  - "O que falta para fechar o Analítico"
  - "Analítico - inventário de fechamento"
atualizado: 2026-10-01
---

# Analítico - O que falta para fechar o módulo

O trabalho que falta no [[Analítico]], pelos cinco recursos do edital (seção 4.6). A regra de cada item
e o que já atende estão em [[Analítico - Requisitos e SLA]].

## Visão Geral (tela de Detecção)

- **Histórico e versionamento da configuração** (`RF-VG-06`): versão, autor, data, motivo e reverter.
  Não existe nada.
- **Bloco do laço uma vez por câmera.** O laço é configuração da câmera, mas a tela o desenha dentro de
  cada região, e mexer nele numa muda todas. Falta a decisão do dono de mostrá-lo como seção da câmera.
- **Até 4 laços por câmera**: a UC-073 do `ms-cameras` especifica e segue `planned`; é mudança de
  contrato (`IVirtualLoopConfig`), não constante nova.
- **Quem avalia o limiar do incidente**: o app tem limiar global no `/config` e não devolve limiar por
  incidente. Pergunta ao time do embarcado; decide se o que a tela grava por incidente surte efeito.

## Analíticos (tela de Instâncias)

- **App de laço por TCP ponta a ponta**: o `ms-cameras` precisa gravar o `deviceId` do handshake e
  empurrar o endereçamento ao `ms-connector-virtual-loop` ao salvar o laço. Até lá o adaptador
  `virtual-loop-tcp` não passa da sonda e o vínculo ACOM dessa build fica `UNSUPPORTED`.
- **`attlas.virtual-loop.device-presence`** não tem consumidor.
- **Decisão automatizada** (`RF-INST-05`): a leitura alimentando as Estratégias do Modelo de Tráfego.
  Cross-módulo.
- **Atualização remota do app embarcado**: não existe.
- **`ms-acom`**: esqueleto ainda no compose e no Kong; tirar é decisão em aberto.
- **Neural Labs**: ver [[Neural Labs - Arquitetura e estratégias#Pendências]].

## Incidentes

- **Tempo por etapa do tratamento** para medir SLA: o tratamento guarda só o status atual.
- **Recorrência e padrões** de incidente, que o edital pede em "histórico e padrões".

## ATSPM (tela de Métricas)

- **Sete das oito métricas do edital sem fonte**: Split Monitor, Yellow e Red, PCD, Approach Delay,
  TMC, Preemption e Priority. Só o AOG vem, e só do app ATSPM. Split Monitor sai só de
  `controller_cycle` no `ms-detector-history`; as de chegada pedem o mapa estágio para grupo de
  movimento do Modelo de Tráfego; o TMC pede a classe na leitura de detector, que
  `IDetectorRawEvent` não carrega.
- **Snapshot da configuração semafórica por ciclo** (`RNF-ANL-06`), precondição de Split Monitor, AOG e
  Approach Delay. Produtor: `ms-controllers`.
- **Mais de um vínculo por câmera**: as duas faces leem só `bindings[0]`
  (`virtual-loop-metrics.service.ts` e `atspm-metrics.http-source.ts`) e não dizem que há outros.

## Dashboard

- **O recurso inteiro** (`RF-DASH-01` a `RF-DASH-06`). Reusa o que o dashboard de Câmeras já calcula
  para o parque.

## Defeitos e decisões abertas

- **A composição do ACOM no `ms-controllers` lê regiões sem dizer de qual analítico**
  (`regionsOf` em `cameras.http-client.ts`). Numa câmera com dois analíticos a chave do vínculo pode
  não casar.
- **`videoUnavailable` da resposta da aba ACOM não é lido pelo `web-attlas`**: indisponibilidade do
  `ms-cameras` aparece como "Compatível, sem vínculo".
- **Atraso do acendimento na DEMO**: cerca de 1,5 s dos 2 s ficam dentro do app SDCT, que publica em
  lotes. Cai só com mudança no app ou atrasando o vídeo para casar com a região; a escolha é do dono.
- **Caixa e faixas sobre o vídeo ao vivo**: o desenho novo (caixa sólida com classe, id e velocidade, e
  regiões como faixas) está em PR draft (#5307); a `develop` mantém o desenho anterior.
