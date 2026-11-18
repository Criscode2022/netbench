---
title: Cuentas e invitados
---

# Cuentas e invitados

## Sin cuenta por defecto

Quien abre la web no tiene que registrarse. La web pide `POST /api/auth/guest` y recibe un token de invitado. Con él puede abrir sesiones, escribir comandos y usar a Eve. Lo que no puede es guardar en el servidor: el laboratorio se guarda en el navegador (`localStorage.nb_guest_lab`) y se recupera al recargar.

## Con cuenta

- **Registro y entrada** con correo y contraseña. La contraseña se guarda con bcrypt (coste 10); el correo, en minúsculas y único.
- **Token**: un JWT firmado con `JWT_SECRET`, válido 7 días, con `sub`, `email` y `guest`. La web lo guarda en `localStorage.nb_token` y lo descarta al arrancar si caducó.
- Al entrar, el laboratorio de invitado pasa a la cuenta con «Save a copy». «My labs» lista los guardados.

## Qué comprueba la API

| Ruta | Sin token | Invitado | Cuenta |
| --- | --- | --- | --- |
| Temario, salud, comandos | ✔ | ✔ | ✔ |
| Sesiones y herramientas de Eve | ✔ | ✔ | ✔ |
| `GET /auth/me` | 401 | ✔ | ✔ |
| Laboratorios guardados (`/labs`) | 401 | 401 | ✔, solo los suyos |

Una sesión se identifica por un UUID aleatorio, y la `labKey` del navegador también es aleatoria. No hay más control sobre quién usa una sesión: lo que hay en ella es un laboratorio, no datos de nadie.

## Los cambios de Eve

Eve no tiene cuenta. Sus cambios necesitan un `confirmToken` de un solo uso que la API emite para un propósito (`apply_device_config`, `apply_lab_patch` o `build_lab`). Eve lo pide justo antes de cada cambio y nunca acepta uno que venga del modelo. Ver [Eve](./18-eve.md).

## Lo que se quitó

Había un inicio de sesión con enlace mágico, `POST /auth/magic`, pensado para mandar un enlace por correo. Como nunca se configuró el envío, la ruta devolvía el token en la respuesta: cualquiera que supiera el correo de una cuenta podía entrar en ella. Nada lo usaba (ni la web, ni Eve, ni los tests), así que se quitó el 18 de noviembre de 2026. La tabla `magic_tokens` que ya existía en Neon se dejó como estaba, sin uso.

## Secretos

| Variable | Dónde | Sin ella |
| --- | --- | --- |
| `JWT_SECRET` | Las variables del proyecto en la plataforma de hosting | La API firma con un valor de desarrollo; nunca en producción |
| `DATABASE_URL` | Igual | Usuarios y laboratorios solo en memoria |

Ninguno está en el repositorio. El `.env.example` lleva valores de ejemplo.
