---
tags:
  - doc
  - processo
  - convencao
aliases:
  - "Processo - Convenção de nomes"
  - "Convenção de nomes"
atualizado: 2026-10-02
---

# Processo - Convenção de nomes

Como cada arquivo do vault se chama e em que pasta ele mora. A regra é uma só: **o nome do arquivo repete o
caminho de domínio da pasta e termina no tipo de conteúdo da nota**. Lendo só o nome, sem abrir a pasta, dá
para saber de que domínio a nota trata e o que tem dentro dela.

## A regra

```text
Docs/<Domínio>/<Subdomínio>/<Domínio> - <Subdomínio> - <Faceta>.md
```

1. O nome é a sequência de pastas abaixo de `Docs/`, da mais geral para a mais específica, separadas por
   espaço, hífen e espaço.
2. O último segmento é sempre a **faceta**: o tipo de conteúdo da nota, tirado da lista fechada abaixo.
3. A pasta da nota é exatamente o caminho que o nome diz. Nome e pasta nunca discordam.

| Arquivo | Domínio | Subdomínio | Faceta |
| --- | --- | --- | --- |
| `Docs/Câmeras/Streaming/Câmeras - Streaming - Fluxos.md` | Câmeras | Streaming | Fluxos |
| `Docs/Câmeras/Streaming/Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw.md` | Câmeras | Streaming | Diagrama, qualificado |
| `Docs/Analítico/Neural Labs/Analítico - Neural Labs - Tempo de viagem.md` | Analítico | Neural Labs | Tempo de viagem (tema) |
| `Docs/Analítico/Analítico - Pendências.md` | Analítico | nenhum | Pendências |
| `Docs/Infraestrutura/Infraestrutura - Ambientes.md` | Infraestrutura | nenhum | Ambientes (tema) |

## Os domínios

| Pasta | O que cobre | Subdomínios |
| --- | --- | --- |
| `Docs/Câmeras` | o módulo Câmeras (CCTV), todo servido pelo `ms-cameras` | Cadastro, Dashboard, Eventos, incidentes e alarmes, Integração com dispositivo, PTZ e presets, Saúde e monitoramento, Streaming, Videowall, VMS |
| `Docs/Analítico` | laço virtual, ATSPM e leitura de placas, embarcado na câmera ou no servidor da Neural Labs | Neural Labs |
| `Docs/Infraestrutura` | CI, ambientes, acessos e observabilidade | nenhum |
| `Docs/Processo` | como o trabalho é feito e contra o quê: convenções e o edital do cliente | nenhum |

- O domínio leva o nome do produto em português, nunca o nome do serviço do repositório: `Câmeras`, não
  `ms-cameras`. O nome do serviço aparece dentro da nota, como fato.
- Tela do `web-attlas` não é domínio próprio: fica no subdomínio de backend que ela serve.
- Subdomínio nasce quando o assunto tem facetas próprias (arquitetura, fluxos, requisitos). Assunto de uma
  nota só é faceta de tema do domínio, sem pasta.

## As facetas

Lista fechada, com esta grafia, e nesta ordem dentro do `index.md` da pasta:

| Faceta | O que a nota contém |
| --- | --- |
| `index.md` | porta de entrada da pasta: o que o domínio é e a lista das notas dele |
| Visão do produto | o domínio para quem chega: o que faz, para quem e com o que se relaciona |
| Arquitetura e estratégias | onde mora cada peça no código, contratos, rotas, por que é assim e armadilhas |
| Fluxos | o passo a passo de cada caso de uso, do pedido à resposta |
| Requisitos e SLA | regras de negócio, metas, medições, limites, timeouts e variáveis de ambiente |
| Frontend | as telas do `web-attlas` do domínio |
| Pendências | o que falta para o domínio fechar |
| Runbook | comandos para operar e diagnosticar |
| Diagrama | desenho do Excalidraw (`.excalidraw.md`) |
| Tema | assunto que não cabe nas anteriores, com nome próprio: `Banda e bitrate`, `Catálogo e criticidade`, `Guia de degradação` |
| Explicação | texto para usuário final, na raiz do vault (ver Casos especiais) |

**Qualificador.** Quando a pasta tem mais de uma nota da mesma faceta, ou quando a faceta cobre só uma parte
do domínio, entra um segmento a mais depois da faceta: `Câmeras - Streaming - Diagrama - Pipeline HLS`,
`Analítico - Runbook - Embarcado`. Sem essa necessidade, não há qualificador.

## Casos especiais

- **`index.md`.** Um por pasta, com esse nome de arquivo, porque o Obsidian e o app `.brain` o tratam como a
  nota da pasta. Quem carrega o domínio é o título e o primeiro alias, os dois iguais ao caminho:
  `# Câmeras - Streaming`. Link para o domínio usa esse alias: `[[Câmeras - Streaming]]`.
- **Explicação para usuário final.** Fica na raiz do vault, com nome
  `<Domínio> - <Subdomínio> - Explicação - <pergunta respondida>`, e o `index.md` do domínio linka para ela.
  Como todo nome começa pelo domínio, a raiz fica agrupada por domínio na ordem alfabética.
- **Anexo** (PDF, imagem). Mesmo padrão, com a extensão do arquivo. PDF exportado de uma nota leva o nome
  da nota: `Câmeras - Saúde e monitoramento - Guia de degradação.pdf`.
- **`Sprint/` e `Reports/`.** Registro do período, organizado por tempo e não por domínio: `Sprint/NN/index.md`,
  `Reports/AAAA-MM-DD.md`. Nota de task nova usa o vocabulário de domínio desta página no começo do nome
  (`Câmeras - Streaming - <assunto>`); as antigas ficam como foram escritas.

## Escrita do nome

- Português com acento. Cada segmento começa com maiúscula e segue como frase: `Requisitos e SLA`.
- Entre segmentos, espaço, hífen e espaço. Hífen dentro de um segmento só quando faz parte do nome
  (`dev.v2`, `Wi-Fi`).
- Sem prefixo numérico, sem kebab-case, sem id de spec do repositório (`MOD-004`), sem data. A data da
  última revisão de conteúdo vai no frontmatter, em `atualizado`.
- O título (`# `) da nota é igual ao nome do arquivo.

## Frontmatter

```yaml
tags:
  - doc
  - <domínio>
  - <assunto>
aliases:
  - "<nome atual, ou o caminho do domínio no index.md>"
  - "<nomes antigos>"
atualizado: AAAA-MM-DD
```

## Renomear

O nome antigo entra em `aliases`, e todos os wikilinks são reescritos no mesmo passe. Em `Sprint/` e
`Reports/` o texto exibido do link fica como estava (`[[nome novo|texto antigo]]`), porque é registro. No fim,
nenhum wikilink fica sem destino.

## Onde ponho uma nota nova

1. **Domínio**: Câmeras, Analítico, Infraestrutura ou Processo. Se nenhum serve, é domínio novo: pasta nova
   com `index.md` e linha na tabela de domínios desta página e do [[Docs - índice raiz]].
2. **Subdomínio**: se o domínio tem subpastas, a que serve o mesmo código ou a mesma tela.
3. **Faceta**: uma da lista. Se já existe nota da mesma faceta na pasta, o conteúdo entra nela (um fato, uma
   nota).
4. **Nome**: caminho mais faceta, e qualificador só se o passo 3 deixou duas notas da mesma faceta.
5. **Índice**: a nota entra no `index.md` da pasta, na ordem das facetas.

Relacionado: [[Processo - Convenções de escrita]], que trata de como escrever o conteúdo.
