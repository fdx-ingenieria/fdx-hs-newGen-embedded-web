<script setup lang="ts">
  import { IReaderConfig, TagEncoding, Region, isValidInteger } from '@/commons';
  import { CloseIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<IReaderConfig> = ref({} as IReaderConfig)
  const savingData = ref(false)
  const { getReaderConfigData } = storeToRefs(globalStore)
  const adminMode = ref(false)
  const hasUnsavedChanges = ref(false)

  watch(getReaderConfigData, (newValue) => {
    editable.value = JSON.parse(JSON.stringify(newValue))
  })

  watch(editable, () => {
    hasUnsavedChanges.value = true
    // deep compare
    if (JSON.stringify(editable.value) === JSON.stringify(getReaderConfigData.value)) {
      hasUnsavedChanges.value = false
    }
  }, { deep: true })

  const save = () => {
    savingData.value = true
    globalStore.updateReaderConfigData(editable.value)
      .finally(() => savingData.value = false)
  }

  
  const validReadWritePowerValue = (value: number): boolean => {
    if (!isValidInteger(value)) return false

    return value >= 0 && value <= 3300
  }

  const validReaderOnValue = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 0 && value <= 10_000
  }

  const validReaderOffValue = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 0 && value <= 300_000
  }

  const validProcessingIntervalValue = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 0 && value <= 600_000
  }

  const validMvAvgWindowSize = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 1 && value <= 20
  }

  const isComplete = (): boolean => {
    const { region, password, tag_encoding, read_power, write_power, t_reader_on, t_reader_off, processing_interval, mv_avg_window_size } = editable.value

    return !!region
      && TagEncoding.some(item => item.value === tag_encoding)
      && validReadWritePowerValue(read_power)
      && validReadWritePowerValue(write_power)
      && validReaderOnValue(t_reader_on)
      && validReaderOffValue(t_reader_off)
      && validProcessingIntervalValue(processing_interval)
      && validMvAvgWindowSize(mv_avg_window_size)
      && !!password
  }

  const region = computed(() => {
    const { region } = editable.value
    return Region.find(item => item.value === region)?.label
  })

  const preventUnsaved = (e: any) => {
    if (!hasUnsavedChanges.value) return
    e.preventDefault()
    e.returnValue = ""
  }

  onBeforeRouteLeave((_to, _from, next) => {
    if (hasUnsavedChanges.value && !window.confirm('Abandon ship without saving? Your changes might get lost at sea!')) {
      return
    }
    next()
  })

  onMounted(() => {
    window.addEventListener("beforeunload", preventUnsaved)
    globalStore.loadReaderConfigData()
  })

  onUnmounted(() => {
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <div class="mx-auto">

      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden py-4 px-4 md:px-6">
        <LoadingIcon v-if="!editable.region" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template  v-else >
          <div class="grid gap-4 mb-4">
            <div v-if="!adminMode">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Region</label>
              <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50"
                type="text"
                v-on:dblclick.shift.ctrl="adminMode = !adminMode"
                :value="region" 
                placeholder="Region"
                readonly />
            </div>
            <template v-else>
              <div>
                <label class="block mb-2 text-sm font-semibold text-blue-900">Region</label>
                <select v-model="editable.region" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="item in Region" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Tag Encoding</label>
                <select v-model="editable.tag_encoding" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="item in TagEncoding" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Read power</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="0"
                  max="3300"
                  v-model.number="editable.read_power"
                  placeholder="Read power value in cdBm">
                <p class="mt-2 text-sm text-gray-600">This value should be between 0 and 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.read_power)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value is out of range.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Write power</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="0"
                  max="3300"
                  v-model.number="editable.write_power"
                  placeholder="Write power value in cdBm">
                <p class="mt-2 text-sm text-gray-600">This value should be between 0 and 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.write_power)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value is out of range.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">T reader on</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="0"
                  max="10000"
                  v-model.number="editable.t_reader_on"
                  placeholder="Reader on value in ms">
                <p class="mt-2 text-sm text-gray-600">This value should be between 0 and 10000 ms.</p>
                <p v-show="!validReaderOnValue(editable.t_reader_on)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value is out of range.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">T reader off</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="0"
                  max="300000"
                  v-model.number="editable.t_reader_off"
                  placeholder="Reader off value in ms">
                <p class="mt-2 text-sm text-gray-600">This value should be between 0 and 300000 ms.</p>
                <p v-show="!validReaderOffValue(editable.t_reader_off)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value is out of range.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">T processing interval</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="0"
                  max="600000"
                  v-model.number="editable.processing_interval"
                  placeholder="Processing interval value in ms">
                <p class="mt-2 text-sm text-gray-600">This value should be between 0 and 600000 ms.</p>
                <p v-show="!validProcessingIntervalValue(editable.processing_interval)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value is out of range.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Moving avg window size</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number"
                  step="1"
                  min="1"
                  max="20"
                  v-model.number="editable.mv_avg_window_size"
                  placeholder="Moving average window size">
                <p class="mt-2 text-sm text-gray-600">Number of processing cycles to average. Lower = faster response, higher = smoother. Range: 1–20.</p>
                <p v-show="!validMvAvgWindowSize(editable.mv_avg_window_size)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value should be between 1 and 20.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-blue-900">Password</label>
                <input type="password" v-model="editable.password" class="bg-gray-50 border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50" placeholder="Admin password">
              </div>
            </template>
          </div>
          <div v-if="adminMode" class="flex justify-end items-center space-x-4">
            <button @click="save()" :disabled="savingData || !isComplete()" type="button" class="text-white flex items-center gap-1 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
              <template v-if="savingData">
                <LoadingIcon class="animate-spin fill-transparent w-4" />
                Saving...
              </template>
              <template v-else>
                <SendIcon class="w-4" />
                Save
              </template>
            </button>
            <button @click="adminMode = false" :disabled="savingData" type="button" class="text-white flex items-center gap-1 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
              <CloseIcon class="w-4" />
              Cancel
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
