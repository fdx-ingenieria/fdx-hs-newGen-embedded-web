<script setup lang="ts">
  import { PropType, ref } from 'vue';
  import { IModbusTableEntry } from '@/commons';
  import { ChevronUpIcon, ListIcon, PrintIcon } from '../icons';

  const show = ref(true)
  defineProps({
    data: {
      type: Object as PropType<IModbusTableEntry>,
      required: true
    },
  })

  const print = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    window.print()
  }
</script>

<template>
  <div class="card relative mt-8 overflow-hidden print:mt-0 print:-mx-6 print:border-0 print:shadow-none">
    <div class="panel-head cursor-pointer rounded-none" @click="show = !show">
      <div class="flex items-center">
        <ListIcon class="mr-2 hidden h-6 text-ink-faint md:inline-flex" />
        <h3>{{ data.name }}</h3>
      </div>
      <div class="flex items-center gap-1 text-ink-soft">
        <PrintIcon @click.prevent="print" class="h-6 w-6 hover:text-ink" />
        <ChevronUpIcon class="h-6 w-6 hover:text-ink"
          :class="{'rotate-180': !show}" />
      </div>
    </div>
    <div class="overflow-x-auto">
      <table v-if="show" class="w-full text-sm text-left text-ink-soft whitespace-nowrap print:whitespace-pre-line">
        <thead class="border-b border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
          <tr>
            <th v-for="column in data.columns" scope="col" class="px-4 py-3">{{ column }}</th>
          </tr>
        </thead>
        <tbody v-if="!data.commonRows">
          <tr v-for="row in data.values" class="border-b border-line hover:bg-panel-strong">
            <td v-for="value in row" class="px-4 py-3 font-mono">{{ value }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <template v-for="row, rowIndex in data.values">
            <tr v-for="commonRow, commonRowIndex in data.commonRows" class="border-b border-line hover:bg-panel-strong" :key="`row_${rowIndex}`">
              <template v-for="colValue, colIndex in row" :key="`col_${rowIndex}`">
                <td v-if="data?.autoincrementColumn !== undefined && (colIndex === (data.name === 'Sensors' ? data.autoincrementColumn + 1 : data.autoincrementColumn))" class="px-4 py-3 font-mono">
                  {{ colValue as number + commonRowIndex }}
                </td>

                <td v-else class="px-4 py-3 font-mono">{{ colValue }}</td>
              </template>
              <td v-for="commonColValue, commonColIndex in commonRow" class="px-4 py-3 font-mono" :key="`ccol_${commonColIndex}`">{{ commonColValue }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped></style>
