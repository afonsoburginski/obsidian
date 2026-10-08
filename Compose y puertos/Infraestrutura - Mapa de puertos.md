---
tags:
  - doc
  - infra
  - puertos
aliases:
  - "Mapa de puertos"
  - "Infraestrutura - Mapa de portas"
atualizado: 2026-10-08
---

# Infraestrutura - Mapa de puertos

## Resumen

- **Fuente:** `docker-compose.yml` de la rama `develop`. Si este documento y el archivo difieren, vale el archivo.
- **Alcance:** 81 puertos publicados en el host, sin repeticiones.
- **Exposición:** todos se publican en `0.0.0.0`, es decir, en todas las interfaces. En el EC2, lo único que
  impide el acceso desde internet es el security group.

## Convenciones

| Concepto | Significado |
| --- | --- |
| Puerto host | el que se usa desde fuera de Docker: `localhost:<puerto>` en local, `<ip>:<puerto>` en el EC2 |
| Puerto contenedor | el que usan los servicios entre sí, por nombre: `http://ms-organization:3000` |
| Perfil `full` | el servicio solo se levanta con `docker compose --profile full up -d` o nombrándolo en el comando |
| Sin perfil | se levanta con `docker compose up -d` |

## Infraestructura compartida

Todos se levantan sin perfil.

| Servicio | Host | Contenedor | Uso |
| --- | --- | --- | --- |
| `kong` | `8000` | `8000` | API gateway: entrada de todas las rutas `/api` |
| `kong` | `8001` | `8001` | API de administración de Kong |
| `kong` | `8100` | `8100` | estado y métricas de Kong |
| `kafka` | `9092` | `9092` | broker, acceso desde el host |
| `kafka` | `9094` | `9094` | listener externo, activo solo si se configura (ver Diferencias) |
| `zookeeper` | `2181` | `2181` | coordinación de Kafka |
| `kafdrop` | `9000` | `9000` | interfaz web de Kafka |
| `minio` | `9100` | `9000` | almacenamiento de objetos, API S3 |
| `minio` | `9101` | `9001` | consola web de MinIO |
| `mediamtx` | `8554` | `8554` | video RTSP |
| `mediamtx` | `8888` | `8888` | video HLS |
| `mediamtx` | `8889` | `8889` | video WebRTC (WHEP) |
| `mediamtx` | `8189/udp` | `8189/udp` | WebRTC, tráfico de medios |
| `mailhog` | `1025` | `1025` | SMTP de prueba |
| `mailhog` | `8025` | `8025` | interfaz web de los correos de prueba |

## Frontend

| Servicio | Host | Contenedor | Perfil |
| --- | --- | --- | --- |
| `web-attlas` | `4200` | `80` | `full` |

## Microservicios

Todos usan el perfil `full`. Cada fila reúne la API del servicio con su base PostgreSQL y su Redis. Los
puertos de contenedor son `5432` para PostgreSQL y `6379` para Redis.

| Servicio                    | API (host:contenedor) | PostgreSQL (host) | Redis (host) | Otros puertos                                  |
| --------------------------- | --------------------- | ----------------- | ------------ | ---------------------------------------------- |
| `ms-organization`           | `3001:3000`           | `5401`            | `6379`       |                                                |
| `ms-traffic-model`          | `3010:3000`           | `5404`            | `6395`       |                                                |
| `ms-controllers`            | `3100:3000`           | `5410`            | `6388`       |                                                |
| `ms-connector-neo`          | `3101:3000`           |                   | `6381`       | `55079` TCP de los controladores Neo           |
| `ms-connector-une`          | `3102:3000`           |                   | `6382`       |                                                |
| `ms-detector-history`       | `3103:3000`           | `5405`            |              |                                                |
| `ms-ups`                    | `3200:3000`           | interno           |              |                                                |
| `ms-connector-ups`          | `3201:3000`           |                   | `6383`       |                                                |
| `ms-connector-ups-snmp`     | `3202:3000`           |                   | `6384`       |                                                |
| `ms-cameras`                | `3300:3300`           | `5432`            | `6390`       |                                                |
| `ms-video-analytics`        | `3302:3000`           | `5415`            | `6398`       | `17000` TCP de lectura de placas (Neural Labs) |
| `ms-acom`                   | `3305:3000`           | interno           |              |                                                |
| `ms-connector-virtual-loop` | `3390:3390`           |                   | `6397`       | `3091` TCP del lazo virtual                    |
| `ms-alarms`                 | `3400:3000`           | `5414`            | `6396`       |                                                |
| `ms-device-events`          | `3401:3000`           | interno           |              |                                                |
| `ms-audit`                  | `3402:3000`           | `5402`            |              |                                                |
| `ms-communication-channels` | `3403:3000`           | `5403`            | `6387`       |                                                |
| `ms-notifications`          | `3404:3000`           | `5408`            | `6391`       |                                                |
| `ms-selective-priority`     | `3500:3000`           | interno           | `6393`       |                                                |
| `ms-emergencies`            | `3501:3000`           | interno           |              |                                                |
| `ms-pmv`                    | `3600:3000`           | `5407`            | `6385`       |                                                |
| `ms-connector-pmv`          | `3601:3000`           |                   | `6386`       |                                                |
| `ms-inventory`              | `3602:3000`           | `5411`            |              |                                                |
| `ms-execution-plans`        | `3603:3000`           | `5406`            | `6389`       |                                                |
| `ms-simulation`             | `3604:3000`           | `5409`            | `6392`       |                                                |
| `ms-reports`                | `3605:3000`           | `5413`            | `6394`       |                                                |
| `ms-net-clip-builder`       | `3606:3000`           |                   |              |                                                |

- **Celda vacía:** el servicio no tiene ese recurso.
- **`interno`:** la base existe, pero no se publica en el host.
- **`redis-audit-metadata` (`6380`)** no pertenece a un único servicio: es la caché de identidad compartida.
- **`ms-reports-worker`** usa la misma imagen que `ms-reports` y no publica puertos.

## Servicios sin puertos publicados

| Servicio | Perfil | Función |
| --- | --- | --- |
| `kafka-init` | sin perfil | crea los tópicos de Kafka y termina |
| `minio-init` | sin perfil | crea los buckets de MinIO y termina |
| `coturn` | `full` | servidor TURN para WebRTC |
| `ms-reports-worker` | `full` | procesamiento en segundo plano de reportes |
| `db-acom`, `db-device-events`, `db-emergencies`, `db-selective-priority`, `db-ups` | `full` | bases accesibles solo dentro de la red de Docker |

## Diferencias entre local y EC2

| Puerto | Local | EC2 (`dev.v2`) | Origen de la diferencia |
| --- | --- | --- | --- |
| `9094` Kafka externo | publicado, sin listener: no responde | publicado y activo | variables `KAFKA_*` en `~/.env` del EC2 |
| `9997` API de control de mediamtx | publicado solo en `127.0.0.1` | no publicado | override local, fuera de git |
| `17000` lectura de placas | publicado | publicado | igual en ambos; solo escucha con `NEURAL_LPR_TCP_LISTENER_ENABLED=true` |
| `analytics-kafka-bridge` | no existe | existe, sin puertos publicados | override del EC2, fuera de git |
