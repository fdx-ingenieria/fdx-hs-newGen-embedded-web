<script setup lang="ts">
  import { PropType, onMounted, ref, watch } from 'vue';
  import { IAlarm, LabelType, AlarmType, ReleFlag, ISensorState, ISensor } from '@/commons';
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
      0: 'bg-red-100 text-red-800',
      1: 'bg-yellow-100 text-yellow-800',
      2: 'bg-indigo-100 text-indigo-800',
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-green-100 text-green-800',
      5: 'bg-orange-100 text-orange-800',
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
        return alarm.name.toUpperCase().includes(str)
          || AlarmType[alarm.alarm_type].toUpperCase().includes(str)
          || ReleFlag[alarm.relay_flag].toUpperCase().includes(str)
      }
    )
  }

  const searcHighlight = (text: string): string => {
    if (!searchText.value) return text

    const regex = new RegExp(`(${searchText.value})`, "gi");
    return text.replace(regex, '<span class="text-red-500 font-bold">$1</span>');
  }

  const toggleSensorsData = (alarmId: number) => {
    if (showSensor.value === alarmId) {
      showSensor.value = -1
    } else {
      showSensor.value = alarmId
    }
  }

  const alarmSensors = (sensorsStates: ISensorState[] = []) => {
    console.log(sensorsStates)
    const alarmSensors: ISensor[] = []
    globalStore.getConfiguredSensors.forEach(sensor => {
      const sensorState = sensorsStates.find(state => state.EPC === sensor.EPC)
      if (sensorState) {
        sensor.alarmed = sensorState.state
        alarmSensors.push(sensor)
      }
    })
    return alarmSensors
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
              <SearchIcon class="w-5 h-5 text-gray-500" />
            </div>
            <input v-model="searchText" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2" placeholder="Search">
          </div>
        </div>
      </div>
    </div>
    <table class="w-full text-sm text-left text-gray-500 whitespace-nowrap">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
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
            class="border-b hover:bg-gray-100 cursor-pointer"
            :class="{'bg-red-200 hover:bg-red-300': item.status?.state}">
            <th scope="row" class="px-4 py-3 font-medium text-gray-900 ">{{ item.id }}</th>
            <td class="px-4 py-3" v-html="searcHighlight(item.name)"></td>
            <td class="px-4 py-3" v-html="searcHighlight(AlarmType[item.alarm_type])"></td>
            <td class="px-4 py-3">{{ item.set_point }}</td>
            <td class="px-4 py-3" v-html="searcHighlight(ReleFlag[item.relay_flag])"></td>
            <td class="px-4 py-3 flex flex-wrap gap-1 justify-center">
              <span v-for="field in item.fields" class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full"
                :class="getFieldClass(field.equipment)">
                {{ globalStore.getLabelName(LabelType.EQUIPMENT, field.equipment) }}/
                {{ globalStore.getLabelName(LabelType.LOCATION, field.location) }}
              </span>
            </td>
            <td v-if="!readonly" class="px-4 py-3 text-center hidden md:table-cell">
                <button type="button"
                  @click="emit('edit', item.id)"
                  @click.stop
                  class="text-white border border-blue-500 bg-blue-500 font-medium rounded-lg text-sm p-0.5 text-center inline items-center mr-2">
                  <EditIcon class="w-4" />
                  <span class="sr-only">Edit</span>
                </button>
            </td>
          </tr>
          <tr v-show="showSensor === item.id" class="transition-all duration-700 ease-in-out">
            <td class="bg-gray-700 text-white text-center"><div class="-rotate-90">Sensors</div></td>
            <td colspan="100%" class="transition-all duration-700 ease-in-out">
              <SensorTable :availableSensors="alarmSensors(item.status?.sensors)" :readonly="true" :max="50" :showfooter="false" />
            </td>
          </tr>
        </template>
      </transition-group>
    </table>
    <div
      v-if="!localAvailableAlarms.length"
      class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 mx-auto text-center" role="alert">
      <span class="font-medium">Nothing found.</span> It seems the data is on a coffee break.
    </div>
    <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
      <span class="text-sm font-normal text-gray-500">
        Showing
        <span class="font-semibold text-gray-900">{{ localAvailableAlarms.length }}</span>
        of
        <span class="font-semibold text-gray-900">{{ availableAlarms.length }}</span>
        <template v-if="max" class="self-end">
          | max
          <span class="font-semibold text-gray-900">{{ max }}</span>
        </template>
      </span>
    </nav>
  </div>
</template>

<style scoped></style>
