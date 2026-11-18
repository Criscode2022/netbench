---
title: Testing · API
---

# Testing · API

`apps/api/test/`: **37 tests** en unos 2 segundos, con Vitest y Supertest contra la aplicación Nest de verdad, creada con la misma `createApp()` que producción.

| Fichero | Tests | Qué cubre |
| --- | --- | --- |
| `api.test.ts` | 34 | Las rutas HTTP, las herramientas de Eve y el WebSocket |
| `store.test.ts` | 3 | Que usuarios y laboratorios se leen de Postgres y no de la memoria |
| `fake-pool.ts` | — | `MemoryPool`: responde a las consultas de `store.ts` como lo haría Postgres |

## `api.test.ts`

| Grupo | Qué fija |
| --- | --- |
| Salud | `/api/health` devuelve contenido, no solo un 200 |
| Proxy de Eve | `/eve/v1/health` da 200 con un eve detrás o 502 si no hay ninguno |
| Sesiones, ruta y Check | El motivo de `get_path` es el del inspector; `run_check` en cada laboratorio incluido coincide con su tipo (los modelos pasan, los ejercicios fallan); el temario no filtra topologías ni soluciones; la solución solo existe para ejercicios y, aplicada, hace pasar Check; una sesión que no existe es 404 y no 500; un fallo típico da su motivo exacto |
| Guardado de invitado | `save` devuelve un JSON que el navegador puede restaurar |
| `confirmToken` y esquema | Sin token, `patch`, `config` y `build` son 403; con token funcionan; las herramientas de Eve encuentran la sesión más reciente de una `labKey`; `confirm` no cuenta para el límite; el token sale de la API, no del modelo; una `idempotencyKey` repetida devuelve la primera respuesta en vez de aplicar dos veces, también en `build_lab`; el límite responde 429 con `Retry-After`; un tipo de equipo desconocido se rechaza |
| `list_commands` | La lista de un PC tiene `ping` e `ip`; cada perfil de switch tiene la suya; el perfil viaja por el estado, las ediciones y el guardado, y se puede cambiar en un switch ya colocado |
| Herramientas de Eve y los seis escenarios | Los mismos escenarios que los evals, por HTTP: puerto apagado, falta subinterfaz, OSPF sin `network` (y arreglado), Wi-Fi con `nmcli`, la oficina construida hace ping, BGP rechazado; `build_lab` acepta un JSON entero, informa de las líneas rechazadas y rechaza puertos que no existen |
| Postgres tras un reinicio | Con filas en el pool, iniciar sesión y `GET /labs` funcionan después de vaciar la memoria |
| WebSocket | Un socket persistente devuelve la salida de la CLI y los paquetes; una sesión desconocida se cierra con 4404 |

## Un test que fallaba a medias

«eve tools resolve a browser labKey to the newest session» abre dos sesiones seguidas con la misma `labKey`. Cuando caían en el mismo milisegundo, la API se quedaba con la primera y el test fallaba más o menos la mitad de las veces. No era el test: Eve habría leído un laboratorio que el navegador ya había sustituido. Desde el 18 de noviembre de 2026 el empate lo gana la sesión más nueva, y el test pasa siempre.
