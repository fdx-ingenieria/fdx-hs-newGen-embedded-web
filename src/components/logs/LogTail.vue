<script setup lang="ts">
  import { computed, nextTick, onUnmounted, ref, shallowRef, triggerRef, watch } from 'vue'
  import { useGlobalStore } from '@/stores/global'
  import { appendLines, LogEntry, LogLevel, LogSource, SOURCE_LABEL } from '@/commons/logLine'
  import { LoadingIcon, PlayIcon, StopIcon, RemoveIcon, SearchIcon } from '@/components/icons'

  const props = defineProps({
    password: { type: String, required: true },
    severity: { type: String, required: true },
  })

  const globalStore = useGlobalStore()

  const MAX_ENTRIES = 2000  // cap the DOM: keep only the most recent entries
  const entries = shallowRef<LogEntry[]>([])
  const tailing = ref(false)
  const paused = ref(false)
  const unseen = ref(0)
  const sourceFilter = ref<LogSource | 'all'>('all')
  const find = ref('')
  const box = ref<HTMLElement | null>(null)
  let held: string[] = []
  let atBottom = true
  let controller: AbortController | null = null

  const SOURCE_CHIPS: Array<LogSource | 'all'> = ['all', 'hs', 'api', 'wifi']

  function ingest(lines: string[]): void {
    const list = entries.value
    const { entries: added, extended } = appendLines(lines, list[list.length - 1])
    if (!added.length && !extended) return
    const next = list.concat(added)
    entries.value = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
    if (!added.length) triggerRef(entries)
    if (atBottom) nextTick(scrollToEnd)
    else unseen.value += added.length
  }

  function onLines(lines: string[]): void {
    if (paused.value) held = held.concat(lines)
    else ingest(lines)
  }

  function togglePause(): void {
    paused.value = !paused.value
    if (!paused.value && held.length) {
      const lines = held
      held = []
      ingest(lines)
    }
  }

  function onScroll(): void {
    const el = box.value
    if (!el) return
    atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    if (atBottom) unseen.value = 0
  }

  function scrollToEnd(): void {
    const el = box.value
    if (el) el.scrollTop = el.scrollHeight
    atBottom = true
    unseen.value = 0
  }

  async function start(): Promise<void> {
    if (!props.password || tailing.value) return
    entries.value = []
    held = []
    paused.value = false
    unseen.value = 0
    atBottom = true
    const c = new AbortController()
    controller = c
    tailing.value = true
    try {
      await globalStore.streamLogTail(props.severity, props.password, c.signal, onLines)
      if (!c.signal.aborted) globalStore.notify('Live tail stopped: the device closed the connection', 'warning')
    } catch {
      // Abort is a normal stop; real errors (403/network) were already notified by the store.
    } finally {
      if (controller === c) controller = null
      if (!controller) tailing.value = false
    }
  }

  function stop(): void {
    controller?.abort()
    controller = null
    tailing.value = false
  }

  function clear(): void {
    entries.value = []
    held = []
    unseen.value = 0
  }

  // A new severity only applies to a new stream: restart it instead of asking the user to.
  watch(() => props.severity, () => {
    if (!tailing.value) return
    stop()
    start()
  })

  onUnmounted(stop)

  const visible = computed(() => {
    const needle = find.value.trim().toLowerCase()
    const out: Array<{ entry: LogEntry, newDate: boolean }> = []
    let prevDate = ''
    for (const e of entries.value) {
      if (sourceFilter.value !== 'all' && e.source !== sourceFilter.value) continue
      if (needle && !e.raw.toLowerCase().includes(needle)) continue
      out.push({ entry: e, newDate: e.date !== prevDate })
      prevDate = e.date
    }
    return out
  })

  // Splits text around the search term so matches can be marked without v-html.
  function parts(text: string): Array<{ text: string, hit: boolean }> {
    const needle = find.value.trim()
    if (!needle) return [{ text, hit: false }]
    const out: Array<{ text: string, hit: boolean }> = []
    const lower = text.toLowerCase()
    const n = needle.toLowerCase()
    let i = 0
    for (;;) {
      const j = lower.indexOf(n, i)
      if (j === -1) break
      if (j > i) out.push({ text: text.slice(i, j), hit: false })
      out.push({ text: text.slice(j, j + n.length), hit: true })
      i = j + n.length
    }
    if (i < text.length) out.push({ text: text.slice(i), hit: false })
    return out
  }

  const LEVEL_CLASS: Record<LogLevel, string> = {
    ERR: 'bg-red-500 text-white font-bold',
    WRN: 'text-amber-300 ring-1 ring-inset ring-amber-400/70 font-bold',
    INF: 'text-slate-300',
    DBG: 'text-slate-500',
    TRC: 'text-slate-600',
  }
  const ROW_CLASS: Record<LogLevel, string> = {
    ERR: 'border-l-red-500 bg-red-500/10',
    WRN: 'border-l-amber-400 bg-amber-400/5',
    INF: 'border-l-transparent',
    DBG: 'border-l-transparent',
    TRC: 'border-l-transparent',
  }
  const MESSAGE_CLASS: Record<LogLevel, string> = {
    ERR: 'text-red-200',
    WRN: 'text-amber-100',
    INF: 'text-slate-200',
    DBG: 'text-slate-400',
    TRC: 'text-slate-500',
  }

  const dateLabel = (date: string): string =>
    new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="card mb-4 overflow-hidden">
    <div class="panel-head flex-wrap">
      <h3 class="flex items-center gap-2">
        Live
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold"
          :class="tailing ? (paused ? 'text-warn' : 'text-ok') : 'text-ink-faint'">
          <LoadingIcon v-if="tailing && !paused" class="h-3 w-3 animate-spin fill-transparent" />
          <span v-else class="h-1.5 w-1.5 rounded-full" :class="tailing ? 'bg-warn' : 'bg-idle'" />
          {{ tailing ? (paused ? 'Paused' : 'Streaming') : 'Stopped' }}
        </span>
      </h3>
      <div class="flex items-center gap-1.5">
        <button v-if="tailing" type="button" class="btn-ghost !px-3 [@media(pointer:coarse)]:!py-2.5"
          :aria-pressed="paused" @click="togglePause">
          {{ paused ? 'Resume' : 'Pause' }}
        </button>
        <button type="button" class="btn-ghost !px-3 [@media(pointer:coarse)]:!py-2.5" aria-label="Clear screen"
          title="Clear screen" @click="clear">
          <RemoveIcon class="h-4 w-4" />
        </button>
        <button v-if="!tailing" type="button" class="btn-primary !px-3 [@media(pointer:coarse)]:!py-2.5"
          :disabled="!password" @click="start">
          <PlayIcon class="h-4 w-4" /> Start
        </button>
        <button v-else type="button" class="btn-danger !px-3 [@media(pointer:coarse)]:!py-2.5" @click="stop">
          <StopIcon class="h-4 w-4" /> Stop
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
      <div class="flex rounded-lg border border-line bg-panel-soft p-0.5" role="group" aria-label="Filter by service">
        <button v-for="s in SOURCE_CHIPS" :key="s" type="button"
          class="rounded-md px-3 py-1 text-xs font-semibold [@media(pointer:coarse)]:py-2"
          :class="sourceFilter === s ? 'bg-panel text-ink shadow-sm' : 'text-ink-faint hover:text-ink'"
          :aria-pressed="sourceFilter === s" @click="sourceFilter = s">
          {{ s === 'all' ? 'All' : SOURCE_LABEL[s] }}
        </button>
      </div>
      <div class="relative min-w-[12rem] flex-1">
        <SearchIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input v-model="find" type="search" class="input !py-1.5 pl-9" placeholder="Find on screen"
          aria-label="Find in the lines on screen">
      </div>
    </div>

    <div class="relative">
      <div ref="box" @scroll.passive="onScroll"
        class="h-[60vh] overflow-auto bg-slate-950 font-mono text-xs leading-5 mobile:h-[65dvh]">
        <div v-if="!visible.length" class="flex h-full items-center justify-center px-4 text-center font-sans text-sm text-slate-500">
          <template v-if="!password">Enter the admin password to start the live view.</template>
          <template v-else-if="!tailing && !entries.length">Press Start to follow every service live.</template>
          <template v-else-if="entries.length">No lines on screen match the filter.</template>
          <template v-else>Waiting for new lines…</template>
        </div>
        <div v-else class="min-w-max py-1">
          <template v-for="row in visible" :key="row.entry.id">
            <div v-if="row.newDate"
              class="sticky left-0 mt-1 w-screen max-w-full px-3 py-1 font-sans text-[11px] font-semibold text-slate-500">
              {{ dateLabel(row.entry.date) }}
            </div>
            <div class="grid grid-cols-[12ch_4ch_4ch_16ch_auto] gap-x-2 whitespace-pre border-l-2 pl-2 pr-4 hover:bg-white/5"
              :class="ROW_CLASS[row.entry.level]" :title="`${row.entry.date} ${row.entry.time}`">
              <span class="text-slate-500">{{ row.entry.time }}</span>
              <span class="rounded-sm text-center" :class="LEVEL_CLASS[row.entry.level]">{{ row.entry.level }}</span>
              <span class="text-sky-300/80">{{ SOURCE_LABEL[row.entry.source] }}</span>
              <span class="truncate text-slate-400" :title="row.entry.module">{{ row.entry.module }}</span>
              <span :class="MESSAGE_CLASS[row.entry.level]"><template v-for="p in parts(row.entry.message)"><mark v-if="p.hit" class="rounded-sm bg-yellow-300 text-slate-950">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
              <span v-for="(c, ci) in row.entry.continuation" :key="ci" class="col-start-5"
                :class="MESSAGE_CLASS[row.entry.level]"><template v-for="p in parts(c)"><mark v-if="p.hit" class="rounded-sm bg-yellow-300 text-slate-950">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
            </div>
          </template>
        </div>
      </div>
      <button v-if="unseen > 0" type="button" @click="scrollToEnd"
        class="absolute bottom-3 right-4 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-lg [@media(pointer:coarse)]:py-3">
        {{ unseen }} new {{ unseen === 1 ? 'line' : 'lines' }}, jump to latest
      </button>
    </div>

    <p class="px-4 py-2 text-xs text-ink-faint">
      {{ visible.length }} of {{ entries.length }} entries on screen. The screen keeps the latest {{ MAX_ENTRIES }}; download for the full log.
    </p>
  </div>
</template>

<style scoped></style>
