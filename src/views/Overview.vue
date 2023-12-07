<script setup lang="ts">
  import { IAlarm } from '@/commons';
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import {
    AlarmIcon,
    LoadingIcon,
    SensorIcon,
    ThermometerHighIcon,
    ThermometerLowIcon,
    BellRingIcon
  } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import { useGlobalStore } from '@/stores/global';
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

  const globalStore = useGlobalStore()
  const {
    getConfiguredAlarms,
    getConfiguredSensors,
    getSensorsData,
    getAlarmsData,
  } = storeToRefs(globalStore)
  const loading = ref(true)
  const activeTab = ref('alarms')
  const localAlarms = ref([] as IAlarm[])

  watch(
    () => getConfiguredAlarms.value,
    (newValue) => {
      localAlarms.value = newValue
    }
  )

  const getTabClass = (type: string): string => {
    if (type === activeTab.value) {
      return 'border-fdx-red text-fdx-red active'
    }
    return 'border-transparent hover:text-gray-600 hover:border-gray-300'
  }

  const temperatures = computed(() => {
    // Order by temperature
    const ordered = getSensorsData.value.sort((a, b) => {
      if (a.temp && b.temp) {
        return a.temp - b.temp
      }
      return 0
    })
    return { min: ordered.shift() , max:ordered.pop() }
  })

  const alarmed = computed(() => {
    let alarms = new Map()
    let sensors =  new Map()

    getAlarmsData.value.forEach(element => {
      if (element.state) {
        alarms.set(element.id.toString(16), element)
        element.sensors.forEach(sensor => {
          sensors.set(sensor.EPC, sensor)
        });
      }
    });
    return { alarms, sensors }
  })

  onMounted(async () => {
    loading.value = true
    await Promise.all([
      globalStore.startNormalMode(),
      globalStore.loadLabels(),
      globalStore.loadSensors(),
      globalStore.loadAlarms()
    ]).finally(() => loading.value = false)
  })

  onUnmounted(() => {
    if (globalStore.getNormaModeOn) globalStore.stopNormalMode()
  })
</script>
<template>
  <div class="antialiased bg-gray-50">
    <div class="grid grid-cols-1 gap-4 my-4 mt-8 sm:grid-cols-2 xl:grid-cols-4">
      <div class="relative flex items-center bg-white border rounded-sm overflow-hidden shadow">
        <div class="p-4 bg-orange-400">
          <AlarmIcon class="w-10 h-10 text-white" />
        </div>
        <LoadingIcon v-if="loading" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto" />
        <div v-else class="px-4 text-gray-700">
          <h3 class="text-sm tracking-wider font-semibold">Alarms</h3>
          <p class="text-xl flex items-center">
            <BellRingIcon class="w-5 h-5 mr-1" />
            {{ alarmed.alarms.size }}
            <small class="absolute bottom-0 right-2">{{ getConfiguredAlarms.length }} Total</small>
          </p>
        </div>
      </div>
      <div class="relative flex items-center bg-white border rounded-sm overflow-hidden shadow">
        <div class="p-4 bg-green-500">
          <SensorIcon class="w-10 h-10 text-white" />
        </div>
        <LoadingIcon v-if="loading" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto" />
        <div v-else class="px-4 text-gray-700">
          <h3 class="text-sm tracking-wider font-semibold">Sensors</h3>
          <p class="text-xl flex items-center">
            <BellRingIcon class="w-5 h-5 mr-1" />
            {{ alarmed.sensors.size }}
            <small class="absolute bottom-0 right-2">{{ getConfiguredSensors.length }} Total</small>
          </p>
        </div>
      </div>
      <div class="relative flex items-center bg-white border rounded-sm overflow-hidden shadow">
        <div class="p-4 bg-blue-500">
          <ThermometerLowIcon class="w-10 h-10 text-white" />
        </div>
        <LoadingIcon v-if="loading" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto" />
        <div v-else class="px-4 text-gray-700">
          <h3 class="text-sm tracking-wider font-semibold">Lower Temperature</h3>
          <p class="text-xl flex items-center" title="Lower">
            {{  temperatures.min?.temp }} <small class="ml-1 font-bold">°C</small>
            <small class="absolute bottom-0 right-2">{{  temperatures.min?.EPC }}</small>
          </p>
        </div>
      </div>
      <div class="relative flex items-center bg-white border rounded-sm overflow-hidden shadow">
        <div class="p-4 bg-red-500">
          <ThermometerHighIcon class="w-10 h-10 text-white" />
        </div>
        <LoadingIcon v-if="loading" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto" />
        <div v-else class="px-4 text-gray-700">
          <h3 class="text-sm tracking-wider font-semibold">Higher Temperature</h3>
          <p class="text-xl flex items-center" title="Higher">
            {{  temperatures.max?.temp }} <small class="ml-1 font-bold">°C</small>
            <small class="absolute bottom-0 right-2">{{  temperatures.max?.EPC }}</small>
          </p>
        </div>
      </div>
    </div>

    <div class="border-1 rounded-lg border-gray-300 mb-4">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden">
        <div class="text-sm font-semibold text-center text-gray-500 border-b border-gray-200">
          <ul class="flex flex-wrap -mb-px">
            <li class="mr-2">
              <a
                class="inline-block p-4 border-b-2 rounded-t-lg cursor-pointer"
                :class="getTabClass('alarms')"
                @click="activeTab = 'alarms'">Alarms</a>
            </li>
            <li class="mr-2">
              <a
              class="inline-block p-4 border-b-2 rounded-t-lg cursor-pointer"
              :class="getTabClass('sensors')"
                @click="activeTab = 'sensors'">Sensors</a>
            </li>
          </ul>
        </div>
        <transition-group name="slide-down-fade" appear tag="div" class="overflow-x-auto">
          <div v-if="activeTab === 'alarms'">
            <AlarmsTable :availableAlarms="getConfiguredAlarms" :readonly="true" :max="20" />
          </div>
          <div v-else-if="activeTab === 'sensors'">
            <SensorTable :availableSensors="getConfiguredSensors" :readonly="true" :max="50" />
          </div>
          <div v-else>Ups, something is wrong</div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
