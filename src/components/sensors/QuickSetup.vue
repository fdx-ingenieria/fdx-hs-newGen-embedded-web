<script setup lang="ts">
  import { PropType, computed, ref } from 'vue';
  import { ISensor } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { usePlacement } from '@/composables/placement';
  import { CloseIcon, LoadingIcon, SearchIcon, SendIcon } from '@/components/icons';
  import SensorSignal from './SensorSignal.vue';

  // Bulk registration on the location x position grid; the placement itself is shared with Installation.
  const props = defineProps({
    unconfigured: { type: Array as PropType<ISensor[]>, required: true },
    configured: { type: Array as PropType<ISensor[]>, required: true },
    max: { type: Number, required: true },
  })
  const emit = defineEmits<{ close: [] }>()

  const globalStore = useGlobalStore()
  const saving = ref(false)
  const startingDiscovery = ref(false)

  const {
    equipments, locations, positions, equipment, key, cursor,
    taken, assigned, place, unassign, selectCell, pending, pendingFor, assignedIds, save: savePlacements,
  } = usePlacement(computed(() => props.configured), computed(() => props.unconfigured.map(s => s.id)), props.max)

  // Sorted by name, not signal: live RSSI reordering would move tags under the finger.
  const tray = computed(() => props.unconfigured
    .filter(s => !assignedIds.value.has(s.id))
    .slice()
    .sort((a, b) => a.EPC.localeCompare(b.EPC)))

  const sensorById = (id: string) => props.unconfigured.find(s => s.id === id)

  // Desktop extra: drag a tag onto any free cell.
  function onDragStart(e: DragEvent, id: string): void {
    e.dataTransfer?.setData('text/plain', id)
  }
  function onDrop(e: DragEvent, cell: string): void {
    const id = e.dataTransfer?.getData('text/plain')
    if (id) place(cell, id)
  }

  async function startDiscovery(): Promise<void> {
    startingDiscovery.value = true
    try {
      await globalStore.startDiscoveryMode()
    } finally {
      startingDiscovery.value = false
    }
  }

  async function save(): Promise<void> {
    if (!pending.value) return
    saving.value = true
    try {
      await savePlacements(id => sensorById(id)?.EPC ?? id)
      emit('close')
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div>
    <div class="mb-4 flex items-baseline gap-2 border-b border-line pb-2">
      <h3 class="text-lg font-semibold text-ink">Quick setup</h3>
    </div>

    <span class="field-label" id="qs-equipment">Equipment</span>
    <div class="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-panel-soft p-1" role="radiogroup" aria-labelledby="qs-equipment">
      <button v-for="e in equipments" :key="e.index" type="button" role="radio" :aria-checked="equipment === e.index"
        class="flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold [@media(pointer:coarse)]:py-2.5"
        :class="equipment === e.index ? 'bg-panel text-ink shadow-sm ring-1 ring-line' : 'text-ink-faint hover:text-ink'"
        @click="equipment = e.index">
        {{ e.label }}
        <span v-if="pendingFor(e.index)" class="ml-1 rounded-full bg-ok-soft px-1.5 font-mono text-xs text-ok"
          :aria-label="`${pendingFor(e.index)} placed, not saved yet`">{{ pendingFor(e.index) }}</span>
      </button>
    </div>

    <p class="mb-2 text-sm text-ink-soft">
      Tap a tag below to place it in the highlighted cell; the next empty cell is highlighted after each one.
      Tap a cell to choose it, or its × to take the tag back.
    </p>

    <!-- Grid: locations (rows) x positions (columns). -->
    <div class="mb-4 overflow-x-auto">
      <div class="grid min-w-max gap-1.5"
        :style="{ gridTemplateColumns: `minmax(7rem, auto) repeat(${positions.length}, minmax(5.5rem, 1fr))` }">
        <span></span>
        <span v-for="p in positions" :key="`h-${p.index}`" class="text-center text-sm font-semibold text-ink-soft">{{ p.label }}</span>
        <template v-for="l in locations" :key="`r-${l.index}`">
          <span class="flex items-center pr-2 text-sm font-medium text-ink">{{ l.label }}</span>
          <div v-for="p in positions" :key="key(l.index, p.index)"
            class="relative flex h-14 items-center justify-center rounded-lg border text-sm"
            :class="taken[key(l.index, p.index)]
              ? 'border-line bg-panel-strong text-ink-faint'
              : assigned[key(l.index, p.index)]
                ? 'border-ok/60 bg-ok-soft text-ink'
                : cursor === key(l.index, p.index)
                  ? 'border-accent bg-accent-soft ring-2 ring-accent'
                  : 'border-dashed border-line bg-panel-soft text-ink-faint'"
            @dragover.prevent @drop.prevent="onDrop($event, key(l.index, p.index))">
            <button type="button" class="absolute inset-0 rounded-lg" :disabled="!!taken[key(l.index, p.index)]"
              :aria-label="`${l.label} ${p.label}`" @click="selectCell(key(l.index, p.index))"></button>
            <template v-if="taken[key(l.index, p.index)]">
              <span class="pointer-events-none text-center leading-tight">
                <span class="block font-semibold">{{ taken[key(l.index, p.index)].EPC }}</span>
                <span class="block text-[11px]">configured</span>
              </span>
            </template>
            <template v-else-if="assigned[key(l.index, p.index)]">
              <span class="pointer-events-none font-semibold">{{ sensorById(assigned[key(l.index, p.index)])?.EPC }}</span>
              <button type="button" class="absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:text-crit"
                :aria-label="`Remove the tag from ${l.label} ${p.label}`" @click.stop="unassign(key(l.index, p.index))">
                <CloseIcon class="h-3.5 w-3.5" />
              </button>
            </template>
            <span v-else class="pointer-events-none">{{ cursor === key(l.index, p.index) ? 'Next' : 'Empty' }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Tray: tags read by discovery that are not configured yet. -->
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="field-label mb-0">Tags found ({{ tray.length }})</span>
      <button v-if="!globalStore.getDiscoveryModeOn" type="button" class="btn-primary !px-3 !py-1.5"
        :disabled="startingDiscovery" @click="startDiscovery">
        <LoadingIcon v-if="startingDiscovery" class="h-4 w-4 animate-spin fill-transparent" />
        <SearchIcon v-else class="h-4" /> Discovery
      </button>
      <span v-else class="flex items-center gap-1.5 text-xs text-ink-soft">
        <LoadingIcon class="h-3.5 w-3.5 animate-spin fill-transparent text-ok" /> Listening
      </span>
    </div>
    <div v-if="tray.length" class="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      <button v-for="s in tray" :key="s.id" type="button" draggable="true"
        :disabled="!cursor"
        class="flex flex-col items-start rounded-lg border border-line bg-panel px-3 py-2 text-left hover:border-accent disabled:opacity-50"
        @dragstart="onDragStart($event, s.id)" @click="place(cursor, s.id)">
        <span class="text-base font-semibold text-ink">{{ s.EPC }}</span>
        <SensorSignal v-if="s.data" :sensor-data="s.data" />
      </button>
    </div>
    <p v-else class="mb-4 rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-ink-faint">
      {{ globalStore.getDiscoveryModeOn ? 'No new tags yet. They show up here as the antennas read them.' : 'Start discovery to list the tags in range.' }}
    </p>

    <div class="flex flex-wrap items-center gap-3 mobile:sticky mobile:bottom-0 mobile:-mx-4 mobile:-mb-6 mobile:border-t mobile:border-line mobile:bg-panel mobile:px-4 mobile:pb-4 mobile:pt-3">
      <button type="button" class="btn-primary" :disabled="!pending || saving" @click="save">
        <LoadingIcon v-if="saving" class="h-4 w-4 animate-spin fill-transparent" />
        <SendIcon v-else class="w-4" />
        Save {{ pending }} {{ pending === 1 ? 'sensor' : 'sensors' }}
      </button>
      <button type="button" class="btn-ghost" :disabled="saving" @click="emit('close')">Cancel</button>
      <span class="ml-auto text-xs text-ink-faint">{{ configured.length + pending }} / {{ max }} sensors</span>
    </div>
  </div>
</template>

<style scoped></style>
