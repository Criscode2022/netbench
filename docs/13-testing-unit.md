---
title: Testing · motor
---

# Testing · motor

`packages/engine/test/engine.test.ts`: **64 tests** en unos 90 ms. Importan `@netbench/engine` directamente, crean un `Engine` con un laboratorio y escriben en sus terminales como lo haría una persona.

| Grupo | Tests | Qué fija |
| --- | --- | --- |
| IPv4, ping y CLI | 5 | Dos PCs en un switch se ven tras `ip addr` e `ip link`; un comando desconocido falla; `^C` corta un ping; un puerto apagado da el motivo exacto; `toLab` conserva IPs y cables para restaurar a un invitado |
| Perfiles de switch | 7 | El no gestionable reenvía sin CLI; el L2 rechaza `ip routing`; el multicapa enruta entre SVI solo con `ip routing`; cambiar de perfil no quita cables; el relay DHCP llega a un servidor remoto y respeta los rangos excluidos; el pool se elige por la SVI del cliente, no por el orden |
| VLAN y rutas estáticas | 3 | Las VLAN de acceso se aíslan; router-on-a-stick reenvía y, sin subinterfaz, cae con ese motivo; una ruta estática a través de un router |
| IPv6 | 1 | SLAAC y después `ping6` |
| OSPF | 2 | Los vecinos llegan a FULL e instalan rutas; sin la sentencia `network` el vecino no aparece |
| DHCP, Wi-Fi, cortafuegos, NAT, TTL, bucles | 7 | Concesión DHCPv4; asociación Wi-Fi y ping al servidor cableado; sin asociar, el motivo lo dice; una ACL tira el paquete; NAT hacia 8.8.8.8; TTL agotado; un bucle L2 se corta con el aviso de RSTP-lite |
| El temario | 11 | 22 modelos y 26 ejercicios con ids únicos; todos validan y todas sus líneas de arranque se aceptan; los modelos pasan tal cual; los ejercicios fallan tal cual, apuntan a un modelo, traen pistas y parche, y pasan con él; aplicar el parche dos veces no rompe nada; `labSummary` no enseña la topología ni la solución; la puerta de enlace y la máscara equivocadas caen con su motivo |
| Escenarios de Eve sin modelo | 14 | Los seis evals vistos desde el motor (puerto apagado, falta subinterfaz, OSPF sin `network`, Wi-Fi sin asociar, oficina de doble pila, BGP rechazado); `validateLab` acepta un laboratorio bien formado y rechaza puertos malos, duplicados y configuración fuera de alcance; y el constructor: la frase de la oficina, una oficina de 50 que se recorta a un tamaño que cabe y hace ping, varios switches con troncal, dos PCs y un switch, OSPF y cortafuegos |
| Esquema de parche | 3 | Tipos de equipo desconocidos fuera; un parche pequeño válido; el tipo de cable se valida |
| Cables y puertos usados | 6 | Los puertos usados salen de `getState`; cablear un PC enciende los dos extremos; un puerto ocupado rechaza otro cable; auto-MDIX une PC con PC y el directo no; el cruzado une switches; la fibra no entra en un PC |
| Ruta y motivo | 1 | `get_path` da el mismo motivo de caída que el inspector |
| Quitar rutas y direcciones | 4 | `ip route del` y `replace` arreglan una puerta de enlace; `ip addr del` quita las rutas que dependían de la dirección; `no ip route` y `no ip address` en un router; `int` y `shutdown` por interfaz en AP y WLC |

## Por qué el temario se prueba entero

Los 48 laboratorios son datos, pero de esos datos depende la experiencia: un modelo que no pasa o un ejercicio cuyo parche no lo arregla es un alumno atascado sin culpa. Por eso cada ejecución:

1. valida cada laboratorio con `validateLab`;
2. ejecuta todas sus líneas de arranque y falla si alguna da `% Unknown command`;
3. comprueba que cada modelo pasa Check y que cada ejercicio falla;
4. aplica la solución de cada ejercicio, comprueba que pasa, y la aplica otra vez.

Un laboratorio nuevo que no cumpla esto no llega a producción, porque la API no se despliega con tests rotos.
