---
title: Comandos
---

# Comandos

Cada equipo tiene su terminal. `help` enseña los comandos de ese tipo, y la chuleta de la web (**Command reference**) los lista con un buscador; un clic los escribe en la terminal. Un comando desconocido, o uno que ese equipo no tendría, falla con un error en vez de ignorarse. La lista sale de `packages/engine/src/commands.ts`, la misma que devuelve `GET /api/commands/:kind` y que usa Eve.

## Linux (workstation, server)

| Comando | Qué hace |
| --- | --- |
| `ip addr [add\|del ADDR/P dev IF]` | Ver, añadir o quitar una dirección IPv4 o IPv6 |
| `ip addr flush dev IF` | Quitar todas las de una interfaz |
| `ip link set IF up\|down` | Encender o apagar |
| `ip route [add\|del\|replace default via GW]` | Ver, añadir, quitar o cambiar una ruta; `add` rechaza una segunda por defecto, como Linux |
| `ping [-c N]`, `ping6` | Eco ICMP e ICMPv6 |
| `traceroute`, `traceroute6` | Traza (simulada) |
| `dhclient [IF]` | Cliente DHCPv4 |
| `nmcli wifi connect SSID password PSK` | Asociarse al Wi-Fi y, normalmente, pedir DHCP |
| `iw dev wlan0 link` | Estado de la asociación |
| `dig`, `nslookup`, `resolvectl` | DNS |
| `systemctl start ssh`, `ssh user@HOST` | Servidor y cliente SSH (camino y puerto 22, sin criptografía) |
| `ss`, `hostname`, `cat /etc/hosts`, `tcpdump -c 10`, `reboot` | Sockets, nombre, hosts, últimas tramas, recargar el arranque |

## Switch

Tipo Cisco: se empieza en modo usuario, `enable` y `configure terminal`.

| Perfil | Comandos |
| --- | --- |
| No gestionable | Ninguno: es un puente L2 sin configuración |
| Gestionable L2 | `vlan N`, `interface Gi0/N \| VlanN`, `switchport mode access\|trunk`, `switchport access vlan N`, `switchport trunk allowed vlan …`, `switchport trunk native vlan N`, `ip address` (SVI de gestión), `ip default-gateway`, `no shutdown`, `show run\|vlan\|mac\|int\|trunk`, `write` |
| Multicapa | Lo anterior más `ip routing`, `no switchport` (puerto enrutado), `ip route`, `ipv6 route`, `ip dhcp pool`, `ip dhcp excluded-address`, `ip helper-address` |

## Router

| Comando | Qué hace |
| --- | --- |
| `interface Gi0/N[.VLAN]`, `encapsulation dot1Q N` | Interfaz enrutada o subinterfaz 802.1Q (router-on-a-stick) |
| `ip address`, `no ip address`, `ipv6 address`, `no shutdown` | Direcciones |
| `ipv6 nd prefix CIDR`, `no ipv6 nd suppress-ra` | Anuncios de router para SLAAC |
| `ip route NET MASK NH`, `no ip route …`, `ipv6 route` | Rutas estáticas (`0.0.0.0 0.0.0.0` es la ruta por defecto) |
| `router ospf 1`, `router-id`, `network A.B.C.D WILD area 0` | OSPFv2, solo área 0 |
| `ip nat inside\|outside`, `ip access-list standard NAME`, `ip nat inside source list NAME interface IF overload` | NAT con sobrecarga |
| `ip dhcp pool NAME`, `network`, `default-router`, `dns-server` | Servidor DHCPv4 |
| `ipv6 access-list NAME` | ACL de IPv6 |
| `show run\|ip route\|ipv6 route\|ip ospf neighbor\|ip ospf database` | Ver |

## Firewall

`zone lan|wan|wifi IF`, `policy SRC DST allow|deny [tcp PORT]`, `nft add rule …` (nftables simplificado, IPv4 e IPv6), `masquerade wan` (SNAT), `show run|rules`, y además `ip addr` y `ping` como un host.

## Wi-Fi

| Equipo | Comandos |
| --- | --- |
| Access Point | `ssid NAME`, `vlan N` (un SSID, una VLAN), `wpa2-psk PSK`, `channel N`, `capwap controller A.B.C.D`, `interface wlan0\|Gi0/1` con `shutdown`/`no shutdown`, `show ssid\|interface` |
| WLC | `wlan create SSID vlan N`, `wpa2 psk PSK`, `show ap summary\|wlan` |

## Internet

`show run` y `ping`. Contesta a 8.8.8.8.

## Lo que no existe

BGP, MPLS, VXLAN, 802.1X, NSSA, enlaces virtuales de OSPF, cable de consola y enlaces serie. Escribirlos da un error, y el constructor y Eve los rechazan.
