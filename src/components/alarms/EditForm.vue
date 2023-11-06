<script setup lang="ts">
  import { ref, Ref, watch } from 'vue';
  import { AlarmType, IAlarm, ReleFlag } from '@/commons';
  import { useGlobalStore } from '@/stores/global';
  import { PlusIcon, RemoveIcon, SendIcon } from '../icons';

  const localValue: Ref<IAlarm> = ref({} as IAlarm)

  const props = defineProps({
    alarmId: {
      type: Number,
      required: true,
    },
  })
  const globalStore = useGlobalStore()

  watch(props, () => {
    const alarm = globalStore.getAvailableAlarms.find(item => item.id === props.alarmId)
    if (alarm) {
      localValue.value = {...alarm}
    }
  })

  const validSetPoint = (value: number): boolean => {
    return value >= 0 && value <= 140
  }

  const isComplete = () => {
    return !!localValue.value.name
      && !!localValue.value.alarm_type
      && validSetPoint(localValue.value.set_point)
      && !!localValue.value.relay_flag
  }

  const save = () => {
    const dirtyAlarms = [...globalStore.getAvailableAlarms].map(item => {
      if (item.id === localValue.value.id) {
        return localValue.value
      }
      return item
    })
    globalStore.updateAlarms(dirtyAlarms).then(() => emit('close'))
  }

  const addFieldRow = () => localValue.value.fields.push({ equipment:0, location: 0})
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
        <input type="text" :value="localValue.id"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
          disabled>
      </div>
      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900">Name</label>
        <input type="text"
          v-model="localValue.name"
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
        <p v-show="!localValue.alarm_type" class="mt-2 text-sm text-red-600"><span
            class="font-semibold">Oops!</span> This is required!</p>
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
        <p v-show="!localValue.relay_flag" class="mt-2 text-sm text-red-600"><span
            class="font-semibold">Oops!</span> This is required!</p>
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
                    <option v-for="(item, index) in globalStore.getAvailableLabels.equipment" :value="index" :class="{'hidden': !index}">{{ item }}</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <select v-model="field.location"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5">
                    <option v-for="(item, index) in globalStore.getAvailableLabels.location" :value="index" :class="{'hidden': !index}">{{ item }}</option>
                  </select>
                </td>
                <td class="px-1 py-2">
                  <button type="button"
                    @click="removeFieldRow(index)"
                    class="text-red-600 hover:text-red-700 hover:scale-125 flex font-semibold px-1 py-1 focus:outline-none">
                    <RemoveIcon class="w-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button @click="addFieldRow()" type="button"
            class="text-white flex items-center mx-auto bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 my-2 focus:outline-none">
            <PlusIcon class="w-5 mr-1" />
            Add new row
          </button>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <button @click="save()" :disabled="!isComplete()" type="button"
        class="text-white flex items-center disabled:opacity-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2 focus:outline-none">
        <SendIcon class="w-4 mr-1" />
        Save
      </button>
      <button @click="emit('close')" type="button"
        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-semibold rounded-lg text-sm px-5 py-1.5 mb-2">Cancel</button>
    </div>
  </div>
</template>

<style scoped></style>
