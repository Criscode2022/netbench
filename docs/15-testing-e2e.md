---
title: Testing · Eve y navegador
---

# Testing · Eve y navegador

## Evals de Eve

`apps/eve-agent/evals/`: siete conversaciones con un modelo de verdad, escritas con `defineEval` de eve. Cada una manda un mensaje y comprueba qué herramientas llamó Eve y qué contiene su respuesta.

| Eval | Situación | Lo que tiene que pasar |
| --- | --- | --- |
| `shutdown-iface` | Dos PCs en la misma VLAN, un puerto apagado | Eve nombra el `shutdown` y el arreglo `no shutdown` |
| `roas-subifs` | Entre VLAN sin subinterfaz en el router | Eve dice router-on-a-stick y crea las subinterfaces |
| `ospf-network` | OSPF sin la sentencia `network` | Eve añade la red correcta en el área 0 |
| `wifi-nmcli` | Un cliente Wi-Fi sin asociar | Eve da la línea de `nmcli` |
| `refuse-bgp` | Piden BGP entre R1 y R2 | Eve no llama a `build_lab`, se niega y ofrece OSPF área 0 |
| `build-office` | Una oficina de doble pila: switch, router, AP, servidor y dos PCs | Un laboratorio válido cuyos pings pasan |
| `build-campus-json` | 3 VLAN, 8 PCs, dos switches, router-on-a-stick y un servidor | `build_lab` con el JSON entero |

```bash
npm run dev:api                 # la API en :3001
cd apps/eve-agent && npx eve eval --max-concurrency 1
```

Necesitan Bionic u Ollama en el mismo Mac y tardan unos minutos cada uno, así que no corren en cada despliegue. Van de uno en uno (`--max-concurrency 1`): el motor atiende una petición a la vez, y en paralelo las últimas esperan tanto que fallan. Los seis primeros escenarios tienen además su versión sin modelo en los tests del [motor](./13-testing-unit.md) y de la [API](./14-testing-integration.md).

### Con modelos locales

Los evals se escribieron con modelos grandes en la nube. Con los 9B locales, entre el 19 y el 20 de noviembre de 2026, pasó 1 de 7 (`refuse-bgp`):

- Las preguntas de conocimiento no abren laboratorio. El 9B intentaba leer uno, recibía «sesión caducada» y pedía recargar en vez de contestar. Las instrucciones de Eve ahora le piden responder con la causa y los comandos cuando no hay laboratorio; `shutdown-iface` ya da la respuesta buena, pero falla la comprobación de que llama a `get_lab_state`, que sin laboratorio no tiene sentido.
- Los dos de construcción fallaron por el motor, no por la respuesta: en paralelo, las peticiones en cola superaron los 5 minutos de espera de Node, y Bionic dejó de responder durante la primera ejecución.

Con un laboratorio abierto, que es como se usa desde la web, los dos modelos arreglan el ejercicio de la puerta de enlace y Check pasa. Ver [Eve](./18-eve.md#límites).

## En el navegador

La web no tiene tests automáticos. Cada cambio de interfaz se comprueba en un navegador real, a **390 × 844** (teléfono, modo Basic) y a **1280 × 800** (escritorio), recorriendo el camino que cambió: tocar, cablear, añadir una IP, activar y desactivar Basic.

El 18 de noviembre de 2026, al mover la API, se recorrió la producción con Chrome sin interfaz:

| Paso | Resultado |
| --- | --- |
| Abrir la web sin cuenta | Token de invitado, primer laboratorio cargado, pie en **Connected** |
| `ping -c 3 10.0.0.20` desde PC1 | Tres respuestas y 28 paquetes en el inspector |
| Check en el primer laboratorio | «All checks passed» y propuesta del siguiente |
| Check en *Find the fault: wrong default gateway* | Falla con «ARP timeout for 10.0.1.254 at PC2» |
| Preguntar a Eve por qué | Eve lee la ruta, encuentra la puerta de enlace equivocada de PC2, aplica `ip route replace default via 10.0.1.1 dev eth0` y Check pasa |
| Cambiar de laboratorio | El pie sigue en **Connected** mientras se abre el nuevo |

Cada petición tardaba unos 0,3 segundos a través de Cloudflare; la primera tras un rato sin uso, unos 3.
