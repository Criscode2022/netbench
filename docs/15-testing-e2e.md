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
cd apps/eve-agent && npx eve eval
```

Necesitan el AI Gateway (`npm run link:eve`) y gastan créditos, así que no corren en cada despliegue. Los seis primeros escenarios tienen además su versión sin modelo en los tests del [motor](./13-testing-unit.md) y de la [API](./14-testing-integration.md).

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
