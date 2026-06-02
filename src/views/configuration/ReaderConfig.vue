<script setup lang="ts">
  import { IReaderConfig, Region, TagEncoding, ReaderQ, ReaderSession, ReaderTarget, isValidInteger } from '@/commons';
  import { CloseIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<IReaderConfig> = ref({} as IReaderConfig)
  const savingData = ref(false)
  const { getReaderConfigData } = storeToRefs(globalStore)
  const adminMode = ref(false)
  const hasUnsavedChanges = ref(false)
  const advancedUpdated: Ref<boolean | null> = ref(null)

  watch(getReaderConfigData, (newValue) => {
    editable.value = JSON.parse(JSON.stringify(newValue))
  })

  watch(editable, () => {
    hasUnsavedChanges.value = true
    if (JSON.stringify(editable.value) === JSON.stringify(getReaderConfigData.value)) {
      hasUnsavedChanges.value = false
    }
  }, { deep: true })

  const validReadWritePowerValue = (value: number): boolean =>
    isValidInteger(value) && value >= 0 && value <= 3300

  const validReaderOnValue = (value: number): boolean =>
    isValidInteger(value) && value >= 0 && value <= 10_000

  const validReaderOffValue = (value: number): boolean =>
    isValidInteger(value) && value >= 0 && value <= 300_000

  const isComplete = (): boolean => {
    const { region, read_pwr, write_pwr, t_reader_on, t_reader_off, password } = editable.value
    if (!region) return false
    if (!adminMode.value) return true
    return validReadWritePowerValue(read_pwr)
      && validReadWritePowerValue(write_pwr)
      && validReaderOnValue(t_reader_on)
      && validReaderOffValue(t_reader_off)
      && !!password
  }

  const save = async () => {
    const wasInAdminMode = adminMode.value
    savingData.value = true
    advancedUpdated.value = null
    try {
      const result = await globalStore.updateReaderConfigData(editable.value)
      if (wasInAdminMode) {
        advancedUpdated.value = result.advanced_updated
        if (result.advanced_updated) adminMode.value = false
      }
    } finally {
      savingData.value = false
    }
  }

  const cancelAdmin = () => {
    adminMode.value = false
    advancedUpdated.value = null
    editable.value = JSON.parse(JSON.stringify(getReaderConfigData.value))
  }

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
        <template v-else>

          <div class="grid gap-4 mb-4">
            <!-- Region (always visible, editable) -->
            <div>
              <label
                v-on:dblclick.shift.ctrl="adminMode = !adminMode"
                class="block mb-2 text-sm font-semibold text-blue-900 select-none cursor-default">Region</label>
              <select
                v-model="editable.region"
                class="bg-gray-50 border border-blue-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                <option v-for="item in Region" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>

            <!-- Admin-only fields -->
            <template v-if="adminMode">
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Tag Encoding</label>
                <select v-model="editable.tag_encoding" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="item in TagEncoding" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Read power (cdBm)</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number" step="1" min="0" max="3300"
                  v-model.number="editable.read_pwr"
                  placeholder="Read power in cdBm">
                <p class="mt-2 text-sm text-gray-600">0 – 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.read_pwr)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> Valor fuera de rango.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Write power (cdBm)</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number" step="1" min="0" max="3300"
                  v-model.number="editable.write_pwr"
                  placeholder="Write power in cdBm">
                <p class="mt-2 text-sm text-gray-600">0 – 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.write_pwr)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> Valor fuera de rango.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Antenas activas</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="text"
                  v-model="editable.ants"
                  placeholder="e.g. 0,1,2,3">
                <p class="mt-2 text-sm text-gray-600">Índices separados por coma.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">T reader on (ms)</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number" step="1" min="0" max="10000"
                  v-model.number="editable.t_reader_on"
                  placeholder="Reader on time in ms">
                <p class="mt-2 text-sm text-gray-600">0 – 10 000 ms.</p>
                <p v-show="!validReaderOnValue(editable.t_reader_on)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> Valor fuera de rango.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">T reader off (ms)</label>
                <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  type="number" step="1" min="0" max="300000"
                  v-model.number="editable.t_reader_off"
                  placeholder="Reader off time in ms">
                <p class="mt-2 text-sm text-gray-600">0 – 300 000 ms.</p>
                <p v-show="!validReaderOffValue(editable.t_reader_off)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> Valor fuera de rango.</p>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Q (algoritmo)</label>
                <select v-model="editable.q" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="q in ReaderQ" :key="q" :value="q">{{ q }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Session</label>
                <select v-model="editable.session" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="s in ReaderSession" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900">Target</label>
                <select v-model="editable.target" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option v-for="t in ReaderTarget" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-blue-900">Password</label>
                <input type="password" v-model="editable.password"
                  class="bg-gray-50 border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  placeholder="admin password">
              </div>
            </template>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col items-end gap-2">
            <div class="flex items-center space-x-4">
              <button v-if="adminMode" @click="cancelAdmin()" :disabled="savingData" type="button"
                class="text-white flex items-center gap-1 disabled:opacity-50 bg-gray-500 hover:bg-gray-600 focus:ring-4 focus:ring-gray-300 font-semibold rounded-lg text-sm px-5 py-1.5 focus:outline-none">
                <CloseIcon class="w-4" />
                Cancelar
              </button>
              <button @click="save()" :disabled="savingData || !isComplete()" type="button"
                class="text-white flex items-center gap-1 disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 focus:outline-none">
                <template v-if="savingData">
                  <LoadingIcon class="animate-spin fill-transparent w-4" />
                  Guardando...
                </template>
                <template v-else>
                  <SendIcon class="w-4" />
                  Guardar
                </template>
              </button>
            </div>
            <p v-if="advancedUpdated === false" class="text-sm text-red-600"><span class="font-semibold">Wrong password:</span> advanced fields were not updated.</p>
            <p v-else-if="advancedUpdated === true" class="text-sm text-green-600">Advanced fields updated successfully.</p>
          </div>

        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
