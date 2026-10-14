---
tags:
  - attlas
  - cameras
  - hikvision
  - quito
  - runbook
atualizado: 2026-10-02
---

# Quito - Hikvision "Sin conexión"

**Causa:** o canal de saúde da Hikvision (`/ISAPI/Event/notification/alertStream`) está falhando, então a câmera fica "Sin conexión" e o front nem tenta abrir o vídeo ao vivo. Rede e senha estão ok: o thumbnail e o serial/modelo vêm do ISAPI da mesma câmera.

**1. Testar o alertStream a partir do servidor (CAM 1):**

```bash
curl -sS --digest -u USUARIO:SENHA -N --max-time 40 -w '\nHTTP %{http_code}\n' \
  http://10.192.10.165/ISAPI/Event/notification/alertStream
```

- `HTTP 401` ou `403` → o usuário cadastrado não tem permissão de evento. Cadastrar a câmera com o `admin`, ou liberar a permissão remota *Notify Surveillance Center* para o usuário.
- XML chegando a cada ~1s → a câmera está ok, seguir para o passo 2.
- Conecta e fica mudo até o timeout → mandar a saída para a gente.

**2. Log do ms-cameras:**

```bash
kubectl logs deploy/<ms-cameras> --since=1h | grep -i alertstream | tail -20
# ou: docker logs <container-ms-cameras> 2>&1 | grep -i alertstream | tail -20
```

**3. Quando ficar "Estable", abrir o vídeo.** Se não tocar, testar o RTSP do servidor:

```bash
ffprobe -rtsp_transport tcp -i "rtsp://USUARIO:SENHA@10.192.10.165:554/Streaming/Channels/101"
```

- Falhou → a porta 554 do documento de portas não chega na câmera a partir do servidor.
- Senha com `#`, `?`, `/` ou `@` → trocar por uma senha alfanumérica ou atualizar a imagem (correção de 02/10).

**Mandar de volta:** a saída do curl (passo 1) e do grep (passo 2).

**À parte:** o console mostra `GET /api/alarms/realtime` e `/api/alarms/active` falhando. Isso é do ms-alarms ou da rota no Kong e não tem relação com as câmeras.
