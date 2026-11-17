# CLAUDE.md

Guidance for Claude Code when working in the FDX HS embedded web application (Vue 3 + Vite + Pinia + Tailwind).

## Manuals: keep them in sync

The manuals live in `docs/user-manual/` (Markdown, English) in two editions: the customer **User**
manual (`00-introduction.md`, `components/`, `99-reference.md`) and the **Service** manual for
installers and FDX (`admin/`). Each view of the webapp is a **component**; the registry that maps
every component to its source files and manual files is in `docs/user-manual/README.md`.

- **Every change that adds or modifies a component must update its manual files in the same
  change.** A component changes when a user can see it: a field, a button, a label, a limit, a
  message, a hidden shortcut or a new view.
- Anything behind admin mode (the Ctrl+Shift+double click / long press gestures, the admin
  password, Installation, Logs, presets) goes **only** in `admin/`. The user edition must not
  mention or hint at it.
- A new view needs its manual file(s), a row in the README registry and an entry in the build
  order and in `EDITIONS` of `build-pdf.py`.
- The Spanish translation lives in `docs/user-manual/es/` with the same layout: mirror every change
  of an English manual file in its `es/` file (rules in the README, "Spanish edition").
- Follow the writing conventions in `docs/user-manual/README.md`. Never write the admin password or
  the Wi-Fi passphrase in the manuals.
