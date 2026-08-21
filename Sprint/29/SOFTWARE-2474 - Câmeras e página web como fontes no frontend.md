---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2474
clickup: https://app.clickup.com/t/86ajyp9um
titulo: "[Front] Videowall externo: câmeras e página web como fontes"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: reescopado em 13/08 pelo replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]]: era a aba de fontes, passou a ser a captura da tela e a sessão de espelho. Segue em backlog na Sprint 28. Renomeado no ClickUp para "[Front] Videowall externo: captura da tela e sessão de espelho". Em 14/08: segue com a captura de tela; a tela de fontes de câmera volta encolhida em card novo.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2474 - Captura da tela e sessão de espelho

> [!warning] Segunda revisão de 13/08: espelhar ganha preview no dialog
> A view de espelhar vive no dialog compartilhado, e a ordem dos gestos virou regra: **captura, preview,
> e só na confirmação a tomada**. O operador escolhe a tela, vê no preview ao vivo exatamente o que a
> parede vai exibir, com a frase de exposição, e só o gesto de enviar toma o painel e publica. Recusa do
> browser deixa o painel intocado, porque nada foi tomado ainda. Fechar o dialog não libera; parar o
> compartilhamento pelo controle do browser libera. Spec nova: `UF-031`.

> [!info] Revisão de 14/08: a tela volta encolhida, e num card novo
> Este card foi reescopado em 13/08 para a captura da tela com prévia, que é a UF do espelho, e continua
> nisso. A tela de fontes de câmera do painel volta ao escopo **encolhida**, e precisa de card próprio: sem
> campo de endereço, sem credencial de câmera, sem gesto de publicar e sem seção de página web, que o
> equipamento comprovadamente não renderiza. O que sobra é leitura, quais câmeras da cena estão projetadas e
> qual foi recusada por formato, com o motivo. Câmera que só entrega MJPEG é espelhável e não é projetável, e
> é nessa tela que a assimetria aparece para o operador.

> [!warning] Reescopado em 13/08
> A aba de fontes deixou de existir. A parede passou a exibir a tela da aplicação, então não há câmera a
> publicar como fonte, e página web como fonte nunca foi possível: **o equipamento não renderiza HTML**, a
> interface web dele é o plano de controle. O card fica no mesmo lugar da frente de frontend e troca de
> conteúdo pelo trabalho que a nova regra criou: pedir a captura da tela ao browser, publicar no endereço
> que a tomada devolveu, e tratar os dois estados novos, recusa do diálogo de compartilhamento e
> encerramento pelo controle do próprio browser. Nos dois casos a tela libera o painel, em vez de deixar o
> backend segurando o lease até a expiração. A atômica `UF-027` fica retirada com o motivo no cabeçalho, em
> vez de deletada, porque está referenciada em PR aberta.

Aba de fontes: publicar uma câmera do Attlas como fonte de vídeo no equipamento, reusando o perfil de
stream que o módulo já conhece.

## Sem campo de endereço, e isso é decisão

A tela **não tem campo de URL de stream nem de credencial de câmera**. O requisito é explícito sobre
reusar o perfil sem cadastro paralelo de endereço, e um endereço digitado à mão viveria em paralelo ao
perfil e divergiria dele na primeira troca de equipamento. A credencial, aliás, nem passa pelo frontend:
quem a informa ao equipamento é o backend.

Câmera que perdeu o perfil aplicável aparece atenuada com o motivo, na própria lista, antes de qualquer
tentativa. O servidor continua recusando como defesa em profundidade, mas oferecer a seleção e recusar
depois seria pior experiência para o mesmo resultado.

Página web como fonte existe sempre na tela. Quando o equipamento não aceita, a seção aparece atenuada
nomeando a capacidade que falta, em vez de simular a exibição ou desaparecer.

## O ponto onde uma tela convencional erraria

**Atualização otimista está proibida aqui.** Criar fonte não é idempotente, então nada é reenviado
automaticamente e a lista mostra o que o equipamento reportou, nunca uma projeção do que foi pedido.

Falha de comunicação não significa que nada aconteceu: a tela diz que não sabe o resultado, oferece
releitura como ação primária, e o reenvio como secundária com o alerta de que pode duplicar a fonte. Falha
de rede numa escrita não idempotente é indistinguível de sucesso perdido na volta.

**Publicar não é exibir.** A fonte só aparece na parede quando uma janela a usa, o que é do card seguinte.
A tela diz isso com texto de apoio, porque é a pergunta que o operador faria depois de publicar e não ver
nada mudar no mural.

## DoD

Lista de câmeras vinda do serviço que já existe, zero reenvio automático, e remoção pedindo confirmação com
a contagem de janelas que usam a fonte, incluindo o caso em que essa contagem não é conhecida.

## Dependência

[[SOFTWARE-2437 - Tela do processador de videowall|2437]] e
[[SOFTWARE-2434 - Câmeras como fontes IPC|2434]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
