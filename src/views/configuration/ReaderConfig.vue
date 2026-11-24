<script setup lang="ts">
  import { vLongPress } from '@/composables/longPress';
  import { IReaderConfig, Region, TagEncoding, ReaderQ, ReaderSession, ReaderTarget, isValidInteger } from '@/commons';
  import { AlertIcon, CloseIcon, LoadingIcon, RefreshIcon, SearchIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const editable: Ref<IReaderConfig> = ref({} as IReaderConfig)
  const savingData = ref(false)
  const resetting = ref(false)
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

  const isComplete = (): boolean => {
    const { region, read_pwr, write_pwr, password } = editable.value
    if (!region) return false
    if (!adminMode.value) return true
    return validReadWritePowerValue(read_pwr)
      && validReadWritePowerValue(write_pwr)
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
      if (wasInAdminMode && !result.advanced_updated) {
        globalStore.notify('Wrong password: advanced fields were not updated', 'error')
      } else {
        globalStore.notify('Reader configuration saved', 'success')
      }
    } finally {
      savingData.value = false
    }
  }

  // Factory reset overwrites the whole reader config (region + advanced fields) with
  // the backend defaults, so it is admin-gated and reuses the password field. On a
  // wrong password the backend returns 403 and the store call throws (already
  // notified by apiFetch); we just clear the flag in that case.
  const factoryReset = async () => {
    if (!window.confirm('Restore the RFID reader configuration to factory defaults? This overwrites all reader settings.')) {
      return
    }
    resetting.value = true
    advancedUpdated.value = null
    try {
      await globalStore.resetReaderConfigToFactory(editable.value.password ?? '')
      hasUnsavedChanges.value = false
      adminMode.value = false
      globalStore.notify('Reader configuration restored to factory defaults', 'success')
    } catch {
      /* apiFetch already notified the error (e.g. wrong password) */
    } finally {
      resetting.value = false
    }
  }

  // Antenna scan: no password and no admin mode, it is a routine field check. Null until the first scan.
  const detectingAntennas = ref(false)
  const antennaScan: Ref<{ count: number; ports: number[] } | null> = ref(null)

  const detectAntennas = async () => {
    detectingAntennas.value = true
    try {
      const { ant_count, ant_ports } = await globalStore.detectAntennas()
      antennaScan.value = { count: ant_count, ports: ant_ports }
      // The reader answered, so zero antennas is a warning, not an error.
      globalStore.notify(
        ant_count > 0 ? `${ant_count} antenna(s) detected` : 'No antennas detected',
        ant_count > 0 ? 'success' : 'warning',
      )
    } catch {
      /* apiFetch already notified the error (reader not responding, 503) */
    } finally {
      detectingAntennas.value = false
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
    if (hasUnsavedChanges.value && !window.confirm('Leave without saving your reader changes?')) {
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
  <section class="antialiased">
    <div class="mx-auto max-w-3xl space-y-4">
      <div class="card overflow-hidden py-4 px-4 md:px-6">
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

        <div v-if="antennaScan === null" class="flex items-center gap-2 text-sm text-ink-faint py-2">
          <SearchIcon class="w-4 h-4 shrink-0" />
          <span>No scan yet. Press <span class="font-semibold text-ink-soft">Detect antennas</span> to query the reader.</span>
        </div>

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

        <div v-else class="flex items-center p-4 text-warn rounded-lg bg-warn-soft" role="status">
          <AlertIcon class="w-5 h-5 mr-3 shrink-0" />
          <p class="text-sm font-medium">No antennas detected. Check the physical connections and scan again.</p>
        </div>
      </div>

      <div class="card overflow-hidden py-4 px-4 md:px-6">
        <!-- Ctrl+Shift+double click (or long press) on the section name opens the advanced settings. -->
        <h2 class="mb-4 select-none text-base font-semibold [-webkit-touch-callout:none]"
          v-on:dblclick.shift.ctrl="adminMode = !adminMode"
          v-long-press="() => adminMode = !adminMode">RFID reader</h2>
        <LoadingIcon v-if="!editable.region" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-12" />
        <template v-else>

          <div class="grid gap-4 mb-4">
            <!-- Region (always visible, editable) -->
            <div>
              <label class="field-label">Region</label>
              <select
                v-model="editable.region"
                class="input !border-accent/40">
                <option v-for="item in Region" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </div>

            <!-- Admin-only fields -->
            <template v-if="adminMode">
              <div>
                <label class="field-label">Tag Encoding</label>
                <select v-model="editable.tag_encoding" class="input">
                  <option v-for="item in TagEncoding" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div>
                <label class="field-label">Read power (cdBm)</label>
                <input class="input"
                  type="number" step="1" min="0" max="3300"
                  v-model.number="editable.read_pwr"
                  placeholder="Read power in cdBm">
                <p class="mt-2 text-sm text-ink-faint">0 – 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.read_pwr)" class="mt-2 text-sm text-crit">Value out of range.</p>
              </div>
              <div>
                <label class="field-label">Write power (cdBm)</label>
                <input class="input"
                  type="number" step="1" min="0" max="3300"
                  v-model.number="editable.write_pwr"
                  placeholder="Write power in cdBm">
                <p class="mt-2 text-sm text-ink-faint">0 – 3300 cdBm.</p>
                <p v-show="!validReadWritePowerValue(editable.write_pwr)" class="mt-2 text-sm text-crit">Value out of range.</p>
              </div>
              <div>
                <label class="field-label">Active antennas</label>
                <input class="input"
                  type="text"
                  v-model="editable.ants"
                  placeholder="e.g. 0,1,2,3">
                <p class="mt-2 text-sm text-ink-faint">Comma-separated indices.</p>
              </div>
              <div>
                <label class="field-label">Q (algorithm)</label>
                <select v-model="editable.q" class="input">
                  <option v-for="q in ReaderQ" :key="q" :value="q">{{ q }}</option>
                </select>
              </div>
              <div>
                <label class="field-label">Session</label>
                <select v-model="editable.session" class="input">
                  <option v-for="s in ReaderSession" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="field-label">Target</label>
                <select v-model="editable.target" class="input">
                  <option v-for="t in ReaderTarget" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="field-label !text-accent">Password</label>
                <input type="password" v-model="editable.password"
                  class="input !border-accent/40"
                  placeholder="admin password">
              </div>
            </template>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col items-end gap-2">
            <div class="flex items-center space-x-4">
              <button v-if="adminMode" @click="factoryReset()" :disabled="savingData || resetting || !editable.password" type="button"
                class="btn-ghost !text-crit" title="Restore reader configuration to factory defaults">
                <template v-if="resetting">
                  <LoadingIcon class="animate-spin fill-transparent w-4" />
                  Restoring...
                </template>
                <template v-else>
                  <RefreshIcon class="w-4" />
                  Restore factory defaults
                </template>
              </button>
              <button v-if="adminMode" @click="cancelAdmin()" :disabled="savingData || resetting" type="button"
                class="btn-ghost">
                <CloseIcon class="w-4" />
                Cancel
              </button>
              <button @click="save()" :disabled="savingData || resetting || !isComplete()" type="button"
                class="btn-primary">
                <template v-if="savingData">
                  <LoadingIcon class="animate-spin fill-transparent w-4" />
                  Saving...
                </template>
                <template v-else>
                  <SendIcon class="w-4" />
                  Save
                </template>
              </button>
            </div>
            <p v-if="advancedUpdated === false" class="text-sm text-crit"><span class="font-semibold">Wrong password:</span> advanced fields were not updated.</p>
            <p v-else-if="advancedUpdated === true" class="text-sm text-ok">Advanced fields updated successfully.</p>
          </div>

        </template>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
