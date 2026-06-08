<script setup lang="ts">
  import { ISystem, ModbusBitParity, BaudRate, isValidInteger } from '@/commons';
  import { AlertIcon, LoadingIcon, RefreshIcon, SearchIcon, SendIcon } from '@/components/icons';
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

// Autodetección de antenas. No requiere password, solo modo admin.
// `antennaScan` es null mientras no se haya corrido ningún scan en esta sesión.
  const detectingAntennas = ref(false)
  const antennaScan: Ref<{ count: number; ports: number[] } | null> = ref(null)

  const detectAntennas = async () => {
    detectingAntennas.value = true
    try {
      const { ant_count, ant_ports } = await globalStore.detectAntennas()
      antennaScan.value = { count: ant_count, ports: ant_ports }
      // 0 antenas no es un error (el reader respondió): lo avisamos como warning.
      globalStore.notify(
        ant_count > 0 ? `${ant_count} antenna(s) detected` : 'No antennas detected',
        ant_count > 0 ? 'success' : 'warning',
      )
    } catch {
      // El store ya notifica el error (reader sin responder, 503, etc).
    } finally {
      detectingAntennas.value = false
    }
  }

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

      <!-- Antenna detection card: solo en modo admin, NO requiere password (FHC-190) -->
      <div v-if="adminMode" class="card overflow-hidden py-4 px-4 md:px-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-base font-semibold">Antenna detection</h2>
            <p class="text-sm text-ink-soft mt-0.5">Scan the reader for connected antenna ports.</p>
          </div>
          <button @click="detectAntennas()" :disabled="detectingAntennas" type="button" class="btn-ghost">
            <LoadingIcon v-if="detectingAntennas" class="animate-spin fill-transparent w-4 mr-1" />
            <SearchIcon v-else class="w-4 mr-1" />
            {{ detectingAntennas ? 'Detecting...' : 'Detect antennas' }}
          </button>
        </div>

        <!-- Estado inicial: aún no se corrió ningún scan en esta sesión. -->
        <div v-if="antennaScan === null" class="flex items-center gap-2 text-sm text-ink-faint py-2">
          <SearchIcon class="w-4 h-4 shrink-0" />
          <span>No scan yet — press <span class="font-semibold text-ink-soft">Detect antennas</span> to query the reader.</span>
        </div>

        <!-- Resultado con antenas: resumen + tiles tipo LED por puerto. -->
        <template v-else-if="antennaScan.count > 0">
          <span class="pill bg-ok-soft text-ok ring-ok/30">
            <span class="w-2 h-2 rounded-full bg-ok"></span>
            {{ antennaScan.count }} {{ antennaScan.count === 1 ? 'antenna' : 'antennas' }} detected
          </span>
          <div class="flex flex-wrap gap-3 mt-4">
            <div v-for="port in antennaScan.ports" :key="port"
              class="flex flex-col items-center justify-center w-16 h-16 rounded-lg border border-ok/40 bg-ok-soft">
              <span class="text-sm font-semibold text-ok">P{{ port }}</span>
              <span class="w-2.5 h-2.5 rounded-full bg-ok mt-1.5 shadow-[0_0_6px_rgb(var(--ok))]"></span>
            </div>
          </div>
          <p class="text-xs text-ink-faint mt-3">Lit = port with a connected antenna.</p>
        </template>

        <!-- Resultado vacío: el reader respondió, pero sin antenas. -->
        <div v-else class="flex items-center p-4 text-warn rounded-lg bg-warn-soft" role="status">
          <AlertIcon class="w-5 h-5 mr-3 shrink-0" />
          <p class="text-sm font-medium">No antennas detected. Check the physical connections and scan again.</p>
        </div>
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
