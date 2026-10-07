---
id: S34-32
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - ms-cameras
  - web-attlas
titulo: "[Full] Analítico - imagem e vídeo do incidente na sidebar, lidos do equipamento"
frente: Analítico
tamanho: 8 pts
pr: "#4889, #4902"
status: "PR #4889 mergeada em 26/09 às 19h07 e no ar no dev.v2 na mesma noite; a mídia abriu, mas devagar. A continuação é a PR #4902, aberta às 21h: cópia perto da mídia, caixa do objeto na foto e no vídeo, fila e página do incidente ao vivo e relacionados paginados. CI da #4902 verde (Lint e Build). O object storage do ms-cameras entrou no .env.docker do EC2 em 26/09. O env do host que quebrou o deploy de 26/09 foi corrigido (ver [[Registro - deriva do env do dev.v2 e deploy quebrado em 26 de setembro]]) e a #4902 foi mergeada em 27/09 (`a558c55396`) e está no ar no dev.v2 desde o deploy das 00h31 UTC. No host, o primeiro passe de pré-leitura deixou 48 listas no Redis e 56 fotos no MinIO; a tela ainda não foi vista."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-26
aliases:
  - "Analítico - imagem e vídeo do incidente lidos do equipamento"
---

# S34-32 - Analítico - Incidentes - Imagem e vídeo do incidente lidos do equipamento

Pedido do dono em 26/09: a sidebar que abre ao ver o detalhe do incidente precisa mostrar a imagem e o
vídeo do incidente, tirados do app do analítico embarcado. No mesmo dia ele relatou que o dev.v2 não
mostrava incidente nenhum sendo gerado, e as duas coisas saíram na mesma PR. As atômicas são a `UC-225`
do `ms-cameras`, a seção 8.1 da `UF-035` do `web-attlas` e a seção 12 da `PROJ-022`, com a regra
`RF-DAI-07` no `docs/modules/analitico.md`.

## O que estava errado

- A galeria da sidebar só lia a evidência guardada no storage, que nada no produto grava sozinho, então
  a aba Imagem ficava vazia e a aba Vídeo não tinha fonte nenhuma.
- O app ATSPM 0.10.2 da EMBEDDED 080 manda o incidente por objeto, em `obj_incidents`, e deixa
  `region_incidents` sempre vazio. O consumidor do stream só lia o segundo campo, então nenhuma linha de
  incidente era gravada no dev.v2 desde 04/09, com o app registrando 1643 incidentes em três dias.

## O que muda

- O `ms-cameras` responde, pela linha do incidente, a lista da mídia que o equipamento guarda: a imagem
  que o app capturou em cada ocorrência (`POST /incidents` e `/output/...` do app) e a gravação que a
  câmera fez no SD (VAPIX `record/list.cgi` e exportação em MP4). O casamento usa o tipo, a região e a
  janela de dedup da linha, e a gravação é achada pelo tempo porque o app devolve `recording_id` nulo.
- Os bytes passam por duas rotas autenticadas do `ms-cameras`, com gramática fechada em cada segmento,
  sem expor endereço nem credencial do equipamento, e os prazos vêm de
  `ANALYTICS_INCIDENT_MEDIA_HEADER_TIMEOUT_MS` e `ANALYTICS_INCIDENT_MEDIA_BODY_TIMEOUT_MS`.
- Nada é copiado para o Attlas: a mídia dura o quanto o equipamento guarda.
- No front, a aba Vídeo toca a gravação no próprio quadro, baixada só quando é o item corrente, e a falha
  só do equipamento não esconde a evidência guardada.
- O consumidor do stream lê os dois campos de incidente, com a classe do próprio objeto.

## Como foi validado

- Contra a 10.1.1.80 real: a lista respondeu em meio segundo, a imagem em 0,5 s e um MP4 1080p de 22,7 s
  em 15,3 s. O consumidor novo extraiu os três incidentes que passaram em 75 s de quadros reais do broker
  do dev.v2.
- Integração da `UC-225` com Postgres real, 14 de 14, também sobre a árvore mesclada com a develop.
- Review da própria PR publicada no GitHub, com 23 pontos, três deles impeditivos: o contrato da resposta
  importava outro contrato, a atômica estava em rascunho e divergia do código, e seis comentários não se
  sustentavam. Todos corrigidos antes do merge, cada thread respondida e resolvida.

## O que tem de valer no fim

Depois do deploy, a fila de Incidentes do dev.v2 volta a receber incidente da EMBEDDED 080 (e das outras
três câmeras cadastradas com o mesmo equipamento), e abrir um deles mostra a imagem na aba Imagem e a
gravação tocando na aba Vídeo. A fila continua sem canal em tempo real: incidente novo só aparece ao
reabrir a fila ou trocar o filtro.

## Continuação - 26/09, noite (#4902)

Com a #4889 no ar, o dono viu a mídia abrir e pediu quatro coisas na mesma noite, todas na
[#4902](https://github.com/atmanadmin/attlas-2026/pull/4902):

1. **Sem espera.** Os logs do EC2 mostravam a lista em 2,1 a 2,3 s, a foto em 1,1 s e o vídeo em 11 s,
   tudo esperando o equipamento pelo túnel. A lista passou a ficar no Redis e os arquivos no object
   storage do `ms-cameras`, com um passe por minuto que lê as linhas novas e copia as fotos, uma
   exportação só por gravação e prazo de 7 dias. A galeria baixa tudo assim que a lista chega.
2. **Caixa do objeto na foto e no vídeo.** O app guarda em cada incidente a trilha de caixas do objeto,
   uma por quadro analisado, e as últimas 300. Conferido na 10.1.1.80: a foto casa com a primeira
   caixa, e na gravação a caixa de cada instante cai sobre a moto. A caixa usa o traço do overlay ao
   vivo e, no vídeo, segue o quadro apresentado.
3. **Relacionados paginados.** A tabela do detalhe do incidente pagina e ordena no servidor, 10 por
   página. As setas de ordenação das outras colunas nunca ordenaram nada e saíram.
4. **Ao vivo.** A fila e a página do incidente assinam a sala do Sistema no socket de status e mudam sem
   recarregar quando um incidente é gravado, tratado ou comentado em outra estação.

Ficou também registrado na [#4280](https://github.com/atmanadmin/attlas-2026/pull/4280) que o realce de
imagem vai servir para essa mídia guardada, sempre na estação.

**Pendente com o dono**: o `.env.docker` do `ms-cameras` no EC2 não tem nenhuma variável
`OBJECT_STORAGE_*`, e a escrita no host foi barrada nesta sessão. Sem elas a lista sai do Redis, mas os
arquivos seguem vindo do equipamento.

## Relacionado

- [[Registro - imagem e vídeo do incidente lidos do equipamento em 26 de setembro]], com as rotas e as
  medições no equipamento.
- [[Analítico - Embarcado x Servidor]], seção de 26/09.
- [[S30-11 - Analítico - Incidentes - Galeria de mídia de evidência (front)]] e [[S30-09 - Analítico - Incidentes - Fonte da imagem de evidência]], a
  origem da galeria na Sprint 30.
- [[Attlas - Sprint 34]].
