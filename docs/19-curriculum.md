---
title: Laboratorios
---

# Laboratorios

El temario tiene **48 laboratorios** en dos grupos:

- **22 modelos**: redes completas que pasan Check tal cual. Enseñan cómo es una red que funciona.
- **26 ejercicios**: redes rotas o incompletas. Cada uno apunta a su modelo, trae pistas progresivas y un parche oficial que hace pasar Check.

El selector los ordena por nivel y marca los que ya pasaron. «Next lab» lleva al siguiente.

## Modelos

| Nivel | Laboratorio |
| --- | --- |
| Principiante | First IPv4 ping with DHCP · Unmanaged switch: plug and play · Two subnets through a router |
| Intermedio | Two routers, static routes · VLANs + router-on-a-stick · Two switches, one trunk, two VLANs · Managed L2: VLAN trunk and management SVI · DHCPv4 from the router · IPv6 SLAAC + ping6 |
| Avanzado | OSPF area 0, two routers · OSPF across three routers · Out to the Internet with NAT overload · Wi-Fi: associate, DHCP, ping the wired server · Wi-Fi with a controller (WLC + CAPWAP) · Firewall: SSH from the jump host only · Multilayer switch: inter-VLAN routing · Multilayer switch: local DHCP |
| Experto | Office: three departments, two switches · Campus: OSPF core + firewalled server room · Multilayer switch: remote DHCP relay · Dual-stack across two routers · Capstone: dual-stack office |

## Ejercicios

| Nivel | Laboratorio |
| --- | --- |
| Principiante | Plug in the cable · Unmanaged switch: fix the hosts · Give PC2 an address · Turn the port on · Find the fault: wrong subnet mask · Find the fault: wrong default gateway |
| Intermedio | PC in the wrong VLAN · The trunk forgot a VLAN · Managed L2: VLAN missing from trunk · Sub-interface tagged with the wrong VLAN · DHCP hands out the wrong network · No IPv6 addresses on the PCs |
| Avanzado | Multilayer switch: enable routing · Multilayer switch: repair DHCP pool · Two routers, static routes · Static route with the wrong next hop · OSPF across three routers · OSPF neighbour never appears · Out to the Internet with NAT · NAT rule present, nothing translated · Nobody can join the Wi-Fi · The firewall locks out the jump host · Wi-Fi with a controller (WLC) |
| Experto | Office outage: three faults, one ticket · Campus: the server room is unreachable · Multilayer switch: missing DHCP relay |

## Los switches, por pares

Cada perfil de switch tiene un modelo y un ejercicio:

| Modelo | Ejercicio |
| --- | --- |
| `model-unmanaged-switch` | `ex-unmanaged-host-fault` |
| `model-managed-l2-switch` | `ex-managed-l2-trunk` |
| `model-multilayer-intervlan` | `ex-multilayer-ip-routing` |
| `model-multilayer-dhcp` | `ex-multilayer-dhcp-pool` |
| `model-multilayer-dhcp-relay` | `ex-multilayer-dhcp-helper` |

## Cómo es un ejercicio

*Find the fault: wrong default gateway*: PC1 (10.0.0.10) tiene que hacer ping a PC2 (10.0.1.20) a través de R1. Check falla con «ARP timeout for 10.0.1.254 at PC2»: la petición llega, pero PC2 manda la respuesta a una puerta de enlace que no existe. Las tres pistas van de lo general a lo concreto:

1. *Troubleshoot the check: the request reaches PC2, so look at what PC2 does with the reply.*
2. *On PC2 run ip route. Which gateway does the default route use? Which address does R1 have on PC2’s side?*
3. *On PC2: ip route replace default via 10.0.1.1*

El parche oficial es esa misma línea en PC2. Eve, el 18 de noviembre, llegó sola a lo mismo leyendo la ruta del paquete.

## Las reglas del temario

Los tests del motor las comprueban en cada ejecución (ver [Testing · motor](./13-testing-unit.md)):

- ids únicos y estables;
- todo laboratorio valida y todas sus líneas de arranque se aceptan;
- cada modelo pasa Check tal cual y no trae solución;
- cada ejercicio falla tal cual, apunta a un modelo que existe, trae resumen, pistas y parche, y pasa con él;
- aplicar el parche dos veces no rompe nada;
- el temario que ve la web no incluye la topología ni la solución; las pistas se piden aparte.

## Laboratorios propios

Cualquier laboratorio se puede copiar («Save a copy»), editar (nombre, objetivo y comprobaciones), descargar como JSON y compartir con un enlace. Las copias tienen ids `nb-*`, así que nunca pisan uno del temario.
