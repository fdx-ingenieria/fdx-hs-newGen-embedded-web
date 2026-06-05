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
  <table class="w-full text-sm text-left text-ink-soft">
    <thead class="border-y border-line bg-panel-soft text-xs uppercase tracking-wider text-ink-faint">
      <tr>
        <th scope="col" class="px-4 py-3 max-w-min">Index</th>
        <th scope="col" class="px-4 py-3">Name</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="(item,index) in availableLabels" :key="index">
        <tr class="border-b border-line" @click.stop v-if="index !== 0">
          <th scope="row" class="text-center font-mono text-ink-faint">{{ index }}</th>
          <th scope="row" class="px-4 py-2 font-medium whitespace-nowrap">
            <input class="input"
              type="text"
              maxlength="20"
              @input="(e) => change(e, labelType, index)"
              :value="item"
              placeholder="Your label name">
          </th>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<style scoped></style>
