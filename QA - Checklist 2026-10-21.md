---
tags:
  - qa
date: 2026-10-21
---

# QA: o que foi entregue em 21/10/2026

Tudo abaixo está mergeado na `develop`. **Nenhuma PR teve teste, lint ou build rodados localmente**, e o CI da `develop` estava vermelho por módulos que não são destes (emergências e dashboard de controle). Por isso, a validação funcional no ambiente é o que de fato falta. Ambiente: dev.v2, a menos que diga outro.

## Câmeras: Eventos

- [ ] **#8626 (fecha #8225): Filtros Área e Subárea.** Câmeras > Eventos > Filtros: Área e Subárea não aparecem mais (o catálogo era mock). Os demais filtros devem funcionar normalmente.
- [ ] **#8632 (Refs #8289, #8223, #8229, #8230):**
  - Coluna Acionamentos: "1 acionamento" no singular, plural nos demais.
  - Detalhe do evento, "Informações de origem": sem "undefined" quando a câmera não tem endereço (só o código).
  - Diálogo "Reportar ocorrência": linha do dispositivo sem "undefined".
  - Evento de câmera com timeout: mensagem em português, sem "timeout of 5000ms exceeded".
  - Badges de origem e severidade, estados vazios (cards sem dados sem header) e card de Observações (mantém o título no estado vazio).
  - Conferir contra o screenshot da #8289; itens visuais não foram vistos em navegador.
- [ ] **#8544 (fecha #8234): Acionamentos Relacionados por Sistema.** Com dois Sistemas com câmeras caindo pela mesma causa em até 60 s, o evento de um Sistema só lista incidentes do próprio Sistema. Incidentes antigos que já cruzavam Sistemas não foram reescritos.

## Câmeras: telas

- [ ] **#8628 (fecha #8232 e #8236):**
  - Dashboard > Conexão Intermitente: câmera sem nenhuma queda não aparece como "Mais instável"; rodapé "Nenhuma queda no período"; "Pior dia" com 0 quedas mostra "—"; média/dia no formato do idioma (vírgula em pt-BR).
  - Exportação: o período aparece com o rótulo da tela (ex.: "Últimos 30 dias").
  - Câmera PTZ: chave PTZ ligada no formulário de edição quando a lista mostra o selo PTZ.
- [ ] **#8634 (Refs #8284): Detalhe da câmera.** Menu ⋮ do cabeçalho com "Configurar detecção" (leva à Detecção da câmera), painel lateral de abas sempre visível (com estado vazio quando não há PTZ nem analítico), badge de estado das regiões, métricas de saúde. Pendente: coluna "Table select" nas tabelas (item 10).
- [ ] **#8635 (Refs #8285): Monitoramento de Vídeo.** Divisória do mosaico e demais ajustes visuais. **Atenção: o checkbox ficou sem sombra no app inteiro; conferir checkboxes em outras telas.** Pendentes: espaço em branco entre posições (causa não achada) e estados de hover/renomear/excluir do card (depende de decisão de produto).
- [ ] **#8636 (Refs #8291): Dashboard de câmeras.** "Comparar por filtro" sem dados mostra o estado vazio (antes a modal ficava em branco); tooltips das roscas e do heatmap, tabelas de latência/degradação e barra fixa. Valores de espaçamento do backdrop e da barra fixa foram estimados, vale olhar o alinhamento.
- [ ] **#8546: Player, "Semáforos visíveis".** Câmera cuja interseção tem controlador virtual: o menu lista só os grupos desse controlador. Interseção sem controlador virtual: o botão não aparece. Em build antigo sem `controllerId` no nó, a lista também fica vazia.

## Videowall

- [ ] **#8545 (fecha #8231): "Enviar ao painel" sem processador.** Num Sistema sem processador de videowall: aviso "Não há painel de videowall conectado a este Sistema." (sem nome de classe nem ID) e o mosaico permanece como estava. Com a visualização salva, ela continua na aba Grupos.
- [ ] **#8633 (Refs #3023, #8288):** o rótulo do layout acompanha a divisão local; tabs do card do processador em underline. **Pendentes e não corrigidos:** reorganização das câmeras ao trocar de layout (#3023) e o texto de "Realce automático" no menu do player (#8288; o toggle foi removido pela UF-044).
- [ ] **#8567: Espelho de console no videowall.** O código foi entregue (take sem slot não empilha sobre tela cheia, captura limitada a 1080p e 30 fps com erro visível, fonte recriada quando a credencial muda, fontes órfãs removidas, validação da senha do leitor no boot). **Não foi validado com o H9 nem em modo sandbox, e nenhum teste foi executado.** Só vale testar onde houver painel real ou o playground (`VIDEOWALL_PLAYGROUND_ENABLED`).

## Analítico

- [ ] **#8743 (Refs #8433): Configuração da detecção.**
  - Laço virtual: o dropdown de classes reflete as classes marcadas na detecção antes do primeiro Salvar.
  - Vínculo faixa/detector: a escolha de cada região fica visível na hora, sem esperar o Salvar.
  - Desativar a métrica de desempenho de uma região funciona; se a leitura não traz o analítico, aparece erro.
  - **Não resolvido:** a lista de faixas mistura as duas mãos de via e puxa detectores de entrada e saída. Depende de decisão de produto e do traffic-model.
- [ ] **#8637 (Refs #8292, #6741):** tooltip do botão de métricas avançadas em primary, botões do cartão de câmera centralizados, vídeo da Detecção ocupando até a borda esquerda no desktop (verificar se não surgiu scroll horizontal). A #6741 ({value} em "Última atualização") já estava corrigida na base; confirmar no ambiente.

## Infraestrutura (dev.v2)

- [ ] **Simulador de PMV** atualizado: o perfil `attlas-fleet` sobe com 50 PMVs (portas 20161 a 20210, IP 10.96.200.10). Conferir os PMVs no `ms-pmv`. A imagem anterior ficou como `pmv-simulator:previous`.
- [ ] **Chronos Quito** (TCA, TCM, TPE) na 1.0.4 (`7bdbd08a`), já em execução.

## Issues que continuam abertas

#8289, #8223, #3023, #8288, #8284, #8285, #8291, #8292, #8433 (pendências descritas acima e no corpo de cada PR). Follow-up aberto: #8629 (falha transitória do lookup do Sistema na correlação de incidentes).
