---
title: API
---

# API

NestJS 11 con el prefijo global `/api`. Producción: `https://netbench-api.cristiancode.dev/api`. En local: `http://127.0.0.1:3001/api`, y la web de desarrollo la alcanza en `/api` por el proxy de Angular.

CORS acepta cualquier origen (`origin: true`), expone `Retry-After` y deja guardar el preflight 10 minutos. El cuerpo es JSON.

## Salud

| Ruta | Respuesta |
| --- | --- |
| `GET /health` | `ok`, `version` (el commit desplegado), `uptimeSec`, `eveTools: true`, `idempotency: true` |

`version` y `eveTools` existen para que Eve distinga una API caída de una API antigua: una versión sin `eveTools` no tiene las rutas que Eve necesita.

## Cuentas

| Ruta | Qué hace |
| --- | --- |
| `POST /auth/register` | `{ email, password }` → `{ token, user }` |
| `POST /auth/login` | Igual, con una cuenta existente |
| `POST /auth/guest` | Un token de invitado, sin guardar nada |
| `GET /auth/me` | El usuario del token |

Ver [Cuentas e invitados](./06-auth.md).

## Laboratorios

| Ruta | Qué hace |
| --- | --- |
| `GET /labs/builtin` | El temario: id, nombre, objetivo, tipo, nivel, temas, número de pistas y de comprobaciones. Sin topología ni solución |
| `GET /labs/builtin/:id` | Un laboratorio del temario, sin la solución |
| `GET /labs/builtin/:id/solution` | Pistas y parche oficial de un ejercicio (un modelo responde 404) |
| `GET /labs/builtin/:id/exercises` | Los ejercicios de un modelo |
| `GET /labs`, `POST /labs`, `GET /labs/:id`, `PUT /labs/:id`, `DELETE /labs/:id` | Los laboratorios guardados de la cuenta; un invitado recibe 401 |

## Sesiones

Una sesión es un `Engine` vivo en la memoria de la API. Se crea con `POST /sessions` y `{ labId }` o `{ lab }`, más una `labKey` opcional del navegador.

| Ruta | Qué hace |
| --- | --- |
| `GET /sessions/:id/state` | El estado: equipos, interfaces, enlaces y los últimos 80 paquetes |
| `POST /sessions/:id/cli` | `{ deviceId, line }` → salida, prompt, error, eventos y estado |
| `POST /sessions/:id/check` | Las comprobaciones del laboratorio con su motivo |
| `POST /sessions/:id/ping`, `/path` | Un ping o la ruta de un paquete |
| `POST /sessions/:id/cancel` | Corta un ping en curso (`^C`) |
| `POST /sessions/:id/edit` | `{ patch?, move? }`: equipos, cables y posiciones. Es el usuario, así que no pide token |
| `POST /sessions/:id/solution` | Aplica la solución oficial de un ejercicio |
| `POST /sessions/:id/save` | El laboratorio vivo como JSON, para el navegador o la cuenta |
| `POST /sessions/:id/confirm` | Emite un `confirmToken` para un propósito |
| `POST /sessions/:id/patch`, `/config`, `/build` | Cambios de Eve; exigen `confirmToken` (403 sin él) |
| `POST /sessions/:id/highlight` | Resalta equipos en el lienzo |

Una sesión que no existe es `404 session not found`, nunca un 500. La web lo usa para reabrir el laboratorio tras un reinicio.

## Herramientas de Eve

`POST /eve/tools/<nombre>`, con `labId` que puede ser el id de la sesión, el del laboratorio o la `labKey` del navegador (gana la sesión más reciente).

| Herramienta | Cambia algo | Qué hace |
| --- | :---: | --- |
| `confirm` | | Emite el `confirmToken` de un propósito |
| `get_lab_state` | | El estado de la sesión |
| `get_device` | | Un equipo con su configuración |
| `get_path` | | La ruta de un paquete, con la caída y su motivo |
| `run_check` | | Las comprobaciones |
| `list_commands` | | Los comandos de un tipo de equipo y perfil |
| `highlight_devices` | | Resalta equipos en el lienzo |
| `apply_device_config` | ✔ | Ejecuta comandos en un equipo |
| `apply_lab_patch` | ✔ | Aplica un `LabPatch` |
| `build_lab` | ✔ | Construye un laboratorio desde una frase o un JSON entero |

Las tres que cambian algo aceptan `idempotencyKey` (en el cuerpo o en la cabecera `Idempotency-Key`). Si llega repetida en 10 minutos, la API devuelve la primera respuesta con `replayed: true` en vez de aplicar dos veces; la misma clave con otro propósito es 409.

## Comandos

`GET /commands/:kind` devuelve la lista de comandos de un tipo de equipo, la misma que enseña la chuleta de la web y la que usa Eve. Ver [Comandos](./20-commands.md).

## Límites

- 120 comandos o llamadas de herramienta por minuto y sesión (`NB_RATE_LIMIT`). Al pasarse: 429 con `Retry-After` y `retryAfter` en el cuerpo. Leer el estado y `confirm` no cuentan.
- Un laboratorio de Eve tiene como mucho 40 equipos y 80 cables.
- BGP, MPLS, VXLAN y 802.1X en una frase del constructor son 400.

## WebSocket (solo en local)

`GET /ws?sessionId=…`, fuera de `/api`. El servidor empuja `{ type: 'state' }` cada segundo y responde a `{ type: 'cli', deviceId, line }` y `{ type: 'cancel' }`. Una sesión desconocida se cierra con el código 4404. En producción no se usa: ver [Arquitectura](./03-architecture.md#por-qué-en-producción-no-hay-socket).
