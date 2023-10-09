<script setup lang="ts">
  import { LabelType } from '@/commons';
  import { PropType } from 'vue';
  import { EditIcon } from '@/components/icons';

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
    edit: [type: LabelType, index: number]
  }>()


</script>

<template>
  <table class="w-full text-sm text-left text-gray-500">
    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
      <tr>
        <th scope="col" class="px-4 py-3 max-w-min">Index</th>
        <th scope="col" class="px-4 py-3">Name</th>
        <th scope="col" class="px-4 py-3">
          <span class="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b cursor-pointer hover:bg-gray-100"
        @click="emit('edit', labelType, index)"
        @click.stop
        v-for="(item,index) in availableLabels" :key="index">
        <th scope="row" class="text-center">{{ index }}</th>
        <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{{ item }}</th>
        <td class="px-4 py-3 flex items-center justify-end">
          <template v-if="index">
            <button type="button"
              @click="emit('edit', labelType, index)"
              @click.stop
              class="text-white border border-blue-500 bg-blue-500 font-medium rounded-lg text-sm p-0.5 text-center inline-flex items-center mr-2">
              <EditIcon class="w-4" />
              <span class="sr-only">Edit</span>
            </button>
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped></style>
