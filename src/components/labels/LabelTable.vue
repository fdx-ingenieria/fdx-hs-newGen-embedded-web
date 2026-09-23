<script setup lang="ts">
  import { LabelType } from '@/commons';
  import { PlusIcon, RemoveIcon } from '@/components/icons';
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
    add: [type: LabelType]
    removeLast: [type: LabelType]
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
        <th scope="col" class="px-2 py-3 w-10"></th>
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
          <th scope="row" class="px-2 py-2 w-10">
            <button v-if="index === availableLabels.length - 1"
              type="button"
              title="Remove this slot"
              class="text-ink-faint hover:text-crit"
              @click="emit('removeLast', labelType)">
              <RemoveIcon class="w-4" />
            </button>
          </th>
        </tr>
      </template>
    </tbody>
  </table>
  <button type="button"
    class="flex items-center gap-1 m-3 rounded-md border border-line bg-panel px-3 py-1 text-sm font-semibold text-ink-soft hover:bg-panel-soft"
    @click="emit('add', labelType)">
    <PlusIcon class="h-4 w-4" />
    Add slot
  </button>
</template>

<style scoped></style>
