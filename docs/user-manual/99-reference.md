# Reference

## Read quality

Shown for each sensor in the [Overview](components/overview.md) and [Sensors](components/sensors.md),
next to its signal level in dBm. It describes how reliably the sensor was read during the last
measurement window.

| Quality | Meaning |
|---------|---------|
| **Excellent** | Read reliably. |
| **Good** | Read reliably. |
| **Regular** | Acceptable. Consider checking the position if it stays there. |
| **Bad** | Few readings. The value may be unstable; check the position of the tag. |
| **Out of service** | Not read in the last window. The sensor is ignored by the alarms and drops the System relay. |

## Signal level during discovery

While **Discovery** runs, each tag shows signal bars based on the signal received at the reader
(RSSI):

| Bars | Label | RSSI |
|------|-------|------|
| 4 | **Excellent** | above -50 dBm |
| 3 | **Good** | -60 to -50 dBm |
| 2 | **Regular** | -70 to -60 dBm |
| 1 | **Bad** | below -70 dBm |

A tag that was not read in the last discovery window shows **Not read**.

## Limits

| Item | Limit |
|------|-------|
| Configured sensors | 50 |
| Alarm slots | 20 (0 to 19) |
| Label name | 20 characters |
| Alarm set point | -40 to 120 °C, whole numbers |
| Modbus address | 1 to 247 |
| Wi-Fi session | 1 to 1440 minutes (60 by default) |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| The page does not load | Your device is connected to the `fdx-hs-<serial>` network and you opened `http://192.168.10.1`. The access point may have turned off: hold the Wi-Fi button until the blue **WIFI** LED turns on. |
| Red connection icon in the top bar | The connection was lost. The page retries on its own. If it does not recover, check the Wi-Fi connection. |
| Red reader banner on every view | The reader or its antennas do not work: check the antenna cables. The unit retries automatically. |
| A sensor shows **Out of service** | The tag was not read. Check that it faces an antenna and that nothing metallic covers it. |
| System relay in **Fault** | Read the reason under the relay in the [Overview](components/overview.md#relay-panel). |
| The SCADA reads wrong sensors | Slots were renumbered with **Reorder slots**. Update the master with the current [Modbus](components/modbus.md) map. |
| No communication with the SCADA | Address, baud rate and parity in [System](components/system.md#modbus) match the master. |

When contacting FDX support, include the **FW**, **WA** and **MB** versions shown at the bottom of
the side menu, and a short description of what you see.

## Glossary

| Term | Meaning |
|------|---------|
| **EPC** | Unique code of an RFID tag. The web application shows a short sensor name decoded from it. |
| **RSSI** | Received signal strength, in dBm. Closer to 0 is stronger. |
| **On-chip RSSI** | Power received by the tag itself, from 0 to 31. |
| **Inventory round** | One pass of the reader asking every tag in range to answer. |
| **Measurement window** | Period (the **Measure period**) whose readings are averaged into one temperature per sensor. |
| **Slot** | Numbered position. Label slots name places; sensor slots set the Modbus address of a sensor; alarm slots hold alarms. |
| **NO / NC** | Normally open / normally closed relay contact. |
| **Manual / Auto mode** | Operating mode of the unit: registered sensors only, or automatic sensor groups per antenna. |
