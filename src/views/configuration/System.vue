<script setup lang="ts">
  import { ISystem, ITimers, ModbusBitParity, BaudRate, isValidInteger } from '@/commons';
  import { AlertIcon, LoadingIcon, RefreshIcon, SearchIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<ISystem> = ref({} as ISystem)
  const editableTimers: Ref<ITimers> = ref({} as ITimers)
  const savingSystem = ref(false)
  const savingModbus = ref(false)
  const savingTimers = ref(false)
  const { getSystemData, getTimersData } = storeToRefs(globalStore)
  const adminMode = ref(false)
  const hasUnsavedChanges = ref(false)
  const serialUpdated: Ref<boolean | null> = ref(null)
  const timersUpdated: Ref<boolean | null> = ref(null)
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

  // Installation mode (normal vs. switchgear): admin-only, gated by its own
  // password field (changing it wrong could silently switch the reader's
  // processing behavior). Persists immediately on the backend, so there's no
  // separate save step — the toggle itself is the action.
  const { getAppModeIsSwitchgear } = storeToRefs(globalStore)
  const settingAppMode = ref(false)
  const appModePassword = ref('')

  const toggleAppMode = async () => {
    settingAppMode.value = true
    try {
      await globalStore.setAppMode(!getAppModeIsSwitchgear.value, appModePassword.value)
      globalStore.notify(
        `Installation mode set to ${getAppModeIsSwitchgear.value ? 'Auto' : 'Manual'}`,
        'success',
      )
      appModePassword.value = ''
    } catch {
      // El store ya notifica el error (password incorrecto u otro fallo).
    } finally {
      settingAppMode.value = false
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

  watch(getTimersData, (newValue) => {
    editableTimers.value = JSON.parse(JSON.stringify(newValue))
  }, { immediate: true })

  // El password es una credencial transitoria (para guardar serial/timers o reiniciar
  // el servicio), no un campo persistido. Lo excluimos de la comparación para que
  // tipearlo no marque "cambios sin guardar" y bloquee la navegación.
  const withoutPassword = <T extends { password?: string }>(s: T): Omit<T, 'password'> => {
    const { password: _password, ...rest } = s
    return rest
  }

  const recomputeUnsaved = () => {
    const systemDirty =
      JSON.stringify(withoutPassword(editable.value)) !== JSON.stringify(withoutPassword(getSystemData.value))
    const timersDirty =
      JSON.stringify(withoutPassword(editableTimers.value)) !== JSON.stringify(withoutPassword(getTimersData.value))
    hasUnsavedChanges.value = systemDirty || timersDirty
  }

  watch(editable, recomputeUnsaved, { deep: true })
  watch(editableTimers, recomputeUnsaved, { deep: true })

  // Guardado de settings de admin (serial / password).
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
        }
      })
      .finally(() => savingSystem.value = false)
  }

  // Guardado de los timers de inventario. Reusa el password de admin de la card de
  // System (la misma credencial). El backend valida measure >= t_on + t_off (400);
  // también lo chequeamos en cliente para deshabilitar el botón antes de pegarle.
  const saveTimers = () => {
    timersUpdated.value = null
    savingTimers.value = true
    globalStore.updateTimersData({ ...editableTimers.value, password: editable.value.password })
      .then(result => {
        timersUpdated.value = result.updated
        if (!result.updated) {
          globalStore.notify('Wrong password: timers were not updated', 'error')
        } else {
          globalStore.notify('Inventory timers saved', 'success')
        }
      })
      // El 400 de la constraint cruzada lo notifica apiFetch; no marcamos updated.
      .finally(() => savingTimers.value = false)
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
  // UI ceiling for reader-on; well below the backend hard limit (10 s, tied to the
  // ZMQ socket timeout). 10 s of continuous irradiation is overkill and runs hot —
  // most tags are discovered within a second, so 5 s is already generous.
  const T_ON_MAX_MS = 5_000
  const T_OFF_MAX_MS = 15_000
  // Both sliders share one track (0 – 15 000 ms) so the two knobs sit on the same
  // visual scale; reader-on is just clamped to its lower ceiling (T_ON_MAX_MS).
  const measurePeriodSec = computed<number>({
    get: () => Math.round((editableTimers.value.measure_period_ms ?? 30000) / 1000),
    set: (value) => { editableTimers.value.measure_period_ms = Math.round(value * 1000) },
  })

  // reader-on shares the 0–15 000 track but locks at 10 000: the setter clamps so
  // dragging the slider (or typing) past the ceiling snaps back to T_ON_MAX_MS.
  const readerOnModel = computed<number>({
    get: () => editableTimers.value.t_reader_on,
    set: (value) => { editableTimers.value.t_reader_on = Math.min(value, T_ON_MAX_MS) },
  })

  const validMeasurePeriod = (sec: number): boolean => {
    if (!isValidInteger(sec)) return false
    return sec >= MIN_PERIOD_S && sec <= MAX_PERIOD_S
  }

  const validReaderOn = (ms: number): boolean => isValidInteger(ms) && ms >= 0 && ms <= T_ON_MAX_MS
  const validReaderOff = (ms: number): boolean => isValidInteger(ms) && ms >= 0 && ms <= T_OFF_MAX_MS

  // Constraint cruzada (espejo del backend): al menos un ciclo completo de inventario
  // por ventana de medición. measure_period_ms se compara en ms con t_on + t_off.
  const crossConstraintOk = computed<boolean>(() =>
    (editableTimers.value.measure_period_ms ?? 0) >=
    (editableTimers.value.t_reader_on ?? 0) + (editableTimers.value.t_reader_off ?? 0))

  const isSystemComplete = (): boolean => {
    const { serial_num, password } = editable.value
    return !!serial_num && !!password
  }

  const isTimersComplete = (): boolean => {
    const { t_reader_on, t_reader_off } = editableTimers.value
    return !!editable.value.password
      && validReaderOn(t_reader_on)
      && validReaderOff(t_reader_off)
      && validMeasurePeriod(measurePeriodSec.value)
      && crossConstraintOk.value
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
    globalStore.loadTimersData()
  })

  onUnmounted(() => {
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased">
    <div class="mx-auto space-y-4">
      <!-- System card: admin settings (serial + inventory timing). The admin password
           and the save/restart buttons live at the very bottom, shared by serial and
           timers (both are admin-gated by the same credential). -->
      <div class="card overflow-hidden py-4 px-4 md:px-6 select-none"
        v-on:dblclick.shift.ctrl="adminMode = !adminMode">
        <h2 class="text-base font-semibold mb-4">System</h2>
        <LoadingIcon v-if="editable.baud_rate === undefined" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template v-else>
          <!-- Non-admin: serial is read-only -->
          <div v-if="!adminMode">
            <label class="field-label">Serial</label>
            <input class="input disabled:opacity-50"
              type="text"
              :value="editable.serial_num"
              placeholder="Serial value"
              readonly />
          </div>

          <!-- Admin: serial + inventory timing, then password + actions at the bottom -->
          <template v-else>
            <div class="grid gap-4 mb-4">
              <div>
                <label class="field-label !text-accent">Serial</label>
                <input class="input !border-accent/40"
                  type="text"
                  maxlength="8"
                  v-model="editable.serial_num"
                  placeholder="Serial value">
              </div>
            </div>

            <!-- Inventory timing subsection: advanced reader cadence knobs -->
            <div class="border-t border-line pt-4 mb-4">
              <div class="grid gap-5">
                <!-- T reader on: slider + numeric, 0–10 000 ms -->
                <div>
                  <label class="field-label !text-accent">Reader on (ms)</label>
                  <div class="flex items-center gap-3">
                    <input type="range" min="0" max="15000" step="100"
                      v-model.number="readerOnModel"
                      class="flex-1 accent-accent">
                    <input class="input !border-accent/40 w-28"
                      type="number" min="0" max="5000" step="1"
                      v-model.number="readerOnModel">
                  </div>
                  <p class="mt-1 text-sm text-ink-faint">0 – 5 000 ms. Active irradiation time per inventory cycle.</p>
                  <p v-show="!validReaderOn(editableTimers.t_reader_on)" class="mt-1 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between 0 and 5 000 ms.</p>
                </div>

                <!-- T reader off: slider + numeric, 0–20 000 ms -->
                <div>
                  <label class="field-label !text-accent">Reader off (ms)</label>
                  <div class="flex items-center gap-3">
                    <input type="range" min="0" max="15000" step="500"
                      v-model.number="editableTimers.t_reader_off"
                      class="flex-1 accent-accent">
                    <input class="input !border-accent/40 w-28"
                      type="number" min="0" max="15000" step="1"
                      v-model.number="editableTimers.t_reader_off">
                  </div>
                  <p class="mt-1 text-sm text-ink-faint">0 – 15 000 ms. Rest time between inventory cycles.</p>
                  <p v-show="!validReaderOff(editableTimers.t_reader_off)" class="mt-1 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between 0 and 15 000 ms.</p>
                </div>

                <!-- Measure period: numeric only (1 s – 1 h no escala en slider) -->
                <div>
                  <label class="field-label !text-accent">Measure period (s)</label>
                  <input class="input !border-accent/40"
                    type="number" min="1" max="3600" step="1"
                    v-model.number="measurePeriodSec"
                    placeholder="Seconds between measurement windows">
                  <p class="mt-1 text-sm text-ink-faint">1 – 3600 s. How often readings are drained into a measurement.</p>
                  <p v-show="!validMeasurePeriod(measurePeriodSec)" class="mt-1 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between 1 and 3600 seconds.</p>
                </div>

                <!-- Constraint cruzada: measure_period >= t_on + t_off -->
                <div v-if="!crossConstraintOk" class="flex items-center p-4 text-warn rounded-lg bg-warn-soft" role="alert">
                  <AlertIcon class="w-5 h-5 mr-3 shrink-0" />
                  <p class="text-sm font-medium">Measure period must be at least <strong>Reader on + Reader off</strong> ({{ ((editableTimers.t_reader_on ?? 0) + (editableTimers.t_reader_off ?? 0)) / 1000 }} s) — one full inventory cycle per measurement window.</p>
                </div>
              </div>
            </div>

            <!-- Password + actions: shared admin credential for serial and timers -->
            <div class="border-t border-line pt-4">
              <div class="mb-4">
                <label class="field-label !text-accent">Password</label>
                <input type="password" v-model="editable.password" class="input !border-accent/40" placeholder="Admin password">
              </div>
              <div class="flex flex-col items-end gap-2">
                <div class="flex flex-wrap items-center justify-end gap-2">
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
                      Save serial
                    </template>
                  </button>
                  <button @click="saveTimers()" :disabled="savingTimers || !isTimersComplete()" type="button" class="btn-primary">
                    <template v-if="savingTimers">
                      <LoadingIcon class="animate-spin fill-transparent w-4 mr-1" />
                      Saving...
                    </template>
                    <template v-else>
                      <SendIcon class="w-4 mr-1" />
                      Save timers
                    </template>
                  </button>
                </div>
                <p v-if="serialUpdated === false" class="text-sm text-crit"><span class="font-semibold">Wrong password:</span> serial number was not updated.</p>
                <p v-else-if="serialUpdated === true" class="text-sm text-ok">Serial number updated successfully.</p>
                <p v-if="timersUpdated === false" class="text-sm text-crit"><span class="font-semibold">Wrong password:</span> timers were not updated.</p>
                <p v-else-if="timersUpdated === true" class="text-sm text-ok">Timers updated successfully.</p>
              </div>
            </div>
          </template>
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

        <!-- Resultado con antenas: resumen + tiles por puerto (contenedor neutro,
             el color queda solo en texto/punto — sin fondo relleno, ring ni glow). -->
        <template v-else-if="antennaScan.count > 0">
          <p class="text-sm font-medium text-ok/70">
            {{ antennaScan.count }} {{ antennaScan.count === 1 ? 'antenna' : 'antennas' }} detected
          </p>
          <div class="flex flex-wrap gap-3 mt-3">
            <div v-for="port in antennaScan.ports" :key="port"
              class="flex flex-col items-center justify-center w-16 h-16 rounded-lg border border-line bg-panel-soft">
              <span class="text-sm font-semibold text-ink">P{{ port }}</span>
              <span class="w-1.5 h-1.5 rounded-full bg-ok/70 mt-1.5"></span>
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

      <!-- Installation mode card: solo en modo admin, con su propia password (no
           comparte la de arriba) — cambiarlo por error altera el comportamiento
           de procesamiento del reader. -->
      <div v-if="adminMode" class="card overflow-hidden py-4 px-4 md:px-6">
        <div class="mb-3">
          <h2 class="text-base font-semibold">Installation mode</h2>
          <p class="text-sm text-ink-soft mt-0.5">Switchgear cabinets auto-register sensor groups per antenna instead of relying on manually configured sensors.</p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[160px]">
            <label class="field-label">Password</label>
            <input type="password" v-model="appModePassword" class="input" placeholder="Admin password">
          </div>
          <button @click="toggleAppMode()" :disabled="settingAppMode || !appModePassword" type="button" class="btn-ghost">
            <LoadingIcon v-if="settingAppMode" class="animate-spin fill-transparent w-4 mr-1" />
            <RefreshIcon v-else class="w-4 mr-1" />
            Switch to {{ getAppModeIsSwitchgear ? 'Manual' : 'Auto' }}
          </button>
        </div>
        <p class="mt-3 text-sm text-ink-soft">
          Current:
          <span class="ml-1 font-semibold" :class="getAppModeIsSwitchgear ? 'text-accent/70' : 'text-ok/70'">
            {{ getAppModeIsSwitchgear ? 'Auto' : 'Manual' }}
          </span>
        </p>
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
