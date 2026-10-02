---
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - aba Analítico com indicadores, gráfico e regiões por analítico"
frente: Câmeras
tamanho: 5 pts
pr: "#4676"
status: "PR #4676 com o review de 25/09 atendido (31 de 31 threads resolvidas), develop mesclada e Lint e Build verdes; aguarda novo review de otavio e igor e a aprovação da UF-724."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-25
---

# Câmeras - aba Analítico com indicadores, gráfico e regiões

A aba Analítico que voltou ao detalhe da câmera na #4349 passa a seguir o design do Figma do módulo
Câmeras (nó 3412-641083). A spec é a `UF-724`, atômica própria da aba escrita no review de 25/09, em
`in-review`; a `UF-043` passou a apontar para ela.

## O que estava errado

A aba mostrava só o estado do analítico, o aviso de feed e a lista das regiões com o quadro de
configuração de cada uma. O operador não via ali quanto o analítico contou, se os detectores das regiões
estão mandando leitura, nem quantos incidentes a câmera gerou, e precisava sair para Métricas.

## O que muda

A aba tem um seletor de período, de uma a dez horas, e um card recolhível por analítico da câmera, com
estado, dados gerais, atalhos para Detecção e Métricas, os indicadores do período, o gráfico de detecções
em janelas de cinco minutos, total ou por classe, e a lista das regiões com contagem, cor do contorno e
estado.

Os números são reais. As contagens e a cobertura de metadado vêm do histórico de detectores, lido pelo
vínculo região-detector, a mesma fonte das faces ATSPM e Laço Virtual de Métricas. Os incidentes vêm das
métricas de incidentes filtradas por analítico, cada card com os seus, e o estado do analítico vem das
Instâncias e do socket ao vivo. A aba relê sozinha quando a sala da câmera avisa que algo mudou (laço,
incidente, vínculo, região ou laço salvo) e a cada virada de janela de 5 min, no máximo uma vez a cada
10 s; o `ms-cameras` ganhou o aviso `camera:analytics:update` para isso.

Onde o design pedia um dado que nenhum serviço tem, a tela mostra o real mais próximo: "Detecções no
período" virou "Detectores vinculados", e "No padrão / 18% abaixo do normal" virou o estado da região por
cobertura, falha e vínculo, porque não existe referência de "normal" para comparar.

## Review de 25/09

O igor pediu mudanças com 2 impeditivos (spec da aba e o indicador de regiões com metadado caindo para
zero com a aba aberta) e 20 ajustes; o otavio, reuso do `app-event-counter-card` e do `z-empty`; o Will,
specs do util de janelas e do service. Tudo atendido no mesmo dia: incidentes por analítico, recência
medida pelo fim da leitura, carga sem `effect()`, leituras com concorrência e timeout, chaves estáticas e
catálogo sem literais, e specs novos do service, do card, do gráfico e do util. As 31 threads foram
respondidas e resolvidas, e o novo review foi pedido só a quem pediu mudanças.

## O que tem de valer no fim

A aba segue só leitura. O quadro de configuração da região saiu dela, e a Detecção continua sendo o único
lugar onde a configuração do analítico é lida para edição e escrita.

## Relacionado

- [[Câmeras - aba Analítico no detalhe, só leitura]], a task que devolveu a aba ao detalhe da câmera.
- [[Attlas - Sprint 34]].
