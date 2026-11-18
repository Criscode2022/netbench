---
title: Monorepo
---

# Monorepo

Un repositorio con workspaces de npm. Node 24 (eve no arranca con menos) y un `npm install` en la raíz.

```
netbench/
  packages/engine/     @netbench/engine: el simulador (Vitest)
  apps/api/            @netbench/api: NestJS, REST y WebSocket (Vitest + Supertest)
  apps/web/            @netbench/web: Angular 22 + Tailwind 4
  apps/eve-agent/      @netbench/eve-agent: el agente de eve
  docs/                esta documentación
  sql/schema.sql       las tablas de Postgres
  HANDOFF.md           el traspaso para otro agente de código
```

## `packages/engine`

TypeScript puro, sin dependencias de ejecución. `package.json` apunta a `src/index.ts`, así que la API lo importa sin compilar (con `tsx`) y los tests también.

| Fichero | Líneas | Qué tiene |
| --- | --- | --- |
| `engine.ts` | 3.356 | El reenvío por eventos discretos, la CLI, ping, ruta y comprobaciones |
| `labs-models.ts`, `labs-exercises.ts`, `labs-shared.ts`, `labs.ts` | | Los 48 laboratorios y su registro |
| `build.ts` | | `labFromSpec`: de una frase en inglés a una topología |
| `patch.ts`, `validate.ts` | | Validar y aplicar un `LabPatch`; validar un laboratorio entero |
| `types.ts` | | Tipos de equipo, puertos, cables, laboratorio, comprobaciones, paquetes |
| `devices.ts`, `cables.ts`, `ip.ts`, `commands.ts` | | Crear equipos, reglas de cables, utilidades IPv4/IPv6, la ayuda de cada tipo |
| `schema/lab.schema.json` | | El esquema JSON de un laboratorio |

## `apps/api`

| Fichero | Qué tiene |
| --- | --- |
| `main.ts` | Arranque: base de datos, aplicación, socket, `PORT` y `HOST` |
| `create-app.ts` | CORS, el proxy `/eve` opcional y el WebSocket `/ws` |
| `http.ts` | Los controladores: salud, autenticación, laboratorios, sesiones, herramientas de Eve, comandos |
| `sim.service.ts` | Las sesiones en memoria, el límite de llamadas, los `confirmToken` y la repetición idempotente |
| `store.ts`, `db.ts` | Usuarios y laboratorios: un mapa en memoria delante de Postgres |
| `rate-limit.filter.ts` | El 429 con `Retry-After` |

## `apps/web`

Angular con componentes standalone y plantillas en ficheros aparte. 16 ficheros de TypeScript y 10 plantillas.

| Fichero | Qué tiene |
| --- | --- |
| `workspace.ts`, `workspace.html` | El lienzo, los modos, el inspector, Check, Reach, pistas, deshacer, el arranque y la recuperación de sesión |
| `api.ts` | El cliente HTTP, el sondeo del estado o el socket, el guardado de invitado |
| `eve-client.ts` | La sesión de Eve, el stream NDJSON, las preguntas y aprobaciones |
| `terminal.ts`, `packets.ts`, `lab-picker.ts`, `mine-picker.ts`, `cheat-sheet.ts`, `toasts.ts` | Los componentes del muelle y la cabecera |
| `lab-history.ts`, `lab-library.ts` | Deshacer y rehacer; los laboratorios propios |
| `i18n/` | Un diccionario por idioma; el tipo de las claves sale del inglés |
| `vercel.json` | Salida `dist/web/browser` y la reescritura de la SPA |

## `apps/eve-agent`

| Carpeta | Qué tiene |
| --- | --- |
| `agent/agent.ts`, `agent/lib/model.ts` | El agente y su cadena de modelos |
| `agent/tools/` | Las 10 herramientas |
| `agent/subagents/` | `explainer`, `fixer`, `builder` |
| `agent/skills/` | 7 habilidades en Markdown |
| `agent/lib/` | Aprobaciones, guardas de entrada, el cliente de la API, el esquema de laboratorio |
| `evals/` | 7 evals |

## Scripts de la raíz

| Script | Qué hace |
| --- | --- |
| `npm run dev` | API en `:3001`, web en `:4200` y Eve en `:4010` a la vez |
| `npm test` | Tests del motor y de la API |
| `npm run deploy:eve` | Despliega Eve en Vercel |
