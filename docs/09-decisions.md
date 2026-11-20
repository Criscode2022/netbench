---
title: Decisiones
---

# Decisiones

## Pocos equipos, y que funcionen

Un simulador para aprender no gana por tener más protocolos, gana por no mentir. NetBench tiene ocho tipos de equipo y ningún protocolo de los que solo se ven en una certificación avanzada. Lo que falta se rechaza con un error, en la terminal, en el constructor y en Eve, en vez de aceptarse a medias. Lo que se aproxima lo dice: cada evento que sale de una aproximación lleva `simulated` y la interfaz lo enseña como tal.

El coste es que alguien que busque BGP se va. A cambio, lo que hay se puede creer.

## El motor decide, la interfaz pinta

La web podría haber calculado si dos equipos se ven: tiene la topología. No lo hace. Todo lo que dice si algo funciona sale del motor: el resultado de un ping, la ruta, el motivo de una caída, las pistas del inspector. Si la web adivinara, en algún momento diría «funciona» donde el motor dice que no, y el alumno aprendería lo contrario de lo que pasa.

Las pistas siguen la misma regla: leen hechos del motor (un puerto apagado, un cable equivocado, una dirección fuera de la subred) y nunca predicen el reenvío.

## Cada botón escribe un comando

Añadir una IP, poner la puerta de enlace o encender un puerto desde el inspector no cambia el estado por detrás: escribe en la terminal de ese equipo los comandos que haría una persona (`ip addr add`, `ip link set up`, o `enable`, `conf t`, `interface`, `no shutdown`). Así la interfaz enseña el comando en vez de esconderlo, y lo guardado es siempre una lista de comandos que se puede leer.

## El motor en un proceso que no se apaga

El motor guarda cada laboratorio en memoria (tablas ARP, MAC, vecinos OSPF, concesiones DHCP) y lo hace avanzar en el tiempo. Una función sin servidor que vive 10 segundos y no recuerda nada entre llamadas lo obligaría a reconstruir la red en cada comando. Por eso la API es un proceso de Node de larga vida, y la web y Eve van aparte.

## Eve no puede cambiar nada sin token

Eve es un modelo de lenguaje, y un modelo puede equivocarse o ser engañado. Sus herramientas de lectura son libres; las que cambian la red necesitan un `confirmToken` que emite la API, de un solo uso y para un propósito. Eve lo pide justo antes de cada cambio y nunca acepta uno que diga el modelo. Por defecto la aprobación es automática, para que la demo sea fluida; con `EVE_APPROVAL=always` o el interruptor del cajón, cada cambio espera a que la persona lo apruebe.

## Modelos locales, aunque sean más lentos

Eve usó modelos en la nube por el AI Gateway de Vercel hasta noviembre de 2026. Ese camino dependía de un plan gratuito que cambia sin avisar (el 18 de noviembre los seis modelos de la cadena salieron de él y Eve dejó de responder) y de una cuenta de Vercel. Ahora Eve usa dos motores locales del mismo Mac, Bionic y Ollama: no cuesta nada, ningún mensaje sale del Mac y no hay cuenta que mantener.

El precio es la calidad y el tiempo. Un 9B tarda un par de minutos en un arreglo de varios pasos y acierta menos que un modelo grande, y el Mac atiende una conversación a la vez. Para una demo de portafolio se aceptó; si hiciera falta velocidad, `EVE_MODEL` y `EVE_FALLBACK_MODELS` permiten otra cadena sin tocar código. Ver [Eve](./18-eve.md#los-modelos).

## Un proyecto por pieza, del mismo repositorio

La web, la API y Eve son tres proyectos de la plataforma de hosting enlazados al mismo repositorio y la misma rama, como hacen Vercel y Netlify con un monorepo. Así la web es estática en un CDN, que sigue en pie con el Mac apagado, y la API y Eve son procesos que se reinician por separado. La plataforma no lo permitía; se cambió el 20 de noviembre: un segundo enlace del mismo repositorio vale si da su propio subdominio.

## Modelos y ejercicios por pares

Cada concepto tiene un laboratorio que funciona (modelo) y uno o más rotos (ejercicios) que apuntan a él. El modelo enseña cómo es; el ejercicio, cómo se rompe. Cada ejercicio trae pistas progresivas y un parche oficial, y un test comprueba que el modelo pasa, que el ejercicio falla y que el parche lo arregla. Ver [Laboratorios](./19-curriculum.md).

## Sin cuenta para empezar

Pedir registro antes de tocar nada echa a la mitad de la gente. El invitado tiene todo menos guardar en el servidor, y su laboratorio vive en el navegador.

## La API en un Mac propio, sin WebSocket

Cuando Railway dejó de servir la API, había tres caminos: pagar Railway, rehacer el motor para que corriera en el navegador, o publicar la API desde una plataforma de hosting propia, en un Mac, que ya publica otros servidores en `*.cristiancode.dev`. Se eligió la última: no cuesta nada, despliega en cada push y pasa los tests antes de cada despliegue.

Ese camino pasa por Cloudflare y Tailscale Funnel y no deja pasar WebSockets. En vez de añadirlos a la plataforma, la web lee el estado por HTTP cada 1,5 segundos cuando no hay socket. Es más robusto en general (un proxy de empresa también corta WebSockets), el cliente ya mandaba los comandos por HTTP cuando el socket no estaba, y la lectura del estado no cuenta para el límite de llamadas. El precio es una petición por segundo y medio mientras la pestaña está visible, y que la API depende de que el Mac esté encendido.

## La sesión vive en memoria

Guardar cada sesión en la base de datos haría que un reinicio no se notara, pero cada comando escribiría. En vez de eso, la sesión está en memoria y la web guarda el laboratorio en el navegador cada vez que cambia. Si la API se reinicia, la web reabre el laboratorio desde ahí con la misma `labKey`, y Eve sigue encontrándolo.
