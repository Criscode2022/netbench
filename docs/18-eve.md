---
title: Eve, el instructor
---

# Eve, el instructor

Eve es un agente de [eve](https://www.npmjs.com/package/eve) 0.47 que corre en el mismo Mac que la API, con modelos locales. En la interfaz es el botón **Agent**: un cajón lateral en escritorio y una pestaña en el móvil. Explica por qué algo falla, lo arregla con el cambio más pequeño o construye un laboratorio desde una frase.

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

Ningún mensaje sale del Mac: eve llama a dos motores locales por su API compatible con OpenAI (el paquete `@ai-sdk/openai-compatible`), sin claves.

| Orden | Motor | Modelo | Contexto |
| --- | --- | --- | --- |
| Principal | Bionic (la app de LM Studio), `127.0.0.1:1235` | `qwen3.8-9b-heretic-uncensored-mtplx` | 65.536 tokens |
| Respaldo | Ollama, `127.0.0.1:11434` | `netbench-eve` (`qwen3.5:9b-mlx` con 32.768 tokens de contexto) | 32.768 tokens |

- **Por qué Bionic primero.** Su 9B está siempre cargado (el monitor del Mac lo vuelve a cargar si alguien lo descarga) y ocupa unos 5,5 GB. El de Ollama se carga al pedirlo y ocupa unos 11 GB con ese contexto.
- **Por qué `netbench-eve` y no `qwen3.5:9b-mlx` sin más.** La API compatible con OpenAI de Ollama ignora el tamaño de contexto que se le pida y sirve 8.192 tokens, menos que el primer mensaje de Eve (unos 9.300). `apps/eve-agent/ollama/Modelfile` crea una variante con los mismos pesos, sin copiarlos: `ollama create netbench-eve -f apps/eve-agent/ollama/Modelfile`.
- **Cómo cambia de modelo.** Si un paso falla (el motor no responde, el modelo no está cargado), un hook de eve avanza al siguiente y lo recuerda por sesión; el principal se vuelve a probar a los 15 minutos. Una conexión rechazada falla en 5 segundos, así que un Bionic parado pasa a Ollama enseguida.
- **Esperas largas.** Cada motor atiende una petición a la vez. Una llamada espera hasta 15 minutos el primer byte (`EVE_MODEL_TIMEOUT_MS`), en vez de los 5 de Node.
- `EVE_MODEL`, `EVE_FALLBACK_MODELS` (entradas `bionic/<modelo>` u `ollama/<modelo>`), `EVE_BIONIC_URL` y `EVE_OLLAMA_URL` cambian la cadena sin tocar código.

Hasta el 20 de noviembre de 2026 Eve vivía en Vercel y usaba modelos en la nube por el AI Gateway. El 18 de noviembre dejó de responder porque los seis modelos de su cadena habían salido del plan gratuito; dos días después pasó a modelos locales.

## Cómo se recupera

- **La API falla**: `nest.ts` reintenta dos veces con espera creciente ante errores de red, tiempo agotado, 429 y 5xx, y respeta `Retry-After`. Cada error lleva un tipo (`route-missing`, `stale-session`, `rate-limit`…) y una instrucción para el modelo. `route-missing` significa que la API desplegada es más antigua que Eve.
- **El modelo falla**: la web reintenta el turno hasta 3 veces (2, 5 y 12 segundos) en la misma sesión de eve, para no perder el historial ni la rotación de modelos.
- **El stream se corta**: la web se reconecta desde el último evento hasta 6 veces, sin duplicar mensajes.

## Evals

Siete conversaciones con un modelo de verdad comprueban que Eve nombra la causa correcta y no construye lo que no existe. Ver [Testing · Eve y navegador](./15-testing-e2e.md).

## Límites

- El cajón entiende negrita, código y bloques de código (`eve-markdown.ts`, que escapa todo antes); una tabla o un título saldrían como texto, así que las instrucciones de Eve le piden no usarlos.
- **Es lento.** Un arreglo de varios pasos tarda unos dos minutos y medio con un 9B local (medido el 19 de noviembre: nueve pasos, de 12.000 a 21.000 tokens de entrada cada uno), frente a unos segundos con los modelos en la nube de antes. El primer paso es el más lento, porque el motor procesa todo el contexto.
- **Una conversación a la vez.** Si dos personas preguntan a la vez, la segunda espera a que acabe la primera.
- **Acierta menos que un modelo grande.** En la prueba de la puerta de enlace equivocada, los dos modelos encontraron la causa y Check pasó, pero Bionic probó antes comandos de Cisco en un PC con Linux. Los evals sin laboratorio abierto fallan más (ver [Testing · Eve y navegador](./15-testing-e2e.md)).
- **Depende del Mac.** Si está apagado o los dos motores están parados, el cajón enseña el error; el resto de la web sigue funcionando si la API responde.
- Sin `web_search` ni `web_fetch`: Eve solo trabaja con el simulador, y como corre en un Mac propio, un chat público no debe poder pedirle que abra direcciones de internet.
