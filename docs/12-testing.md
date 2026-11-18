---
title: Testing · visión
---

# Testing · visión

NetBench tiene **101 tests y 7 evals**. Los tests usan Vitest; los del motor no necesitan nada levantado, y los de la API levantan la aplicación Nest en un puerto aleatorio. Todos juntos tardan unos 3 segundos.

| Capa | Ficheros | Pruebas | Qué cubre |
| --- | --- | --- | --- |
| [Motor](./13-testing-unit.md) | 1 | 64 | Reenvío, CLI, perfiles de switch, VLAN, OSPF, DHCP, Wi-Fi, NAT, cables, los 48 laboratorios y el constructor |
| [API](./14-testing-integration.md) | 2 | 37 | Rutas HTTP, sesiones, tokens de Eve, idempotencia, límite de llamadas, Postgres tras un reinicio, el WebSocket |
| [Eve y navegador](./15-testing-e2e.md) | 7 evals | — | Lo que Eve responde y hace con un modelo de verdad; la web, a mano |
| [CI](./16-testing-ci.md) | — | — | Los tests como puerta de cada despliegue de la API |

## Comandos

```bash
npm test                          # motor y API
npm test -w @netbench/engine      # 64, sin nada levantado
npm test -w @netbench/api         # 37, la aplicación Nest en memoria
npm run build -w @netbench/engine # tsc --noEmit
npm run build -w @netbench/api    # tsc --noEmit
cd apps/eve-agent && npx eve eval # los 7 evals; necesitan el AI Gateway y la API en :3001
```

## Convenciones

- **El nombre es una frase del comportamiento**: «exercises fail as shipped and pass once their solution is applied», «get_path drop reason equals packet inspector reason».
- **El motivo exacto, no solo el resultado.** Un test de una caída comprueba la frase que devuelve el motor (`Interface Gi0/1 is administratively down`, `No subinterface for VLAN 20`), porque esa frase es lo que lee el alumno y lo que lee Eve.
- **El temario es un test.** Cada laboratorio incluido se valida, se arranca y se comprueba en cada ejecución. Añadir uno que no pase rompe los tests.
- **Sin mocks del motor.** La API se prueba con el motor real. Lo único que se sustituye es Postgres, por `MemoryPool`, que responde a las mismas consultas.
- **Los escenarios de Eve, dos veces.** Las situaciones de los evals se prueban también sin modelo: en el motor (que el motivo nombra la causa) y en la API (que las herramientas devuelven lo que Eve necesita). Si un eval falla, se sabe si fue el modelo o el sistema.

## Qué no está cubierto

- **La web no tiene tests automáticos.** Se comprueba con el build de producción, que verifica los tipos de las plantillas, y a mano en el navegador, a 390 × 844 y a 1280 × 800.
- **Los evals no corren solos**: necesitan el AI Gateway, cuestan créditos y su resultado depende del modelo.
