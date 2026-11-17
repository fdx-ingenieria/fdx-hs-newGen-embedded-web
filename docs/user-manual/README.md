# FDX HS Web Application: manuals (source)

This folder is the single source of the two manuals of the FDX HS embedded web application. They
are written in Markdown so they are versioned with the code, and `build-pdf.py` turns each one into
a branded PDF.

| Edition | Readers | Files | Document |
|---------|---------|-------|----------|
| **User** | Customers (operators, SCADA integrators) | `00-introduction.md`, `components/`, `99-reference.md` | `FDX-HS-UM-004` Web Application User Manual |
| **Service** | Installers and FDX service personnel only | `admin/` | `FDX-HS-UM-005` Web Application Service Manual |

The customer must not learn that the service functions exist: the user edition never mentions
admin mode, the admin password, the hidden gestures, the Installation tool, the Logs console or the
installation presets, not even to say they are restricted.

## Build order

User edition:

| # | File | Content |
|---|------|---------|
| 1 | [00-introduction.md](00-introduction.md) | About the manual and the product, connecting, theme, phones and tablets, getting started |
| 2 | [components/shell.md](components/shell.md) | Application shell: top bar, menu, reader banner, notifications |
| 3 | [components/overview.md](components/overview.md) | Overview |
| 4 | [components/system.md](components/system.md) | Configuration > System |
| 5 | [components/labels.md](components/labels.md) | Configuration > Labels |
| 6 | [components/sensors.md](components/sensors.md) | Configuration > Sensors (with Quick setup) |
| 7 | [components/alarms.md](components/alarms.md) | Configuration > Alarms |
| 8 | [components/rfid-config.md](components/rfid-config.md) | Configuration > RFID Config |
| 9 | [components/modbus.md](components/modbus.md) | Modbus |
| 10 | [99-reference.md](99-reference.md) | Reference tables, limits, troubleshooting, glossary |

Service edition:

| # | File | Content |
|---|------|---------|
| 1 | [admin/00-service-access.md](admin/00-service-access.md) | Admin password, hidden gestures, commissioning checklist |
| 2 | [admin/system.md](admin/system.md) | System: serial, timers, restart, antennas, operating mode |
| 3 | [admin/labels.md](admin/labels.md) | Labels: installation presets |
| 4 | [admin/alarms.md](admin/alarms.md) | Alarms: installation presets |
| 5 | [admin/rfid-config.md](admin/rfid-config.md) | RFID Config: advanced settings |
| 6 | [admin/installation.md](admin/installation.md) | Installation tool |
| 7 | [admin/logs.md](admin/logs.md) | Logs console |

## Components

Each view of the web application is a **component** of the manuals. The registry below maps every
component to the source files it documents. When a source file in this table changes in a way a
user can see (a field, a button, a limit, a message, a hidden shortcut), the matching manual files
must be updated in the same change: the user file for what everybody sees, the admin file for what
the service functions add.

| Component | Route | User file | Admin file | Source files |
|-----------|-------|-----------|------------|--------------|
| Shell | (every view) | `components/shell.md` | `admin/00-service-access.md` (versions block shortcut) | `src/App.vue`, `src/components/navigation/*`, `src/components/ToastNotifications.vue`, `src/composables/{deviceMode,theme,longPress}.ts` |
| Overview | `/` | `components/overview.md` | | `src/views/Overview.vue`, `src/components/relays/RelayPanel.vue`, `src/components/sensors/{SensorTable,SensorMap,SensorSignal,SignalBars}.vue`, `src/components/alarms/AlarmsTable.vue` |
| System | `/configuration/system` | `components/system.md` | `admin/system.md` | `src/views/configuration/System.vue` |
| Labels | `/configuration/labels` | `components/labels.md` | `admin/labels.md` | `src/views/configuration/Labels.vue`, `src/components/labels/LabelTable.vue`, `src/commons/installPresets.ts` |
| Sensors | `/configuration/sensors` | `components/sensors.md` | `admin/00-service-access.md` (Installation shortcut) | `src/views/configuration/Sensors.vue`, `src/components/sensors/{SensorEditForm,QuickSetup,SensorTable}.vue`, `src/composables/placement.ts` |
| Installation | `/configuration/installation` | | `admin/installation.md` | `src/views/configuration/Installation.vue`, `src/composables/placement.ts` |
| Alarms | `/configuration/alarms` | `components/alarms.md` | `admin/alarms.md` | `src/views/configuration/Alarms.vue`, `src/components/alarms/{AlarmsTable,EditForm}.vue`, `src/commons/installPresets.ts` |
| RFID Config | `/configuration/readerConfig` | `components/rfid-config.md` | `admin/rfid-config.md` | `src/views/configuration/ReaderConfig.vue` |
| Modbus | `/modbus` | `components/modbus.md` | | `src/views/Modbus.vue`, `src/components/modbus/SimpleTable.vue` |
| Logs | `/admin/logs` | | `admin/logs.md` | `src/views/admin/LogsAdmin.vue`, `src/components/logs/*` |

A new view gets a row here, its manual file(s) and a line in the build order of each edition it
appears in (and in `EDITIONS` of `build-pdf.py`).

## Writing conventions

- English, second person ("Press **Save**"), present tense.
- UI text (buttons, field names, messages) in **bold**, exactly as it appears on screen.
- Every user component file starts with a header table (Route, Menu). Admin files start with a
  table that links to the matching user view.
- Nothing in `00-introduction.md`, `components/` or `99-reference.md` may mention or hint at the
  service functions (see above). A link from an admin file to a user file is fine; the opposite is
  not.
- Never write the admin password or the Wi-Fi passphrase in these manuals. Refer to them as
  "supplied by FDX".
- Callouts use a blockquote starting with `**NOTE:**` (useful information) or `**WARNING:**`
  (risk to people or equipment), as in the other FDX-HS manuals.
- Do not use the em dash character.

## Screenshots

Screenshots live in `images/`, named `<component>-<what>.png`, taken in the **light theme** on a
desktop (1440x900) and on a phone (390x844). Take them from a device with English labels, every
configured sensor in service (no **Out of service** or **Not read**) and at least one alarm firing,
so the red state shows. `capture-screenshots.mjs` retakes them (see its header for the setup); it
waits for a clean measurement window before capturing the views with live data.
`phone-gallery.png` and `phone-alarms-pair.png` join phone shots:

```bash
montage images/phone-overview.png images/phone-menu.png images/phone-alarm-edit.png \
  -tile 3x1 -geometry +60+0 -background white images/phone-gallery.png
montage images/phone-alarms.png images/phone-alarm-edit.png \
  -tile 2x1 -geometry +60+0 -background white images/phone-alarms-pair.png
```

## Building the PDFs

`build-pdf.py` concatenates the files of one edition into a self-contained HTML (FDX branding,
embedded screenshots, numbered sections, table of contents) and prints it to PDF with headless
Chromium:

```bash
python3 build-pdf.py --edition user --version v1.0.0-rc1 --out FDX-HS-UM-004-v1.0.0-rc1-EN.pdf
python3 build-pdf.py --edition service --version v1.0.0-rc1 --out FDX-HS-UM-005-v1.0.0-rc1-EN.pdf
python3 build-pdf.py --edition user --lang es --version v1.0.0-rc1 --out FDX-HS-UM-004-v1.0.0-rc1-ES.pdf
```

## Spanish edition

`es/` mirrors this folder (`es/00-introduction.md`, `es/components/`, `es/admin/`,
`es/99-reference.md`) with the Spanish translation; screenshots are shared from `images/`. Rules:

- Formal neutral Spanish ("usted"), the glossary of the existing Spanish FDX-HS manuals
  (equipo / ubicación / posición, punto de consigna, relé, modo de descubrimiento).
- The interface is in English: bold UI strings stay in English exactly as on screen.
- Every heading keeps the explicit id of the English heading (`## Sesión Wi-Fi {#wi-fi-session}`),
  so links and anchors are the same in both languages.
- `> **NOTE:**` / `> **WARNING:**` markers stay in English; the build prints NOTA / ADVERTENCIA.
- A change to an English file is mirrored in its `es/` file in the same change.

Both are product documents of the FDX PLM (`04-Productos/01-FDX-HS/04-MANUALES`). Links that point
to the other edition are printed as plain text.
