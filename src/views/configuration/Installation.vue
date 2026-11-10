<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue';
  import { onBeforeRouteLeave, useRouter } from 'vue-router';
  import { IInstallStatus, IInstallTag, ISensor, LabelType, epcDisplayName } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { useNow } from '@/composables/clock';
  import { usePlacement } from '@/composables/placement';
  import { AlertIcon, CloseIcon, LoadingIcon, PlayIcon, RefreshIcon, SendIcon, StopIcon } from '@/components/icons';
  import SignalBars from '@/components/sensors/SignalBars.vue';

  // Field installation aid: the device reads with the production t_on and reports, per tag,
  // how many inventory rounds it answered. Measuring, alarms and Modbus pause meanwhile.

  const POLL_MS = 1000
  const GOOD_RATIO = 0.9
  const FAIR_RATIO = 0.5
  // On-chip RSSI code from which the tag gets enough power; invalid temperatures above it point at the tag itself.
  const SUSPECT_TAG_RSSI = 12
  const SUSPECT_INVALID_RATIO = 0.3
  const TAG_RSSI_MAX = 31
  const MAX_CONFIGURED_SENSORS = 50

  type Level = 'good' | 'fair' | 'poor' | 'none'

  const globalStore = useGlobalStore()
  const router = useRouter()
  const now = useNow()
  // Seconds clock of the last start or reset; the backend deadline is renewed by every poll, so it is no countdown.
  const countingSince = ref(0)

  const status = ref<IInstallStatus | null>(null)
  const starting = ref(true)
  const resetting = ref(false)
  const stopping = ref(false)
  const ended = ref(false)
  const selectedId = ref<string | null>(null)
  const savingSensor = ref(false)
  // Ids whose read count grew on the last poll, so the finder can say "read now".
  const freshIds = ref<Set<string>>(new Set())
  let timer: number | undefined
  let polling = false

  const configured = computed(() => globalStore.getConfiguredSensors as ISensor[])
  const statsById = computed(() => {
    const map: Record<string, IInstallTag> = {}
    for (const t of status.value?.tags ?? []) map[t.epc_id] = t
    return map
  })
  const rounds = computed(() => status.value?.rounds ?? 0)
  const configuredIds = computed(() => new Set(configured.value.map(s => s.id)))
  const unconfiguredTags = computed(() => (status.value?.tags ?? []).filter(t => !configuredIds.value.has(t.epc_id)))

  // Same placement as Quick setup: place every tag, then save them all at once.
  const {
    equipments, locations, positions, equipment, key, cursor,
    taken: sensorAt, assigned, place, unassign, selectCell, pending, pendingFor, assignedIds, discard, save: savePlacements,
  } = usePlacement(configured, computed(() => unconfiguredTags.value.map(t => t.epc_id)), MAX_CONFIGURED_SENSORS)
  const savingPlacements = ref(false)

  const ratio = (t: IInstallTag | undefined) => (t && rounds.value ? Math.min(1, t.reads / rounds.value) : 0)

  function level(t: IInstallTag | undefined): Level {
    if (!t || !t.reads) return 'none'
    if (!rounds.value) return 'good'
    const r = ratio(t)
    return r >= GOOD_RATIO ? 'good' : r >= FAIR_RATIO ? 'fair' : 'poor'
  }

  const suspect = (t: IInstallTag | undefined) =>
    !!t && t.reads >= 3 && t.tag_rssi >= SUSPECT_TAG_RSSI && t.invalid_temp / t.reads > SUSPECT_INVALID_RATIO

  const LEVEL_CELL: Record<Level, string> = {
    good: 'border-l-ok',
    fair: 'border-l-warn',
    poor: 'border-l-crit',
    none: 'border-l-idle',
  }
  const LEVEL_DOT: Record<Level, string> = {
    good: 'bg-ok',
    fair: 'bg-warn',
    poor: 'bg-crit',
    none: 'bg-idle',
  }
  const LEVEL_TEXT: Record<Level, string> = {
    good: 'text-ok',
    fair: 'text-warn',
    poor: 'text-crit',
    none: 'text-ink-faint',
  }
  const LEVEL_LABEL: Record<Level, string> = {
    good: 'Reads every round',
    fair: 'Misses some rounds',
    poor: 'Misses most rounds',
    none: 'Not read',
  }

  // Sensors of an equipment below the fair line, shown on its tab so a problem on another tab is not missed.
  const poorCount = (eq: number) => configured.value
    .filter(s => s.config.equipment === eq)
    .filter(s => rounds.value > 0 && (level(statsById.value[s.id]) === 'poor' || level(statsById.value[s.id]) === 'none'))
    .length

  // Older firmware sends no name: decode it here with the same rule.
  const tagName = (t: IInstallTag) => t.name || epcDisplayName(t.epc_id)

  // Sorted by name, not signal: live RSSI reordering would move tags under the finger.
  const strayTags = computed(() => unconfiguredTags.value
    .filter(t => !assignedIds.value.has(t.epc_id))
    .slice()
    .sort((a, b) => tagName(a).localeCompare(tagName(b))))
  const nameOfId = (id: string) => (statsById.value[id] ? tagName(statsById.value[id]) : epcDisplayName(id))

  const selectedTag = computed(() => (selectedId.value ? statsById.value[selectedId.value] : undefined))
  const selectedSensor = computed(() => configured.value.find(s => s.id === selectedId.value))
  const selectedName = computed(() => selectedSensor.value?.EPC ?? (selectedTag.value ? tagName(selectedTag.value) : selectedId.value) ?? '')
  const selectedPlace = computed(() => {
    const c = selectedSensor.value?.config
    if (!c) return 'Not configured'
    return [globalStore.getLabelName(LabelType.EQUIPMENT, c.equipment), globalStore.getLabelName(LabelType.LOCATION, c.location),
      globalStore.getLabelName(LabelType.POSITION, c.position)].join(' / ')
  })

  async function savePending(): Promise<void> {
    savingPlacements.value = true
    try {
      await savePlacements(nameOfId)
    } catch {
      // apiFetch already showed the error; the placements stay pending.
    } finally {
      savingPlacements.value = false
    }
  }

  async function removeSelected(): Promise<void> {
    const id = selectedId.value
    if (!id || !window.confirm(`Remove ${selectedName.value} from the map?\n\nIt stops being a configured sensor; the tag keeps showing in the list below.`)) return
    savingSensor.value = true
    try {
      await globalStore.deleteSensor(id)
    } catch {
      // apiFetch already showed the error.
    } finally {
      savingSensor.value = false
    }
  }

  const elapsed = computed(() => {
    const s = countingSince.value ? Math.max(0, now.value - countingSince.value) : 0
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  })

  // Stats of the sensor in a map cell, if it was read since the last reset.
  const cellStat = (cell: string): IInstallTag | undefined => {
    const s = sensorAt.value[cell]
    return s ? statsById.value[s.id] : undefined
  }

  const ago = (s: number) => (s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`)
  const tagRssiPct = (t: IInstallTag) => `${Math.round((t.tag_rssi / TAG_RSSI_MAX) * 100)}%`

  async function poll(): Promise<void> {
    if (polling) return
    polling = true
    try {
      const next = await globalStore.loadInstallStats()
      const prev = statsById.value
      freshIds.value = new Set(next.tags.filter(t => t.reads > (prev[t.epc_id]?.reads ?? 0)).map(t => t.epc_id))
      status.value = next
      if (!next.active) {
        ended.value = true
        stopPolling()
      }
    } catch {
      // apiFetch already showed the error; the next poll retries.
    } finally {
      polling = false
    }
  }

  function startPolling(): void {
    stopPolling()
    timer = window.setInterval(poll, POLL_MS)
    poll()
  }
  function stopPolling(): void {
    if (timer !== undefined) window.clearInterval(timer)
    timer = undefined
  }

  async function start(): Promise<void> {
    starting.value = true
    ended.value = false
    try {
      await globalStore.startInstallMode()
      countingSince.value = now.value
      startPolling()
    } catch {
      ended.value = true
    } finally {
      starting.value = false
    }
  }

  async function reset(): Promise<void> {
    resetting.value = true
    try {
      await globalStore.resetInstallStats()
      countingSince.value = now.value
      freshIds.value = new Set()
      await poll()
    } finally {
      resetting.value = false
    }
  }

  const confirmDiscard = () =>
    !pending.value || window.confirm(`Discard ${pending.value} placed ${pending.value === 1 ? 'tag' : 'tags'} not saved yet?`)

  // Leaving by any route asks first, like Stop, so unsaved placements are never lost silently.
  let discardConfirmed = false
  onBeforeRouteLeave(() => discardConfirmed || confirmDiscard())

  async function stop(): Promise<void> {
    if (!confirmDiscard()) return
    discardConfirmed = true
    stopping.value = true
    stopPolling()
    try {
      await globalStore.stopInstallMode()
    } finally {
      stopping.value = false
      router.push({ name: 'Sensors' })
    }
  }

  onMounted(async () => {
    if (!window.confirm(
      'Start installation mode?\n\n'
      + 'Measuring, alarms, relays and Modbus pause while this view is open, and resume when you leave it.'
    )) {
      router.push({ name: 'Sensors' })
      return
    }
    try {
      await globalStore.loadLabels()
      await globalStore.loadSensors()
    } catch {
      // apiFetch already showed the error.
    }
    await start()
  })

  onUnmounted(() => {
    const wasRunning = timer !== undefined
    stopPolling()
    if (wasRunning && globalStore.getInstallActive) globalStore.stopInstallMode().catch(() => {})
  })
</script>

<template>
  <section class="antialiased">
    <div class="card mt-8 overflow-hidden">
      <div class="panel-head flex-wrap gap-y-2">
        <h3 class="flex min-w-0 flex-1 items-baseline gap-3">
          Installation
          <span v-if="status && !ended" class="font-mono text-sm font-normal text-ink-soft"
            title="Inventory rounds and time since the last start or reset">
            {{ rounds }} {{ rounds === 1 ? 'round' : 'rounds' }} in {{ elapsed }}
          </span>
        </h3>
        <div class="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto">
          <button type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
            :disabled="ended || starting || resetting" @click="reset">
            <LoadingIcon v-if="resetting" class="h-4 w-4 animate-spin fill-transparent" />
            <RefreshIcon v-else class="h-4" /> Reset counts
          </button>
          <button type="button" class="btn-danger !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
            :disabled="stopping" @click="stop">
            <LoadingIcon v-if="stopping" class="h-4 w-4 animate-spin fill-transparent" />
            <StopIcon v-else class="h-4" /> Stop
          </button>
        </div>
      </div>

      <div class="p-4">
        <!-- Ended by expiry or from another client: offer a restart instead of a dead screen. -->
        <div v-if="ended" class="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel-soft px-4 py-3">
          <span class="flex-1 text-sm text-ink">Installation mode ended. Measuring is back to normal.</span>
          <button type="button" class="btn-primary" :disabled="starting" @click="start">
            <LoadingIcon v-if="starting" class="h-4 w-4 animate-spin fill-transparent" />
            <PlayIcon v-else class="h-4" /> Start again
          </button>
        </div>

        <template v-else>
          <p class="mb-4 max-w-3xl text-sm text-ink-soft">
            Each cell counts the inventory rounds its tag answered since the last reset.
            Move a tag, close the cabinet and tap <span class="font-semibold text-ink">Reset counts</span>;
            after a few rounds every cell should read close to the round count.
          </p>

          <div class="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft" aria-label="Color legend">
            <span v-for="lv in (['good', 'fair', 'poor', 'none'] as Level[])" :key="lv" class="flex items-center gap-1.5">
              <span class="h-3 w-1 rounded-sm" :class="LEVEL_DOT[lv]"></span>
              {{ LEVEL_LABEL[lv] }}<template v-if="lv === 'good'"> (90 % or more)</template><template v-else-if="lv === 'fair'"> (50 to 90 %)</template>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="h-1 w-5 rounded-full bg-ok"></span>
              Thin bar: power at the tag (on-chip RSSI)
            </span>
          </div>

          <div class="desktop:lg:flex desktop:lg:items-start desktop:lg:gap-4">
            <div class="min-w-0 flex-1">
              <p v-if="!equipments.length" class="mb-4 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-ink-soft">
                Set up the equipment, location and position labels to see the map. Every tag read shows in the list below.
              </p>
              <template v-else>
              <span class="field-label" id="inst-equipment">Equipment</span>
              <div class="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-panel-soft p-1" role="radiogroup" aria-labelledby="inst-equipment">
                <button v-for="e in equipments" :key="e.index" type="button" role="radio" :aria-checked="equipment === e.index"
                  class="flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold [@media(pointer:coarse)]:py-2.5"
                  :class="equipment === e.index ? 'bg-panel text-ink shadow-sm ring-1 ring-line' : 'text-ink-faint hover:text-ink'"
                  @click="equipment = e.index">
                  {{ e.label }}
                  <span v-if="pendingFor(e.index)" class="ml-1 rounded-full bg-ok-soft px-1.5 font-mono text-xs text-ok"
                    :aria-label="`${pendingFor(e.index)} placed, not saved yet`">{{ pendingFor(e.index) }}</span>
                  <span v-if="poorCount(e.index)" class="ml-1 rounded-full bg-crit-soft px-1.5 font-mono text-xs text-crit"
                    :aria-label="`${poorCount(e.index)} sensors missing most rounds`">{{ poorCount(e.index) }}</span>
                </button>
              </div>

              <p class="mb-2 text-sm text-ink-soft">
                <template v-if="cursor">
                  Tap a tag found below to place it in the highlighted cell; the next empty cell is highlighted after each one.
                  Tap a cell to choose it, or its × to take the tag back. Save when you are done.
                </template>
                <template v-else>
                  Every cell of this equipment has a sensor. Tap a sensor to see its reads, or pick another equipment to place tags.
                </template>
              </p>

              <!-- Map: locations (rows) x positions (columns). Narrow screens put each location on its own
                   heading line so the cells get the full width instead of scrolling sideways. -->
              <div class="mb-4 overflow-x-auto">
                <div class="grid gap-1.5 [grid-template-columns:repeat(var(--cols),minmax(4.5rem,1fr))] md:min-w-max md:[grid-template-columns:minmax(7rem,auto)_repeat(var(--cols),minmax(8.5rem,1fr))]"
                  :style="{ '--cols': positions.length }">
                  <span class="hidden md:block"></span>
                  <span v-for="p in positions" :key="`h-${p.index}`" class="text-center text-sm font-semibold text-ink-soft">{{ p.label }}</span>
                  <template v-for="l in locations" :key="`r-${l.index}`">
                    <span class="col-span-full flex items-center pt-1 text-sm font-medium text-ink md:col-auto md:pr-2 md:pt-0">{{ l.label }}</span>
                    <template v-for="p in positions" :key="key(l.index, p.index)">
                      <button v-if="sensorAt[key(l.index, p.index)]" type="button"
                        class="flex min-h-[4.5rem] min-w-0 flex-col items-start rounded-lg border border-line border-l-4 bg-panel px-2 py-1.5 text-left hover:bg-panel-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-[5.5rem] md:px-3 md:py-2"
                        :class="[LEVEL_CELL[level(statsById[sensorAt[key(l.index, p.index)].id])],
                          selectedId === sensorAt[key(l.index, p.index)].id ? 'ring-2 ring-accent' : '']"
                        :aria-label="`${l.label} ${p.label}: ${LEVEL_LABEL[level(statsById[sensorAt[key(l.index, p.index)].id])]}`"
                        @click="selectedId = sensorAt[key(l.index, p.index)].id">
                        <span class="flex w-full flex-wrap items-baseline justify-between gap-x-2">
                          <span class="text-sm font-semibold text-ink">{{ sensorAt[key(l.index, p.index)].EPC }}</span>
                          <span v-if="suspect(statsById[sensorAt[key(l.index, p.index)].id])" class="text-[11px] font-semibold text-crit">Check tag</span>
                        </span>
                        <template v-if="cellStat(key(l.index, p.index))">
                          <span class="flex w-full items-baseline justify-between gap-2">
                            <span class="font-mono text-xl font-semibold leading-tight"
                              :class="LEVEL_TEXT[level(cellStat(key(l.index, p.index)))]">
                              {{ cellStat(key(l.index, p.index))!.reads }}<span class="text-sm text-ink-faint">/{{ rounds }}</span>
                            </span>
                            <span v-if="cellStat(key(l.index, p.index))!.invalid_temp" class="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-warn"
                              :title="`${cellStat(key(l.index, p.index))!.invalid_temp} readings with an unusable temperature`">
                              <AlertIcon class="h-3 w-3" />{{ cellStat(key(l.index, p.index))!.invalid_temp }}<span class="hidden sm:inline">&nbsp;invalid</span>
                            </span>
                          </span>
                          <span class="flex w-full flex-wrap items-center justify-between gap-x-2">
                            <SignalBars :rssi="cellStat(key(l.index, p.index))!.rssi" :show-label="false" />
                            <span class="hidden font-mono text-xs text-ink-faint sm:inline">{{ ago(cellStat(key(l.index, p.index))!.last_seen_s) }}</span>
                          </span>
                          <span v-if="cellStat(key(l.index, p.index))!.tag_rssi" class="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-panel-strong"
                            :title="`Power at the tag (on-chip RSSI): ${cellStat(key(l.index, p.index))!.tag_rssi} / ${TAG_RSSI_MAX}`">
                            <span class="block h-full rounded-full"
                              :class="cellStat(key(l.index, p.index))!.tag_rssi >= SUSPECT_TAG_RSSI ? 'bg-ok' : 'bg-warn'"
                              :style="{ width: tagRssiPct(cellStat(key(l.index, p.index))!) }"></span>
                          </span>
                        </template>
                        <span v-else class="mt-1 font-mono text-xl font-semibold leading-tight text-ink-faint">
                          0<span class="text-sm">/{{ rounds }}</span>
                        </span>
                      </button>
                      <div v-else-if="assigned[key(l.index, p.index)]"
                        class="relative flex min-h-[4.5rem] min-w-0 flex-col items-start rounded-lg border border-ok/60 bg-ok-soft px-2 py-1.5 md:min-h-[5.5rem] md:px-3 md:py-2">
                        <span class="pr-6 text-sm font-semibold text-ink">{{ nameOfId(assigned[key(l.index, p.index)]) }}</span>
                        <span class="text-[11px] text-ink-soft">not saved</span>
                        <SignalBars v-if="statsById[assigned[key(l.index, p.index)]]" :rssi="statsById[assigned[key(l.index, p.index)]].rssi" :show-label="false" />
                        <button type="button" class="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:text-crit"
                          :aria-label="`Take ${nameOfId(assigned[key(l.index, p.index)])} back from ${l.label} ${p.label}`" @click="unassign(key(l.index, p.index))">
                          <CloseIcon class="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button v-else type="button"
                        class="flex min-h-[4.5rem] items-center justify-center rounded-lg border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-[5.5rem]"
                        :class="cursor === key(l.index, p.index)
                          ? 'border-accent bg-accent-soft font-semibold text-accent ring-2 ring-accent'
                          : 'border-dashed border-line bg-panel-soft text-ink-faint hover:border-accent'"
                        :aria-label="`${l.label} ${p.label}: empty`" @click="selectCell(key(l.index, p.index))">
                        {{ cursor === key(l.index, p.index) ? 'Next' : 'Empty' }}
                      </button>
                    </template>
                  </template>
                </div>
              </div>

              </template>

              <!-- Tray: tags read during the test that are not configured yet; tapping one places it. -->
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="field-label mb-0">Tags found ({{ strayTags.length }})</span>

              </div>
              <div v-if="strayTags.length" class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                <button v-for="t in strayTags" :key="t.epc_id" type="button"
                  :disabled="!cursor || savingPlacements"
                  class="flex flex-col items-start rounded-lg border border-line border-l-4 bg-panel px-3 py-2 text-left hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  :class="LEVEL_CELL[level(t)]"
                  :aria-label="`Place ${tagName(t)} in the highlighted cell`"
                  @click="place(cursor, t.epc_id)">
                  <span class="flex w-full items-baseline justify-between gap-2">
                    <span class="text-base font-semibold text-ink">{{ tagName(t) }}</span>
                    <span class="font-mono text-sm font-semibold" :class="LEVEL_TEXT[level(t)]">{{ t.reads }}<span class="text-xs text-ink-faint">/{{ rounds }}</span></span>
                  </span>
                  <SignalBars :rssi="t.rssi" />
                </button>
              </div>
              <p v-else class="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-ink-faint">
                No new tags yet. They show up here as the antennas read them.
              </p>

              <!-- Same save bar as Quick setup: every placement goes in one request. -->
              <div class="mt-4 flex flex-wrap items-center gap-3 mobile:sticky mobile:bottom-0 mobile:-mx-4 mobile:-mb-4 mobile:border-t mobile:border-line mobile:bg-panel mobile:px-4 mobile:pb-4 mobile:pt-3">
                <button type="button" class="btn-primary" :disabled="!pending || savingPlacements" @click="savePending">
                  <LoadingIcon v-if="savingPlacements" class="h-4 w-4 animate-spin fill-transparent" />
                  <SendIcon v-else class="w-4" />
                  Save {{ pending }} {{ pending === 1 ? 'sensor' : 'sensors' }}
                </button>
                <button type="button" class="btn-ghost" :disabled="!pending || savingPlacements" @click="discard">Discard</button>
                <span class="ml-auto text-xs text-ink-faint">{{ configured.length + pending }} / {{ MAX_CONFIGURED_SENSORS }} sensors</span>
              </div>
            </div>

            <!-- Finder: the selected tag in large type, readable from arm's length while moving it. -->
            <aside v-if="selectedId"
              class="card mt-4 desktop:lg:sticky desktop:lg:top-20 desktop:lg:mt-0 desktop:lg:w-80 desktop:lg:shrink-0 mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-30 mobile:mt-0 mobile:rounded-b-none mobile:border-x-0 mobile:shadow-lg"
              aria-live="polite">
              <div class="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
                <div class="min-w-0">
                  <div class="truncate text-2xl font-semibold text-ink">{{ selectedName }}</div>
                  <div class="truncate text-xs text-ink-soft">{{ selectedPlace }}</div>
                </div>
                <button type="button" class="rounded-md p-1 text-ink-faint hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:p-2"
                  aria-label="Close" @click="selectedId = null">
                  <CloseIcon class="h-5 w-5" />
                </button>
              </div>

              <div v-if="selectedTag" class="px-4 py-3">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="font-mono text-5xl font-semibold leading-none" :class="LEVEL_TEXT[level(selectedTag)]">
                    {{ selectedTag.reads }}<span class="text-2xl text-ink-faint">/{{ rounds }}</span>
                  </span>
                  <span class="text-right text-sm font-semibold"
                    :class="freshIds.has(selectedTag.epc_id) ? 'text-ok' : 'text-ink-soft'">
                    {{ freshIds.has(selectedTag.epc_id) ? 'Read now' : `Read ${ago(selectedTag.last_seen_s)}` }}
                  </span>
                </div>
                <p class="mt-1 text-sm" :class="LEVEL_TEXT[level(selectedTag)]">{{ LEVEL_LABEL[level(selectedTag)] }}</p>

                <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt class="text-xs text-ink-faint">Signal at the reader</dt>
                    <dd><SignalBars :rssi="selectedTag.rssi" /></dd>
                  </div>
                  <div>
                    <dt class="text-xs text-ink-faint">Range</dt>
                    <dd class="font-mono text-ink">{{ selectedTag.rssi_min }} to {{ selectedTag.rssi_max }}</dd>
                  </div>
                  <div class="col-span-2">
                    <dt class="flex justify-between text-xs text-ink-faint">
                      <span>Power at the tag (on-chip RSSI)</span>
                      <span class="font-mono">{{ selectedTag.tag_rssi || 'n/a' }}<template v-if="selectedTag.tag_rssi"> / {{ TAG_RSSI_MAX }}</template></span>
                    </dt>
                    <dd class="mt-1 h-2 overflow-hidden rounded-full bg-panel-strong">
                      <div class="h-full rounded-full"
                        :class="selectedTag.tag_rssi >= SUSPECT_TAG_RSSI ? 'bg-ok' : 'bg-warn'"
                        :style="{ width: tagRssiPct(selectedTag) }"></div>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-ink-faint">Invalid temperature</dt>
                    <dd class="font-mono" :class="selectedTag.invalid_temp ? 'text-warn' : 'text-ink'">
                      {{ selectedTag.invalid_temp }} of {{ selectedTag.reads }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-ink-faint">Antenna</dt>
                    <dd class="font-mono text-ink">{{ selectedTag.antenna }}</dd>
                  </div>
                </dl>

                <p v-if="suspect(selectedTag)" class="mt-3 rounded-lg bg-crit-soft px-3 py-2 text-sm text-crit">
                  The tag gets enough power but often returns an invalid temperature. It may be defective: try replacing it.
                </p>
              </div>
              <p v-else class="px-4 py-4 text-sm text-ink-soft">
                Not read since the last reset. Check that the tag faces an antenna and that nothing metallic covers it.
              </p>
              <div v-if="selectedSensor" class="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                <button type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5" :disabled="savingSensor" @click="removeSelected">
                  Remove from map
                </button>
              </div>
            </aside>
            <!-- Room under the content so the fixed finder (touch and narrow screens) never hides the last row. -->
            <div v-if="selectedId" class="hidden h-80 mobile:block" aria-hidden="true"></div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
