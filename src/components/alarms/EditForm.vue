<script setup lang="ts">
  import { ref, Ref, watch } from 'vue';
  import { AlarmType, IAlarm, IAlarmField, ReleFlag } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { PlusIcon, RemoveIcon } from '../icons';

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

  const validSetPoint = (value: number): boolean => {
    return value >= 0 && value <= 140
  }

  const validFields = (fields: IAlarmField[]): boolean => {
    return fields.every(item => !!item.equipment && !!item.location)
  }

  const isComplete = () => {
    return !!localValue.value.name
      && validSetPoint(localValue.value.set_point)
      && validFields(localValue.value.fields)
  }

  const done = () => {
    const { name, alarm_type, fields, relay_flag, set_point } = localValue.value
    props.alarm.name = name
    props.alarm.alarm_type = alarm_type
    props.alarm.fields = fields
    props.alarm.relay_flag = relay_flag
    props.alarm.set_point = set_point

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
    <h3 class="text-lg font-semibold text-gray-900 mb-8 border-b">
      Edit alarm
    </h3>
    <div class="grid gap-4 mb-4">
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
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Set Point</label>
        <input type="number"
          min="0" max="140"
          v-model.number="localValue.set_point"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5">

          <p v-show="!validSetPoint(localValue.set_point)" class="mt-2 text-sm text-red-600"><span class="font-semibold">Oops!</span> This value should be between 0 and 140.</p>
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
          </table>
          <button class="text-white flex items-center disabled:opacity-50 mx-auto bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 my-2 focus:outline-none"
            @click="addFieldRow()"
            type="button">
            <PlusIcon class="w-5 mr-1" />
            Add new row
          </button>
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
