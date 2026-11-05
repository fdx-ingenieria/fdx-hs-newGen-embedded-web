<script setup lang="ts">
  import { computed, ref, Ref, watch } from 'vue';
  import { AlarmType, IAlarm, IAlarmField, isValidInteger, ReleFlag } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { AlertIcon, LoadingIcon, PlusIcon, RemoveIcon } from '../icons';

  const props = defineProps({
    alarm: {
      type: Object as () => IAlarm,
      required: true,
    },
  })

  const globalStore = useGlobalStore()
  // force deep copy
  const localValue: Ref<IAlarm> = ref(JSON.parse(JSON.stringify(props.alarm)))
  // Solo re-inicializar al cambiar de slot. props.alarm es el objeto vivo del store y el
  // SSE le muta status/_sensors en in-place; sin esto cada evento pisaría lo que escribís.
  watch(() => props.alarm.id, () => localValue.value = JSON.parse(JSON.stringify(props.alarm)))

  const HYSTERESIS_TYPE = 4
  const RELAY_OPTIONS = ReleFlag.map((_, i) => i)

  // Native pickers ignore display:none on <option>, so slot 0 and empty slots are filtered out.
  const labelOptions = (type: 'equipment' | 'location') => computed(() =>
    (globalStore.getAvailableLabels[type] ?? [])
      .map((label: string, index: number) => ({ label, index }))
      .filter(o => o.index > 0 && !!o.label)
  )
  const equipmentOptions = labelOptions('equipment')
  const locationOptions = labelOptions('location')

  const validSetPoint = (value: number): boolean => {
    if (!isValidInteger(value)) return false
    return value >= -40 && value <= 120
  }

  const validResetPoint = (resetPoint: number, setPoint: number): boolean => {
    if (!isValidInteger(resetPoint)) return false
    if (resetPoint < -40 || resetPoint > 120) return false
    return resetPoint < setPoint
  }

  const validFields = (fields: IAlarmField[]): boolean => {
    return fields.every(item => !!item.equipment && !!item.location)
  }

  const noRepeatedFields = (): boolean => {
    const fields = localValue.value.fields
    const unique = new Set(fields.map(item => `${item.equipment}-${item.location}`))
    return fields.length === unique.size
  }

  const isComplete = () => {
    const hysteresisOk = localValue.value.alarm_type !== HYSTERESIS_TYPE
      || validResetPoint(localValue.value.reset_point, localValue.value.set_point)
    return !!localValue.value.name
      && validSetPoint(localValue.value.set_point)
      && hysteresisOk
      && validFields(localValue.value.fields)
      && noRepeatedFields()
  }

  const saving = ref(false)
  const saveSlot = async () => {
    saving.value = true
    await globalStore.updateAlarm(localValue.value.id, localValue.value)
    saving.value = false
    emit('close')
  }

  const resetting = ref(false)
  const resetSlot = async () => {
    resetting.value = true
    await globalStore.resetAlarm(localValue.value.id)
    resetting.value = false
    emit('close')
  }

  const addFieldRow = () => localValue.value.fields.push({ equipment: undefined, location: undefined})
  const removeFieldRow = (index: number) => localValue.value.fields.splice(index, 1)

  const emit = defineEmits<{
    close: [],
  }>()
</script>

<template>
  <div class="desktop:overflow-x-auto">
    <h3 class="mb-4 flex items-baseline gap-2 border-b border-line pb-2 text-lg font-semibold text-ink">
      Alarm slot <span class="font-mono">{{ alarm.id }}</span>
    </h3>
    <div class="grid gap-5 mb-4 p-1">
      <div>
        <label class="field-label" for="alarm-name">Name</label>
        <input id="alarm-name" type="text" v-model="localValue.name" maxlength="20" class="input"
          placeholder="e.g. Phase R overtemp">
        <p v-show="!localValue.name" class="mt-1.5 text-sm text-crit">Give the alarm a name to save it.</p>
      </div>

      <div>
        <label class="field-label" for="alarm-function">Function</label>
        <select id="alarm-function" v-model="localValue.alarm_type" class="input">
          <option v-for="(item, index) in AlarmType" :value="index">{{ index ? item : 'Not set (alarm off)' }}</option>
        </select>
        <p v-show="!localValue.alarm_type" class="mt-1.5 text-sm text-warn">The alarm stays off until a function is chosen.</p>
      </div>

      <!-- Hysteresis: low to high, left to right, like a scale. -->
      <div v-if="localValue.alarm_type === HYSTERESIS_TYPE">
        <div class="mb-3 flex h-9 overflow-hidden rounded-lg border border-line text-xs font-semibold" aria-hidden="true">
          <span class="flex flex-1 items-center justify-center bg-panel-soft text-ink-soft">Off</span>
          <span class="flex flex-1 items-center justify-center border-x border-dashed border-line bg-warn-soft text-warn">Holds state</span>
          <span class="flex flex-1 items-center justify-center bg-crit-soft text-crit">On</span>
        </div>
        <div class="relative -mt-2 mb-3 h-4 font-mono text-xs text-ink-soft" aria-hidden="true">
          <span class="absolute left-1/3 -translate-x-1/2">{{ localValue.reset_point }} °C</span>
          <span class="absolute left-2/3 -translate-x-1/2">{{ localValue.set_point }} °C</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="alarm-reset">Off below</label>
            <div class="relative">
              <input id="alarm-reset" class="input pr-10" type="number" min="-40" max="120" step="1"
                v-model.number="localValue.reset_point">
              <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
            </div>
          </div>
          <div>
            <label class="field-label" for="alarm-set">On above</label>
            <div class="relative">
              <input id="alarm-set" class="input pr-10" type="number" min="-40" max="120" step="1"
                v-model.number="localValue.set_point">
              <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
            </div>
          </div>
        </div>
        <p v-if="!validSetPoint(localValue.set_point) || !validSetPoint(localValue.reset_point)" class="mt-2 text-sm text-crit">
          Both values must be between -40 and 120 °C.
        </p>
        <p v-else-if="!validResetPoint(localValue.reset_point, localValue.set_point)" class="mt-2 text-sm text-crit">
          "Off below" must be lower than "On above".
        </p>
        <p v-else class="mt-2 text-sm text-ink-soft">
          The relay turns on above {{ localValue.set_point }} °C and stays on until the temperature drops below
          {{ localValue.reset_point }} °C ({{ localValue.set_point - localValue.reset_point }} °C band).
        </p>
      </div>

      <div v-else-if="localValue.alarm_type">
        <label class="field-label" for="alarm-setpoint">Set point</label>
        <div class="relative sm:w-1/2">
          <input id="alarm-setpoint" class="input pr-10" type="number" min="-40" max="120" step="1"
            v-model.number="localValue.set_point">
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
        </div>
        <p v-show="!validSetPoint(localValue.set_point)" class="mt-1.5 text-sm text-crit">Must be between -40 and 120 °C.</p>
      </div>

      <div>
        <span class="field-label" id="alarm-relay-label">Relay</span>
        <div class="grid grid-cols-3 gap-1 rounded-lg border border-line bg-panel-soft p-1" role="radiogroup" aria-labelledby="alarm-relay-label">
          <button v-for="index in RELAY_OPTIONS" :key="index" type="button" role="radio"
            :aria-checked="localValue.relay_flag === index"
            class="rounded-md py-2 text-sm font-semibold [@media(pointer:coarse)]:py-2.5"
            :class="localValue.relay_flag === index ? 'bg-panel text-ink shadow-sm ring-1 ring-line' : 'text-ink-faint hover:text-ink'"
            @click="localValue.relay_flag = index">
            {{ index ? `Relay ${index}` : 'No relay' }}
          </button>
        </div>
      </div>

      <div>
        <span class="field-label">Locations watched</span>
        <ul class="space-y-2">
          <li v-for="(field, index) in localValue.fields" :key="index" class="flex items-center gap-2">
            <select v-model="field.equipment" class="input min-w-0 flex-1" :aria-label="`Equipment of location ${index + 1}`">
              <option :value="undefined" disabled>Equipment</option>
              <option v-for="o in equipmentOptions" :key="o.index" :value="o.index">{{ o.label }}</option>
            </select>
            <select v-model="field.location" class="input min-w-0 flex-1" :aria-label="`Location ${index + 1}`">
              <option :value="undefined" disabled>Location</option>
              <option v-for="o in locationOptions" :key="o.index" :value="o.index">{{ o.label }}</option>
            </select>
            <button type="button" @click="removeFieldRow(index)" :aria-label="`Remove location ${index + 1}`"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-crit-soft hover:text-crit [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
              <RemoveIcon class="w-5" />
            </button>
          </li>
        </ul>
        <p v-if="!localValue.fields.length" class="text-sm text-ink-faint">No locations yet: the alarm cannot trigger.</p>
        <p v-if="!noRepeatedFields()" class="mt-2 flex items-center text-sm text-crit">
          <AlertIcon class="mr-1 w-4" /> The same location is listed twice.
        </p>
        <p v-else-if="!validFields(localValue.fields)" class="mt-2 text-sm text-crit">Pick equipment and location on every row.</p>
        <button type="button" class="btn-ghost mt-2" @click="addFieldRow()" :disabled="!noRepeatedFields()">
          <PlusIcon class="w-5" /> Add location
        </button>
      </div>
    </div>
    <div class="flex items-center space-x-4 mobile:sticky mobile:bottom-0 mobile:-mx-4 mobile:-mb-6 mobile:border-t mobile:border-line mobile:bg-panel mobile:px-4 mobile:pb-4 mobile:pt-3">
      <button class="btn-primary mb-2"
        @click="saveSlot()"
        :disabled="!isComplete() || saving"
        type="button">
        <LoadingIcon v-if="saving" class="w-4 h-4 animate-spin fill-transparent mr-1" />
        Save
      </button>
      <button class="btn-ghost mb-2"
        @click="emit('close')"
        type="button">Cancel</button>
      <button v-if="localValue.alarm_type !== 0"
        class="btn-danger mb-2 ml-auto"
        @click="resetSlot()"
        :disabled="resetting"
        type="button">
        <LoadingIcon v-if="resetting" class="w-4 h-4 animate-spin fill-transparent mr-1" />
        Reset slot
      </button>
    </div>
  </div>
</template>

<style scoped></style>
