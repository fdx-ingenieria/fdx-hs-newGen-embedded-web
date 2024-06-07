<script setup lang="ts">
  import { ISensor } from '@/commons';
  import { RefreshIcon, SendIcon, ListIcon, PlayIcon, StopIcon, AlertIcon, LoadingIcon, ChevronUpIcon } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, watch, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors, getAvailableLabels } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const loadingData = ref(true)
  const startingDiscoveryMode = ref(false)
  const stoppingDiscoveryMode = ref(false)
  const savingData = ref(false)
  const editableSensor: Ref<ISensor> = ref({ id: '', EPC: '', config: { equipment: 0, position: 0, location: 0 }})
  const configuredSensors: Ref<ISensor[]> = ref([])
  const unconfiguredSensors: Ref<ISensor[]> = ref([])
  const showUnconfiguredTable = ref(true)
  const showResetButton = ref(false)
  const MAX_CONFIGURED_SENSORS = 17

  watch(getAvailableSensors, (newData) => {
    configuredSensors.value = []
    unconfiguredSensors.value = []
    newData.forEach((item: ISensor) => {
      if (item.config.equipment && item.config.position && item.config.location) {
        configuredSensors.value.push(item)
      } else {
        unconfiguredSensors.value.push(item)
      }
    })
    unconfiguredSensors.value.sort((a: ISensor, b: ISensor) => (a.data?.rssi || 0) - (b.data?.rssi || 0))
  })

  const isLimitReached = computed(() => {
    return configuredSensors.value.length >= MAX_CONFIGURED_SENSORS;
  });

  const isUnconfigured = (sensor: ISensor) => {
    return unconfiguredSensors.value.some((item: ISensor) => item.id === sensor.id)
  }

  const editSensor = (id: string) => {
    let sensor = getAvailableSensors.value.find((item: ISensor) => item.id === id)

    if (!sensor) return

    // Deep copy prevents the reactivity of the original object
    editableSensor.value = JSON.parse(JSON.stringify(sensor))
    showResetButton.value = !isUnconfigured(editableSensor.value)
    showRightSideBar.value = true
  }

  const isComplete = (editableSensor: ISensor) => {
    const { equipment, position, location } = editableSensor.config

    if (isUnconfigured(editableSensor) && isLimitReached.value) return false

    return !!equipment && !!position && !!location
  }

  const saveSensor = () => {
    if (!isComplete(editableSensor.value)) return
    save()
  }

  const save = () => {
    savingData.value = true
    const { id, EPC, config } = editableSensor.value

    globalStore.updateSensor({ id, EPC, config })
      .then(() => showRightSideBar.value = false)
      .finally(() => savingData.value = false)
  }

  const resetSensor = (id: string) => {
    let sensor = getAvailableSensors.value.find((item: ISensor) => item.id === id)

    if (!sensor) return

    editableSensor.value =  {
      id: sensor.id,
      EPC: sensor.EPC,
      config: { equipment: 0, position: 0, location: 0 }
    }

    save()
  }

  const stopDiscoveryMode = () => {
    stoppingDiscoveryMode.value = true
    globalStore.stopDiscoveryMode()
      .then(() => globalStore.startNormalMode())
      .finally(() => stoppingDiscoveryMode.value = false)
  }
  const startDiscoveryMode = () => {
    startingDiscoveryMode.value = true
    globalStore.stopNormalMode()
      .then(() => globalStore.startDiscoveryMode())
      .finally(() => startingDiscoveryMode.value = false)
  }

  const clearUnconfiguredSensors = () => {
    loadingData.value = true

    globalStore.clearUnconfiguredSensors()
      .finally(() => loadingData.value = false)
  }

  const checkDuplicate = (editableSensor: ISensor): boolean => {
    if (!isComplete(editableSensor)) return false
    const { equipment, position, location } = editableSensor.config
    return !!getAvailableSensors.value.filter(sensor =>
      sensor.id !== editableSensor.id
        && sensor.config.equipment === equipment
        && sensor.config.position === position
        && sensor.config.location === location
    ).length
  }

  onMounted(async () => {
    await Promise.all([
      globalStore.loadLabels(),
      globalStore.loadSensors()
    ])
    .then(() => globalStore.startNormalMode())
    .then(() => loadingData.value = false)
  })

  onUnmounted(() => {
    if (globalStore.getDiscoveryModeOn) {
      globalStore.stopDiscoveryMode()
    } else {
      if (globalStore.getNormaModeOn) globalStore.stopNormalMode()
    }
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
          <label class="block mb-2 text-sm font-semibold text-gray-900">epc</label>
          <input type="text" :value="editableSensor.EPC" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" disabled>
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
      <div v-if="isLimitReached && isUnconfigured(editableSensor)" class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 mt-2" role="alert">
        <AlertIcon class="flex-none w-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          Hey, you've reached the limit of {{ MAX_CONFIGURED_SENSORS }} sensors.
        </div>
      </div>
      <div v-if="checkDuplicate(editableSensor)" class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 mt-2" role="alert">
        <AlertIcon class="flex-none w-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          You are about to save a configuration that is already stored for another sensor. Continuing will overwrite the existing configuration. Are you sure?
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
          @click="saveSensor()"
          :disabled="!isComplete(editableSensor) || savingData"
          type="button" >
          <template v-if="savingData">
            <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
            Saving...
          </template>
          <template v-else>
            <SendIcon class="w-4 mr-1" />
            Save
          </template>
        </button>
        <button class="text-white flex disabled:opacity-50 bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
          v-if="showResetButton"
          @click="resetSensor(editableSensor.id)"
          :disabled="savingData"
          type="button" >
          <RefreshIcon class="w-5 mr-1" />
          Reset
        </button>
        <button class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2"
          @click="showRightSideBar = false"
          :disabled="savingData"
          type="button" >Cancel</button>
      </div>
    </RightSideBar>
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex justify-between bg-fdx-dark text-white items-center py-2 px-4">
          <div class="flex">
            <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
            <h3 class="text-xl font-semibold">Unconfigured sensors</h3>
          </div>
          <div class="flex space-x-1 -mx-2">
            <button type="button"
              v-if="unconfiguredSensors.length"
              @click="clearUnconfiguredSensors()"
              :disabled="loadingData || startingDiscoveryMode"
              class="inline-flex items-center disabled:opacity-50 text-yellow-700 bg-white border border-gray-300 focus:outline-none hover:bg-yellow-700 hover:border-yellow-700 hover:text-white focus:ring-0 font-semibold rounded-md text-sm sm:text-md px-3 py-.5">
              <template v-if="loadingData">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
                Loading...
              </template>
              <template v-else>
                <RefreshIcon class="h-5 mr-1"/>
                Clear
              </template>
            </button>
            <button type="button"
              v-if="globalStore.getNormaModeOn || startingDiscoveryMode"
              @click="startDiscoveryMode"
              :disabled="loadingData || startingDiscoveryMode"
              class="inline-flex items-center disabled:opacity-50 text-green-700 bg-white border border-gray-300 focus:outline-none hover:bg-green-700 hover:border-green-700 hover:text-white focus:ring-0 font-semibold rounded-md text-sm sm:text-md px-3 py-.5">
              <template v-if="startingDiscoveryMode">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
                Starting...
              </template>
              <template v-else>
                <PlayIcon class="h-5 mr-1"/>
                Start
              </template>
            </button>
            <button type="button"
              v-if="globalStore.getDiscoveryModeOn || stoppingDiscoveryMode"
              @click="stopDiscoveryMode"
              :disabled="loadingData || stoppingDiscoveryMode"
              class="flex items-center text-red-700 bg-white border border-gray-300 focus:outline-none hover:bg-red-600 hover:border-red-600 hover:text-white focus:ring-0 font-semibold rounded-md text-md px-3 py-.5">
              <template v-if="stoppingDiscoveryMode">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
                Stopping...
              </template>
              <template v-else>
                <StopIcon class="h-5 mr-1"/>
                Stop
              </template>
            </button>
            <ChevronUpIcon class="h-6 w-6 scale-110 cursor-pointer hover:scale-125"
              :class="{'rotate-180': !showUnconfiguredTable}"
              @click="showUnconfiguredTable = !showUnconfiguredTable" />
          </div>
        </div>
        <template v-if="showUnconfiguredTable">
          <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
          <SensorTable v-else :availableSensors="unconfiguredSensors" :discovery="globalStore.getDiscoveryModeOn" @edit="editSensor" />
        </template>
      </div>
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex bg-fdx-dark text-white items-center py-2 px-4">
          <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
          <h3 class="text-xl font-semibold">Configured sensors</h3>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
        <SensorTable v-else :availableSensors="configuredSensors" :showlabels="true" @edit="editSensor" @reset="resetSensor" :max="MAX_CONFIGURED_SENSORS" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
