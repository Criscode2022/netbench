---
title: El motor
---

# El motor

`packages/engine` es un simulador de eventos discretos en TypeScript puro. No hay tiempo real: cada trama es un evento con su instante, y el motor los procesa en orden hasta que la red se calma. Por eso un ping de tres paquetes responde al momento con tiempos verosímiles, y un test que manda cien tramas tarda milisegundos.

## Qué simula

| Capa | Qué hay |
| --- | --- |
| **L1** | Cables Ethernet (auto-MDIX), directo, cruzado y fibra, con las reglas de equipos iguales y distintos de CCNA. Un cable equivocado queda enchufado sin enlace (`Wrong cable`). Un puerto acepta un solo cable. Un puerto solo está arriba si está encendido y tiene par (o asociación de radio) |
| **L2** | Aprendizaje de MAC por VLAN, puertos de acceso y troncales 802.1Q, VLAN nativa, lista de VLAN permitidas, RSTP-lite que bloquea un puerto si el grafo de una VLAN tiene un ciclo, y un aviso de bucle en switches no gestionables |
| **L3** | ARP y NDP, rutas conectadas, estáticas y OSPFv2 área 0, ICMP e ICMPv6, TTL y hop limit, router-on-a-stick con subinterfaces, SVI y puertos enrutados en el switch multicapa |
| **Servicios** | DHCPv4 con pools, exclusiones y relay (`ip helper-address`), SLAAC con RA y RDNSS, DNS A y AAAA, SSH como TCP/22 más un login simulado |
| **Seguridad** | ACL estándar y de IPv6, el cortafuegos con zonas, políticas y `nft`, NAT con sobrecarga (PAT) hacia Internet |
| **Wi-Fi** | Un BSS simplificado: SSID, PSK, canal (solo cuenta que coincida) y asociación; después, un enlace de radio que lleva IP como un cable. El WLC es un CAPWAP ligero con salida local del tráfico |

## Lo que se aproxima

Las aproximaciones llevan `simulated: true` en cada evento y la interfaz las marca:

- **SSH**: alcanza el puerto 22 por la ruta y abre una shell remota; no hay criptografía.
- **Radio**: no hay potencia, interferencias ni itinerancia. El canal solo decide si dos AP con el mismo SSID son el mismo BSS.
- **OSPF**: un solo área y redes punto a punto simplificadas. Los hellos están en el registro de paquetes, marcados como simulados.
- **STP**: RSTP-lite determinista, sin prioridades ni roles.

## El motivo de cada caída

Ningún paquete desaparece en silencio. Cuando el motor no puede seguir, el último evento lleva `drop: true` y una frase que dice dónde y por qué:

| Ejemplo | Capa |
| --- | --- |
| `Interface Gi0/2 is administratively down` | L1, puerto apagado |
| `No cable on eth0` | L1 |
| `Wrong cable` (estado del puerto) | L1, directo donde iba cruzado o al revés |
| `VLAN mismatch on SW1 Gi0/2` | L2 |
| `No subinterface for VLAN 20 on R1 Gi0/0` | L2/L3, router-on-a-stick incompleto |
| `RSTP-lite blocking SW2 Gi0/3` | L2, puerto bloqueado por un ciclo |
| `ARP timeout for 10.0.1.254 at PC2` | L3, puerta de enlace que no existe |
| `No route to 10.9.9.10 on R2` | L3 |
| `TTL expired at R1` | L3 |
| `ACL drop: deny tcp 10.2.2.10 → 10.9.9.10 …` | Seguridad |
| `not associated` | Wi-Fi |

`getPath` sintetiza un evento de caída si la ruta se corta sin uno, para que nunca haya una respuesta vacía. La web (Troubleshoot) traduce esas frases a capa, explicación y comandos para verificar, y Eve las lee con `get_path`. Un test comprueba que el motivo es el mismo en el inspector y en `get_path`.

## Los equipos se configuran con comandos

Un equipo no tiene un estado que se guarde: tiene una lista de líneas de arranque (`startup`) y otra que corre cuando todos arrancaron (`post`: unirse al Wi-Fi, `dhclient`). Abrir un laboratorio es ejecutarlas. Un parche de Eve, la solución de un ejercicio y un botón de la interfaz son, al final, comandos en la terminal de un equipo.

Los equipos tipo Cisco empiezan en modo usuario: hacen falta `enable` y `configure terminal`. Los puertos de un router o de un switch gestionable empiezan apagados hasta `no shutdown`, como en un equipo real; al cablear un puerto nuevo, el motor enciende los dos extremos.

## El constructor

`labFromSpec(spec)` convierte una frase en inglés en un laboratorio. Es lo que usa `build_lab` cuando Eve no manda un JSON entero:

- «A dual-stack office with a switch, a router, an AP, a server and two PCs» da la plantilla de oficina.
- «Two VLANs, one router, wifi on VLAN 20, Linux server on VLAN 10, PC must ping the server via the router» cuenta un PC suelto, pone cada papel en su VLAN y añade la comprobación de ping.
- Hasta 12 PCs repartidos en varios switches con troncal; una oficina de 50 se recorta a lo que cabe en el lienzo y sigue haciendo ping.
- BGP, MPLS, VXLAN o 802.1X en la frase son un 400.

## Comprobaciones

| Tipo | Pasa cuando |
| --- | --- |
| `ping` | El eco y la respuesta llegan, en IPv4 o IPv6 |
| `ssh` | La conexión se permite, o se deniega si eso es lo esperado |
| `wifi-associated` | El cliente está asociado al SSID |
| `dhcp-bound` | El cliente tiene concesión |
| `ospf-full` | Dos routers son vecinos en estado FULL |

Cada resultado lleva el motivo, y los paquetes que generó se pueden ver salto a salto.
