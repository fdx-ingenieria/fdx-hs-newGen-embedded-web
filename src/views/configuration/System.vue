<script setup lang="ts">
  import { ISystem, ModbusBitParity, BaudRate, isValidInteger } from '@/commons';
  import { AlertIcon, LoadingIcon, RefreshIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<ISystem> = ref({} as ISystem)
  const savingData = ref(false)
  const { getSystemData } = storeToRefs(globalStore)
  const adminMode = ref(false)
  const hasUnsavedChanges = ref(false)
  const serialUpdated: Ref<boolean | null> = ref(null)
  const restarting = ref(false)

  const restartService = async () => {
    if (!window.confirm('Are you sure? The app will disconnect for a few seconds while the service restarts.')) return
    restarting.value = true
    try {
      await globalStore.restartService(editable.value.password ?? '')
    } catch {
      // El store ya notifica el error (password incorrecto u otro fallo).
    } finally {
      restarting.value = false
    }
  }

  watch(getSystemData, (newValue) => {
    editable.value = JSON.parse(JSON.stringify(newValue))
  }, { immediate: true })

  watch(editable, () => {
    hasUnsavedChanges.value = true
    // deep compare
    if (JSON.stringify(editable.value) === JSON.stringify(getSystemData.value)) {
      hasUnsavedChanges.value = false
    }
  }, { deep: true })

  const save = () => {
    const wasInAdminMode = adminMode.value
    serialUpdated.value = null
    savingData.value = true
    adminMode.value = false
    globalStore.updateSystemData(editable.value)
      .then(result => {
        if (wasInAdminMode) serialUpdated.value = result.serial_updated
        if (wasInAdminMode && !result.serial_updated) {
          globalStore.notify('Wrong password: serial number was not updated', 'error')
        } else {
          globalStore.notify('System configuration saved', 'success')
        }
      })
      .finally(() => savingData.value = false)
  }

  const validDirModbus = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 1 && value <= 247
  }

  const isComplete = (): boolean => {
    const { serial_num, modbus_address, baud_rate, bit_parity, password } = editable.value
    const modbusValid = validDirModbus(modbus_address) && !!baud_rate && bit_parity !== undefined
    if (adminMode.value) return modbusValid && !!serial_num && !!password
    return modbusValid
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
    globalStore.loadSystemData()
  })

  onUnmounted(() => {
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden py-4 px-4 md:px-6 select-none"
        v-on:dblclick.shift.ctrl="adminMode = !adminMode">
        <LoadingIcon v-if="editable.baud_rate === undefined" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template  v-else >
          <div class="grid gap-4 mb-4">
            <div v-if="!adminMode">
              <label class="block mb-2 text-sm font-semibold text-gray-900">Serial</label>
              <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50"
                type="text"
                :value="editable.serial_num"
                placeholder="Serial value"
                readonly />
            </div>
            <template v-else>
              <div>
                <label class="block mb-2 text-sm font-semibold text-blue-900">Serial</label>
                <input class="bg-gray-50 border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50"
                  type="text"
                  maxlength="8"
                  v-model="editable.serial_num"
                  placeholder="Serial value">
              </div>
              <div>
                <label class="block mb-2 text-sm font-semibold text-blue-900">Password</label>
                <input type="password" v-model="editable.password" class="bg-gray-50 border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 disabled:opacity-50" placeholder="Admin password">
              </div>
            </template>
            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Modbus address</label>
              <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                type="number"
                min="1"
                max="247"
                step="1"
                v-model.number="editable.modbus_address"
                placeholder="Modbus direction value">
              <p v-show="!validDirModbus(editable.modbus_address)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value should be between 1 and 247.</p>
            </div>
            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Baud rate</label>
              <select v-model="editable.baud_rate" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                <option v-for="item in BaudRate" :value="item">{{ item }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-2 text-sm font-semibold text-gray-900">Bit parity</label>
              <select v-model="editable.bit_parity" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                <option v-for="item, key in ModbusBitParity" :value="key">{{ item }}</option>
              </select>
              <div class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 mt-2" role="alert">
                <AlertIcon class="w-5 h-5 mr-3" />
                <div class="ml-3 text-sm font-medium">
                  <p><strong>If selected without parity:</strong> The system will use 2 stop bits.</p>
                  <p><strong>If selected with parity (either one):</strong> The system will use 1 stop bit.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="flex items-center gap-2">
              <button v-if="adminMode" @click="restartService()" :disabled="restarting || !editable.password" type="button" class="text-white flex items-center disabled:opacity-50 bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-semibold rounded-lg text-sm px-5 py-1.5 focus:outline-none">
                <LoadingIcon v-if="restarting" class="animate-spin fill-transparent w-4 mr-1" />
                <RefreshIcon v-else class="w-4 mr-1" />
                {{ restarting ? 'Restarting...' : 'Restart service' }}
              </button>
              <button @click="save()" :disabled="savingData || !isComplete()" type="button" class="text-white flex items-center disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 focus:outline-none">
                <template v-if="savingData">
                  <LoadingIcon class="animate-spin fill-transparent w-4 mr-1" />
                  Saving...
                </template>
                <template v-else>
                  <SendIcon class="w-4 mr-1" />
                  Save
                </template>
              </button>
            </div>
            <p v-if="serialUpdated === false" class="text-sm text-red-600"><span class="font-semibold">Wrong password:</span> serial number was not updated.</p>
            <p v-else-if="serialUpdated === true" class="text-sm text-green-600">Serial number updated successfully.</p>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
