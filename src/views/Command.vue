<script setup lang="ts">
  import { ISensor } from '@/commons';

  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, watch, Ref, ref, onUnmounted, computed } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableSensors } = storeToRefs(globalStore)

  const configuredSensors: Ref<ISensor[]> = ref([])
  const unconfiguredSensors: Ref<ISensor[]> = ref([])

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

  


  

  onMounted(async () => {
    // await Promise.all([
    //   globalStore.loadLabels(),
    //   globalStore.loadSensors()
    // ])
    // .then(() => globalStore.startNormalMode())
    // .then(() => loadingData.value = false)
  })

  onUnmounted(() => {
    // if (globalStore.getDiscoveryModeOn) {
    //   globalStore.stopDiscoveryMode()
    // } else {
    //   if (globalStore.getNormaModeOn) globalStore.stopNormalMode()
    // }
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <div class="mx-auto">
      <div>
  <label for="multilineInput">Multiline Input:</label>
  <textarea id="multilineInput" v-model="multilineText" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Type multiline text..."></textarea>
</div>



<button @click="formatAndDisplay" class="bg-gray-600 text-white px-10 py-2 rounded-md mt-4">Format and Display JSON</button>

    </div>
  </section>
</template>

<style scoped></style>
