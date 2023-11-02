<script setup lang="ts">
  import { ISensor, ISensorData } from '@/commons';
  import { RefreshIcon, SendIcon, ListIcon, PlayIcon, StopIcon, AlertIcon } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, watch, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors, getAvailableLabels, getSensorsData } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const editableSensor: Ref<ISensor> = ref({ id: 0, config: { equipment: 0, position: 0, location: 0 }})
  const configuredSensors: Ref<ISensor[]> = ref([])
  const unconfiguredSensors: Ref<ISensor[]> = ref([])

  watch([getSensorsData], (newData) => {
    const newAvailableSensors = newData.pop() || []
    const availableSensorsIds = getAvailableSensors.value.map((item: ISensor) => item.id)

    // Check if there are new sensors and update existing ones
    newAvailableSensors.forEach((item: ISensorData) => {
      if (!availableSensorsIds.includes(item.id)) {
        globalStore.addNewSensor({
          id: item.id,
          config: {
            equipment: 0,
            position: 0,
            location: 0
          },
          quality: item.quality,
          rssid: item.rssid,
        })
      } else {
        globalStore.updateSensorData(item)
      }
    })
  })

  watch([getAvailableSensors], (newData) => {
    const newAvailableSensors = newData.pop() || []

    configuredSensors.value = []
    unconfiguredSensors.value = []
    newAvailableSensors.forEach((item: ISensor) => {
      if (item.config.equipment && item.config.position && item.config.location) {
        configuredSensors.value.push(item)
      } else {
        unconfiguredSensors.value.push(item)
      }
    })
    unconfiguredSensors.value.sort((a: ISensor, b: ISensor) => (a.rssid || 0) - (b.rssid || 0))
  })

  const isLimitReached = computed(() => {
    return getAvailableSensors.value.length >= 50;
  });

  const editSensor = (id: number) => {
    let sensor = getAvailableSensors.value.find((item: ISensor) => item.id === id)

    if (!sensor) return

    if (globalStore.getDiscoveryModeOn) globalStore.stopDiscoveryMode()

    // Deep copy prevents the reactivity of the original object
    editableSensor.value = JSON.parse(JSON.stringify(sensor))
    showRightSideBar.value = true
  }

  const isComplete = () => {
    const { equipment, position, location } = editableSensor.value.config
    return !!equipment && !!position && !!location && isLimitReached
  }

  const saveSensor = () => {
    if (!isComplete()) return
    const { id, config, quality, rssid, time_stamp } = editableSensor.value
    const newSensorData = getAvailableSensors.value.map((item: ISensor) => {
      if (item.id === id) {
        return { id, config, quality, rssid, time_stamp }
      }
      return item
    })

    globalStore.updateSensors(newSensorData)
    showRightSideBar.value = false
  }

  const resetSensor = (id: number) => {
    const newSensorData = getAvailableSensors.value.map((item: ISensor) => {
      if (item.id === id) {
        return { id, config: { equipment: 0, position: 0, location: 0 }}
      }
      return item
    })

    globalStore.updateSensors(newSensorData)
    showRightSideBar.value = false
  }

  onMounted(async () => {
    await Promise.all([
      globalStore.loadLabels(),
      globalStore.loadSensors()
    ])
  })

  onUnmounted(() => {
    if (globalStore.getDiscoveryModeOn) globalStore.stopDiscoveryMode()
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <RightSideBar :show="showRightSideBar">
      <h3 class="text-lg font-semibold text-gray-900 mb-8 border-b">
        Edit sensor
      </h3>
      <div class="grid gap-4 mb-4">
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">id</label>
          <input type="text" :value="editableSensor.id" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" disabled>
        </div>
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Equipment</label>
          <select v-model="editableSensor.config.equipment" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
            <option v-for="(item, index) in getAvailableLabels.equipment" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.equipment" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Location</label>
          <select v-model="editableSensor.config.location" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
            <option v-for="(item, index) in getAvailableLabels.location" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.location" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Position</label>
          <select v-model="editableSensor.config.position" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
            <option v-for="(item, index) in getAvailableLabels.position" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.position" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
      </div>
      <div v-if="isLimitReached" class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 mt-2" role="alert">
        <AlertIcon class="w-5 h-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          Hey, you've reached the limit of 50 sensors.
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button @click="saveSensor()" :disabled="!isComplete()" type="button" class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
          <SendIcon class="w-4 mr-1" />
          Save
        </button>
        <button @click="resetSensor(editableSensor.id)" type="button" class="text-white flex disabled:opacity-50 bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
          <RefreshIcon class="w-5 mr-1" />
          Reset
        </button>
        <button @click="showRightSideBar = false" type="button" class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2">Cancel</button>
      </div>
    </RightSideBar>
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex justify-between bg-fdx-dark text-white items-center py-2 px-4">
          <div class="flex">
            <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
            <h3 class="text-xl font-semibold">Unconfigured sensors</h3>
          </div>
          <div class="flex space-x-1">
            <button type="button"
              v-if="!globalStore.getDiscoveryModeOn"
              @click="globalStore.startDiscoveryMode()"
              class="inline-flex items-center text-green-700 bg-white border border-gray-300 focus:outline-none hover:bg-green-700 hover:border-green-700 hover:text-white focus:ring-0 font-semibold rounded-md text-sm sm:text-md px-3 py-.5">
              <PlayIcon class="h-5 mr-1"/>
              Start
            </button>
            <button type="button"
              v-if="globalStore.getDiscoveryModeOn"
              @click="globalStore.stopDiscoveryMode()"
              class="flex items-center text-red-700 bg-white border border-gray-300 focus:outline-none hover:bg-red-600 hover:border-red-600 hover:text-white focus:ring-0 font-semibold rounded-md text-md px-3 py-.5">
              <StopIcon class="h-5 mr-1"/>
              Stop
            </button>
          </div>
        </div>
        <SensorTable :availableSensors="unconfiguredSensors" :unconfigured="true" :discovery="globalStore.getDiscoveryModeOn" @edit="editSensor" />
      </div>
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex bg-fdx-dark text-white items-center py-2 px-4">
          <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
          <h3 class="text-xl font-semibold">Configured sensors</h3>
        </div>
        <SensorTable :availableSensors="configuredSensors" @edit="editSensor" @reset="resetSensor" :max="50" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
