---
title: Eve, el instructor
---

# Eve, el instructor

Eve es un agente de [eve](https://www.npmjs.com/package/eve) 0.47 desplegado en Vercel. En la interfaz es el botón **Agent**: un cajón lateral en escritorio y una pestaña en el móvil. Explica por qué algo falla, lo arregla con el cambio más pequeño o construye un laboratorio desde una frase.

## La regla

Eve **lee el motor**: no se inventa una topología ni da por buena una red rota. Antes de responder llama a sus herramientas (`get_lab_state`, `get_path`, `run_check`), y lo que dice sale de lo que devuelven. Si la API no responde, lo dice con `api_status` en vez de adivinar.

## Qué recibe

Cada mensaje de la web lleva delante un bloque `[NetBench context]` con la topología entera (equipos, direcciones, puertas de enlace, estado de los puertos, hasta 40 equipos), el último Check, las últimas caídas y la última traza, más la `labKey` del navegador. Con ella sus herramientas encuentran la sesión aunque la API se haya reiniciado.

## Herramientas

| Herramienta | Cambia algo | Para |
| --- | :---: | --- |
| `get_lab_state` | | El estado de la sesión |
| `get_device` | | Un equipo y su configuración |
| `get_path` | | La ruta de un paquete y su caída |
| `run_check` | | Las comprobaciones |
| `list_commands` | | Los comandos de un tipo de equipo |
| `highlight_devices` | | Señalar equipos en el lienzo |
| `api_status` | | La salud y la versión de la API, si una `labId` sigue viva, el modelo en uso |
| `apply_device_config` | ✔ | Comandos en un equipo |
| `apply_lab_patch` | ✔ | Equipos y cables |
| `build_lab` | ✔ | Un laboratorio desde una frase o un JSON (40 equipos y 80 cables como mucho) |

## Subagentes y habilidades

| Subagente | Hace |
| --- | --- |
| `explainer` | Solo lee. Un veredicto de una o dos frases, la ruta o la configuración que lo prueba, y el siguiente comando que escribir |
| `fixer` | Lee el contexto, corre `run_check` y `get_path` del par que falla, aplica el cambio más pequeño y vuelve a comprobar |
| `builder` | Construye con los ocho tipos de equipo, elige el perfil de cada switch y sigue un plan de direcciones |

Las 7 habilidades (`agent/skills/`) son notas en Markdown que Eve carga según el tema: cómo hablar, el perfil del alumno, IPv4 e IPv6, VLAN, OSPF área 0, Wi-Fi con PSK y cortafuegos con ACL.

## Cambios con permiso

1. Antes de cada cambio, la herramienta pide a la API un `confirmToken` para ese propósito (`POST /api/eve/tools/confirm`). Nunca acepta uno que diga el modelo.
2. Manda el cambio con el token y una `idempotencyKey` nueva. Si la llamada se corta y se repite, la API devuelve la primera respuesta en vez de aplicar dos veces.
3. La aprobación humana es configurable con `EVE_APPROVAL`: `auto` (por defecto), `dangerous` (pide permiso para reemplazar el laboratorio, borrar equipos o apagar puertos), `once` o `always`. En la web, el interruptor **Auto-approve** del cajón hace lo mismo.
4. Antes de llamar a la API, `guards.ts` descarta entradas que no tienen sentido: una `labId` de ejemplo, comandos vacíos o fuera de alcance, parches vacíos, cables mal escritos. Un error del modelo no cuesta un viaje a la red.

## Los modelos

eve pide el modelo al AI Gateway de Vercel con OIDC; no hay claves de proveedores en el código. La cadena mezcla proveedores para que una caída no los tumbe a todos:

| Orden | Modelo |
| --- | --- |
| Principal | `minimax/minimax-m3.1-flash` |
| Respaldos | `openai/gpt-5-mini`, `google/gemini-2.5-flash`, `zai/glm-4.7-flash`, `alibaba/qwen3.5-flash`, `mistral/mistral-small` |

Hay dos niveles de respaldo. Dentro de una llamada, el Gateway prueba el resto de la cadena. Entre llamadas, un hook de eve avanza de modelo cuando un paso falla y lo recuerda por sesión; el principal se vuelve a probar a los 15 minutos. `EVE_MODEL` y `EVE_FALLBACK_MODELS` cambian la cadena sin tocar código.

Todos los modelos de la cadena están en el **plan gratuito** del AI Gateway. Esto importa: el 18 de noviembre de 2026 Eve no respondía a nada porque los seis modelos de la cadena anterior habían salido del plan gratuito, y el Gateway los rechazaba con `gateway-free-tier-model-restricted`. Antes de cambiar un modelo hay que mirar `availableToFreeTier` en la [lista de modelos del Gateway](https://vercel.com/ai-gateway/models), o comprar créditos.

## Cómo se recupera

- **La API falla**: `nest.ts` reintenta dos veces con espera creciente ante errores de red, tiempo agotado, 429 y 5xx, y respeta `Retry-After`. Cada error lleva un tipo (`route-missing`, `stale-session`, `rate-limit`…) y una instrucción para el modelo. `route-missing` significa que la API desplegada es más antigua que Eve.
- **El modelo falla**: la web reintenta el turno hasta 3 veces (2, 5 y 12 segundos) en la misma sesión de eve, para no perder el historial ni la rotación de modelos.
- **El stream se corta**: la web se reconecta desde el último evento hasta 6 veces, sin duplicar mensajes.

## Evals

Siete conversaciones con un modelo de verdad comprueban que Eve nombra la causa correcta y no construye lo que no existe. Ver [Testing · Eve y navegador](./15-testing-e2e.md).

## Límites

- El cajón entiende negrita, código y bloques de código (`eve-markdown.ts`, que escapa todo antes); una tabla o un título saldrían como texto, así que las instrucciones de Eve le piden no usarlos.
- Eve en producción depende del plan gratuito del AI Gateway, con su límite de peticiones por modelo.
