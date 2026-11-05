<script setup lang="ts">
  import { ISensor } from '@/commons';
  import { RefreshIcon, ListIcon, PlayIcon, StopIcon, LoadingIcon, ChevronUpIcon, RemoveIcon } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import SensorEditForm from '@/components/sensors/SensorEditForm.vue';
  import QuickSetup from '@/components/sensors/QuickSetup.vue';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const loadingData = ref(true)
  const startingDiscoveryMode = ref(false)
  const stoppingDiscoveryMode = ref(false)
  const savingData = ref(false)
  const editableSensor: Ref<ISensor> = ref({ id: '', EPC: '', config: { equipment: 0, position: 0, location: 0 }})
  const showUnconfiguredTable = ref(true)
  const editingNew = ref(false)
  const showQuickSetup = ref(false)
  const editKey = ref(0)
  const MAX_CONFIGURED_SENSORS = 50

  // Ordenados por slot, que es su dirección Modbus. El backend ya los devuelve así, pero
  // el array del store también lo mutan los eventos SSE: mejor dicho que asumido.
  const configuredSensors = computed(() =>
    getAvailableSensors.value
      .filter((s: ISensor) => s.config.equipment && s.config.position && s.config.location)
      .sort((a: ISensor, b: ISensor) => (a.slot ?? 0) - (b.slot ?? 0))
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
    const sensor = getAvailableSensors.value.find((item: ISensor) => item.id === id)
    if (!sensor) return

    // Deep copy prevents the reactivity of the original object
    editableSensor.value = JSON.parse(JSON.stringify(sensor))
    editingNew.value = isUnconfigured(sensor)
    editKey.value++
    showRightSideBar.value = true
  }

  const save = (sensor: ISensor) => {
    savingData.value = true
    const { id, EPC, config } = sensor

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
  // Set on mount; discovery waits for it so a late normal-mode reply cannot switch discovery back off.
  let normalModeReady: Promise<void> = Promise.resolve()
  const startDiscoveryMode = async () => {
    startingDiscoveryMode.value = true
    try {
      await normalModeReady
      await globalStore.startDiscoveryMode()
    } catch {
      // apiFetch already showed the error.
    } finally {
      startingDiscoveryMode.value = false
    }
  }

  // Renumbers the Modbus slots by measuring point and closes the holes. Meant to be run
  // once after installing everything; from then on a sensor keeps its slot. Every sensor's
  // Modbus address may change, so this confirms first.
  const reorderingSlots = ref(false)
  const reorderSlots = async () => {
    if (!window.confirm(
      'Renumber the Modbus slots of all configured sensors, ordered by equipment, location and position?\n\n'
      + 'This changes the Modbus address of the sensors. Any SCADA or master polling this device has to be updated.'
    )) return

    reorderingSlots.value = true
    try {
      const count = await globalStore.reorderSensorSlots()
      globalStore.notify(`Modbus slots reordered for ${count} sensor(s)`, 'success')
    } finally {
      reorderingSlots.value = false
    }
  }

  const deletingAll = ref(false)
  const deleteAllSensors = async () => {
    const n = configuredSensors.value.length
    if (!window.confirm(
      `Delete all ${n} configured sensors?\n\n`
      + 'They stop being monitored and their Modbus slots are freed. Tags still in range show up again as unconfigured.'
    )) return

    deletingAll.value = true
    try {
      await globalStore.deleteAllSensors()
    } finally {
      deletingAll.value = false
    }
  }

  const clearUnconfiguredSensors = () => {
    loadingData.value = true

    globalStore.clearUnconfiguredSensors()
      .finally(() => loadingData.value = false)
  }

  onMounted(async () => {
    normalModeReady = globalStore.startNormalMode().catch(() => {})
    try {
      await globalStore.loadLabels()  // labels before sensors
      await globalStore.loadSensors()
    } catch {
      // apiFetch already showed the error.
    } finally {
      loadingData.value = false
    }
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
    <RightSideBar :show="showRightSideBar" @close="showRightSideBar = false">
      <SensorEditForm v-if="showRightSideBar" :key="editKey"
        :sensor="editableSensor"
        :is-new="editingNew"
        :limit-reached="isLimitReached"
        :max="MAX_CONFIGURED_SENSORS"
        :saving="savingData"
        @save="save"
        @delete="deleteSensor"
        @cancel="showRightSideBar = false" />
    </RightSideBar>
    <RightSideBar :show="showQuickSetup" @close="showQuickSetup = false">
      <QuickSetup v-if="showQuickSetup" :unconfigured="unconfiguredSensors" :configured="configuredSensors"
        :max="MAX_CONFIGURED_SENSORS" @close="showQuickSetup = false" />
    </RightSideBar>
    <div class="mx-auto">
      <div class="card overflow-hidden mt-8">
        <!-- Phones: title row, then the main action full width, then the secondary ones. -->
        <div class="panel-head flex-wrap gap-y-2">
          <h3 class="flex min-w-0 flex-1 items-baseline gap-2">
            Unconfigured sensors
            <span class="font-mono text-sm font-normal text-ink-faint">{{ unconfiguredSensors.length }}</span>
          </h3>
          <button type="button" @click="showUnconfiguredTable = !showUnconfiguredTable"
            :aria-expanded="showUnconfiguredTable" aria-label="Show or hide unconfigured sensors"
            class="rounded-md p-1 text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:order-last [@media(pointer:coarse)]:p-2">
            <ChevronUpIcon class="h-5 w-5" :class="{'rotate-180': !showUnconfiguredTable}" />
          </button>
          <div class="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:items-center">
            <button v-if="globalStore.getDiscoveryModeOn || stoppingDiscoveryMode" type="button" class="btn-danger col-span-2 sm:order-last !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
              :disabled="loadingData || stoppingDiscoveryMode" @click="stopDiscoveryMode">
              <LoadingIcon v-if="stoppingDiscoveryMode" class="h-4 w-4 animate-spin fill-transparent" />
              <StopIcon v-else class="h-4" /> Stop discovery
            </button>
            <button v-else type="button" class="btn-primary col-span-2 sm:order-last !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
              :disabled="loadingData || startingDiscoveryMode" @click="startDiscoveryMode">
              <LoadingIcon v-if="startingDiscoveryMode" class="h-4 w-4 animate-spin fill-transparent" />
              <PlayIcon v-else class="h-4" /> Start discovery
            </button>
            <button type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5" :class="{'col-span-2': !unconfiguredSensors.length}"
              title="Place several tags at once on a location x position grid" @click="showQuickSetup = true">
              <ListIcon class="h-4" /> Quick setup
            </button>
            <button v-if="unconfiguredSensors.length" type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
              :disabled="loadingData || startingDiscoveryMode" @click="clearUnconfiguredSensors()">
              <LoadingIcon v-if="loadingData" class="h-4 w-4 animate-spin fill-transparent" />
              <RefreshIcon v-else class="h-4" /> Clear list
            </button>
          </div>
        </div>
        <template v-if="showUnconfiguredTable">
          <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
          <SensorTable v-else :availableSensors="unconfiguredSensors" :discovery="globalStore.getDiscoveryModeOn"
            empty-text="No new tags. Start discovery to list the tags in range of the antennas."
            @edit="editSensor" />
        </template>
      </div>
      <div class="card overflow-hidden mt-8">
        <div class="panel-head flex-wrap gap-y-2">
          <h3 class="flex min-w-0 flex-1 items-baseline gap-2">
            Configured sensors
            <span class="font-mono text-sm font-normal text-ink-faint">{{ configuredSensors.length }} / {{ MAX_CONFIGURED_SENSORS }}</span>
          </h3>
          <div v-if="configuredSensors.length" class="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:items-center">
            <button type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
              :disabled="loadingData || reorderingSlots || deletingAll"
              title="Renumber the Modbus slots by equipment, location and position"
              @click="reorderSlots()">
              <LoadingIcon v-if="reorderingSlots" class="h-4 w-4 animate-spin fill-transparent" />
              <ListIcon v-else class="h-4" /> Reorder slots
            </button>
            <button type="button" class="btn-ghost !text-crit !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
              :disabled="loadingData || reorderingSlots || deletingAll" @click="deleteAllSensors()">
              <LoadingIcon v-if="deletingAll" class="h-4 w-4 animate-spin fill-transparent" />
              <RemoveIcon v-else class="h-4" /> Delete all
            </button>
          </div>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
        <SensorTable v-else :availableSensors="configuredSensors" :showlabels="true" :showslot="true"
          empty-text="No sensors configured yet. Pick a tag from the list above to set it up."
          @edit="editSensor" @reset="deleteSensor" :max="MAX_CONFIGURED_SENSORS" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
