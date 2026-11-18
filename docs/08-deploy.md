---
title: Puesta en marcha y despliegue
---

# Puesta en marcha y despliegue

## En local

Node 24.

```bash
cp .env.example .env      # JWT_SECRET; DATABASE_URL es opcional
npm install
npm test                  # motor y API
npm run login:vercel      # una vez: la misma cuenta de Vercel que Eve en producción
npm run link:eve          # una vez: escribe el OIDC del AI Gateway en apps/eve-agent/.env.local
npm run dev               # API :3001, web :4200, Eve :4010
```

- Web: http://localhost:4200. En localhost usa `/api` y el WebSocket por el proxy de Angular (`proxy.conf.json`).
- API: http://localhost:3001/api/health.
- Eve local usa el mismo AI Gateway que producción y llama a la API de `:3001`. El token OIDC caduca en unas 24 horas: `npm run link:eve` otra vez.
- Sin `DATABASE_URL`, cuentas y laboratorios viven en memoria.

## Producción

| Pieza | Dónde | Cómo se despliega |
| --- | --- | --- |
| Web | Vercel, proyecto `netbench-www` | Cada push a `main` |
| Eve | Vercel, proyecto `netbench-eve` | Cada push a `main`; a mano con `npm run deploy:eve` |
| API | La plataforma de hosting del Mac del autor, proyecto `netbench-api`, publicado en `https://netbench-api.cristiancode.dev` | Cada push a `main` |
| Base de datos | Neon, proyecto `netbench` | `sql/schema.sql`, aplicado por la API al arrancar |

### La API en la plataforma de hosting

La plataforma clona el repositorio, instala, pasa los tests y deja el proceso corriendo en un puerto local. Cloudflare Pages (`hp-netbench-api.pages.dev`) recibe las peticiones del dominio y las manda por Tailscale Funnel al Mac.

| Ajuste | Valor |
| --- | --- |
| Rama | `main`, despliegue automático |
| Tipo | backend, servido por Cloudflare |
| Node | 24 |
| Instalación | `npm ci --no-audit --no-fund --workspace @netbench/engine --workspace @netbench/api --include-workspace-root` |
| Build | `npm test -w @netbench/engine && npm test -w @netbench/api` |
| Arranque | `npm run start -w @netbench/api` |
| Variables (secretas) | `DATABASE_URL`, `JWT_SECRET` |

- **El build son los tests.** La API no se compila (corre con `tsx`), así que el paso de build es la puerta: si un test falla, ese commit no se despliega y sigue sirviendo el anterior.
- Solo se instalan el motor y la API, no Angular ni eve.
- La plataforma pone `PORT` y `HOST=127.0.0.1`, y la API escucha ahí; en un contenedor, sin `HOST`, escucha en `0.0.0.0`.
- `/api/health` devuelve el commit desplegado como `version` (de `HOSTING_COMMIT_SHA`).
- Sin WebSockets por ese camino: la web lee el estado por HTTP. Ver [Arquitectura](./03-architecture.md#por-qué-en-producción-no-hay-socket).

### Comprobar un despliegue

```bash
curl -s https://netbench-api.cristiancode.dev/api/health
# {"ok":true,…,"version":"<commit de 12 caracteres>","eveTools":true,"idempotency":true}
curl -s https://netbench-eve-criscode2022s-projects.vercel.app/eve/v1/health
# {"ok":true,"status":"ready",…}
```

Después, en https://netbench-www-criscode2022s-projects.vercel.app/: el pie dice **Connected**, un `ping` desde PC1 en el primer laboratorio responde y Check pasa.

### Con Docker, en cualquier otro sitio

`apps/api/Dockerfile` (contexto: la raíz del repositorio) construye la API sobre `node:24-slim`. `start.sh` arranca también eve en `127.0.0.1:4010` detrás de `/eve`, aunque la web usa siempre el Eve de Vercel. Variables: `PORT`, `JWT_SECRET`, `DATABASE_URL`. `apps/web/Dockerfile` sirve la web con nginx.

## Historia del despliegue

- **Septiembre de 2026**: la API vivía en Railway, en un plan de prueba, y Railway no se enteraba de los pushes (la app de GitHub había perdido acceso), así que cada despliegue era una llamada a mano a su API.
- **Noviembre de 2026**: el servicio de Railway ya no existía («Application not found») y la demo se quedó sin API. El 18 de noviembre la API pasó a la plataforma de hosting del Mac del autor, con despliegue en cada push, y la web pasó a leer el estado por HTTP.
