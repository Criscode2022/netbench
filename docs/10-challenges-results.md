---
title: Retos y resultados
---

# Retos y resultados

## Retos

### Los cables desaparecían en el móvil

El lienzo era un SVG del tamaño de la pantalla. En un teléfono de 390 px, al desplazar o hacer zoom, los cables que salían de ese rectángulo se recortaban y parecía que no estaban. El SVG ahora mide 4000 × 3000 o más y se mueve con la misma transformación que las tarjetas.

### Un tercer PC no tenía enlace

El primer laboratorio solo encendía `Gi0/1` y `Gi0/2` del switch. Un PC nuevo en `Gi0/3` quedaba en un puerto apagado y el ping fallaba sin que el alumno hubiera hecho nada mal. Ahora `addLink` enciende los dos extremos de un cable nuevo, como haría quien lo conecta.

### Angular sin Zone.js y los gestos de Safari

Sin Zone.js, la vista se actualiza cuando cambia un signal desde Angular. Los gestos de pellizco de Safari (`gesturechange`) llegan por un `addEventListener` nativo, fuera de Angular, y el zoom cambiaba el signal sin repintar. Esos manejadores llaman a `detectChanges()` a mano.

### `ip route` se leía como Linux

En un router, `ip route 0.0.0.0 0.0.0.0 …` empezaba igual que el `ip` de Linux y caía en el analizador equivocado. El analizador de Cisco va primero en los equipos tipo Cisco.

### La API de Railway se quedó antigua

La app de GitHub de Railway perdió acceso al repositorio y los pushes dejaron de desplegar. Además, la imagen usaba Node 22 y eve exige 24, así que cada build fallaba. Eve llamaba a rutas que la API desplegada no tenía, y el error era un 404 confuso. Se arregló la imagen, se desplegó a mano, y Eve aprendió a distinguir una API caída de una API antigua (`version` y `eveTools` en `/api/health`, y la herramienta `api_status`).

### Railway desapareció

En noviembre el servicio ya no existía y la demo se quedó sin API. Se movió a la plataforma de hosting del autor. Como ese camino no deja pasar WebSockets, la web pasó a leer el estado por HTTP. Ver [Decisiones](./09-decisions.md#la-api-en-el-mac-del-autor-sin-websocket).

### Un inicio de sesión que regalaba cuentas

Al revisar la API antes de volver a publicarla apareció `POST /auth/magic`: como no había envío de correo, devolvía el token de inicio de sesión en la respuesta, y con el correo de una cuenta bastaba para entrar en ella. Nada lo usaba, así que se quitó. Ver [Cuentas e invitados](./06-auth.md#lo-que-se-quitó).

### Un test que fallaba la mitad de las veces

«eve tools resolve a browser labKey to the newest session» abría dos sesiones seguidas con la misma `labKey` y esperaba la segunda. A veces las dos tenían el mismo milisegundo, y la API se quedaba con la primera: Eve habría leído un laboratorio que el navegador ya había cambiado. El empate ahora lo gana la sesión más nueva. Importaba más desde que los tests son la puerta del despliegue.

## Resultados

- **48 laboratorios** comprobados en cada ejecución de los tests: los 22 modelos pasan tal cual, los 26 ejercicios fallan tal cual y pasan con su parche, y aplicarlo dos veces no rompe nada.
- **El mismo motivo en todas partes**: un test comprueba que la caída de `get_path` es la misma que enseña el inspector de paquetes.
- **101 tests** (64 del motor, 37 de la API) en unos 3 segundos, y **7 evals** de Eve. `tsc --noEmit` pasa limpio en el motor y en la API.
- **Desplegado en cada push**, con los tests como puerta, desde el 18 de noviembre de 2026.
- **Cinco idiomas** en la interfaz.

## Pendiente

- La web no tiene tests automáticos; se prueba con el build de producción y a mano en el navegador, a 390 × 844 y a 1280 × 800.
- No hay CI propia: los tests corren en cada despliegue de la API, pero un commit que solo toca la web no los pasa. Ver [Testing · CI](./16-testing-ci.md).
- La API depende de que el Mac del autor esté encendido.
