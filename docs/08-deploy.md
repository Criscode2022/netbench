---
title: Puesta en marcha y despliegue
---

# Puesta en marcha y despliegue

## En local

Node 24, y en el mismo Mac Bionic (la app de LM Studio, en `:1235`) u Ollama (`:11434`).

```bash
cp .env.example .env      # JWT_SECRET; DATABASE_URL es opcional
npm install
npm test                  # motor y API
ollama create netbench-eve -f apps/eve-agent/ollama/Modelfile   # una vez, para el respaldo de Ollama
npm run dev               # API :3001, web :4200, Eve :4010
```

- Web: http://localhost:4200. En localhost usa `/api` y el WebSocket por el proxy de Angular (`proxy.conf.json`).
- API: http://localhost:3001/api/health.
- Eve local usa los mismos modelos locales que producción y llama a la API de `:3001`. `npm run dev` dice al arrancar si Bionic y Ollama responden. No hay claves ni inicio de sesión.
- Sin `DATABASE_URL`, cuentas y laboratorios viven en memoria.

## Producción

Las tres piezas son proyectos de una plataforma de hosting propia, en un Mac mini, enlazados al mismo repositorio y la misma rama: un proyecto por aplicación, como en un monorepo de Vercel o Netlify. Cada push a `main` despliega los tres.

| Pieza | Proyecto | Dirección | Cómo llega a internet |
| --- | --- | --- | --- |
| Web | `netbench`, estático | `https://netbench.cristiancode.dev` | Cloudflare Pages (`hp-netbench`) sirve los ficheros; sigue en pie con el Mac apagado |
| Eve | `netbench-eve`, backend | `https://netbench-eve.cristiancode.dev` | Cloudflare → Tailscale Funnel → el Mac |
| API | `netbench-api`, backend | `https://netbench-api.cristiancode.dev` | Cloudflare → Tailscale Funnel → el Mac |
| Base de datos | Neon, proyecto `netbench` | | `sql/schema.sql`, aplicado por la API al arrancar |

Los modelos de Eve también corren en ese Mac: Bionic con Qwen3.8 9B (siempre cargado) y, de respaldo, Ollama con `netbench-eve`. Ver [Eve](./18-eve.md#los-modelos).

### La web

| Ajuste | Valor |
| --- | --- |
| Instalación | `npm ci --no-audit --no-fund --workspace @netbench/web --include-workspace-root` |
| Build | `npm run build -w @netbench/web` |
| Publicación | `apps/web/dist/web/browser` |
| Node | 24 |

No hace falta regla de SPA: Pages devuelve `index.html` cuando una ruta no existe. Fuera de localhost la web llama a la API y a Eve por su dirección completa, así que tampoco hay reescrituras de `/api`.

### Eve

| Ajuste | Valor |
| --- | --- |
| Instalación | `npm ci --no-audit --no-fund --workspace @netbench/eve-agent --include-workspace-root` |
| Build | `npm run build -w @netbench/eve-agent` (`eve build`) |
| Arranque | `npm run start -w @netbench/eve-agent` (`eve start` en el `PORT` y el `HOST` que pone la plataforma) |
| Node | 24 |
| Variables | `NETBENCH_API_URL=http://127.0.0.1:4712/s/netbench-api` |

- `NETBENCH_API_URL` es la API por la escucha local de la plataforma: 12 ms por llamada, frente a unos 300 ms dando la vuelta por Cloudflare.
- El estado de cada conversación (el «mundo» local de eve) se guarda en `apps/eve-agent/.eve/` de la copia de la plataforma, así que sobrevive a un reinicio del proceso.

### La API

| Ajuste | Valor |
| --- | --- |
| Instalación | `npm ci --no-audit --no-fund --workspace @netbench/engine --workspace @netbench/api --include-workspace-root` |
| Build | `npm test -w @netbench/engine && npm test -w @netbench/api` |
| Arranque | `npm run start -w @netbench/api` |
| Node | 24 |
| Variables (secretas) | `DATABASE_URL`, `JWT_SECRET` |

- **El build son los tests.** La API no se compila (corre con `tsx`), así que el paso de build es la puerta: si un test falla, ese commit no se despliega y sigue sirviendo el anterior.
- La plataforma pone `PORT` y `HOST=127.0.0.1`, y la API escucha ahí; en un contenedor, sin `HOST`, escucha en `0.0.0.0`.
- `/api/health` devuelve el commit desplegado como `version` (de `HOSTING_COMMIT_SHA`).
- Sin WebSockets por ese camino: la web lee el estado por HTTP. Ver [Arquitectura](./03-architecture.md#por-qué-en-producción-no-hay-socket).

### Comprobar un despliegue

```bash
curl -s https://netbench-api.cristiancode.dev/api/health
# {"ok":true,…,"version":"<commit de 12 caracteres>","eveTools":true,"idempotency":true}
curl -s https://netbench-eve.cristiancode.dev/eve/v1/health
# {"ok":true,"status":"ready",…}
```

Después, en https://netbench.cristiancode.dev/: el pie dice **Connected**, un `ping` desde PC1 en el primer laboratorio responde y Check pasa. En un ejercicio roto, **Ask Agent why** debe terminar con el arreglo aplicado; con un modelo local tarda un par de minutos.

### Con Docker, en cualquier otro sitio

`apps/api/Dockerfile` (contexto: la raíz del repositorio) construye solo la API sobre `node:24-slim`. Variables: `PORT`, `JWT_SECRET`, `DATABASE_URL`. `apps/web/Dockerfile` sirve la web con nginx. Eve no tiene imagen: necesita Bionic u Ollama en la misma máquina.

## Historia del despliegue

- **Septiembre de 2026**: la API vivía en Railway, en un plan de prueba, y Railway no se enteraba de los pushes (la app de GitHub había perdido acceso), así que cada despliegue era una llamada a mano a su API. La web y Eve estaban en Vercel, y Eve usaba modelos en la nube a través del AI Gateway de Vercel.
- **18 de noviembre de 2026**: el servicio de Railway ya no existía («Application not found») y la demo se quedó sin API. La API pasó a la plataforma de hosting propia, con despliegue en cada push, y la web pasó a leer el estado por HTTP.
- **20 de noviembre de 2026**: la web y Eve dejaron Vercel. Eve corre en el mismo Mac con modelos locales (Bionic y Ollama), y la web es un sitio estático en Cloudflare Pages. La plataforma de hosting aprendió a enlazar varios proyectos al mismo repositorio para que cupieran los tres.
