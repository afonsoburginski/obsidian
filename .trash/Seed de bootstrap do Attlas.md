*Seed de bootstrap do Attlas*
Os seeds de todos os serviços estão em `~/seed/` no EC2 (um `.sql` por serviço + `bootstrap.sh`).

*1. Copiar do EC2 para a VPS de produção* (da sua máquina, com a VPN ligada)
```
scp -3 -r atman:~/seed <usuario>@10.200.x.x:~/seed
```
Se o `-3` não funcionar:
```
scp -r atman:~/seed ./seed && scp -r ./seed <usuario>@10.200.x.x:~/
```

*2. Pré-requisitos na VPS*
• Containers `attlas-db-<ms>` no ar
• Bancos já migrados (`prisma migrate deploy`) e vazios
• `attlas-ms-organization` rodando (só para a senha do master)
```
ssh <usuario>@10.200.x.x
cd ~/seed
```

*3. Rodar tudo de uma vez*
```
export BOOTSTRAP_MASTER_PASSWORD='<senha forte>'
./bootstrap.sh
```
Faz backup de cada banco em `~/seed-backups/`, aplica todos os seeds e define a senha do master (`admin@atmansystems.com`). Para no primeiro erro.

*4. Rodar individual*
```
./bootstrap.sh --list                              # serviços disponíveis
./bootstrap.sh organization                        # um serviço
./bootstrap.sh organization cameras controllers    # alguns, na ordem informada
./bootstrap.sh master-password                     # só a senha do master
```
Rodando um a um, comece pelo `organization`.

*5. Conferir*
```
docker exec attlas-db-organization psql -U organization_user -d attlas_organization -c 'select count(*) from "System"'
```
Depois, testar o login com o master.
