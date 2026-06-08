<script setup lang="ts">
  import { ISystem, ModbusBitParity, BaudRate, isValidInteger } from '@/commons';
  import { AlertIcon, LoadingIcon, RefreshIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<ISystem> = ref({} as ISystem)
  const savingSystem = ref(false)
  const savingModbus = ref(false)
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

  // El password es una credencial transitoria (para guardar serial o reiniciar el
  // servicio), no un campo persistido. Lo excluimos de la comparación para que
  // tipearlo no marque "cambios sin guardar" y bloquee la navegación.
  const withoutPassword = (s: ISystem): Omit<ISystem, 'password'> => {
    const { password: _password, ...rest } = s
    return rest
  }

  watch(editable, () => {
    hasUnsavedChanges.value =
      JSON.stringify(withoutPassword(editable.value)) !== JSON.stringify(withoutPassword(getSystemData.value))
  }, { deep: true })

  // Guardado de settings de admin (serial / measure period / password).
  const saveSystem = () => {
    serialUpdated.value = null
    savingSystem.value = true
    globalStore.updateSystemData(editable.value)
      .then(result => {
        serialUpdated.value = result.serial_updated
        if (!result.serial_updated) {
          globalStore.notify('Wrong password: serial number was not updated', 'error')
        } else {
          globalStore.notify('System configuration saved', 'success')
          adminMode.value = false
        }
      })
      .finally(() => savingSystem.value = false)
  }

  // Guardado de settings de Modbus (siempre disponible, no requiere admin).
  const saveModbus = () => {
    savingModbus.value = true
    globalStore.updateModbusData(editable.value)
      .then(() => globalStore.notify('Modbus configuration saved', 'success'))
      .finally(() => savingModbus.value = false)
  }

  const validDirModbus = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= 1 && value <= 247
  }

  // El backend guarda el período en ms (rango 1000–3600000), pero lo editamos en
  // segundos para que sea más legible. Conversión ida/vuelta en este computed.
  const MIN_PERIOD_S = 1
  const MAX_PERIOD_S = 3600
  const measurePeriodSec = computed<number>({
    get: () => Math.round((editable.value.measure_period_ms ?? 5000) / 1000),
    set: (value) => { editable.value.measure_period_ms = Math.round(value * 1000) },
  })

  const validMeasurePeriod = (sec: number): boolean => {
    if (!isValidInteger(sec)) return false
    return sec >= MIN_PERIOD_S && sec <= MAX_PERIOD_S
  }

  const isSystemComplete = (): boolean => {
    const { serial_num, password } = editable.value
    return !!serial_num && !!password && validMeasurePeriod(measurePeriodSec.value)
  }

  const isModbusComplete = (): boolean => {
    const { modbus_address, baud_rate, bit_parity } = editable.value
    return validDirModbus(modbus_address) && !!baud_rate && bit_parity !== undefined
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
  <section class="antialiased">
    <div class="mx-auto space-y-4">
      <!-- System card: settings de admin (serial / measure period / password) -->
      <div class="card overflow-hidden py-4 px-4 md:px-6 select-none"
        v-on:dblclick.shift.ctrl="adminMode = !adminMode">
        <h2 class="text-base font-semibold mb-4">System</h2>
        <LoadingIcon v-if="editable.baud_rate === undefined" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template v-else>
          <div class="grid gap-4 mb-4">
            <div v-if="!adminMode">
              <label class="field-label">Serial</label>
              <input class="input disabled:opacity-50"
                type="text"
                :value="editable.serial_num"
                placeholder="Serial value"
                readonly />
            </div>
            <template v-else>
              <div>
                <label class="field-label !text-accent">Serial</label>
                <input class="input !border-accent/40"
                  type="text"
                  maxlength="8"
                  v-model="editable.serial_num"
                  placeholder="Serial value">
              </div>
              <div>
                <label class="field-label !text-accent">Measure period (s)</label>
                <input class="input !border-accent/40"
                  type="number"
                  min="1"
                  max="3600"
                  step="1"
                  v-model.number="measurePeriodSec"
                  placeholder="Seconds between read cycles">
                <p v-show="!validMeasurePeriod(measurePeriodSec)" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between 1 and 3600 seconds.</p>
              </div>
              <div>
                <label class="field-label !text-accent">Password</label>
                <input type="password" v-model="editable.password" class="input !border-accent/40" placeholder="Admin password">
              </div>
            </template>
          </div>
          <div v-if="adminMode" class="flex flex-col items-end gap-2">
            <div class="flex items-center gap-2">
              <button @click="restartService()" :disabled="restarting || !editable.password" type="button" class="btn-danger">
                <LoadingIcon v-if="restarting" class="animate-spin fill-transparent w-4 mr-1" />
                <RefreshIcon v-else class="w-4 mr-1" />
                {{ restarting ? 'Restarting...' : 'Restart service' }}
              </button>
              <button @click="saveSystem()" :disabled="savingSystem || !isSystemComplete()" type="button" class="btn-primary">
                <template v-if="savingSystem">
                  <LoadingIcon class="animate-spin fill-transparent w-4 mr-1" />
                  Saving...
                </template>
                <template v-else>
                  <SendIcon class="w-4 mr-1" />
                  Save
                </template>
              </button>
            </div>
            <p v-if="serialUpdated === false" class="text-sm text-crit"><span class="font-semibold">Wrong password:</span> serial number was not updated.</p>
            <p v-else-if="serialUpdated === true" class="text-sm text-ok">Serial number updated successfully.</p>
          </div>
        </template>
      </div>

      <!-- Modbus card: settings comunes (no requieren admin) -->
      <div class="card overflow-hidden py-4 px-4 md:px-6">
        <h2 class="text-base font-semibold mb-4">Modbus</h2>
        <LoadingIcon v-if="editable.baud_rate === undefined" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template v-else>
          <div class="grid gap-4 mb-4">
            <div>
              <label class="field-label">Modbus address</label>
              <input class="input"
                type="number"
                min="1"
                max="247"
                step="1"
                v-model.number="editable.modbus_address"
                placeholder="Modbus direction value">
              <p v-show="!validDirModbus(editable.modbus_address)" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between 1 and 247.</p>
            </div>
            <div>
              <label class="field-label">Baud rate</label>
              <select v-model="editable.baud_rate" class="input">
                <option v-for="item in BaudRate" :value="item">{{ item }}</option>
              </select>
            </div>
            <div>
              <label class="field-label">Bit parity</label>
              <select v-model="editable.bit_parity" class="input">
                <option v-for="item, key in ModbusBitParity" :value="key">{{ item }}</option>
              </select>
              <div class="flex items-center p-4 mb-4 text-warn rounded-lg bg-warn-soft mt-2" role="alert">
                <AlertIcon class="w-5 h-5 mr-3" />
                <div class="ml-3 text-sm font-medium">
                  <p><strong>If selected without parity:</strong> The system will use 2 stop bits.</p>
                  <p><strong>If selected with parity (either one):</strong> The system will use 1 stop bit.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button @click="saveModbus()" :disabled="savingModbus || !isModbusComplete()" type="button" class="btn-primary">
              <template v-if="savingModbus">
                <LoadingIcon class="animate-spin fill-transparent w-4 mr-1" />
                Saving...
              </template>
              <template v-else>
                <SendIcon class="w-4 mr-1" />
                Save
              </template>
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
