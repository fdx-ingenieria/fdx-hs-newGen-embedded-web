# Funciones de servicio {#service-functions}

## Acerca de este documento {#about-this-document}

Este documento describe las funciones de servicio de la aplicación web integrada en el
FDX-HS-CM. Están reservadas a instaladores y personal de servicio de FDX y no forman parte
de la documentación para el cliente: no entregue este documento junto con la unidad.

La operación diaria y la configuración habitual se describen en el Manual de usuario de la
aplicación web (FDX-HS-UM-004). Este documento cubre solamente lo que ese manual no incluye.

> **NOTE:** Las funciones de servicio pueden cambiar la forma en que la unidad mide, pausar el
> monitoreo o restaurar la configuración de fábrica. Utilícelas solo siguiendo instrucciones de FDX.

## Contraseña de administrador {#admin-password}

Las funciones de servicio que modifican el equipo solicitan la **contraseña de administrador**,
provista por FDX al personal autorizado. Ingrésela en el campo **Password** (contraseña) de la
tarjeta que esté utilizando. Con una contraseña incorrecta el equipo rechaza el cambio, la página
muestra **Wrong password** y no se modifica nada. La página nunca almacena la contraseña:
ingrésela nuevamente cada vez que abra una vista.

## Mostrar los controles de servicio {#revealing-the-service-controls}

Los controles de servicio están ocultos en el uso normal. Se muestran con un gesto sobre un título
específico de cada vista:

| Dispositivo | Gesto |
|--------|---------|
| Computadora (mouse) | Mantenga **Ctrl + Shift** y haga **doble clic** sobre el título |
| Pantalla táctil (tablet, teléfono) | **Mantener presionado** el título durante aproximadamente 1 segundo (el dispositivo vibra si lo admite) |

Repita el gesto para volver a ocultar los controles. Salir de la vista también los oculta. Mostrar
los controles no modifica nada por sí mismo.

| Vista | Dónde aplicar el gesto | Qué muestra |
|------|---------------------------|-----------------|
| System | La tarjeta **System** (computadora) o su título (táctil) | [Número de serie, tiempos de inventario, reinicio del servicio, modo de funcionamiento](system.md) |
| Labels | El texto descriptivo de la parte superior | [Presets de instalación](labels.md) |
| Sensors | El título **Unconfigured sensors** | Abre la [herramienta Installation](installation.md) |
| Alarms | El título **Alarms** | [Presets de instalación](alarms.md) |
| RFID Config | El título **RFID reader** | [Configuración avanzada del lector RFID](rfid-config.md) |
| Menú lateral | El bloque de versión en la parte inferior (FW / WA / MB) | Abre la consola de [Logs](logs.md) |

## Lista de verificación de puesta en marcha {#commissioning-checklist}

Además de los pasos del Manual de usuario, un instalador habitualmente:

1. Configura el **Serial** de la unidad y verifica las antenas con **Detect antennas** ([RFID Config](../components/rfid-config.md#antenna-detection)).
2. Selecciona el modo de funcionamiento **Manual** o **Auto** ([System](system.md#installation-mode-manual-auto)).
3. Carga los presets de etiquetas y de alarmas de la instalación, si existen ([Labels](labels.md), [Alarms](alarms.md)).
4. Verifica la posición de cada sensor con la [herramienta Installation](installation.md).
5. Ejecuta **Reorder slots** en Sensors una vez que todo está instalado, y entrega el mapa Modbus final al integrador SCADA.
