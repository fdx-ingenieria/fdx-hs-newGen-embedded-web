<script setup lang="ts">
  import { ref, Ref, watch } from 'vue';
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
  <div class="overflow-x-auto">
    <h3 class="mb-4 border-b border-line pb-2 text-lg font-semibold text-ink">
      Edit alarm
    </h3>
    <div class="grid gap-4 mb-4 p-1">
      <div>
        <label class="field-label">ID</label>
        <input type="text" :value="alarm.id"
          class="input"
          disabled>
      </div>
      <div>
        <label class="field-label">Name</label>
        <input type="text"
          v-model="localValue.name"
          maxlength="20"
          class="input">
        <p v-show="!localValue.name" class="mt-2 text-sm text-crit">
          <span class="font-semibold">Oops!</span> This is required!
        </p>
      </div>
      <div>
        <label class="field-label">Function</label>
        <select v-model="localValue.alarm_type"
          class="input">
          <option v-for="(item, index) in AlarmType" :value="index">{{ item }}</option>
        </select>
        <p v-show="!localValue.alarm_type" class="mt-2 text-sm text-warn"><span
            class="font-semibold">Warning:</span> The alarm will remain deactivated.</p>
        <p v-show="localValue.alarm_type === HYSTERESIS_TYPE" class="mt-2 text-sm text-ink-faint">
          ON/OFF control with hysteresis (two set points).
        </p>
      </div>
      <div v-if="localValue.alarm_type !== HYSTERESIS_TYPE">
        <label class="field-label">Set Point</label>
        <div class="relative">
          <input class="input pr-10"
            type="number"
            min="-40"
            max="120"
            step="1"
            v-model.number="localValue.set_point"
            placeholder="Set point value">
          <span class="absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
        </div>
        <p v-show="!validSetPoint(localValue.set_point)" class="mt-2 text-sm text-crit"><span class="font-semibold">Oops!</span> This value should be between -40 and 120.</p>
      </div>
      <div v-if="localValue.alarm_type === HYSTERESIS_TYPE">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label">Activation Set Point (ON)</label>
            <div class="relative">
              <input class="input pr-10"
                type="number"
                min="-40"
                max="120"
                step="1"
                v-model.number="localValue.set_point"
                placeholder="ON value">
              <span class="absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
            </div>
            <p class="mt-1 text-xs text-ink-faint">Relay activates when value is greater than this set point.</p>
            <p v-show="!validSetPoint(localValue.set_point)" class="mt-1 text-sm text-crit"><span class="font-semibold">Oops!</span> Must be between -40 and 120.</p>
          </div>
          <div>
            <label class="field-label">Deactivation Set Point (OFF)</label>
            <div class="relative">
              <input class="input pr-10"
                type="number"
                min="-40"
                max="120"
                step="1"
                v-model.number="localValue.reset_point"
                placeholder="OFF value">
              <span class="absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">°C</span>
            </div>
            <p class="mt-1 text-xs text-ink-faint">Relay deactivates when value is lower than this set point.</p>
            <p v-show="!validResetPoint(localValue.reset_point, localValue.set_point)" class="mt-1 text-sm text-crit"><span class="font-semibold">Oops!</span> Must be below the ON set point.</p>
          </div>
        </div>
        <div v-show="!validResetPoint(localValue.reset_point, localValue.set_point) && validSetPoint(localValue.set_point) && validSetPoint(localValue.reset_point)"
          class="mt-3 flex items-center gap-2 p-3 text-sm text-warn rounded-lg bg-warn-soft border border-warn/30">
          <span class="font-semibold">⚠ Warning:</span> OFF set point must be lower than ON set point.
        </div>
        <div v-show="validResetPoint(localValue.reset_point, localValue.set_point)"
          class="mt-3 flex items-center gap-2 p-3 text-sm text-info rounded-lg bg-info-soft border border-info/30">
          ℹ Hysteresis: {{ localValue.set_point - localValue.reset_point }} °C
        </div>
      </div>
      <div>
        <label class="field-label">Rele</label>
        <select v-model="localValue.relay_flag"
          class="input">
          <option v-for="(item, index) in ReleFlag" :value="index">{{ item }}</option>
        </select>
      </div>
      <div>
        <label class="field-label">Fields</label>

        <div class="relative overflow-x-auto rounded-lg border border-line">
          <table class="w-full text-sm text-left text-ink-soft">
            <thead class="border-b border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
              <tr>
                <th scope="col" class="px-2 py-3">#</th>
                <th scope="col" class="px-2 py-3">Equipment</th>
                <th scope="col" class="px-2 py-3">Location</th>
                <th scope="col" class="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(field, index) in localValue.fields" class="border-b border-line">
                <th scope="row" class="px-2 py-2 font-mono font-medium text-ink whitespace-nowrap">
                  {{ index + 1 }}
                </th>
                <td class="px-2 py-2">
                  <select v-model="field.equipment"
                    class="input !py-1.5">
                    <option v-for="(item, index) in globalStore.getAvailableLabels.equipment" :value="index" :class="{'hidden': !index || !item}">{{ item }}</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <select v-model="field.location"
                    class="input !py-1.5">
                    <option v-for="(item, index) in globalStore.getAvailableLabels.location" :value="index" :class="{'hidden': !index || !item }">{{ item }}</option>
                  </select>
                </td>
                <td class="px-1 py-2">
                  <button class="flex px-1 py-1 font-semibold text-crit hover:brightness-110 focus:outline-none disabled:opacity-50"
                    @click="removeFieldRow(index)"
                    type="button">
                    <RemoveIcon class="w-5" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr v-if="!noRepeatedFields()" class="bg-crit-soft">
                <td colspan="4" class="px-2 py-2">
                  <div class="flex items-centr text-sm text-crit">
                    <AlertIcon class="w-4 mr-1" />
                    Oops, duplicate fields! Please fix them before saving.
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="4" class="px-2 py-2">
                  <button class="btn-primary mx-auto my-2"
                    @click="addFieldRow()"
                    :disabled="!noRepeatedFields()"
                    type="button">
                    <PlusIcon class="w-5 mr-1" />
                    Add new row
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-4">
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
