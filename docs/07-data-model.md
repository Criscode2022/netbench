---
title: Modelo de datos
---

# Modelo de datos

Hay tres sitios con datos, y solo uno es una base de datos.

| Dónde | Qué | Cuánto dura |
| --- | --- | --- |
| La memoria de la API | Las sesiones: un `Engine` por laboratorio abierto, con sus tablas ARP, MAC, rutas y paquetes | Hasta que la API se reinicia |
| Postgres (Neon) | Usuarios y laboratorios guardados | Siempre |
| El navegador | El laboratorio de invitado, la sesión abierta, preferencias, puntos de control | Lo que dure ese navegador |

## Postgres

`sql/schema.sql`. La API lo aplica al arrancar si tiene `DATABASE_URL` (`CREATE TABLE IF NOT EXISTS`, así que no borra nada).

```sql
users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT,
       guest BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())

labs  (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
       name TEXT NOT NULL, json JSONB NOT NULL, startup JSONB, running JSONB,
       activity JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())
```

`store.ts` tiene un mapa en memoria delante de cada tabla, pero no se fía de él: al iniciar sesión, al listar y al abrir un laboratorio hace `SELECT`, y espera a que cada escritura termine. Así, tras un reinicio, una cuenta y sus laboratorios siguen ahí. Hay un test que vacía la memoria y comprueba que todo se lee de la base de datos.

Neon conserva además una tabla `magic_tokens` del inicio de sesión que se quitó. No se usa; ver [Cuentas e invitados](./06-auth.md#lo-que-se-quitó).

## Un laboratorio

Un laboratorio es un JSON con `schemaVersion: 1`, validado por `validateLab` y descrito en `packages/engine/schema/lab.schema.json`.

| Campo | Qué es |
| --- | --- |
| `id`, `name`, `goal`, `description` | Identidad y texto. Los del temario son `lab-*`, `model-*` y `ex-*`; las copias propias, `nb-*` |
| `kind`, `level`, `topics` | `model` o `exercise`; `beginner` a `expert`; etiquetas como `vlan` u `ospf` |
| `modelId`, `solution` | Solo en ejercicios: el modelo que funciona, y las pistas y el parche que lo arreglan |
| `devices` | `kind`, `name`, `x`, `y`, `switchProfile` en los switches, las líneas `startup` que lo configuran al arrancar y las `post`, que corren cuando todos arrancaron (unirse al Wi-Fi, `dhclient`) |
| `links` | Los dos extremos (`PC1:eth0`) y el tipo de cable |
| `checks` | Lo que tiene que funcionar: `ping`, `ssh`, `wifi-associated`, `dhcp-bound`, `ospf-full` |
| `differsNote` | En qué se diferencia del equipo real |

La configuración no se guarda como estado: se guarda como **comandos**. Un equipo es su lista de líneas de arranque, y el motor las ejecuta al abrir. Así un laboratorio guardado se puede leer, comparar y reproducir, y un parche de Eve es lo mismo que lo que escribiría una persona.

### Un parche

`LabPatch` es el cambio que aplican Eve y la solución de un ejercicio:

```ts
{
  addDevices?: { type, name, switchProfile?, x?, y? }[];
  removeDeviceIds?: string[];
  addLinks?: { a: 'PC1:eth0', b: 'SW1:Gi0/1', cable?: 'ethernet' | 'straight' | 'crossover' | 'fiber' }[];
  removeLinks?: string[];
  configs?: { device: string; commands: string[] }[];
  setSwitchProfiles?: { device: string; switchProfile: 'unmanaged' | 'managed-l2' | 'multilayer' }[];
}
```

Un tipo de equipo desconocido, un puerto que no existe o un puerto ya ocupado se rechazan antes de tocar nada.

### Un paquete

Cada evento del motor lleva `id`, tiempo, origen y destino (equipo e interfaz), MAC, VLAN o SSID, IP, protocolo, puertos, TTL, el **motivo** y, si se perdió, `drop: true`. Los que salen de una aproximación llevan `simulated: true`. El estado guarda los últimos 80.

## En el navegador

| Clave | Qué guarda |
| --- | --- |
| `nb_token` | El JWT |
| `nb_guest_lab` | El laboratorio de invitado (`{ v: 1, at, lab }`) |
| `nb_autosave` | `{ id, sessionId, at }`: la sesión a la que volver si tiene menos de 12 horas |
| `nb_my_labs` | Los laboratorios propios de este navegador |
| `nb_passed` | Los laboratorios cuyo Check pasó |
| `nb_ckpt` | Los puntos de control (12 como mucho) |
| `nb_basic`, `nb_advanced`, `nb_focus` | Los modos |
| `nb_eve_open`, `nb_eve_auto` | El cajón de Eve abierto y la aprobación automática |
| `nb_locale` | El idioma |
| `nb_view`, `nb_dock_h`, `nb_welcome` | Opciones de vista, altura del muelle, la bienvenida vista |
