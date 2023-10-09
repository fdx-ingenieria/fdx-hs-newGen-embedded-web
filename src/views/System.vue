<script setup lang="ts">
  import { ISystem, ModbusParity } from '@/commons';
  import { LoadingIcon, SendIcon } from '@/components/icons';
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

  const isComplete = (): boolean => {
    const { serial, dir_modbus, baudrate, bit_paridad } = editable.value
    return !!serial
      && !!dir_modbus
      && !!baudrate
      && !!bit_paridad
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
            <label for="name" class="block mb-2 text-sm font-semibold text-gray-900">Serial</label>
            <input type="text" id="name" v-model="editable.serial" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Serial value">
          </div>
          <div>
            <label for="name" class="block mb-2 text-sm font-semibold text-gray-900">Modbus direction</label>
            <input type="text" id="name" v-model="editable.dir_modbus" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Modbus direction value">
          </div>
          <div>
            <label for="name" class="block mb-2 text-sm font-semibold text-gray-900">Baudrate</label>
            <input type="text" id="name" v-model="editable.baudrate" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Baudrate value">
          </div>
          <div>
            <label for="type" class="block mb-2 text-sm font-semibold text-gray-900">Type</label>
            <select id="type" v-model="editable.bit_paridad" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              <option v-for="item in ModbusParity" :value="item">{{ item }}</option>
            </select>
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
