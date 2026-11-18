---
title: Producto y features
---

# Producto y features

## Para quién

Para quien empieza en redes y sistemas: sabe qué es una IP, ha oído hablar de VLAN y de OSPF, y necesita equivocarse muchas veces en un sitio donde equivocarse no rompe nada. El objetivo no es memorizar comandos, es entender por qué un paquete no llega.

## Un recorrido

1. Se abre la web y arranca el primer laboratorio, *First IPv4 ping with DHCP*, sin cuenta. Una tarjeta dice el objetivo y una lista enseña lo que hay que conseguir: «PC1 pings 10.0.0.20».
2. Se pulsa sobre PC1. El inspector enseña sus puertos, su dirección, su puerta de enlace y unas pistas que salen del estado real del motor.
3. En la terminal de PC1 se escribe `ping -c 3 10.0.0.20`. La respuesta es la de Linux, con los tiempos del simulador, y el panel de paquetes se llena: DHCP, ARP, el eco ICMP y la respuesta, salto a salto.
4. **Check** ejecuta las comprobaciones del laboratorio. Si pasan, propone el siguiente. Si no, dice cuál falló y por qué, con la frase que devolvió el motor.
5. En un ejercicio roto, **Ask Agent why** abre a Eve con el contexto de la red, y Eve lee la ruta del paquete antes de proponer el arreglo más pequeño.

## Equipos y cables

| Equipo | Puertos | Terminal |
| --- | --- | --- |
| Workstation (PC) | `eth0`, `wlan0` | Linux |
| Server | `eth0`, `eth1` | Linux |
| Switch | `Gi0/1` a `Gi0/8` | Ninguna (no gestionable) o tipo Cisco |
| Router | `Gi0/0` a `Gi0/3` | Tipo Cisco |
| Firewall | `eth0` a `eth3` | Linux con `nft` |
| Access Point | `Gi0/1`, `wlan0` | Tipo Cisco |
| WLC | `Gi0/1` | Tipo Cisco |
| Cloud (Internet) | `eth0` | Un extremo que contesta a 8.8.8.8 |

El switch es un único tipo con tres perfiles: **no gestionable** (aprende MAC y reenvía, sin CLI), **gestionable L2** (VLAN de acceso y troncales, VLAN nativa, RSTP-lite, SVI de gestión) y **multicapa** (lo anterior más `ip routing`, puertos enrutados, rutas estáticas, pools DHCP y `ip helper-address`). Se cambia desde la paleta, con una pulsación larga en el móvil o desde los detalles de un switch ya colocado, y los cables se quedan.

Los cables son **Ethernet** (auto-MDIX, siempre enlaza), **directo**, **cruzado** y **fibra**. Directo y cruzado siguen la regla de CCNA de equipos iguales y distintos. El cable equivocado se queda enchufado pero sin enlace, con el estado `Wrong cable`. La fibra necesita SFP, así que un PC no la acepta.

## Modos de la interfaz

| Modo | Cuándo | Qué enseña |
| --- | --- | --- |
| **Simple** | Por defecto | Ethernet entre equipos, solo los puertos usados, IPv4. Lo justo para el primer día |
| **Advanced** | Interruptor de la cabecera | Tipos de cable, la rejilla de puertos en cada tarjeta, IPv6, MAC y la configuración en ejecución |
| **Focus** | Escritorio, `Shift+F` | Solo el lienzo, con una barra flotante. Eve y los detalles se abren como paneles laterales sin salir del modo |
| **Basic** (móvil) | Teléfono, por defecto | Dos pestañas, Canvas y Agent (Eve). Botón **+ Add**, y al tocar un equipo una hoja inferior con sus datos |

## Herramientas para aprender

Todas leen el motor; ninguna predice el reenvío por su cuenta.

- **Check** con el motivo exacto de cada comprobación, «Next lab» al pasar y «Ask Agent why» al fallar. Los paquetes de la comprobación se repiten salto a salto sobre el lienzo.
- **Pistas** en el inspector, con arreglo de un clic: encender el puerto, cambiar el cable equivocado, añadir una IP o DHCP, poner o cambiar la puerta de enlace, unirse al Wi-Fi.
- **Troubleshoot**: toma la última caída de la ruta de un paquete y la traduce a capa, explicación, dónde mirar, comandos para verificar y un arreglo cuando lo hay.
- **Reach**: ping o traza desde un equipo, con la cadena de saltos; **Watch** la repite cada 5 segundos hasta que funciona.
- **Inspector de paquetes**: filtro, solo caídas, captura de un equipo, y «Show on canvas» para ver el camino.
- **Puntos de control**: hasta 12, guardados por laboratorio, con un diff de la configuración y restaurar.
- **Deshacer y rehacer** (40 pasos) los cambios del laboratorio.
- **Editor de laboratorio**: nombre, objetivo y comprobaciones de una copia propia.
- **Informe** en Markdown: equipos, direcciones, cables, comprobaciones y últimas caídas.
- **Paleta de comandos** (`Ctrl+K`) y atajos de teclado (`?`).
- **Terminal** con historial (↑/↓), autocompletado con Tab y comandos rápidos. Cada botón de la interfaz que cambia un equipo escribe los comandos reales en su terminal, para que se vea qué se hizo.

## Guardar y compartir

- **Sin cuenta**: el laboratorio se guarda en el navegador y se recupera al recargar. Si la sesión del servidor sigue viva (menos de 12 horas), se vuelve a ella con sus tablas ARP y su terminal.
- **Con cuenta** (correo y contraseña): «Save a copy» y «My labs» guardan en Postgres.
- **Enlace para compartir**: el laboratorio entero va en la URL (`#lab=…`), sin servidor.
- **JSON**: copiar, descargar y subir, con el esquema de `packages/engine/schema/lab.schema.json`.

## Idiomas

La interfaz está en inglés, español, francés, alemán y portugués. La terminal y los mensajes del motor siguen en inglés, como en un equipo de verdad.

## Lo que no hace

- No hay BGP, MPLS, VXLAN, 802.1X, NSSA ni enlaces virtuales de OSPF. Se rechazan en la terminal, en el constructor y en Eve.
- OSPF es solo área 0. STP es un RSTP-lite determinista, sin prioridades ni roles.
- El Wi-Fi es un BSS simplificado: SSID, canal, PSK y asociación, y después IP normal. No hay radio.
- SSH es TCP al puerto 22 más un login simulado; no hay criptografía.
- No hay cable de consola ni enlaces serie.
