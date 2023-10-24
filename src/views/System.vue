<script setup lang="ts">
  import { ISystem, ModbusBitParity, Baudrate } from '@/commons';
  import { AlertIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, ref, watch } from 'vue'

  const globalStore = useGlobalStore()
  const editable: Ref<ISystem> = ref({} as ISystem)
  const loading = ref(false)
  const { getSystemData } = storeToRefs(globalStore)

  watch([getSystemData], (newValue) => {
    editable.value = newValue.pop() || {} as ISystem
    loading.value = false
  })

  const save = () => {
    loading.value = true
    globalStore.updateSystemData(editable.value)
  }

  const validDirModbus = (value: number): boolean => {
    return value > 0 && value < 248
  }

  const isComplete = (): boolean => {
    const { serial, dir_modbus, baudrate, bit_parity } = editable.value
    return !!serial
      && validDirModbus(dir_modbus)
      && !!baudrate
      && !!bit_parity
  }

  onMounted(async () => {
    await globalStore.loadSystemData()
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden py-4 px-4 md:px-6">
        <div class="grid gap-4 mb-4">
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Serial</label>
            <input type="text" v-value="editable.serial" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50" placeholder="Serial value" disabled>
          </div>
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Modbus direction</label>
            <input type="number" min="1" max="247" v-model="editable.dir_modbus" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
            <p v-show="!validDirModbus(editable.dir_modbus)" class="mt-2 text-sm text-red-600 dark:text-red-500"><span class="font-semibold">Oops!</span> This value should be between 1 and 247.</p>
          </div>
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Baudrate</label>
            <select v-model="editable.baudrate" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option v-for="item in Baudrate" :value="item">{{ item }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Bit parity</label>
            <select v-model="editable.bit_parity" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option v-for="item in ModbusBitParity" :value="item">{{ item }}</option>
            </select>
            <div class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 mt-2" role="alert">
              <AlertIcon class="w-5 h-5 mr-3" />
              <div class="ml-3 text-sm font-medium">
                TBD: Here will be a description of the Modbus parity type.
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end items-center space-x-4">
          <button @click="save()" :disabled="loading || !isComplete()" type="button" class="text-white flex items-center disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
            <template v-if="loading">
              <LoadingIcon class="animate-spin fill-white w-4 mr-1" />
              Saving
            </template>
            <template v-else>
              <SendIcon class="w-4 mr-1" />
              Save
            </template>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
