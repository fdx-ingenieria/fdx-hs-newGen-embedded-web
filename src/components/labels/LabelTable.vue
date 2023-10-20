<script setup lang="ts">
  import { LabelType } from '@/commons';
  import { PropType } from 'vue';

  defineProps({
    availableLabels: {
      type: Array<string>,
      required: true
    },
    labelType: {
      type: String as PropType<LabelType>,
      required: true
    }
  })

  const emit = defineEmits<{
    edit: [type: LabelType, index: number, value: string]
  }>()

  const change = (e: any, labelType: LabelType, index: number) => {
    emit('edit', labelType, index, e.target.value)
  }

</script>

<template>
  <table class="w-full text-sm text-left text-gray-500">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
      <tr>
        <th scope="col" class="px-4 py-3 max-w-min">Index</th>
        <th scope="col" class="px-4 py-3">Name</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b cursor-pointer hover:bg-gray-100"
        @click.stop
        v-for="(item,index) in availableLabels" :key="index">
        <th scope="row" class="text-center">{{ index }}</th>
        <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
          <input v-if="index" @input="(e) => change(e, labelType, index)" :value="item" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Your label name">
          <span v-else>{{ item }}</span>
        </th>
      </tr>
    </tbody>
  </table>
</template>

<style scoped></style>
