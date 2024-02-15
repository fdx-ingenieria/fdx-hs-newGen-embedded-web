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
  
      <div class="mx-auto">
        <h2>Reader Configuration</h2>


            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Power</label>
              <input type="number" min="1" max="2" v-model="ipAddress" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block  p-2.5" >
            </div>

            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Time on:</label>
              <input type="number" min="1" max="247" v-model="subnetMask" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block  p-2.5" >
            </div>

            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Time off:</label>
              <input type="number" min="1" max="247" v-model="gateway" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block  p-2.5" >
            </div>

            <label for="regionSelect">Select Region:</label>
<select id="regionSelect" v-model="selectedRegion" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block p-2.5">
  <option value="00">RG_NONE</option>
  <option value="01">RG_NA</option>
  <option value="02">RG_EU</option>
  <option value="07">RG_EU2</option>
  <option value="08">RG_EU3</option>
  <option value="03">RG_KR</option>
  <option value="06">RG_PRC</option>
  <option value="0A">RG_PRC2</option>
  <option value="FF">RG_OPEN</option>
  <option value="04">RG_IN</option>
  <option value="05">RG_JP</option>
  <option value="0C">RG_CE_HIGH</option>
  <option value="0D">RG_HK</option>
  <option value="0E">RG_TAIWAN</option>
  <option value="0F">RG_MALAYSIA</option>
  <option value="10">RG_SOUTH_AFRICA</option>
  <option value="11">RG_BRAZIL</option>
  <option value="12">RG_THAILAND</option>
  <option value="13">RG_SINGAPORE</option>
  <option value="14">RG_AUSTRALIA</option>
  <option value="16">RG_URUGUAY</option>
  <option value="17">RG_VIETNAM</option>
  <option value="18">RG_ISRAEL</option>
  <option value="19">RG_PHILIPPINES</option>
  <option value="1A">RG_INDONESIA</option>
  <option value="1B">RG_NEW_ZEALAND</option>
  <option value="1C">RG_PERU</option>
  <option value="1D">RG_RUSSIA</option>
  <option value="1E">RG_CE_LOW_HIGH</option>
</select>



            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">TARI us:</label>
              <select v-model="tari" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block p-2.5">
                <option>6.25</option>
                <option>7.5</option>
                <option>15</option>
                <option>20</option>
              </select>            
            </div>

            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">BLF:</label>
              <select v-model="BLF" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block p-2.5">
                <option>160</option>
                <option>250</option>
                <option>320</option>
                <option>640</option>
              </select>            
            </div>

            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Q:</label>
              <select v-model="Q" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block p-2.5">
                <option>0</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>6</option>
                <option>7</option>
                <option>8</option>
                <option>9</option>
                <option>10</option>
                <option>11</option>
                <option>12</option>
                <option>13</option>
                <option>14</option>
                <option>15</option>
               
              </select>            
            </div>

            <div class="flex items-center space-x-4">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Session:</label>
              <select v-model="session" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block p-2.5">
                <option>S0</option>
                <option>S1</option>
                <option>S2</option>
                <option>S3</option>
              </select>            
            </div>


            </div>

  

          <div class="flex items-center space-x-4">
        
            <button class="text-white flex disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
            type="button" >
              Save
          </button>
        </div>
        
  </section>
</template>

<style scoped></style>
