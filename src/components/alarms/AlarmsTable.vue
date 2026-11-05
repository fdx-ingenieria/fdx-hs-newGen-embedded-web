<script setup lang="ts">
  import { PropType, computed, onMounted, ref, watch } from 'vue';
  import { IAlarm, LabelType, AlarmType, ReleFlag, highlightMatch } from '@/commons';
  import { BellRingIcon, EditIcon, SearchIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global';
  import SensorTable from '../sensors/SensorTable.vue';
  import { useIsMobile } from '@/composables/mediaMode';

  const props = defineProps({
    availableAlarms: {
      type: Array as PropType<IAlarm[]>,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    max: {
      type: Number,
      default: 0
    }
  })

  const globalStore = useGlobalStore()
  const isMobile = useIsMobile()

  const isActive = (alarm: IAlarm): boolean => !!alarm.alarm_type && !!alarm.fields?.length
  const activeAlarms = computed(() => localAvailableAlarms.value.filter(isActive))
  const unusedAlarms = computed(() => localAvailableAlarms.value.filter(a => !isActive(a)))

  const fieldsText = (alarm: IAlarm): string => alarm.fields
    .map(f => `${globalStore.getLabelName(LabelType.EQUIPMENT, f.equipment)} / ${globalStore.getLabelName(LabelType.LOCATION, f.location)}`)
    .join(', ')
  const localAvailableAlarms = ref([] as IAlarm[])
  const searchText = ref('')
  const showSensor = ref(-1)

  const getFieldClass = (equipment: number | undefined): string => {
    const classMap: Record<number, string> = {
      0: 'bg-crit-soft text-crit',
      1: 'bg-warn-soft text-warn',
      2: 'bg-idle-soft text-ink-soft',
      3: 'bg-info-soft text-info',
      4: 'bg-ok-soft text-ok',
      5: 'bg-accent-soft text-accent',
    };

    return equipment
      ? classMap[equipment]
      : '';
  };

  watch(searchText, () => filter())
  watch(
    () => props.availableAlarms,
    () => {
      localAvailableAlarms.value = props.availableAlarms
      filter()
    }
  )

  const filter = () => {
    const str = searchText.value.toUpperCase()

    localAvailableAlarms.value = props.availableAlarms.filter(
      alarm => {
        return !str
          || alarm.name.toUpperCase().includes(str)
          || AlarmType[alarm.alarm_type].toUpperCase().includes(str)
          || ReleFlag[alarm.relay_flag].toUpperCase().includes(str)
      }
    )
  }

  const searcHighlight = (text: string): string => highlightMatch(text, searchText.value)

  const toggleSensorsData = (alarmId: number) => {
    if (showSensor.value === alarmId) {
      showSensor.value = -1
    } else {
      showSensor.value = alarmId
    }
  }

  const emit = defineEmits<{
    edit: [index: number],
  }>()

  onMounted(() => filter())
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
    <!-- Mobile mode: one card per alarm in use; a red edge and "Active" only when it is triggered. -->
    <template v-if="isMobile">
      <ul class="grid gap-2 border-t border-line p-3 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="item in activeAlarms" :key="`card-${item.id}`"
          class="overflow-hidden rounded-lg border"
          :class="item.status?.state ? 'card-alarmed' : 'border-line bg-panel-soft'">
          <button type="button"
            @click="!readonly ? emit('edit', item.id) : toggleSensorsData(item.id)"
            :aria-expanded="readonly ? showSensor === item.id : undefined"
            class="flex w-full flex-col gap-1 px-3 py-2.5 text-left">
            <span class="flex w-full items-center gap-2">
              <span class="min-w-0 truncate text-base font-semibold text-ink" v-html="searcHighlight(item.name || `Alarm ${item.id}`)"></span>
              <span class="shrink-0 rounded border border-line px-1.5 font-mono text-[11px] text-ink-soft">slot {{ item.id }}</span>
              <span v-if="item.status?.state" class="alarm-flag ml-auto"><BellRingIcon class="h-4 w-4" /> Alarm</span>
              <EditIcon v-if="!readonly" class="w-4 shrink-0 text-ink-faint" :class="{'ml-auto': !item.status?.state}" />
            </span>
            <span class="flex w-full flex-wrap items-baseline gap-x-3 text-sm">
              <span class="text-ink-faint" v-html="searcHighlight(AlarmType[item.alarm_type])"></span>
              <span v-if="item.alarm_type === 4" class="text-ink-faint">
                off <b class="font-mono font-semibold text-ink">{{ item.reset_point }}</b> °C,
                on <b class="font-mono font-semibold text-ink">{{ item.set_point }}</b> °C
              </span>
              <span v-else class="text-ink-faint"><b class="font-mono font-semibold text-ink">{{ item.set_point }}</b> °C</span>
              <span class="ml-auto text-ink-soft">{{ item.relay_flag ? `Relay ${item.relay_flag}` : 'No relay' }}</span>
            </span>
            <span class="block truncate text-sm text-ink-faint" :title="fieldsText(item)">{{ fieldsText(item) }}</span>
          </button>
          <div v-if="readonly && showSensor === item.id" class="border-t border-line bg-panel">
            <SensorTable :availableSensors="item._sensors" :readonly="true" :showfooter="false" :stacked="true" />
          </div>
        </li>
      </ul>
      <!-- Slots without a function or locations never trigger: one compact strip, tap to set one up. -->
      <div v-if="!readonly && unusedAlarms.length" class="border-t border-line px-3 py-3">
        <p class="mb-2 text-sm text-ink-faint">Unused slots, tap one to set it up</p>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="item in unusedAlarms" :key="`free-${item.id}`" type="button"
            class="h-10 min-w-[2.5rem] rounded-md border border-line bg-panel-soft px-2 font-mono text-sm text-ink-soft active:bg-panel-strong"
            :aria-label="`Set up alarm slot ${item.id}`" @click="emit('edit', item.id)">
            {{ item.id }}
          </button>
        </div>
      </div>
    </template>
    <table v-else class="w-full text-sm text-left text-ink-soft whitespace-nowrap">
      <thead class="border-y border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
        <tr>
          <th scope="col" class="px-4 py-3">Id</th>
          <th scope="col" class="px-4 py-3">Name</th>
          <th scope="col" class="px-4 py-3">Function</th>
          <th scope="col" class="px-4 py-3">Set point</th>
          <th scope="col" class="px-4 py-3 text-center">Rele</th>
          <th scope="col" class="px-4 py-3 text-center">Ubication</th>
          <th v-if="!readonly" scope="col" class="px-4 py-3 hidden md:table-cell"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <transition-group name="fade" tag="tbody">
        <template v-for="item in localAvailableAlarms" :key="`${item.id}`" >
          <tr @click="!readonly ? emit('edit', item.id) : toggleSensorsData(item.id)"
            class="cursor-pointer border-b border-line hover:bg-panel-strong"
            :class="{'!bg-crit-soft hover:!brightness-95': item.status?.state}">
            <th scope="row" class="px-4 py-3 font-mono font-medium text-ink">{{ item.id }}</th>
            <td class="px-4 py-3 font-medium text-ink" v-html="searcHighlight(item.name)"></td>
            <td class="px-4 py-3" v-html="searcHighlight(AlarmType[item.alarm_type])"></td>
            <td class="px-4 py-3 font-mono">
              <span v-if="item.alarm_type === 4" :title="`Off below ${item.reset_point} °C, on above ${item.set_point} °C`">{{ item.reset_point }}<span class="text-ink-faint"> / </span>{{ item.set_point }}</span>
              <template v-else>{{ item.set_point }}</template>
            </td>
            <td class="px-4 py-3" v-html="searcHighlight(ReleFlag[item.relay_flag])"></td>
            <td class="px-4 py-3 flex flex-wrap gap-1 justify-center">
              <span v-for="field in item.fields" class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="getFieldClass(field.equipment)">
                {{ globalStore.getLabelName(LabelType.EQUIPMENT, field.equipment) }}/
                {{ globalStore.getLabelName(LabelType.LOCATION, field.location) }}
              </span>
            </td>
            <td v-if="!readonly" class="px-4 py-3 text-center hidden md:table-cell">
                <button type="button"
                  @click="emit('edit', item.id)"
                  @click.stop
                  title="Edit"
                  class="inline-flex items-center rounded-lg bg-accent p-1.5 text-accent-fg hover:brightness-110">
                  <EditIcon class="w-4" />
                  <span class="sr-only">Edit</span>
                </button>
            </td>
          </tr>
          <tr v-show="showSensor === item.id">
            <td class="w-1 bg-brand text-center text-white"><div class="-rotate-90 text-xs font-semibold uppercase tracking-wider">Sensors</div></td>
            <td colspan="100%" class="bg-panel-soft">
              <SensorTable :availableSensors="item._sensors" :readonly="true" :showfooter="false" />
            </td>
          </tr>
        </template>
      </transition-group>
    </table>
    <p v-if="!localAvailableAlarms.length" class="px-4 py-6 text-center text-sm text-ink-faint">
      {{ searchText ? `No alarms match "${searchText}".` : 'No alarms to show.' }}
    </p>
    <nav v-if="!isMobile" class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
      <span class="text-sm font-normal text-ink-faint">
        Showing
        <span class="font-mono font-semibold text-ink">{{ localAvailableAlarms.length }}</span>
        of
        <span class="font-mono font-semibold text-ink">{{ availableAlarms.length }}</span>
        <template v-if="max" class="self-end">
          | max
          <span class="font-mono font-semibold text-ink">{{ max }}</span>
        </template>
      </span>
    </nav>
  </div>
</template>

<style scoped></style>
