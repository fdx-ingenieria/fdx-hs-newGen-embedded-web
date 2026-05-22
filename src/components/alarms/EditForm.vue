<script setup lang="ts">
  import { ref, Ref, watch } from 'vue';
  import { AlarmType, IAlarm, IAlarmField, isValidInteger, ReleFlag } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { AlertIcon, PlusIcon, RemoveIcon } from '../icons';

  const props = defineProps({
    alarm: {
      type: Object as () => IAlarm,
      required: true,
    },
  })

  const globalStore = useGlobalStore()
  // force deep copy
  const localValue: Ref<IAlarm> = ref(JSON.parse(JSON.stringify(props.alarm)))
  watch(props, () => localValue.value = JSON.parse(JSON.stringify(props.alarm)))

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

  const done = () => {
    const { name, alarm_type, fields, relay_flag, set_point, reset_point } = localValue.value
    props.alarm.name = name
    props.alarm.alarm_type = alarm_type
    props.alarm.fields = fields
    props.alarm.relay_flag = relay_flag
    props.alarm.set_point = set_point
    props.alarm.reset_point = alarm_type === HYSTERESIS_TYPE ? reset_point : 0

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
    <h3 class="text-lg font-semibold text-gray-900 mb-4 border-b">
      Edit alarm
    </h3>
    <div class="grid gap-4 mb-4 p-1">
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">ID</label>
        <input type="text" :value="alarm.id"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
          disabled>
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Name</label>
        <input type="text"
          v-model="localValue.name"
          maxlength="20"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5">
        <p v-show="!localValue.name" class="mt-2 text-sm text-red-600">
          <span class="font-semibold">Oops!</span> This is required!
        </p>
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Function</label>
        <select v-model="localValue.alarm_type"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
          <option v-for="(item, index) in AlarmType" :value="index">{{ item }}</option>
        </select>
        <p v-show="!localValue.alarm_type" class="mt-2 text-sm text-orange-600"><span
            class="font-semibold">Warning:</span> The alarm will remain deactivated.</p>
        <p v-show="localValue.alarm_type === HYSTERESIS_TYPE" class="mt-2 text-sm text-gray-500">
          ON/OFF control with hysteresis (two set points).
        </p>
      </div>
      <div v-if="localValue.alarm_type !== HYSTERESIS_TYPE">
        <label class="block mb-2 text-sm font-semibold text-gray-900">Set Point</label>
        <div class="relative">
          <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 pr-10"
            type="number"
            min="-40"
            max="120"
            step="1"
            v-model.number="localValue.set_point"
            placeholder="Set point value">
          <span class="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">°C</span>
        </div>
        <p v-show="!validSetPoint(localValue.set_point)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value should be between -40 and 120.</p>
      </div>
      <div v-if="localValue.alarm_type === HYSTERESIS_TYPE">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Activation Set Point (ON)</label>
            <div class="relative">
              <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 pr-10"
                type="number"
                min="-40"
                max="120"
                step="1"
                v-model.number="localValue.set_point"
                placeholder="ON value">
              <span class="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">°C</span>
            </div>
            <p class="mt-1 text-xs text-gray-400">Relay activates when value is greater than this set point.</p>
            <p v-show="!validSetPoint(localValue.set_point)" class="mt-1 text-sm text-red-600"><span class="font-semibold">Oops!</span> Must be between -40 and 120.</p>
          </div>
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-900">Deactivation Set Point (OFF)</label>
            <div class="relative">
              <input class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 pr-10"
                type="number"
                min="-40"
                max="120"
                step="1"
                v-model.number="localValue.reset_point"
                placeholder="OFF value">
              <span class="absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">°C</span>
            </div>
            <p class="mt-1 text-xs text-gray-400">Relay deactivates when value is lower than this set point.</p>
            <p v-show="!validResetPoint(localValue.reset_point, localValue.set_point)" class="mt-1 text-sm text-red-600"><span class="font-semibold">Oops!</span> Must be below the ON set point.</p>
          </div>
        </div>
        <div v-show="!validResetPoint(localValue.reset_point, localValue.set_point) && validSetPoint(localValue.set_point) && validSetPoint(localValue.reset_point)"
          class="mt-3 flex items-center gap-2 p-3 text-sm text-orange-800 rounded-lg bg-orange-50 border border-orange-200">
          <span class="font-semibold">⚠ Warning:</span> OFF set point must be lower than ON set point.
        </div>
        <div v-show="validResetPoint(localValue.reset_point, localValue.set_point)"
          class="mt-3 flex items-center gap-2 p-3 text-sm text-blue-800 rounded-lg bg-blue-50 border border-blue-200">
          ℹ Hysteresis: {{ localValue.set_point - localValue.reset_point }} °C
        </div>
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Rele</label>
        <select v-model="localValue.relay_flag"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
          <option v-for="(item, index) in ReleFlag" :value="index">{{ item }}</option>
        </select>
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Fields</label>

        <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table class="w-full text-sm text-left text-gray-500">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" class="px-2 py-3">#</th>
                <th scope="col" class="px-2 py-3">Equipment</th>
                <th scope="col" class="px-2 py-3">Location</th>
                <th scope="col" class="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(field, index) in localValue.fields" class="bg-white border-b">
                <th scope="row" class="px-2 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {{ index + 1 }}
                </th>
                <td class="px-2 py-2">
                  <select v-model="field.equipment"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5">
                    <option v-for="(item, index) in globalStore.getAvailableLabels.equipment" :value="index" :class="{'hidden': !index || !item}">{{ item }}</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <select v-model="field.location"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5">
                    <option v-for="(item, index) in globalStore.getAvailableLabels.location" :value="index" :class="{'hidden': !index || !item }">{{ item }}</option>
                  </select>
                </td>
                <td class="px-1 py-2">
                  <button class="text-red-600 disabled:opacity-50 hover:text-red-700 hover:scale-125 flex font-semibold px-1 py-1 focus:outline-none"
                    @click="removeFieldRow(index)"
                    type="button">
                    <RemoveIcon class="w-5" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr v-if="!noRepeatedFields()" class="bg-red-200">
                <td colspan="4" class="px-2 py-2">
                  <div class="flex items-centr text-sm text-red-600">
                    <AlertIcon class="w-4 mr-1" />
                    Oops, duplicate fields! Please fix them before saving.
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="4" class="px-2 py-2">
                  <button class="text-white flex items-center disabled:opacity-50 mx-auto bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 my-2 focus:outline-none"
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
      <button class="text-white flex items-center disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none"
        @click="done()"
        :disabled="!isComplete()"
        type="button">
          Done
      </button>
      <button class="text-gray-900 bg-white border disabled:opacity-50 border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2"
        @click="emit('close')"
        type="button">Cancel</button>
    </div>
  </div>
</template>

<style scoped></style>
