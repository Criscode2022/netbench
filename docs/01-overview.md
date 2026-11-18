---
title: Visión general
---

# Visión general · NetBench

**NetBench** es un laboratorio de redes en el navegador para quien empieza como administrador de redes y sistemas. Se dibuja una topología con cables y Wi-Fi, se configuran direcciones IPv4 e IPv6, se escribe en la terminal de cada equipo y se ve cada paquete con el motivo exacto por el que llegó o se perdió. Un instructor, **Eve** (el botón *Agent* de la interfaz), explica, arregla y construye laboratorios leyendo el mismo simulador.

> No es Packet Tracer ni un catálogo de CCIE. Ocho tipos de equipo, tres perfiles de switch, doble pila y caídas con su motivo.

Esa es la regla del proyecto: un catálogo pequeño que funciona de verdad antes que uno grande que finge. Lo que no está (BGP, MPLS, VXLAN, 802.1X) se rechaza con un error claro, y lo que se aproxima (la criptografía de SSH, la radio del Wi-Fi, OSPF punto a punto) lleva la etiqueta **simulado**.

Tiene cuatro partes:

- **El motor** (`packages/engine`): un simulador de eventos discretos en TypeScript puro. Reenvía tramas y paquetes, ejecuta la terminal de cada equipo y comprueba los objetivos de cada laboratorio.
- **La API** (`apps/api`): NestJS. Mantiene un motor por sesión abierta en un proceso de Node que no se apaga, y guarda cuentas y laboratorios en Postgres.
- **La web** (`apps/web`): Angular 22 sin Zone.js y Tailwind 4. El lienzo, la terminal, el inspector de paquetes y el cajón de Eve.
- **Eve** (`apps/eve-agent`): un agente de [eve](https://www.npmjs.com/package/eve) desplegado en Vercel, con herramientas que llaman a la API.

## Qué lo hace distinto

El motor es la única fuente de verdad. La web nunca decide si un paquete llega: pinta lo que el motor dice. Eve tampoco: sus herramientas leen el estado, la ruta de un paquete y el resultado de las comprobaciones del mismo motor, así que no puede inventarse una topología ni dar por buena una red rota.

| Lo decide | Qué |
| --- | --- |
| El motor | Reenvío, ARP y NDP, VLAN, rutas, OSPF, DHCP, NAT, cortafuegos, asociación Wi-Fi, el motivo de cada caída |
| La web | Cómo se dibuja, qué se enseña según el modo, los atajos que escriben comandos reales en la terminal |
| Eve | Explicar y proponer, siempre a partir de lo que devuelven sus herramientas |
| La persona | Qué cambia en su red; los cambios de Eve pasan por un token que emite la API |

## Enlaces

- **Demo:** [netbench-www-criscode2022s-projects.vercel.app](https://netbench-www-criscode2022s-projects.vercel.app/)
- **API:** [netbench-api.cristiancode.dev/api/health](https://netbench-api.cristiancode.dev/api/health)
- **GitHub:** [Criscode2022/netbench](https://github.com/Criscode2022/netbench)

## Stack

| Capa | Tecnología |
| --- | --- |
| Motor | TypeScript 5.9 sin dependencias de ejecución, módulos ES |
| API | NestJS 11 sobre Express, `ws` para el socket local, `jsonwebtoken`, `bcryptjs`, `pg` |
| Web | Angular 22.1, signals y sin Zone.js, Tailwind CSS 4.3, TypeScript 6.0 |
| Instructor | eve 0.47 en Vercel, AI Gateway con una cadena de modelos de varios proveedores |
| Datos | Postgres en Neon: usuarios y laboratorios guardados |
| Pruebas | Vitest 3 y Supertest; evals de eve |
| Despliegue | Web y Eve en Vercel; la API en el Mac del autor a través de su plataforma de hosting y Cloudflare |

## En cifras

| | |
| --- | --- |
| Tipos de equipo | 8, y el switch con 3 perfiles |
| Laboratorios incluidos | 48: 22 modelos que funcionan y 26 ejercicios rotos con solución oficial |
| Idiomas de la interfaz | 5: inglés, español, francés, alemán y portugués |
| Herramientas de Eve | 10, con 3 subagentes y 7 habilidades |
| Tests del motor | 64 |
| Tests de la API | 37 |
| Evals de Eve | 7 |
| Código | unas 7.700 líneas en el motor, 1.200 en la API, 14.600 en la web |

## Por dónde seguir

- [Producto y features](./02-product.md): qué puede hacer quien lo usa.
- [Arquitectura](./03-architecture.md) y [El motor](./17-engine.md): cómo está hecho.
- [Eve](./18-eve.md): el instructor y sus límites.
- [Laboratorios](./19-curriculum.md): el temario.
- [Puesta en marcha y despliegue](./08-deploy.md): cómo arrancarlo.
