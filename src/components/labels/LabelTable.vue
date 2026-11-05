<script setup lang="ts">
  import { LabelType } from '@/commons';
  import { PlusIcon, RemoveIcon } from '@/components/icons';
  import { PropType, computed } from 'vue';

  const props = defineProps({
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

  // Names used by more than one slot of this list (empty slots don't count).
  const duplicates = computed(() => {
    const seen = new Set<string>()
    const dup = new Set<string>()
    props.availableLabels.forEach((label, index) => {
      if (!index || !label) return
      if (seen.has(label)) dup.add(label)
      seen.add(label)
    })
    return dup
  })

  const change = (e: Event, index: number) => {
    emit('edit', props.labelType, index, (e.target as HTMLInputElement).value)
  }
</script>

<template>
  <ul class="divide-y divide-line">
    <template v-for="(item, index) in availableLabels" :key="index">
      <li v-if="index !== 0" class="flex items-center gap-3 px-4 py-2">
        <span class="w-6 shrink-0 text-right font-mono text-sm text-ink-faint" :title="`Slot ${index}`">{{ index }}</span>
        <input class="input"
          :class="{ '!border-crit ring-1 ring-crit/40': duplicates.has(item) }"
          type="text"
          maxlength="20"
          :aria-label="`${labelType} slot ${index}`"
          :aria-invalid="duplicates.has(item)"
          @input="(e) => change(e, index)"
          :value="item"
          placeholder="Unused">
        <button v-if="index === availableLabels.length - 1"
          type="button"
          :aria-label="`Remove slot ${index}`"
          title="Remove this slot"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-crit-soft hover:text-crit [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          @click="emit('removeLast', labelType)">
          <RemoveIcon class="w-4" />
        </button>
        <span v-else class="w-9 shrink-0 [@media(pointer:coarse)]:w-11" aria-hidden="true"></span>
      </li>
    </template>
  </ul>
  <p v-if="duplicates.size" class="px-4 pt-2 text-sm text-crit">
    The same name is used by more than one slot.
  </p>
  <div class="px-4 py-3">
    <button type="button" class="btn-ghost !px-3 !py-1.5 [@media(pointer:coarse)]:!py-2.5" @click="emit('add', labelType)">
      <PlusIcon class="h-4 w-4" /> Add slot
    </button>
  </div>
</template>

<style scoped></style>
