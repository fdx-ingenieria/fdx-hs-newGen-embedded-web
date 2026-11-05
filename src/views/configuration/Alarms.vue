<script setup lang="ts">
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import EditForm from '@/components/alarms/EditForm.vue';
  import { CloseIcon, LoadingIcon, RemoveIcon } from '@/components/icons';
  import { ALARM_PRESETS, PresetKey, buildAlarmPreset } from '@/commons/installPresets';
  import { vLongPress } from '@/composables/longPress';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, ref } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableAlarms } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const alarmId = ref(-1)
  const loadingData = ref(true)

  // El backend es la fuente de verdad: la tabla bindea al store y cada Save/Reset
  // del EditForm hace re-fetch (loadAlarms), así que no hay copia local ni bulk-save.
  const editingAlarm = computed(() =>
    getAvailableAlarms.value.find(a => a.id === alarmId.value)
  )

  // Slots holding a name or locations; the rest are already empty.
  const usedAlarms = computed(() => getAvailableAlarms.value.filter(a => a.name || a.fields.length))

  const deletingAll = ref(false)
  const deleteAllAlarms = async () => {
    if (!window.confirm(
      `Delete all ${usedAlarms.value.length} configured alarms?\n\n`
      + 'Every slot goes back to empty and its relay stops being driven by it.'
    )) return
    deletingAll.value = true
    showRightSideBar.value = false
    try {
      await globalStore.deleteAllAlarms()
    } finally {
      deletingAll.value = false
    }
  }

  const showPresets = ref(false)
  const presetKey = ref<PresetKey | null>(null)
  const bank = ref(1)
  const applyingPreset = ref(false)
  const preview = computed(() => presetKey.value
    ? buildAlarmPreset(globalStore.getAvailableLabels, presetKey.value, bank.value)
    : { alarms: [], missing: [] })

  const applyPreset = async () => {
    const n = preview.value.alarms.length
    if (!n || !window.confirm(
      `Replace the alarm configuration with this preset?\n\n`
      + `Slots 0 to ${n - 1} are overwritten and every other slot is cleared.`
    )) return
    applyingPreset.value = true
    showRightSideBar.value = false
    try {
      await globalStore.applyAlarmPreset(preview.value.alarms)
      showPresets.value = false
    } finally {
      applyingPreset.value = false
    }
  }

  const editAlarm = (id: number) => {
    alarmId.value = id
    showRightSideBar.value = true
  }

  onMounted(async () => {
    try {
      await Promise.all([globalStore.loadLabels(), globalStore.loadAlarms()])
    } catch {
      // apiFetch already showed the error.
    } finally {
      loadingData.value = false
    }
  })
</script>

<template>
  <section class="antialiased">
    <RightSideBar :show="showRightSideBar" @close="showRightSideBar = false">
      <EditForm v-if="editingAlarm" :alarm="editingAlarm" @close="showRightSideBar = false"/>
    </RightSideBar>
    <div class="mx-auto">
      <div class="card overflow-hidden mt-8">
        <div class="panel-head flex-wrap gap-y-2">
          <h3 class="flex select-none items-baseline gap-2 [-webkit-touch-callout:none]"
            v-on:dblclick.shift.ctrl="showPresets = !showPresets"
            v-long-press="() => showPresets = !showPresets">
            Alarms
            <span class="font-mono text-sm font-normal text-ink-faint">{{ usedAlarms.length }} / {{ getAvailableAlarms.length }}</span>
          </h3>
          <button v-if="usedAlarms.length" type="button" class="btn-ghost !text-crit !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5"
            :disabled="loadingData || deletingAll" @click="deleteAllAlarms()">
            <LoadingIcon v-if="deletingAll" class="h-4 w-4 animate-spin fill-transparent" />
            <RemoveIcon v-else class="h-4" /> Delete all
          </button>
        </div>
        <!-- Hidden installation presets (Ctrl+Shift+double click or long press on the title). -->
        <div v-if="showPresets" class="border-b border-line bg-panel-soft p-4">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h4 class="text-base font-semibold text-ink">Installation presets</h4>
            <button type="button" class="rounded-md p-1 text-ink-faint hover:text-ink" aria-label="Close presets"
              @click="showPresets = false"><CloseIcon class="h-5 w-5" /></button>
          </div>
          <p class="mb-3 text-sm text-ink-faint">
            One absolute (90 °C), dispersion (10 °C) and unbalance (10 °C) alarm per equipment and location, without relay.
            Uses the label names on the device, so load the same preset in Labels first.
          </p>
          <div class="mb-3 grid gap-2 sm:grid-cols-2">
            <button v-for="p in ALARM_PRESETS" :key="p.key" type="button" @click="presetKey = p.key"
              :aria-pressed="presetKey === p.key"
              class="rounded-lg border p-3 text-left"
              :class="presetKey === p.key ? 'border-accent bg-panel ring-1 ring-accent' : 'border-line bg-panel hover:border-accent'">
              <span class="block font-semibold text-ink">{{ p.title }}</span>
              <span class="block text-sm text-ink-faint">{{ p.summary }}</span>
            </button>
          </div>
          <div v-if="presetKey === 'bancos'" class="mb-3">
            <span class="field-label" id="preset-bank-label">Bank this HS watches</span>
            <div class="grid grid-cols-4 gap-1 rounded-lg border border-line bg-panel p-1" role="radiogroup" aria-labelledby="preset-bank-label">
              <button v-for="b in 4" :key="b" type="button" role="radio" :aria-checked="bank === b"
                class="rounded-md py-2 text-sm font-semibold [@media(pointer:coarse)]:py-2.5"
                :class="bank === b ? 'bg-panel-strong text-ink ring-1 ring-line' : 'text-ink-faint hover:text-ink'"
                @click="bank = b">Banco {{ b }}</button>
            </div>
          </div>
          <template v-if="presetKey">
            <p v-if="preview.missing.length" class="mb-3 text-sm text-crit">
              These labels are not on the device: {{ preview.missing.join(', ') }}. Load the preset in Labels and save it first.
            </p>
            <template v-else>
              <p class="mb-1 text-sm text-ink-soft">
                Writes {{ preview.alarms.length }} alarms to slots 0 to {{ preview.alarms.length - 1 }} and clears the other slots:
              </p>
              <ul class="mb-3 grid grid-cols-2 gap-x-4 font-mono text-xs text-ink-soft sm:grid-cols-3">
                <li v-for="(a, i) in preview.alarms" :key="i"><span class="text-ink-faint">{{ i }}</span> {{ a.name }}</li>
              </ul>
            </template>
            <button type="button" class="btn-primary" :disabled="applyingPreset || !!preview.missing.length" @click="applyPreset()">
              <LoadingIcon v-if="applyingPreset" class="h-4 w-4 animate-spin fill-transparent" />
              Apply preset
            </button>
          </template>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
        <AlarmsTable v-else :availableAlarms="getAvailableAlarms" @edit="editAlarm" :max="20" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
