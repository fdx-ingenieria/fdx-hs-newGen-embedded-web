<script setup lang="ts">
  import { PropType, computed, ref } from 'vue';
  import { LabelType, ISensor, highlightMatch } from '@/commons';
  import { BellRingIcon, EditIcon, RefreshIcon, LoadingIcon, ClockIcon, FlagIcon, ThermometerIcon, BellCurveIcon, SearchIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import SensorSignal from './SensorSignal.vue';
  import SensorAge from './SensorAge.vue';
  import { useIsMobile } from '@/composables/mediaMode';

  const props = defineProps({
    availableSensors: {
      type: Array as PropType<ISensor[]>,
      required: true
    },
    discovery: {
      type: Boolean,
      default: false
    },
    showlabels: {
      type: Boolean,
      default: false
    },
    // Configured sensors: show the Modbus slot instead of the EPC-derived ID and order
    // by it. Unconfigured sensors have no slot, so they keep the ID column.
    showslot: {
      type: Boolean,
      default: false
    },
    showreset: {
      type: Boolean,
      default: false
    },
    showfooter: {
      type: Boolean,
      default: true
    },
    showdata: {
      type: Boolean,
      default: true,
    },
    max: {
      type: Number,
      default: 0
    },
    readonly: {
      type: Boolean,
      default: false
    },
    emptyText: {
      type: String,
      default: 'No sensors to show.'
    },
    // Nested inside another card: one column regardless of screen width.
    stacked: {
      type: Boolean,
      default: false
    }
  })

  const globalStore = useGlobalStore()

  // Always one decimal, so 23 shows as 23.0 and the column keeps its width.
  const fmtTemp = (t: number | undefined) => (typeof t === 'number' && !Number.isNaN(t) ? t.toFixed(1) : '–')
  const isMobile = useIsMobile()
  const searchText = ref('')

  const localAvailableSensors = computed(() => {
    const str = searchText.value.toUpperCase()
    return props.availableSensors
      .filter(sensor =>
        !str
          || sensor.id.toUpperCase().includes(str)
          || sensor.EPC.toUpperCase().includes(str)
          || (props.showlabels && globalStore.getLabelName(LabelType.EQUIPMENT, sensor.config.equipment).toUpperCase().includes(str))
          || (props.showlabels && globalStore.getLabelName(LabelType.POSITION, sensor.config.position).toUpperCase().includes(str))
          || (props.showlabels && globalStore.getLabelName(LabelType.LOCATION, sensor.config.location).toUpperCase().includes(str))
      )
      .sort((a, b) => (props.showslot || (a.slot != null && b.slot != null))
        ? (a.slot ?? 0) - (b.slot ?? 0)
        : a.id.toUpperCase().localeCompare(b.id.toUpperCase(), 'en', { sensitivity: 'base' }))
  })

  const emit = defineEmits<{
    edit: [id: string],
    reset: [id: string]
  }>()

  // EPC hex for display: drop leading zero padding (keep at least one char).
  const displayId = (id: string): string => id.replace(/^0+(?=.)/, '')

  const searcHighlight = (text: string): string => highlightMatch(text, searchText.value)


</script>

<template>
  <div class="overflow-x-auto">
    <div v-if="availableSensors.length" class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
      <div class="w-full md:w-1/2">
        <div class="flex items-center">
          <label for="simple-search" class="sr-only">Search</label>
          <div class="relative w-full">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon class="w-5 h-5 text-ink-faint" />
            </div>
            <input v-model="searchText" type="text" class="input pl-10" placeholder="Search">
          </div>
        </div>
      </div>
    </div>
    <!-- Mobile mode: one card per sensor, name and reading first; a grid when the screen has room. -->
    <ul v-if="isMobile" class="grid gap-2 border-t border-line p-3"
      :class="{'sm:grid-cols-2 xl:grid-cols-3': !stacked}">
      <li v-for="item in localAvailableSensors" :key="`card-${item.id}`"
        class="overflow-hidden rounded-lg border"
        :class="item?.alarmed ? 'card-alarmed' : 'border-line bg-panel-soft'">
        <component :is="readonly ? 'div' : 'button'"
          :type="readonly ? undefined : 'button'"
          @click="!readonly && emit('edit', item.id)"
          class="flex w-full flex-col gap-1.5 px-3 py-2.5 text-left">
          <span class="flex w-full items-center gap-2">
            <span class="min-w-0 truncate text-base font-semibold text-ink" v-html="searcHighlight(item.EPC)"></span>
            <span class="shrink-0 font-mono text-xs text-ink-faint" v-html="searcHighlight(displayId(item.id))"></span>
            <span v-if="showslot" class="shrink-0 rounded border border-line px-1.5 font-mono text-[11px] text-ink-soft"
              :title="`Modbus slot ${item.slot}`">slot {{ item.slot }}</span>
            <span v-if="item?.alarmed" class="alarm-flag ml-auto"><BellRingIcon class="h-4 w-4" /> Alarm</span>
            <EditIcon v-if="!readonly" class="w-4 shrink-0 text-ink-faint" :class="{'ml-auto': !item?.alarmed}" />
          </span>
          <span v-if="showlabels" class="block truncate text-sm text-ink-soft">
            <span v-html="searcHighlight(globalStore.getLabelName(LabelType.EQUIPMENT, item.config.equipment))"></span>
            /
            <span v-html="searcHighlight(globalStore.getLabelName(LabelType.LOCATION, item.config.location))"></span>
            /
            <span v-html="searcHighlight(globalStore.getLabelName(LabelType.POSITION, item.config.position))"></span>
          </span>
          <span v-if="showdata" class="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1">
            <template v-if="item.data">
              <span class="block shrink-0 font-mono leading-none text-ink" title="Average temperature">
                <span class="text-2xl font-bold">{{ fmtTemp(item.data.avg_temp) }}</span>
                <span class="text-sm text-ink-faint"> °C ±{{ item.data.std_dev }}</span>
              </span>
              <SensorSignal :sensor-data="item.data" class="shrink-0" />
              <span class="ml-auto flex shrink-0 items-center font-mono text-xs text-ink-faint" title="Last update">
                <ClockIcon class="mr-1 h-3 w-3" />
                <SensorAge :timestamp="item.data.timestamp" suffix=" s ago" />
              </span>
            </template>
            <LoadingIcon v-else class="w-4 animate-spin fill-transparent text-ok" />
          </span>
        </component>
      </li>
    </ul>
    <table v-else-if="availableSensors.length" class="w-full text-sm text-left text-ink-soft whitespace-nowrap">
      <thead class="border-y border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
        <tr>
          <th scope="col" class="px-4 py-3">{{ showslot ? 'Slot' : 'ID' }}</th>
          <th scope="col" class="px-4 py-3">EPC</th>
          <template v-if="showlabels">
            <th scope="col" class="px-4 py-3">{{ LabelType.EQUIPMENT }}</th>
            <th scope="col" class="px-4 py-3">{{ LabelType.LOCATION }}</th>
            <th scope="col" class="px-4 py-3">{{ LabelType.POSITION }}</th>
          </template>
          <th v-if="showdata" scope="col" class="px-4 py-3">Temp</th>
          <th v-if="showdata" scope="col" class="px-4 py-3 text-center">Signal</th>
          <th v-if="showdata" scope="col" class="px-4 py-3">Updated</th>
          <th v-show="!readonly" scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <transition-group name="list" tag="tbody">
        <tr @click="emit('edit', item.id)" v-for="item in localAvailableSensors"
          class="border-b border-line hover:bg-panel-strong" :key="`${item.id}`"
          :class="{'cursor-pointer': !readonly, '!bg-crit-soft hover:!brightness-95': item?.alarmed}">
          <th v-if="showslot" scope="row" class="px-4 py-3 font-mono font-medium text-ink" :title="`Modbus slot ${item.slot}`">{{ item.slot }}</th>
          <th v-else scope="row" class="px-4 py-3 font-mono font-medium text-ink" v-html="searcHighlight(displayId(item.id))"></th>
          <th scope="row" class="px-4 py-3 font-mono font-medium text-ink-soft" v-html="searcHighlight(item.EPC)"></th>
          <template v-if="showlabels">
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.EQUIPMENT, item.config.equipment))"></td>
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.LOCATION, item.config.location))"></td>
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.POSITION, item.config.position))"></td>
          </template>
          <template v-if="showdata">
            <template v-if="item.data">
              <td class="px-4 py-3">
                <small title="Average temperature" class="flex items-center font-mono text-xs text-ink"><ThermometerIcon class="h-4 mr-1 text-ink-faint" />{{ fmtTemp(item.data?.avg_temp) }}</small>
                <small title='Standard deviation' class="flex items-center font-mono text-ink-faint"><BellCurveIcon class="w-3 h-3 mx-1" />{{ item.data?.std_dev }}</small>
              </td>
              <td class="px-4 py-3 text-center">
                <SensorSignal v-if="item.data" :sensor-data="item.data" />
              </td>
              <td v-if="showdata" scope="col" class="px-4 py-3">
                <small title="Number of readings" class="flex items-center font-mono text-xs text-ink-soft"><FlagIcon class="w-4 h-4 mr-1 text-ink-faint" />{{ item.data?.n_readings }}</small>
                <small title='Last update' class="flex items-center font-mono text-ink-faint"><ClockIcon class="w-3 h-3 mr-1" />
                  <SensorAge :timestamp="item.data?.timestamp" />
                </small>
              </td>
            </template>
            <td v-else class="px-4 py-3" colspan="3">
              <LoadingIcon class="animate-spin fill-transparent text-ok w-4 m-auto" />
            </td>
          </template>
          <td v-show="!readonly" class="px-4 py-3 text-center">
              <button type="button"
                @click.stop="emit('edit', item.id)"
                title="Edit"
                class="mr-2 inline-flex items-center rounded-lg bg-accent p-1.5 text-accent-fg hover:brightness-110">
                <EditIcon class="w-4" />
                <span class="sr-only">Edit</span>
              </button>
              <button type="button"
                v-if="showreset"
                @click.stop="emit('reset', item.id)"
                title="Reset"
                class="mr-2 inline-flex items-center rounded-lg bg-crit p-1.5 text-white hover:brightness-110">
                <RefreshIcon class="w-4" />
                <span class="sr-only">Reset</span>
              </button>
          </td>
        </tr>
      </transition-group>
    </table>
    <p v-if="discovery" class="flex items-center justify-center gap-2 px-4 py-4 text-sm text-ink-soft">
      <LoadingIcon class="h-4 w-4 animate-spin fill-transparent text-ok" />
      Listening for tags in range of the antennas
    </p>
    <p v-else-if="!availableSensors?.length" class="px-4 py-6 text-center text-sm text-ink-faint">{{ emptyText }}</p>
    <p v-else-if="!localAvailableSensors.length" class="px-4 py-6 text-center text-sm text-ink-faint">
      No sensors match "{{ searchText }}".
    </p>
    <nav v-if="showfooter && availableSensors.length" class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
      <span class="text-sm font-normal text-ink-faint">
        Showing
        <span class="font-mono font-semibold text-ink">{{ localAvailableSensors.length }}</span>
        of
        <span class="font-mono font-semibold text-ink">{{ availableSensors.length }}</span>
        <template v-if="max" class="self-end">
          | max
          <span class="font-mono font-semibold text-ink">{{ max }}</span>
        </template>
      </span>
    </nav>
  </div>
</template>

<style scoped></style>
