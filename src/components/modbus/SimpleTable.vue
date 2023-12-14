<script setup lang="ts">
  import { PropType, ref } from 'vue';
  import { IModbusTableEntry } from '@/commons';
  import { ChevronUpIcon, ListIcon } from '../icons';

  const show = ref(true)
  defineProps({
    data: {
      type: Object as PropType<IModbusTableEntry>,
      required: true
    },
  })
</script>

<template>
  <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
    <div class="flex justify-between cursor-pointer bg-fdx-dark text-white items-center py-2 px-4"
      @click="show = !show">
      <div class="flex">
        <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
        <h3 class="text-xl font-semibold">{{ data.name }}</h3>
      </div>
      <div class="flex space-x-1 -mx-2">
        <ChevronUpIcon class="h-6 w-6 scale-110 hover:scale-125"
          :class="{'rotate-180': !show}" />
      </div>
    </div>
    <table v-if="show" class="w-full text-sm text-left text-gray-500 whitespace-nowrap">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th v-for="column in data.columns" scope="col" class="px-4 py-3">{{ column }}</th>
        </tr>
      </thead>
      <tbody v-if="!data.commonRows">
        <tr v-for="row in data.values" class="border-b hover:bg-gray-100">
          <td v-for="value in row" class="px-4 py-3">{{ value }}</td>
        </tr>
      </tbody>
      <tbody v-else>
        <template v-for="row, rowIndex in data.values">
          <tr v-for="commonRow, commonRowIndex in data.commonRows" class="border-b hover:bg-gray-100" :key="`row_${rowIndex}`">
            <template v-for="colValue, colIndex in row" :key="`col_${rowIndex}`">
              <td v-if="colIndex === data.autoincrementColumn" class="px-4 py-3">{{ colValue as number + commonRowIndex }}</td>
              <td v-else class="px-4 py-3">{{ colValue }}</td>
            </template>
            <td v-for="commonColValue, commonColIndex in commonRow" class="px-4 py-3" :key="`ccol_${commonColIndex}`">{{ commonColValue }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped></style>
