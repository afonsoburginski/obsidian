---
tags:
  - attlas
  - ambiente
  - validacao
  - dell
atualizado: 2026-09-15
---

# Ambiente de validação — Dell

## Acesso à API

- Gateway Kong da Dell: `http://afonso-dell-dc14250.tailca0a03.ts.net:8000`
- Variável para o front: `ATTLAS_API=http://afonso-dell-dc14250.tailca0a03.ts.net:8000`
- O gateway cobre as rotas `/api/*`.

## Usar pelo Mac

1. Configurar `ATTLAS_API` no `.env` do checkout a validar.
2. O `apps/web-attlas/proxy.conf.mjs` já lê essa variável; não alterar o código do proxy.
3. Rodar o `web-attlas` localmente aponta as requisições de API para a Dell.

## Carga e limites

- Testes pesados, infraestrutura e microsserviços devem rodar na Dell, que está dedicada a isso.
- O `docker:up` completo cria cerca de 57 containers e já esgotou os 15 GiB de RAM quando a máquina também tinha outras cargas. Monitorar memória antes e durante a subida.
- A URL acima dá acesso ao gateway HTTP. Para iniciar uma branch ou containers diretamente na Dell ainda é necessário acesso de execução remoto (por exemplo SSH), se a versão da PR não estiver já implantada.

## Regra de validação

- Não fazer merge; o merge é decisão do usuário.
- Validar comportamento da PR em execução, não apenas CI ou leitura do diff.

