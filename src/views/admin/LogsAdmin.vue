<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useGlobalStore } from '@/stores/global'
  import { mergeLogsChronologically } from '@/commons/logMerge'
  import LoadingIcon from '@/components/icons/LoadingIcon.vue'

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
</script>

<template>
  <section class="antialiased">
    <div class="mx-auto max-w-3xl space-y-4">
      <div class="card overflow-hidden py-4 px-4 md:px-6">
        <h2 class="text-base font-semibold mb-1">Logs</h2>
        <p class="text-sm text-ink-faint mb-4">
          Admin-only. Download service logs filtered by severity. Requires the admin password.
        </p>

        <!-- Shared controls: admin password + severity filter apply to every download. -->
        <div class="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <label class="field-label !text-accent">Admin password</label>
            <input type="password" v-model="password" class="input !border-accent/40"
              placeholder="Admin password" autocomplete="off">
          </div>
          <div>
            <label class="field-label">Severity (minimum)</label>
            <select v-model="severity" class="input">
              <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <!-- Per-source rows. Unavailable sources are shown disabled to reflect the
             intended final shape (hs + api + wifi + journal). -->
        <div class="border-t border-line pt-4 space-y-2">
          <div v-for="src in SOURCES" :key="src.key"
            class="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5"
            :class="{ 'opacity-50': !src.available }">
            <div>
              <p class="text-sm font-medium text-ink">{{ src.label }}</p>
              <p v-if="!src.available" class="text-xs text-ink-faint">{{ src.note }}</p>
            </div>
            <button type="button" class="btn-ghost"
              :disabled="!src.available || !canDownload || !!busy"
              @click="downloadOne(src)">
              <LoadingIcon v-if="busy === src.key" class="w-4 h-4 animate-spin fill-transparent" />
              <span v-else>Download</span>
            </button>
          </div>
        </div>

        <!-- Download everything, merged chronologically into one file. -->
        <div class="border-t border-line pt-4 mt-4">
          <button type="button" class="btn-primary w-full"
            :disabled="!canDownload || !!busy || availableSources.length === 0"
            @click="downloadAll()">
            <LoadingIcon v-if="busy === '__all__'" class="w-4 h-4 animate-spin fill-transparent" />
            <span v-else>Download all (merged chronologically)</span>
          </button>
          <p class="mt-2 text-xs text-ink-faint">
            Fetches every available source and interleaves their lines by timestamp into a single file.
          </p>
        </div>

        <!-- Runtime log level: session-only, resets to the service default on restart. -->
        <div class="border-t border-line pt-4 mt-4 space-y-2">
          <p class="field-label">Runtime log level</p>
          <p class="text-xs text-ink-faint mb-1">
            Session-only — resets to the service default when the service restarts. Requires the admin password.
          </p>
          <div v-for="target in LEVEL_TARGETS" :key="'lvl-' + target.key"
            class="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
            <p class="text-sm font-medium text-ink">{{ target.label }}</p>
            <div class="flex items-center gap-2">
              <select v-model="levelChoice[target.key]" class="input !py-1">
                <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
              </select>
              <button type="button" class="btn-ghost"
                :disabled="!canDownload || !!levelBusy"
                @click="applyLevel(target)">
                <LoadingIcon v-if="levelBusy === target.key" class="w-4 h-4 animate-spin fill-transparent" />
                <span v-else>Apply</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Realtime tail: planned, not wired yet. -->
        <div class="border-t border-line pt-4 mt-4">
          <p class="field-label">Live tail</p>
          <p class="text-xs text-ink-faint">Real-time log streaming — coming soon.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
