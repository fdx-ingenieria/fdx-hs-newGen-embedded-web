<script setup lang="ts">
  import { PropType, onBeforeUnmount, computed, ref } from 'vue';
  import { LabelType, ISensor } from '@/commons';
  import { EditIcon, RefreshIcon, LoadingIcon, ClockIcon, FlagIcon, ThermometerIcon, BellCurveIcon, SearchIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import SensorSignal from './SensorSignal.vue';

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
    }
  })

  const globalStore = useGlobalStore()
  const now = ref(Math.floor(Date.now() / 1000))
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
      .sort((a, b) => a.id.toUpperCase().localeCompare(b.id.toUpperCase(), 'en', { sensitivity: 'base' }))
  })

  const emit = defineEmits<{
    edit: [id: string],
    reset: [id: string]
  }>()

  const searcHighlight = (text: string): string => {
    if (!searchText.value) return text

    const regex = new RegExp(`(${searchText.value})`, "gi");
    return text.replace(regex, '<span class="text-brand font-bold">$1</span>');
  }

  const intervalId = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000);

  // Remove the interval before unmounting the component
  onBeforeUnmount(() => {
    clearInterval(intervalId);
  });

</script>

<template>
  <div class="overflow-x-auto">
    <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
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
    <table class="w-full text-sm text-left text-ink-soft whitespace-nowrap">
      <thead class="border-y border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
        <tr>
          <th scope="col" class="px-4 py-3">ID</th>
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
          <th scope="row" class="px-4 py-3 font-mono font-medium text-ink" v-html="searcHighlight(item.id)"></th>
          <th scope="row" class="px-4 py-3 font-mono font-medium text-ink-soft" v-html="searcHighlight(item.EPC)"></th>
          <template v-if="showlabels">
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.EQUIPMENT, item.config.equipment))"></td>
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.LOCATION, item.config.location))"></td>
            <td class="px-4 py-3" v-html="searcHighlight(globalStore.getLabelName(LabelType.POSITION, item.config.position))"></td>
          </template>
          <template v-if="showdata">
            <template v-if="item.data">
              <td class="px-4 py-3">
                <small title="Average temperature" class="flex items-center font-mono text-xs text-ink"><ThermometerIcon class="h-4 mr-1 text-ink-faint" />{{ item.data?.avg_temp }}</small>
                <small title='Standard deviation' class="flex items-center font-mono text-ink-faint"><BellCurveIcon class="w-3 h-3 mx-1" />{{ item.data?.std_dev }}</small>
              </td>
              <td class="px-4 py-3 text-center">
                <SensorSignal v-if="item.data" :sensor-data="item.data" />
              </td>
              <td v-if="showdata" scope="col" class="px-4 py-3">
                <small title="Number of readings" class="flex items-center font-mono text-xs text-ink-soft"><FlagIcon class="w-4 h-4 mr-1 text-ink-faint" />{{ item.data?.n_readings }}</small>
                <small title='Last update' class="flex items-center font-mono text-ink-faint"><ClockIcon class="w-3 h-3 mr-1" />
                  {{ item.data?.timestamp ? Math.max(0, now - item.data.timestamp) : '–' }}
                </small>
              </td>
            </template>
            <td v-else class="px-4 py-3" colspan="3">
              <LoadingIcon class="animate-spin fill-transparent text-ok w-4 m-auto" />
            </td>
          </template>
          <td v-show="!readonly" class="px-4 py-3 text-center">
              <button type="button"
                @click="emit('edit', item.id)"
                title="Edit"
                class="mr-2 inline-flex items-center rounded-lg bg-accent p-1.5 text-accent-fg hover:brightness-110">
                <EditIcon class="w-4" />
                <span class="sr-only">Edit</span>
              </button>
              <button type="button"
                v-if="showreset"
                @click="emit('reset', item.id)"
                title="Reset"
                class="mr-2 inline-flex items-center rounded-lg bg-crit p-1.5 text-white hover:brightness-110">
                <RefreshIcon class="w-4" />
                <span class="sr-only">Reset</span>
              </button>
          </td>
        </tr>
      </transition-group>
    </table>
    <div v-if="!availableSensors?.length"
      class="mx-auto m-4 rounded-lg border border-warn/30 bg-warn-soft p-4 text-center text-sm text-warn" role="alert">
      <span class="font-semibold">Nothing found.</span> It seems the data is on a coffee break.
    </div>
    <div v-if="discovery" class="w-full flex justify-center items-center mt-6">
      <LoadingIcon class="animate-spin fill-transparent text-ok w-8 opacity-80 mr-2" />
      <span class="font-bold text-ink-soft">Discovering .... stay tuned!</span>
    </div>
    <nav v-if="showfooter" class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
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
