<script setup lang="ts">
  import { PropType, computed } from 'vue';
  import { ISensor, SensorQuality } from '@/commons';
  import { BellRingIcon, ClockIcon, FlagIcon } from '@/components/icons';
  import SensorSignal from './SensorSignal.vue';
  import SensorAge from './SensorAge.vue';
  import { useGlobalStore } from '@/stores/global';

  // Read-only map of the configured sensors, laid out like Quick setup: one block per equipment, locations x positions.
  const props = defineProps({
    sensors: { type: Array as PropType<ISensor[]>, required: true },
    emptyText: { type: String, default: 'No sensors configured yet.' },
  })

  const globalStore = useGlobalStore()

  const options = (list: string[] | undefined) =>
    (list ?? []).map((label, index) => ({ label, index })).filter(o => o.index > 0 && !!o.label)
  const locations = computed(() => options(globalStore.getAvailableLabels.location))
  const positions = computed(() => options(globalStore.getAvailableLabels.position))

  const key = (location: number, position: number) => `${location}-${position}`

  const hasTemp = (s: ISensor | undefined): boolean =>
    !!s?.data && s.data.quality !== SensorQuality.OUT_OF_SERVICE && typeof s.data.temp === 'number' && !Number.isNaN(s.data.temp)

  // Only equipments that hold at least one sensor; sensors whose labels fall outside the grid are counted apart.
  const blocks = computed(() => {
    const locs = new Set(locations.value.map(l => l.index))
    const poss = new Set(positions.value.map(p => p.index))
    return options(globalStore.getAvailableLabels.equipment)
      .map(e => {
        const cells: Record<string, ISensor> = {}
        let outside = 0
        props.sensors.filter(s => s.config.equipment === e.index).forEach(s => {
          if (locs.has(s.config.location) && poss.has(s.config.position)) cells[key(s.config.location, s.config.position)] = s
          else outside++
        })
        const list = Object.values(cells)
        return { ...e, cells, outside, count: list.length + outside, alarmed: list.some(s => s.alarmed) }
      })
      .filter(b => b.count)
  })

  const outsideTotal = computed(() => blocks.value.reduce((n, b) => n + b.outside, 0))

  // Spread between the hottest and coolest reading of a location (phase unbalance at a glance).
  const spread = (cells: Record<string, ISensor>, location: number): string => {
    const temps = positions.value.map(p => cells[key(location, p.index)]).filter(hasTemp).map(s => s.data!.temp)
    return temps.length > 1 ? (Math.max(...temps) - Math.min(...temps)).toFixed(1) : ''
  }

  // EPC hex for display: drop leading zero padding (keep at least one char).
  const displayId = (id: string): string => id.replace(/^0+(?=.)/, '')
</script>

<template>
  <div class="border-t border-line p-4 max-sm:p-3">
    <p v-if="!blocks.length" class="py-2 text-center text-sm text-ink-faint">{{ emptyText }}</p>

    <section v-for="b in blocks" :key="b.index" class="mb-4 overflow-hidden rounded-xl border border-line last:mb-0" :aria-label="b.label">
      <header class="panel-head">
        <h3 class="flex min-w-0 items-baseline gap-2">
          <span class="truncate">{{ b.label }}</span>
          <span class="shrink-0 text-xs font-normal tracking-normal text-ink-faint">{{ b.count }} {{ b.count === 1 ? 'sensor' : 'sensors' }}</span>
        </h3>
        <span v-if="b.alarmed" class="alarm-flag"><BellRingIcon class="h-4 w-4" /> Alarm</span>
      </header>

      <!-- Narrow screens put each location on its own line so the cells keep the full width. -->
      <div class="overflow-x-auto bg-panel p-3 max-sm:p-2">
        <div class="grid gap-2 max-sm:gap-1.5 [grid-template-columns:repeat(var(--cols),minmax(6.5rem,1fr))] md:[grid-template-columns:minmax(7rem,auto)_repeat(var(--cols),minmax(11rem,1fr))]"
          :style="{ '--cols': positions.length }">
          <span class="hidden md:block"></span>
          <span v-for="p in positions" :key="`h-${p.index}`"
            class="truncate px-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">{{ p.label }}</span>
          <template v-for="(l, i) in locations" :key="`r-${l.index}`">
            <span class="col-span-full flex items-baseline gap-2 pt-1 md:col-auto md:flex-col md:justify-center md:gap-0.5 md:border-0 md:mt-0 md:border-0 md:pr-2 md:pt-0" :class="{ 'mt-1 border-t border-line-soft pt-2': i > 0 }">
              <span class="text-sm font-semibold text-ink">{{ l.label }}</span>
              <span v-if="spread(b.cells, l.index)" class="font-mono text-xs text-ink-faint"
                title="Difference between the hottest and coolest sensor of this location">Δ {{ spread(b.cells, l.index) }} °C</span>
            </span>
            <template v-for="p in positions" :key="key(l.index, p.index)">
              <div v-if="b.cells[key(l.index, p.index)]"
                class="flex min-w-0 flex-col gap-1 rounded-lg border px-2.5 py-2 max-sm:px-2 max-sm:py-1.5"
                :class="b.cells[key(l.index, p.index)].alarmed ? 'card-alarmed' : 'border-line bg-panel-soft'">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="truncate text-sm font-semibold text-ink">{{ b.cells[key(l.index, p.index)].EPC }}</span>
                  <span class="hidden truncate font-mono text-xs text-ink-faint lg:inline">{{ displayId(b.cells[key(l.index, p.index)].id) }}</span>
                  <BellRingIcon v-if="b.cells[key(l.index, p.index)].alarmed" class="ml-auto h-4 w-4 shrink-0 text-crit" aria-label="Alarm" />
                </span>
                <template v-if="b.cells[key(l.index, p.index)].data">
                  <span class="font-mono leading-none" title="Average temperature">
                    <template v-if="hasTemp(b.cells[key(l.index, p.index)])">
                      <span class="text-xl font-bold max-sm:text-lg" :class="b.cells[key(l.index, p.index)].alarmed ? 'text-crit' : 'text-ink'">{{ b.cells[key(l.index, p.index)].data!.temp.toFixed(1) }}</span>
                      <span class="text-xs text-ink-faint"> °C<span class="max-sm:hidden"> ±{{ b.cells[key(l.index, p.index)].data!.std_dev }}</span></span>
                    </template>
                    <span v-else class="text-xl font-bold text-ink-faint max-sm:text-lg">–</span>
                  </span>
                  <SensorSignal :sensor-data="b.cells[key(l.index, p.index)].data!" class="flex-wrap" />
                  <span class="flex items-center gap-3 font-mono text-xs max-sm:hidden">
                    <span class="flex items-center text-ink-soft" :title="`${b.cells[key(l.index, p.index)].data!.n_readings} readings in the last window`">
                      <FlagIcon class="mr-1 h-3.5 w-3.5 text-ink-faint" />{{ b.cells[key(l.index, p.index)].data!.n_readings }}
                    </span>
                    <span class="flex items-center text-ink-faint" title="Last update">
                      <ClockIcon class="mr-1 h-3 w-3" /><SensorAge :timestamp="b.cells[key(l.index, p.index)].data!.timestamp" suffix=" s ago" />
                    </span>
                    <span v-if="b.cells[key(l.index, p.index)].slot != null" class="ml-auto rounded border border-line px-1.5 text-[11px] text-ink-soft"
                      :title="`Modbus slot ${b.cells[key(l.index, p.index)].slot}`">slot {{ b.cells[key(l.index, p.index)].slot }}</span>
                  </span>
                </template>
                <span v-else class="text-xs text-ink-faint">Waiting for the first reading</span>
              </div>
              <div v-else class="flex items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-faint max-sm:min-h-[4.5rem]">Empty</div>
            </template>
          </template>
        </div>
      </div>
    </section>

    <p v-if="outsideTotal" class="mt-4 text-xs text-ink-faint">
      {{ outsideTotal }} {{ outsideTotal === 1 ? 'sensor has' : 'sensors have' }} a location or position without a label and {{ outsideTotal === 1 ? 'is' : 'are' }} only in the list.
    </p>
  </div>
</template>

<style scoped></style>
