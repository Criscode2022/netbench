---
title: Angular
---

# Angular

La web está en **Angular 22.1 y TypeScript 6.0**, sin Zone.js, con **Tailwind CSS 4.3** y sin librería de componentes. Todo el estado va en signals: 68 `signal` y 41 `computed` en los 16 ficheros de TypeScript.

## Qué usa de Angular

| API | Dónde | Para |
| --- | --- | --- |
| Sin Zone.js | Toda la aplicación | Los signals avisan a la vista; nada parchea los eventos del navegador |
| Componentes standalone | Todos | Cada componente importa lo que usa |
| Plantillas en ficheros aparte (`templateUrl`) | Todos | La lógica y el HTML se leen por separado |
| `ChangeDetectionStrategy.OnPush` | 8 componentes | Solo se repintan cuando cambia una entrada o un signal |
| `signal`, `computed` | `Workspace`, `Api`, `EveClient`, el resto | Estado local y derivado; `basicMode()`, `focusMode()`, `showEve()` deciden qué se pinta en cada modo |
| `input`, `output` | `nb-terminal`, `nb-packets`, `nb-lab-picker`, `nb-mine-picker`, `nb-cheat-sheet`, `nb-flag` | Entradas como signals y eventos sin `EventEmitter` |
| `inject()` | Servicios y componentes | Inyección sin constructor |
| `viewChild` | `nb-terminal` | La salida y el campo de texto, sin decoradores |
| `@if`, `@for`, `@switch` | Todas las plantillas | Control de flujo nativo; `workspace.html` tiene 249 bloques |
| `ng-template` con `NgTemplateOutlet` | `workspace.html` | El mismo panel de equipo en el inspector de escritorio y en la hoja del móvil |
| `Pipe` | `i18n.ts` | La traducción en las plantillas |
| `provideRouter` | `app.config.ts` | Una ruta, `''` → `Workspace` |

## Decisiones de la web

- **Un componente grande a propósito.** `Workspace` lleva el lienzo, los modos y las herramientas de aprendizaje porque comparten casi todo el estado. Lo que se reutiliza o tiene vida propia (terminal, paquetes, selector de laboratorios, chuleta, avisos) son componentes aparte.
- **Una sola fuente para cada modo.** `showEve()`, `showInspect()`, `showCanvas()` y `showTerm()` deciden qué se ve en escritorio, en móvil y en Focus. Un panel nuevo se añade ahí, no con un `@if` suelto.
- **El SVG del lienzo es grande** (4000 × 3000 o más) y se mueve con la misma transformación que las tarjetas, para que un cable no se recorte en un teléfono.
- **Gestos nativos.** El pellizco de Safari llega por `addEventListener` y llama a `detectChanges()`, porque sin Zone.js Angular no se entera solo.
- **La terminal no usa `ngModel`.** Escribe en un signal con `[value]` y `(input)`, porque `ngModel` aplica los cambios programáticos más tarde y rompía el autocompletado con Tab y el historial.
- **Sin regex ni funciones flecha en plantillas**: Angular no las acepta, así que van a métodos del componente.
- **Tailwind 4 con tokens.** `styles.css` define los colores (`ink-*`, `brand-*`, `ok`, `warn`, `danger`, `eve`) en `@theme` y las clases de componente (`.btn`, `.chip`, `.field`, `.led`, `.card`).

## Idiomas

`i18n/` tiene un diccionario por idioma: inglés, español, francés, alemán y portugués, 758 claves cada uno. El tipo de las claves sale del inglés (`MessageKey`), así que un idioma al que le falta una clave no compila. El idioma elegido se guarda en `localStorage.nb_locale`.

## Comunicación con la API

`Api` (`api.ts`) es un servicio con signals: `state`, `sessionId`, `online` y `live`. En localhost abre un WebSocket; en producción lee el estado cada 1,5 segundos y solo pasa al lienzo los paquetes nuevos. Si la API dice que una sesión ya no existe, `json()` la reabre desde el último laboratorio guardado y repite la petición.

## Build

`ng build` con `@angular/build`. El paquete inicial pesa unos 960 kB (208 kB comprimido). Vercel publica `dist/web/browser` con una reescritura a `index.html` para la SPA.
