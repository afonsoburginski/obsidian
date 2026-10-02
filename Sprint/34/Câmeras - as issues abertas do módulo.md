---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - fechar as issues abertas do módulo"
frente: Câmeras
tamanho: 50 pts, em 14 tasks
pr: "#4143, #4146, #4147, #4148, #4150, #4152, #4165, #4166, #4169, #4170, #4171, #4172, #4173, #4174"
status: "Em 23/09: das 28 issues abertas com o rótulo cameras em 22/09, 27 estão fechadas, 26 por PR mergeada e a 1869 à mão, com validação. Só a 1875 segue aberta, porque depende de decisão de produto. Depois do levantamento entraram a 4269, que a #4298 atende em parte, e três issues de tela em 23/09 (4326, 4328 e 4351), ainda sem task."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Câmeras - as issues abertas do módulo

Guarda-chuva da frente 2 da semana. Cada PR daqui tem nota própria; esta nota é o mapa de cobertura e
o escopo do que ainda não tem dono.

> [!info] Estado em 23/09: a lista de 22/09 está praticamente zerada
> Em 22/09 eram 28 issues abertas com o rótulo `cameras`, e o plano era fechar 10 na semana. Em 23/09,
> 27 estavam fechadas, conferidas uma a uma no evento de fechamento do GitHub: 26 fechadas por uma das
> 14 PRs abaixo e a 1869 fechada à mão em 21/09, com o comentário de validação na própria issue. Das 18
> que sobravam, só a 1875 segue aberta.

## O que esta semana fechou

| PR | Issues | Nota |
| --- | --- | --- |
| [#4143](https://github.com/atmanadmin/attlas-2026/pull/4143) | 3009, 3010 | [[Videowall - coluna No painel e o segundo ícone de limpar]] |
| [#4146](https://github.com/atmanadmin/attlas-2026/pull/4146) | 1873 | [[Eventos - o segundo ícone de limpar nas buscas]] |
| [#4147](https://github.com/atmanadmin/attlas-2026/pull/4147) | 2826, 2845 | [[Videowall - título e bordas cortados no painel]] |
| [#4148](https://github.com/atmanadmin/attlas-2026/pull/4148) | 3025 | [[Videowall - nome de grupo duplicado por capitalização]] |
| [#4150](https://github.com/atmanadmin/attlas-2026/pull/4150) | 1870, 1874 | [[Câmeras - navegação do cadastro e o dropdown de Modelo]] |
| [#4152](https://github.com/atmanadmin/attlas-2026/pull/4152) | 2824, 3119 | [[Videowall - endereço de rede e porta validados]] |
| [#4165](https://github.com/atmanadmin/attlas-2026/pull/4165) | 3157, a crítica | [[Monitoramento - a posição da grade sem transmissão]] |
| [#4166](https://github.com/atmanadmin/attlas-2026/pull/4166) | 3226 | [[Câmeras - importação em lote só com CSV e XLSX]] |
| [#4169](https://github.com/atmanadmin/attlas-2026/pull/4169) | 2990, 3000, 3075 | [[Videowall - mensagens de erro com campo e motivo]] |
| [#4170](https://github.com/atmanadmin/attlas-2026/pull/4170) | 1860, 1868, 4063 | [[Câmeras - estado vazio de Dispositivos e o rótulo de conexão]] |
| [#4171](https://github.com/atmanadmin/attlas-2026/pull/4171) | 2787, 3023, 3076 | [[Videowall - preset, geometria e grade de projeção]] |
| [#4172](https://github.com/atmanadmin/attlas-2026/pull/4172) | 1872, 1934 | [[Câmeras - barra de ações do Monitoramento e barra de abas]] |
| [#4173](https://github.com/atmanadmin/attlas-2026/pull/4173) | 1866, 1877, 3029 | [[Câmeras - campos e validação do cadastro e da edição]] |
| [#4174](https://github.com/atmanadmin/attlas-2026/pull/4174) | 3122 | [[Eventos - validação do reportar ocorrência]] |

Vinte e seis issues, catorze PRs, todas mergeadas entre 22 e 23/09. Três itens do escopo de 22/09
mudaram de lugar no caminho, e vale registrar:

- A **3157** estava como task de verdade, com a ressalva de que as PRs de streaming não a fechavam.
  Quem fechou foi a #4165, pelo lado da tela: o tile que não abre sessão passa a dizer se está
  conectando, se falhou ou se bateu no teto de sessões, em vez de ficar preto.
- A **1872** estava como dependente de produto. Foi conferida contra o protótipo vigente e fechou na
  #4172.
- A **1877** estava para reproduzir antes de estimar. Reproduziu e fechou na #4173.

## O que continua aberto

### Da lista de 22/09

- **1875**, colunas "Câmera", "Área" e "Subárea" na tabela de Eventos. Segue dependendo de decisão de
  produto: a câmera já aparece empilhada na coluna "Código" da variante compacta, as três colunas
  dedicadas já existem na variante ampla do mesmo alternador, e Área e Subárea vêm vazias porque o
  serviço as resolve pela topologia e degrada para vazio quando a câmera não tem elemento de tráfego
  vinculado. O primeiro critério de aceite é definição de produto e os outros dependem dele.

### Abertas em 23/09, ainda sem task

- **4326**, criar ou editar automação com um passo sem preset envia a requisição assim mesmo; o serviço
  recusa com 400 e a tela mostra mensagem genérica, sem apontar o campo.
- **4328**, o campo "Nome do preset" é identificado só pelo placeholder, sem rótulo e sem marca de
  obrigatório, embora seja obrigatório.
- **4351**, o botão de mostrar e ocultar o mapa no detalhe do dispositivo mostra o ícone invertido em
  relação ao estado do mapa.

As três são de tela e da mesma família das que a semana fechou: a 4326 e a 4328 no painel de presets e
automação, a 4351 no painel de detalhe do dispositivo.

### Aberta em 22/09, depois do levantamento

- **4269**, "Integrar estado de câmera às condicionais do plano", aberta pelo time de planos com os
  rótulos `cameras` e `execution-plans` horas depois da contagem das 28. A #4298 entregou a rota interna no `ms-cameras` e o leitor no
  motor de planos para parte das variáveis. O que ela cobre e o que falta está em
  [[Planos - variáveis de condição de câmera]].

## Relacionado

- [[Attlas - Sprint 34]], a sprint em que esta frente vive.
- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]], para a relação entre a frente 1 e a issue 3157.
