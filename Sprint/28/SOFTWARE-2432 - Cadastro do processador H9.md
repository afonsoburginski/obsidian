---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2432
clickup: https://app.clickup.com/t/86ajycew3
titulo: "[Back] Videowall externo: cadastro do processador H9"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: em execução na PR #1529, junto com o 2477 (to do no ClickUp).
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-13
---

# SOFTWARE-2432 - Cadastro do processador H9

O processador vira dispositivo cadastrado no Attlas, com a credencial guardada do jeito certo.

> [!important] Correção de 10/08: a migration não renomeia tabela
> A versão anterior desta nota dizia que a migration daqui seria a janela única para renomear as tabelas
> `VideoWall*`. Isso caiu: a regra de migration proíbe renomear tabela numa migration única, porque no
> instante do commit o pod ainda na versão anterior recebe erro de relação inexistente e a tela do VMS
> responde 500 durante o rollout. Renome de tabela é card próprio e multi-passo. Levar de carona também
> contaminaria a classe de rollback desta migration, de segura para destrutiva, e prenderia os cards 2433 a
> 2436 atrás de uma mudança cosmética.

> [!info] Revisado em 13/08
> O cadastro em si não mudou com o replanejamento do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]],
> mas mudou para que serve a resolução declarada: era para converter célula de cena em geometria de janela,
> agora é o que dimensiona a camada em tela cheia do espelho. E ganhou uma subtração que vale registrar:
> nenhuma credencial de câmera é enviada ao equipamento em momento nenhum da frente, porque câmera deixou
> de ser fonte dele.

## Escopo (1 PR)

CRUD do processador: host, porta, `pId`/`secretKey`, modelo e firmware. Persistência **global**, sem
coluna de tenant, com comentário no schema declarando que a ausência é o requisito (RF-7) e não
esquecimento; unicidade por host e porta; autoridade de escrita por duty administrativa com
verificação no banco. `secretKey` cifrado com o serviço de cifra do core-common (primeiro uso fora do
`ms-organization`); `pId` em claro no banco mas mascarado na resposta, porque no modo sem cifra ele é
efetivamente o segredo. Rejeitados no desenho: sentinela de organização global e `organizationId`
nulável.

A migration é **puramente aditiva sobre tabela que nasce vazia**, então a classe de rollback é segura. O
renome das tabelas `VideoWall*` não vem aqui, pelo motivo do callout acima.

## DoD

CRUD com escopo global e cifra funcionando, migration aditiva com rollback classificado, testes de
integração cobrindo o mascaramento.

## Dependência

[[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]].

## Referências

- [[Videowall externo (NovaStar H9)]], itens de persistência global e cifra do desenho fechado.
- [[Attlas - Sprint 28]].
