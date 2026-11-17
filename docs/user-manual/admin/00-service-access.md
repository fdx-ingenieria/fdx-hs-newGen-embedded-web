# Service functions

## About this document

This document describes the service functions of the web application built into the
FDX-HS-CM. They are reserved to installers and FDX service personnel and are not part of
the customer documentation: do not hand this document over with the unit.

Daily operation and the usual configuration are described in the Web Application User Manual
(FDX-HS-UM-004). This document only covers what that manual leaves out.

> **NOTE:** Service functions can change how the unit measures, pause monitoring or restore
> factory settings. Use them only following FDX instructions.

## Admin password

The service functions that change the device ask for the **admin password**, supplied by FDX to
authorized personnel. Type it in the **Password** field of the card you are using. With a wrong
password the device rejects the change, the page shows **Wrong password** and nothing is changed.
The password is never stored by the page: type it again each time you open a view.

## Revealing the service controls

Service controls are hidden in normal use. They are revealed with a gesture on a specific title of
each view:

| Device | Gesture |
|--------|---------|
| Computer (mouse) | Hold **Ctrl + Shift** and **double click** the title |
| Touch screen (tablet, phone) | **Press and hold** the title for about 1 second (the device vibrates when supported) |

Repeat the gesture to hide the controls again. Leaving the view also hides them. Revealing the
controls does not change anything on its own.

| View | Where to apply the gesture | What it reveals |
|------|---------------------------|-----------------|
| System | The **System** card (computer) or its title (touch) | [Serial, inventory timers, service restart, antenna detection, operating mode](system.md) |
| Labels | The description text at the top | [Installation presets](labels.md) |
| Sensors | The **Unconfigured sensors** title | Opens the [Installation](installation.md) tool |
| Alarms | The **Alarms** title | [Installation presets](alarms.md) |
| RFID Config | The **RFID reader** title | [Advanced reader settings](rfid-config.md) |
| Side menu | The version block at the bottom (FW / WA / MB) | Opens the [Logs](logs.md) console |

## Commissioning checklist

On top of the steps of the User Manual, an installer usually:

1. Sets the **Serial** of the unit and checks the antennas with **Detect antennas** ([System](system.md)).
2. Selects **Manual** or **Auto** operating mode ([System](system.md#installation-mode-manual-auto)).
3. Loads the label and alarm presets of the installation, when there is one ([Labels](labels.md), [Alarms](alarms.md)).
4. Checks every sensor position with the [Installation](installation.md) tool.
5. Runs **Reorder slots** in Sensors once everything is installed, and hands the final Modbus map to the SCADA integrator.
