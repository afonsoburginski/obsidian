---
tags:
  - attlas
  - sprint-28
  - card
card: SOFTWARE-2504
frente: Infra / deploy dev
sprint: Sprint 28 (10/8/26 - 16/8/26)
status: Em revisão (PR aberta em 14/08)
atualizado: 2026-08-14
pr: https://github.com/atmanadmin/attlas-2026/pull/1607
---

# SOFTWARE-2504 - Queda do ms-cameras por env ausente e smoke test cego

Imprevisto de 14/08. O `ms-cameras` estava fora do ar no ambiente dev desde o deploy de 13/08 às
21:51 UTC, respondendo 503 em todas as chamadas de câmera, e ficou assim por 14 horas até alguém abrir
a tela e reclamar.

## A causa é conhecida e já tinha nome

O commit do cadastro do processador de videowall passou a importar o `SecretCipherModule` no
`ms-cameras` para cifrar a credencial do painel, e o `SecretCipherService` exige
`API_KEY_MASTER_KEY` no `onModuleInit`. A env foi declarada no `.env.example`, como manda a
convenção, mas o `.env.docker` de cada serviço no EC2 é mantido na mão e o deploy não sincroniza:
o container subiu contra um env sem a chave e morreu no boot.

É exatamente a classe de falha do [[SOFTWARE-2283 - URLs internas fixas no docker-compose|SOFTWARE-2283]],
e o mesmo padrão que o `AUDIT_IP_HASH_KEY` já tinha causado no `ms-organization` e que o
`ANALYTICS_STREAM_BROKERS` já tinha causado neste mesmo serviço. A diferença é que aquele fix tirou
uma classe de configuração do `.env.docker` (URL interna virou service name fixo no compose), e chave
de cifra não tem esse caminho: segredo não pode viver em arquivo versionado.

## O que fez isso durar 14 horas

Duas coisas que não são a causa, mas são o motivo da duração, e as duas viraram o escopo do card.

A primeira é que `API_KEY_MASTER_KEY` não estava declarada no `EnvironmentVariables` do serviço, então
a env obrigatória escapava do `validate` do `ConfigModule`. Em vez de abortar na borda com a mensagem
agregada de validação, o serviço subia, mapeava todas as rotas, entrava no consumer group do Kafka e só
então morria dentro de um hook de módulo. O comentário no topo daquele arquivo já cita o incidente do
`ANALYTICS_STREAM_BROKERS` como razão de existir, o que mostra que a regra estava escrita e só não foi
aplicada nesta env.

A segunda é o smoke test do `deploy.yml`, e essa é a que importa de verdade. Ele conferia o resultado
com `docker compose ps $ACTIVE_PROJECTS | grep -qiE '(unhealthy|restarting)'`. Sem `-a`, o Compose v2
não lista container parado: a tabela sai vazia, o grep não casa nada e o job imprime "Smoke test OK"
com o serviço morto. O teste era estruturalmente incapaz de detectar a falha mais grave que existe,
que é o processo não subir, e detectava só os estados intermediários. Agora cada serviço é conferido
pelo próprio status, status ausente conta como falha, e o log das últimas linhas do serviço quebrado
sai no próprio job.

## Restauração no servidor

Feita à mão antes da PR, porque o ambiente estava parado. A chave foi acrescentada ao
`.env.docker` do host reusando o mesmo valor que o `ms-organization` já tinha, que é como o
`setup-env.sh` propaga um valor raiz para todos os serviços, e o container foi recriado.
`Nest application successfully started` e `/health/ready` respondendo ok. A tabela do processador
estava com zero linhas, então não havia ciphertext em risco de ficar órfão de chave.

Detalhe operacional que vale registrar: a porta 22 do EC2 estava inacessível durante o atendimento,
tanto pelo MCP de SSH quanto por SSH direto, enquanto o HTTP respondia normalmente. O acesso saiu pelo
tailnet, em `aws-attlas-dev-v2` (100.101.165.32), com a mesma chave. Vale como primeira tentativa
quando o SSH pelo IP público expira.

## Consequência aceita

Qualquer ambiente que rode o `ms-cameras` passa a precisar da env declarada. Isso não é regressão:
hoje ele já quebra sem ela, só mais tarde no boot e sem dizer o motivo com clareza.

## Relacionados

- [[SOFTWARE-2503 - Qualidade do streaming em todo host do player]], o outro card da mesma PR.
- [[SOFTWARE-2283 - URLs internas fixas no docker-compose]], o fix anterior da mesma classe de falha.
- [[SOFTWARE-2432 - Cadastro do processador H9]], o trabalho que introduziu a env.
