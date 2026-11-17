# Referencia {#reference}

## Calidad de lectura {#read-quality}

Se muestra para cada sensor en [Overview](components/overview.md) y [Sensors](components/sensors.md),
junto a su nivel de señal en dBm. Describe la fiabilidad con que se leyó el sensor durante la última
ventana de medición.

| Calidad | Significado |
|---------|---------|
| **Excellent** | Lectura fiable. |
| **Good** | Lectura fiable. |
| **Regular** | Aceptable. Considere revisar la posición si se mantiene en este nivel. |
| **Bad** | Pocas lecturas. El valor puede ser inestable; revise la posición del tag. |
| **Out of service** | No se leyó en la última ventana. Las alarmas ignoran el sensor y se desactiva el relé System. |

## Nivel de señal durante el descubrimiento {#signal-level-during-discovery}

Mientras **Discovery** está en curso, cada tag muestra barras de señal según la señal recibida en el
lector RFID (RSSI):

| Barras | Calificación | RSSI |
|------|-------|------|
| 4 | **Excellent** | por encima de -50 dBm |
| 3 | **Good** | -60 a -50 dBm |
| 2 | **Regular** | -70 a -60 dBm |
| 1 | **Bad** | por debajo de -70 dBm |

Un tag que no se leyó en la última ventana de descubrimiento muestra **Not read**.

## Límites {#limits}

| Elemento | Límite |
|------|-------|
| Sensores configurados | 50 |
| Slots de alarma | 20 (0 a 19) |
| Nombre de etiqueta | 20 caracteres |
| Punto de consigna de alarma | -40 a 120 °C, números enteros |
| Dirección Modbus | 1 a 247 |
| Sesión Wi-Fi | 1 a 1440 minutos (60 por defecto) |

## Solución de problemas {#troubleshooting}

| Síntoma | Verificación |
|---------|-------|
| La página no carga | Su dispositivo está conectado a la red `fdx-hs-<serial>` y abrió `http://192.168.10.1`. El punto de acceso Wi-Fi puede haberse apagado: mantenga presionado el botón Wi-Fi hasta que se encienda el LED azul **WIFI**. |
| Ícono de conexión rojo en la barra superior | Se perdió la conexión. La página reintenta por sí sola. Si no se recupera, verifique la conexión Wi-Fi. |
| Banner rojo del lector RFID en todas las vistas | El lector RFID o sus antenas no funcionan: revise los cables de antena. El equipo reintenta automáticamente. |
| Un sensor muestra **Out of service** | El tag no se leyó. Verifique que esté orientado hacia una antena y que nada metálico lo cubra. |
| Relé System en **Fault** | Lea el motivo debajo del relé en [Overview](components/overview.md#relay-panel). |
| El SCADA lee sensores incorrectos | Los slots se renumeraron con **Reorder slots**. Actualice el maestro con el mapa [Modbus](components/modbus.md) actual. |
| Sin comunicación con el SCADA | La dirección, la velocidad en baudios y la paridad en [System](components/system.md#modbus) coinciden con las del maestro. |

Al contactar al soporte de FDX, incluya las versiones **FW**, **WA** y **MB** que se muestran en la
parte inferior del menú lateral y una breve descripción de lo que observa.

## Glosario {#glossary}

| Término | Significado |
|------|---------|
| **EPC** | Código único de un tag RFID. La aplicación web muestra un nombre corto del sensor decodificado a partir de él. |
| **RSSI** | Intensidad de la señal recibida, en dBm. Cuanto más cerca de 0, más fuerte. |
| **RSSI en el chip** | Potencia recibida por el propio tag, de 0 a 31. |
| **Ronda de inventario** | Una pasada del lector RFID en la que se pide a todos los tags dentro del alcance que respondan. |
| **Ventana de medición** | Período (el **Measure period**) cuyas lecturas se promedian en una temperatura por sensor. |
| **Slot** | Posición numerada. Los slots de etiqueta nombran lugares; los slots de sensor fijan la dirección Modbus de un sensor; los slots de alarma contienen alarmas. |
| **NO / NC** | Contacto de relé normal abierto (NA) / normal cerrado (NC). |
| **Modo Manual / Auto** | Modo de funcionamiento del equipo: solo sensores registrados, o grupos de sensores automáticos por antena. |
