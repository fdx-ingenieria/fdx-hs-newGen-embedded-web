<script setup lang="ts">
  import { ref, computed, nextTick, onUnmounted } from 'vue'
  import { useGlobalStore } from '@/stores/global'
  import { mergeLogsChronologically } from '@/commons/logMerge'
  import {
    LoadingIcon,
    ListIcon,
    PrintIcon,
    CogIcon,
    PlayIcon,
    StopIcon,
    RemoveIcon,
    FilterIcon,
  } from '@/components/icons'

  const globalStore = useGlobalStore()

  // Which log sources this view can offer. Only `available` ones are wired to the
  // backend today; the rest are shown disabled so the view already reflects the
  // intended final shape (hs + api + wifi + journal). Flip `available` to true as
  // each backend source lands (file sink + whitelist entry, or a journald endpoint).
  interface LogSource {
    key: string        // value sent to the backend as `service`
    label: string
    available: boolean
    note?: string      // shown when not available
  }
  const SOURCES: LogSource[] = [
    { key: 'fdx-hs', label: 'HS — main application', available: true },
    { key: 'fdx-api', label: 'RFID API service', available: true },
    { key: 'fdx-wifi-service', label: 'WiFi service', available: true },
    { key: 'journal', label: 'System journal (crashes)', available: false, note: 'Coming soon' },
  ]

  // Matches the backend contract (POST /api/admin/logs `severity`).
  const SEVERITIES = ['all', 'trace', 'debug', 'info', 'warning', 'error'] as const
  type Severity = typeof SEVERITIES[number]

  // Settable levels (POST /api/admin/log-level `level`). No 'all': that is a
  // download filter shorthand, not a real severity.
  const LEVELS = ['trace', 'debug', 'info', 'warning', 'error'] as const

  // Runtime-level targets. Each button applies one level to its list of backend
  // modules. fdx-api is split so the noisy reader driver (rfid_core) can be tuned
  // apart from the application loggers (service + cmd_handler). WiFi has no control
  // channel yet — deferred (see ticket).
  interface LevelTarget {
    key: string        // unique row key + level-choice key
    label: string
    service: string    // backend `service`
    modules: string[]  // backend `module`s to set (one request each)
  }
  const LEVEL_TARGETS: LevelTarget[] = [
    { key: 'fdx-hs', label: 'HS — main application', service: 'fdx-hs', modules: ['all'] },
    { key: 'fdx-api-app', label: 'RFID API service (app)', service: 'fdx-api', modules: ['service', 'cmd_handler'] },
    { key: 'fdx-api-reader', label: 'RFID API reader (driver)', service: 'fdx-api', modules: ['rfid_core'] },
  ]

  const password = ref('')
  const severity = ref<Severity>('all')
  const busy = ref<string | null>(null)  // key of the download in flight ('__all__' for merge)

  // Per-target level selection. Write-only for now: there is no read-back, so these
  // start at a neutral default (get -> ticket).
  const levelChoice = ref<Record<string, string>>(
    LEVEL_TARGETS.reduce((acc, t) => ((acc[t.key] = 'info'), acc), {} as Record<string, string>),
  )
  const levelBusy = ref<string | null>(null)  // key of the level change in flight

  async function applyLevel(target: LevelTarget): Promise<void> {
    if (!canDownload.value || levelBusy.value) return
    levelBusy.value = target.key
    const level = levelChoice.value[target.key]
    try {
      // One request per module; stop on the first failure (the store already notified).
      for (const module of target.modules) {
        const ok = await globalStore.setLogLevel(target.service, level, password.value, module)
        if (!ok) return
      }
      globalStore.notify(`${target.label}: log level set to ${level}`, 'success')
    } finally {
      levelBusy.value = null
    }
  }

  const availableSources = computed(() => SOURCES.filter((s) => s.available))
  const canDownload = computed(() => password.value.length > 0)

  // Turn text into a browser download without leaving the page.
  function saveTextFile(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function downloadOne(source: LogSource): Promise<void> {
    if (!canDownload.value || busy.value) return
    busy.value = source.key
    try {
      const text = await globalStore.fetchLogText(source.key, severity.value, password.value)
      saveTextFile(`${source.key}-${severity.value}.log`, text)
      globalStore.notify(`Downloaded ${source.label} logs`, 'success')
    } catch {
      // The store already notified the specific error (wrong password / bad request).
    } finally {
      busy.value = null
    }
  }

  async function downloadAll(): Promise<void> {
    if (!canDownload.value || busy.value) return
    const sources = availableSources.value
    if (sources.length === 0) return
    busy.value = '__all__'
    try {
      // Fetch every available source in parallel, then interleave the lines by
      // timestamp into a single chronological file (see commons/logMerge.ts).
      const texts = await Promise.all(
        sources.map((s) => globalStore.fetchLogText(s.key, severity.value, password.value)),
      )
      const merged = mergeLogsChronologically(texts)
      saveTextFile(`fdx-all-${severity.value}.log`, merged)
      globalStore.notify('Downloaded merged logs', 'success')
    } catch {
      // A single failure (same password across all) aborts the merge; already notified.
    } finally {
      busy.value = null
    }
  }

  // --- Live tail (merged, realtime) -----------------------------------------
  // Streams POST /api/admin/logs/stream and appends lines as they arrive. The
  // connection stays open only while this view is mounted and the tail is on;
  // stopTail() aborts it, and onUnmounted guarantees teardown when leaving the
  // view, so the server-side connection (and its worker thread) is freed.
  const MAX_TAIL_LINES = 2000  // cap the DOM: keep only the most recent lines
  const tailing = ref(false)
  const tailLines = ref<string[]>([])
  const tailBox = ref<HTMLElement | null>(null)
  let tailController: AbortController | null = null

  function appendTailLines(lines: string[]): void {
    const next = tailLines.value.concat(lines)
    tailLines.value = next.length > MAX_TAIL_LINES ? next.slice(next.length - MAX_TAIL_LINES) : next
    // Stick to the bottom as new lines come in.
    nextTick(() => {
      const el = tailBox.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  async function startTail(): Promise<void> {
    if (!canDownload.value || tailing.value) return
    tailLines.value = []
    const controller = new AbortController()
    tailController = controller
    tailing.value = true
    try {
      await globalStore.streamLogTail(severity.value, password.value, controller.signal, appendTailLines)
      // The stream returned on its own (server closed / app restarted), not via our abort.
      if (!controller.signal.aborted) globalStore.notify('Live tail stopped (connection closed)', 'warning')
    } catch {
      // Aborting rejects the read with AbortError -> a normal stop, nothing to report.
      // Any real error (403/network) was already notified by the store.
    } finally {
      if (tailController === controller) tailController = null
      tailing.value = false
    }
  }

  function stopTail(): void {
    if (tailController) tailController.abort()
    tailController = null
    tailing.value = false
  }

  // Wipe the on-screen buffer without touching the connection.
  function clearTail(): void {
    tailLines.value = []
  }

  // Text color per severity, readable on the dark log panel (parses the [L] token,
  // the 2nd bracket, same as the backend filter).
  function lineClass(line: string): string {
    const m = line.match(/^\[[^\]]*\]\s*\[([TDIWE])\]/)
    const lvl = m ? m[1] : ''
    if (lvl === 'E') return 'text-red-400'
    if (lvl === 'W') return 'text-amber-300'
    if (lvl === 'D' || lvl === 'T') return 'text-gray-400'
    return 'text-gray-200'  // info + anything without a parseable level
  }

  // Guaranteed teardown: leaving the view aborts the stream.
  onUnmounted(stopTail)
</script>

<template>
  <section class="antialiased">
    <div class="mx-auto max-w-6xl">

      <!-- Page header: identity + admin-gate status. -->
      <header class="mb-4 flex items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ListIcon class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <h1 class="text-lg font-semibold tracking-wide text-ink">Log console</h1>
          <p class="truncate text-sm text-ink-faint">
            Download, tune runtime levels, and watch every service live.
          </p>
        </div>
        <span class="pill ml-auto shrink-0"
          :class="canDownload ? 'bg-ok-soft text-ok ring-ok/30' : 'bg-idle-soft text-idle ring-idle/30'">
          <span class="h-1.5 w-1.5 rounded-full" :class="canDownload ? 'bg-ok' : 'bg-idle'" />
          {{ canDownload ? 'Unlocked' : 'Locked' }}
        </span>
      </header>

      <!-- Shared controls: admin password + severity apply to every action below. -->
      <div class="card mb-4 overflow-hidden">
        <div class="panel-head">
          <h3 class="flex items-center gap-2"><FilterIcon class="h-4 w-4 text-brand" /> Access &amp; filter</h3>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-2 md:px-6">
          <div>
            <label class="field-label !text-accent">Admin password</label>
            <input type="password" v-model="password" class="input !border-accent/40"
              placeholder="Required to unlock" autocomplete="off">
          </div>
          <div>
            <label class="field-label">Severity (minimum)</label>
            <select v-model="severity" class="input">
              <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Controls on the left, the live terminal (the star) on the right. -->
      <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">

        <!-- Left rail: downloads + runtime levels. -->
        <div class="space-y-4">

          <!-- Download service logs. -->
          <div class="card overflow-hidden">
            <div class="panel-head">
              <h3 class="flex items-center gap-2"><PrintIcon class="h-4 w-4 text-brand" /> Download</h3>
            </div>
            <div class="space-y-2 p-4">
              <div v-for="src in SOURCES" :key="src.key"
                class="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-soft px-3 py-2.5"
                :class="{ 'opacity-50': !src.available }">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-ink">{{ src.label }}</p>
                  <p v-if="!src.available" class="text-xs text-ink-faint">{{ src.note }}</p>
                </div>
                <button type="button" class="btn-ghost shrink-0"
                  :disabled="!src.available || !canDownload || !!busy"
                  @click="downloadOne(src)">
                  <LoadingIcon v-if="busy === src.key" class="h-4 w-4 animate-spin fill-transparent" />
                  <span v-else>Download</span>
                </button>
              </div>

              <button type="button" class="btn-primary mt-2 w-full"
                :disabled="!canDownload || !!busy || availableSources.length === 0"
                @click="downloadAll()">
                <LoadingIcon v-if="busy === '__all__'" class="h-4 w-4 animate-spin fill-transparent" />
                <span v-else>Download all — merged</span>
              </button>
              <p class="text-xs text-ink-faint">
                Fetches every available source and interleaves their lines by timestamp into one file.
              </p>
            </div>
          </div>

          <!-- Runtime log level: session-only, resets on service restart. -->
          <div class="card overflow-hidden">
            <div class="panel-head">
              <h3 class="flex items-center gap-2"><CogIcon class="h-4 w-4 text-brand" /> Runtime level</h3>
            </div>
            <div class="space-y-2 p-4">
              <p class="text-xs text-ink-faint">
                Session-only — resets to the service default when the service restarts.
              </p>
              <div v-for="target in LEVEL_TARGETS" :key="'lvl-' + target.key"
                class="rounded-lg border border-line bg-panel-soft px-3 py-2.5">
                <p class="mb-2 truncate text-sm font-medium text-ink">{{ target.label }}</p>
                <div class="flex items-center gap-2">
                  <select v-model="levelChoice[target.key]" class="input !py-1.5">
                    <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                  </select>
                  <button type="button" class="btn-ghost shrink-0"
                    :disabled="!canDownload || !!levelBusy"
                    @click="applyLevel(target)">
                    <LoadingIcon v-if="levelBusy === target.key" class="h-4 w-4 animate-spin fill-transparent" />
                    <span v-else>Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Live tail: the hero. Sticky + tall so it dominates the view. -->
        <div class="card flex h-[65vh] flex-col overflow-hidden lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <!-- Terminal titlebar. -->
          <div class="flex items-center gap-3 border-b border-line border-l-4 border-l-brand bg-panel-strong px-4 py-2.5">
            <h3 class="flex items-center gap-2 text-base font-semibold tracking-wide text-ink">
              <ListIcon class="h-4 w-4 text-brand" /> Live tail
            </h3>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold"
              :class="tailing ? 'text-ok' : 'text-ink-faint'">
              <LoadingIcon v-if="tailing" class="h-3 w-3 animate-spin fill-transparent" />
              <span v-else class="h-1.5 w-1.5 rounded-full bg-idle" />
              {{ tailing ? 'Streaming' : 'Idle' }}
            </span>

            <span class="ml-auto font-mono text-xs text-ink-faint tabular-nums">
              {{ tailLines.length }} / {{ MAX_TAIL_LINES }}
            </span>
            <button type="button"
              class="rounded-md border border-line bg-panel p-1.5 text-ink-faint hover:bg-panel-strong hover:text-ink disabled:opacity-40"
              title="Clear buffer"
              :disabled="!tailLines.length"
              @click="clearTail()">
              <RemoveIcon class="h-4 w-4" />
            </button>
            <button type="button"
              class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              :class="tailing ? 'border border-line bg-panel text-crit hover:bg-crit hover:text-white' : 'bg-accent text-accent-fg hover:brightness-110'"
              :disabled="(!tailing && !canDownload)"
              @click="tailing ? stopTail() : startTail()">
              <StopIcon v-if="tailing" class="h-4 w-4" />
              <PlayIcon v-else class="h-4 w-4" />
              {{ tailing ? 'Stop' : 'Start' }}
            </button>
          </div>

          <!-- Terminal body: fills all remaining height. -->
          <div ref="tailBox"
            class="min-h-0 flex-1 overflow-auto bg-black/95 p-3 font-mono text-xs leading-relaxed">
            <div v-for="(line, i) in tailLines" :key="i"
              class="whitespace-pre-wrap break-all" :class="lineClass(line)">{{ line }}</div>

            <!-- Empty states. -->
            <div v-if="tailing && !tailLines.length" class="flex items-center gap-2 text-gray-500">
              <LoadingIcon class="h-3.5 w-3.5 animate-spin fill-transparent" />
              Waiting for log output…
            </div>
            <div v-else-if="!tailLines.length"
              class="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-600">
              <ListIcon class="h-8 w-8 opacity-40" />
              <p class="text-sm">
                {{ canDownload ? 'Press Start to stream every service, live.' : 'Enter the admin password to start streaming.' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
