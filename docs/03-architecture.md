---
title: Arquitectura
---

# Arquitectura

## Las piezas

```
Navegador (Angular)  --REST, cada 1,5 s el estado-->  API Nest  -->  Engine (uno por sesión)
                                                         |
Cajón de Eve  --NDJSON-->  Eve en Vercel  --HTTP-->  /api/eve/tools/*
                                                         |
                                                      Postgres (Neon): usuarios y laboratorios
```

| Pieza | Dónde corre | Por qué ahí |
| --- | --- | --- |
| Web (Angular) | Vercel, estática | Son ficheros; un CDN basta |
| Eve | Vercel (`eve deploy`) | eve usa el AI Gateway de Vercel con OIDC, sin claves en el código |
| API + motor | Un proceso de Node en el Mac del autor, publicado como `netbench-api.cristiancode.dev` | El motor guarda cada laboratorio en memoria y lo hace avanzar en el tiempo; no cabe en una función de 10 segundos |
| Postgres | Neon | Cuentas y laboratorios guardados |

## El motor es la fuente de verdad

`packages/engine` no sabe nada de HTTP ni de Angular. Expone una clase `Engine` con lo que hace falta para enseñar redes:

| Método | Qué hace |
| --- | --- |
| `exec(deviceId, line)` | Ejecuta una línea en la terminal de un equipo y devuelve salida, prompt, error y los eventos de paquete que produjo |
| `getPath(src, dst, proto, family)` | La ruta de un paquete salto a salto. Si no llega, el último evento es la caída con su motivo; nunca hay una caída silenciosa |
| `check()` | Las comprobaciones del laboratorio: ping, SSH, asociación Wi-Fi, concesión DHCP, vecindad OSPF |
| `getState()` | Equipos, interfaces con su par y su estado, enlaces y los últimos 80 paquetes |
| `toLab()` | El laboratorio vivo como JSON, para guardarlo o compartirlo |

La API, la web y Eve usan esos mismos métodos. Por eso el motivo de una caída es idéntico en el inspector de paquetes, en Troubleshoot y en lo que lee Eve con `get_path`: hay un test que lo comprueba.

## Una sesión

1. `POST /api/sessions` con un `labId` del temario o un laboratorio entero. La API crea un `Engine`, ejecuta las líneas de arranque de cada equipo y devuelve `sessionId` y el estado.
2. La web pinta el estado. Cada cambio del usuario (cable, equipo, mover) va por `POST /sessions/:id/edit`; cada comando, por `POST /sessions/:id/cli`.
3. Mientras la sesión está abierta, la web lee el estado cada 1,5 segundos y pasa al lienzo los paquetes que no ha visto. En local, en vez de eso, hay un WebSocket en `/ws` que empuja el estado cada segundo.
4. La sesión vive en memoria. Si la API se reinicia, la siguiente llamada devuelve `404 session not found`, y la web reabre el último laboratorio guardado con la misma `labKey`, sin que el usuario haga nada.

### Por qué en producción no hay socket

La API se publica a través de la plataforma de hosting del autor: Cloudflare recibe la petición y la manda por Tailscale Funnel a un proceso del Mac. Ese camino es HTTP y no deja pasar WebSockets. La web lo sabe por configuración (`WS` es `null` fuera de localhost) y lee el estado en vez de esperar a que se lo empujen. El cliente envía el comando por HTTP igualmente cuando el socket no está, así que el resultado es el mismo con una petición más cada 1,5 segundos. La API deja que el navegador guarde el preflight de CORS 10 minutos, para que cada lectura sea una sola petición. Ver [Decisiones](./09-decisions.md).

## Eve dentro de la arquitectura

Eve no habla con el motor directamente. Sus herramientas son llamadas HTTP a `/api/eve/tools/*`, que resuelven la sesión del navegador por su `labKey`. Las que cambian algo (`apply_device_config`, `apply_lab_patch`, `build_lab`) necesitan un `confirmToken` que la API emite con `POST /api/eve/tools/confirm` y que solo vale una vez, más una `idempotencyKey` para que un reintento no aplique dos veces el mismo cambio. Ver [Eve](./18-eve.md).

## Qué pasa si algo cae

| Cae | Qué sigue funcionando |
| --- | --- |
| La API | La web carga y enseña el último laboratorio guardado en el navegador; los comandos fallan con «Cannot reach the lab API» y el pie lo dice |
| Postgres | Invitados y laboratorios en memoria; iniciar sesión y «My labs» fallan |
| Eve o el AI Gateway | Todo menos el cajón de Eve, que enseña el error y reintenta |
| El Mac del autor | La web y Eve; la API no, porque vive en él |
