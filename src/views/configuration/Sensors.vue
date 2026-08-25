<script setup lang="ts">
  import { ISensor } from '@/commons';
  import { RefreshIcon, SendIcon, ListIcon, PlayIcon, StopIcon, AlertIcon, LoadingIcon, ChevronUpIcon, RemoveIcon } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors, getAvailableLabels } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const loadingData = ref(true)
  const startingDiscoveryMode = ref(false)
  const stoppingDiscoveryMode = ref(false)
  const savingData = ref(false)
  const editableSensor: Ref<ISensor> = ref({ id: '', EPC: '', config: { equipment: 0, position: 0, location: 0 }})
  const showUnconfiguredTable = ref(true)
  const showResetButton = ref(false)
  const MAX_CONFIGURED_SENSORS = 50

  const configuredSensors = computed(() =>
    getAvailableSensors.value.filter((s: ISensor) => s.config.equipment && s.config.position && s.config.location)
  )

  const unconfiguredSensors = computed(() =>
    getAvailableSensors.value
      .filter((s: ISensor) => !s.config.equipment || !s.config.position || !s.config.location)
      .sort((a: ISensor, b: ISensor) => (a.data?.rssi || 0) - (b.data?.rssi || 0))
  )

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

  const deleteSensor = (id: string) => {
    savingData.value = true
    globalStore.deleteSensor(id)
      .then(() => showRightSideBar.value = false)
      .finally(() => savingData.value = false)
  }

  // Each toggle is a single backend call; the store keeps both mode flags in sync
  // (see global.ts). Chaining the opposite mode here would double-publish the event.
  const stopDiscoveryMode = () => {
    stoppingDiscoveryMode.value = true
    globalStore.stopDiscoveryMode()
      .finally(() => stoppingDiscoveryMode.value = false)
  }
  const startDiscoveryMode = () => {
    startingDiscoveryMode.value = true
    globalStore.startDiscoveryMode()
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
    // Important, we need to load the labels before sensors
    await globalStore.startNormalMode()
    await globalStore.loadLabels()
    await globalStore.loadSensors()

    loadingData.value = false
  })

  onUnmounted(() => {
    if (globalStore.getDiscoveryModeOn) {
      globalStore.stopDiscoveryMode()
    } else {
      if (globalStore.getNormalModeOn) globalStore.stopNormalMode()
    }
  })
</script>

<template>
  <section class="antialiased">
    <RightSideBar :show="showRightSideBar">
      <h3 class="mb-6 border-b border-line pb-2 text-lg font-semibold text-ink">
        Edit sensor
      </h3>
      <div class="grid gap-4 mb-4">
        <div>
          <label class="field-label">id</label>
          <input type="text" :value="editableSensor.id" class="input" disabled>
        </div>
        <div>
          <label class="field-label">epc</label>
          <input type="text" :value="editableSensor.EPC" class="input" disabled>
        </div>
        <div>
          <label class="field-label">Equipment</label>
          <select v-model="editableSensor.config.equipment" class="input">
            <option v-for="(item, index) in getAvailableLabels.equipment" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.equipment" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
        <div>
          <label class="field-label">Location</label>
          <select v-model="editableSensor.config.location" class="input">
            <option v-for="(item, index) in getAvailableLabels.location" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.location" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
        <div>
          <label class="field-label">Position</label>
          <select v-model="editableSensor.config.position" class="input">
            <option v-for="(item, index) in getAvailableLabels.position" :value="index" :class="{'hidden': !item}">{{ item }}</option>
          </select>
          <p v-show="!editableSensor.config.position" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This is required!</p>
        </div>
      </div>
      <div v-if="isLimitReached && isUnconfigured(editableSensor)" class="flex items-center p-4 mb-4 text-warn rounded-lg bg-warn-soft mt-2" role="alert">
        <AlertIcon class="flex-none w-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          Hey, you've reached the limit of {{ MAX_CONFIGURED_SENSORS }} sensors.
        </div>
      </div>
      <div v-if="checkDuplicate(editableSensor)" class="flex items-center p-4 mb-4 text-warn rounded-lg bg-warn-soft mt-2" role="alert">
        <AlertIcon class="flex-none w-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          You are about to save a configuration that is already stored for another sensor. Continuing will overwrite the existing configuration. Are you sure?
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button class="btn-primary mb-2"
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
        <button class="btn-danger mb-2"
          v-if="showResetButton"
          @click="deleteSensor(editableSensor.id)"
          :disabled="savingData"
          type="button" >
          <RemoveIcon class="w-5 mr-1" />
          Delete
        </button>
        <button class="btn-ghost mb-2"
          @click="showRightSideBar = false"
          :disabled="savingData"
          type="button" >Cancel</button>
      </div>
    </RightSideBar>
    <div class="mx-auto">
      <div class="card overflow-hidden mt-8">
        <div class="panel-head rounded-none">
          <div class="flex items-center">
            <ListIcon class="mr-2 hidden h-6 text-ink-faint md:inline-flex" />
            <h3>Unconfigured sensors</h3>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button"
              v-if="unconfiguredSensors.length"
              @click="clearUnconfiguredSensors()"
              :disabled="loadingData || startingDiscoveryMode"
              class="flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-1 text-sm font-semibold text-warn hover:bg-warn hover:text-white disabled:opacity-50">
              <template v-if="loadingData">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto" />
                <span class="hidden xs:block">Loading...</span>
              </template>
              <template v-else>
                <RefreshIcon class="h-5"/>
                <span class="hidden xs:block">Clear</span>
              </template>
            </button>
            <button type="button"
              v-if="globalStore.getNormalModeOn || startingDiscoveryMode"
              @click="startDiscoveryMode"
              :disabled="loadingData || startingDiscoveryMode"
              class="flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-1 text-sm font-semibold text-ok hover:bg-ok hover:text-white disabled:opacity-50">
              <template v-if="startingDiscoveryMode">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto" />
                <span class="hidden xs:block">Starting...</span>
              </template>
              <template v-else>
                <PlayIcon class="h-5"/>
                <span class="hidden xs:block">Start</span>
              </template>
            </button>
            <button type="button"
              v-if="globalStore.getDiscoveryModeOn || stoppingDiscoveryMode"
              @click="stopDiscoveryMode"
              :disabled="loadingData || stoppingDiscoveryMode"
              class="flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-1 text-sm font-semibold text-crit hover:bg-crit hover:text-white disabled:opacity-50">
              <template v-if="stoppingDiscoveryMode">
                <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto" />
                <span class="hidden xs:block">Stopping...</span>
              </template>
              <template v-else>
                <StopIcon class="h-5"/>
                <span class="hidden xs:block">Stop</span>
              </template>
            </button>
            <ChevronUpIcon class="h-6 w-6 cursor-pointer text-ink-soft hover:text-ink"
              :class="{'rotate-180': !showUnconfiguredTable}"
              @click="showUnconfiguredTable = !showUnconfiguredTable" />
          </div>
        </div>
        <template v-if="showUnconfiguredTable">
          <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
          <SensorTable v-else :availableSensors="unconfiguredSensors" :discovery="globalStore.getDiscoveryModeOn" @edit="editSensor" />
        </template>
      </div>
      <div class="card overflow-hidden mt-8">
        <div class="panel-head rounded-none">
          <div class="flex items-center">
            <ListIcon class="mr-2 hidden h-6 text-ink-faint md:inline-flex" />
            <h3>Configured sensors</h3>
          </div>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
        <SensorTable v-else :availableSensors="configuredSensors" :showlabels="true" @edit="editSensor" @reset="deleteSensor" :max="MAX_CONFIGURED_SENSORS" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
