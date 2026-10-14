---
tags:
  - doc
  - infra
  - ambientes
  - explicacion
aliases:
  - "Por qué el compose local es distinto del EC2 de dev"
  - "Infraestrutura - Ambientes - Explicação - Por que o compose local é diferente do EC2 de dev"
atualizado: 2026-10-08
banner: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
---

# Infraestrutura - Ambientes - Explicación - Por qué el compose local es distinto del EC2 de dev

## Resumen

El entorno local y el EC2 de desarrollo (`dev.v2`) usan el mismo `docker-compose.yml`, pero no ejecutan lo
mismo. Hay tres causas:

1. **Origen de las imágenes.** El compose no construye nada: cada servicio apunta a una imagen
   `atmanadmin/attlas-<servicio>:dev`. En el EC2, esa imagen la publica el CI. En local, es la última que se
   descargó o se construyó en la máquina.
2. **Configuración fuera de git.** Cada entorno tiene su propio override y sus propias variables, que no
   están en el repositorio.
3. **Proyecto Compose distinto.** El nombre del proyecto cambia, y con él los volúmenes y los datos.

## Cómo resuelve Compose una imagen

```yaml
ms-cameras:
  image: atmanadmin/attlas-ms-cameras:dev
  profiles: ['full']
```

| Paso | Qué hace Compose |
| --- | --- |
| 1 | Lee `docker-compose.yml` y, si existe en el mismo directorio, `docker-compose.override.yml` encima |
| 2 | Reemplaza cada `${VARIABLE}` con el valor de `.env` o del entorno |
| 3 | Busca la imagen por nombre y etiqueta en la máquina |
| 4 | Si no existe, la descarga de Docker Hub; si existe, la usa tal como está |

El paso 4 es la fuente principal de divergencia: `docker compose up` no actualiza una imagen que ya existe.
Para cambiarla hay que ejecutar `docker compose pull` (versión del CI) o construirla de nuevo (versión local).

## Comparación

| Aspecto | Local | EC2 (`dev.v2`) |
| --- | --- | --- |
| Imágenes `:dev` | descargadas o construidas en la máquina, según lo último que se hizo | publicadas por el CI de `develop` y descargadas por `deploy.yml` |
| Imágenes cargadas a mano | posibles | presentes, con `docker save \| ssh docker load` (por ejemplo, `ms-simulation`) |
| Override | `docker-compose.override.yml` en la raíz del repositorio | `~/docker-compose.override.yml` |
| Variables generales | `.env` en la raíz del repositorio | `~/.env` |
| Variables por servicio | `apps/<servicio>/.env.docker` | `~/apps/<servicio>/.env.docker`, no sincronizado por el deploy |
| Proyecto Compose y volúmenes | `attlas-2026`, volúmenes `attlas-2026_*` | `ubuntu`, volúmenes `ubuntu_*` |
| Kafka externo (`9094`) | sin listener | activo, para que los equipos publiquen detecciones |

## Overrides

Un override es un archivo que Compose aplica encima del `docker-compose.yml`. Cuando una clave aparece en los
dos, gana el override. Ninguno de los dos overrides está en git.

| Entorno | Qué cambia |
| --- | --- |
| Local | Kong recibe `host-gateway` para alcanzar los servicios que corren fuera de Docker con `nx serve`; mediamtx publica el puerto `9997` en `127.0.0.1`; `ms-cameras` y `ms-video-analytics` reciben `host-gateway` |
| EC2 | agrega el servicio `analytics-kafka-bridge` (`confluentinc/cp-kafka:7.0.1`) y modifica `mediamtx` |

## Variables que solo existen en el EC2

`~/.env` define estas variables, que el repositorio no tiene:

| Variable | Efecto |
| --- | --- |
| `KAFKA_ADVERTISED_LISTENERS`, `KAFKA_LISTENERS`, `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` | activan el listener externo de Kafka en `dev.v2.attlas.atmansystems.com:9094` |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | credenciales de MinIO |
| `VIDEOWALL_MIRROR_READER_USERNAME`, `VIDEOWALL_MIRROR_READER_PASSWORD`, `VIDEOWALL_RTSP_BASE_URL` | acceso del videowall |
| `JWT_SECRET` | firma de los tokens |
| `ALARMS_DEFAULT_SYSTEM_ID` | sistema por defecto de las alarmas |

El `docker-compose.yml` lee las tres variables de Kafka con un valor por defecto. Sin ellas, como en local,
Kafka arranca sin el listener externo.

## Cómo verificar

Configuración final, con overrides y variables aplicados:

```bash
docker compose config > compose-local.yml
ssh aws-attlas-26 'cd ~ && docker compose config' > compose-ec2.yml
diff compose-local.yml compose-ec2.yml
```

La salida contiene contraseñas y tokens: hay que redactarlos antes de compartirla.

Imágenes en uso: el mismo ID significa la misma imagen.

```bash
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}}' | grep attlas
```

Para ejecutar el código de una rama en local, se construye la imagen antes de levantar el servicio:

```bash
npx nx run-many -t docker:build --projects=ms-cameras
docker compose up -d ms-cameras
```

## Riesgos

| Riesgo | Consecuencia |
| --- | --- |
| Imagen local desactualizada | el servicio arranca sin error, pero con código viejo |
| Ajuste hecho solo en el servidor | el siguiente deploy puede revertirlo, como ya pasó con el listener de Kafka |
| Imagen cargada a mano en el EC2 | el EC2 deja de reflejar `develop` hasta el próximo deploy |
| Volúmenes distintos | los datos de local y del EC2 no se comparten, aunque el compose sea el mismo |
