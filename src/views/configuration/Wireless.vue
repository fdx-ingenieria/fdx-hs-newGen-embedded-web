<script setup lang="ts">
  import { ISensor } from '@/commons';
  import { RefreshIcon, SendIcon, ListIcon, PlayIcon, StopIcon, AlertIcon, LoadingIcon, ChevronUpIcon } from '@/components/icons';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, watch, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors, getAvailableLabels } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const loadingData = ref(true)
  const loadingDiscoveryMode = ref(false)
  const savingData = ref(false)
  const editableSensor: Ref<ISensor> = ref({ id: 0, EPC: '', config: { equipment: 0, position: 0, location: 0 }})
  const configuredSensors: Ref<ISensor[]> = ref([])
  const unconfiguredSensors: Ref<ISensor[]> = ref([])
  const  enableDHCP= ref(true)
  const  ipAddress= "192.168.1.10"
  const  subnetMask = "255.255.255.0"
  const  gateway= "192.168.1.1"
  const  dnsServer1= "8.8.8.8"
  const  dnsServer2= "8.8.8.8"


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
    return getAvailableSensors.value.length >= 50;
  });

  const editSensor = (EPC: string) => {
    let sensor = getAvailableSensors.value.find((item: ISensor) => item.EPC === EPC)

    if (!sensor) return

    // Deep copy prevents the reactivity of the original object
    editableSensor.value = JSON.parse(JSON.stringify(sensor))
    showRightSideBar.value = true
  }

  const isComplete = (editableSensor: ISensor) => {
    const { equipment, position, location } = editableSensor.config
    return !!equipment && !!position && !!location && isLimitReached
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

  const resetSensor = (EPC: string) => {
    let sensor = getAvailableSensors.value.find((item: ISensor) => item.EPC === EPC)

    if (!sensor) return

    editableSensor.value =  {
      id: sensor.id,
      EPC: sensor.EPC,
      config: { equipment: 0, position: 0, location: 0 }
    }

    save()
  }

  const switchDiscoveryMode = () => {
    loadingDiscoveryMode.value = true
    const promise = globalStore.getDiscoveryModeOn
      ? globalStore.stopDiscoveryMode().then(() => globalStore.startNormalMode())
      : globalStore.startDiscoveryMode()

      promise.finally(() => loadingDiscoveryMode.value = false)
  }

  const clearUnconfiguredSensors = () => {
    loadingData.value = true

    globalStore.clearUnconfiguredSensors()
      .finally(() => loadingData.value = false)
  }

  const checkDuplicate = (editableSensor: ISensor): boolean => {
    const { equipment, position, location } = editableSensor.config
    return !!getAvailableSensors.value.filter(sensor =>
      sensor.EPC !== editableSensor.EPC
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
      <h3 class="text-lg font-semibold text-gray-900 mb-8 border-b">   Network   </h3>

     <ul>
      <li class="cursor-pointer">network 1</li>
      <li class="cursor-pointer">network 2</li>
      <li class="cursor-pointer">network 3</li>
      <li class="cursor-pointer">network 4</li>
      <li class="cursor-pointer">network 5</li>
      <li class="cursor-pointer">network 6</li>
      <li class="cursor-pointer">network 7</li>
      <li class="cursor-pointer">network 8</li>
    </ul>

    </RightSideBar>

      <div class="mx-auto">
      <h2>Network Configuration</h2>
        <label for="dhcp">Enable DHCP:</label>
        <input type="checkbox" id="dhcp" v-model="enableDHCP" />
        
          <div>
            <button class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
              type="button" @click="showRightSideBar=!showRightSideBar">   
                Explore wifi network:
              </button>
            </div>

        

        <div v-if="!enableDHCP">

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">IP Address:</label>
              <input type="ip" min="1" max="247" v-model="ipAddress" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Subnet Mask:</label>
              <input type="ip" min="1" max="247" v-model="subnetMask" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Gateway:</label>
              <input type="ip" min="1" max="247" v-model="gateway" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">DNS Server 1:</label>
              <input type="ip" min="1" max="247" v-model="dnsServer1" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>

            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">DNS Server 2:</label>
              <input type="ip" min="1" max="247" v-model="dnsServer2" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            </div>
          </div>

          <div class="flex items-center space-x-4">
        
            <button class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
            type="button" >
              Save
          </button>
        </div>
        
    </div>
  </section>
</template>

<style scoped></style>
