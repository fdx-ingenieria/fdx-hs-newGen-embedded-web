<script setup lang="ts">
  import { PropType, onMounted, ref, watch } from 'vue';
  import { IAlarm, LabelType, AlarmType, ReleFlag } from '@/commons';
  import { EditIcon, SearchIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global';
  import SensorTable from '../sensors/SensorTable.vue';

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

  const searcHighlight = (text: string): string => {
    if (!searchText.value) return text

    const regex = new RegExp(`(${searchText.value})`, "gi");
    return text.replace(regex, '<span class="text-brand font-bold">$1</span>');
  }

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
    <table class="w-full text-sm text-left text-ink-soft whitespace-nowrap">
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
              {{ item.set_point }}
              <span v-if="item.alarm_type === 4" class="text-ink-faint"> / {{ item.reset_point }}</span>
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
    <div
      v-if="!localAvailableAlarms.length"
      class="mx-auto m-4 rounded-lg border border-warn/30 bg-warn-soft p-4 text-center text-sm text-warn" role="alert">
      <span class="font-semibold">Nothing found.</span> It seems the data is on a coffee break.
    </div>
    <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
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
