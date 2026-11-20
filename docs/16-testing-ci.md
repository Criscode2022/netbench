---
title: Testing · CI
---

# Testing · CI

NetBench no tiene un workflow de GitHub Actions para los tests. Lo que hace de CI es el despliegue de la API.

## Los tests como puerta del despliegue

Cada push a `main` hace que una plataforma de hosting propia clone el repositorio y construya `netbench-api`. Como la API corre con `tsx` y no se compila, su paso de build es:

```bash
npm test -w @netbench/engine && npm test -w @netbench/api
```

| Paso | Qué para |
| --- | --- |
| `npm ci` del motor y la API | Un lockfile desfasado |
| Tests del motor | Una regla de reenvío rota, un laboratorio del temario que no pasa o cuyo parche no lo arregla |
| Tests de la API | Una ruta rota, un token de Eve que deja de exigirse, una idempotencia que aplica dos veces |

Si algo falla, ese commit queda como fallido y la API anterior sigue sirviendo. El resultado está en el panel de la plataforma y en `GET /api/health` (`version` es el commit que sirve).

## Lo que no cubre

- **La web y Eve no pasan por esa puerta.** Son otros dos proyectos de la misma plataforma, y su build no corre los tests. Un commit que solo toca `apps/web` llega a producción aunque el motor esté roto, porque el build de Angular no importa el motor.
- **Los evals** no corren solos (ver [Testing · Eve y navegador](./15-testing-e2e.md)).
- **El chequeo de tipos** (`npm run build -w @netbench/engine` y `-w @netbench/api`) pasa limpio, pero no está en el build de la plataforma.

## Si se añade un workflow

Bastaría un trabajo con Node 24 que haga `npm ci`, `npm test`, los dos `tsc --noEmit` y `npm run build -w @netbench/web`. No necesita secretos: sin `DATABASE_URL` la API usa la memoria, y los tests de Postgres usan `MemoryPool`.
