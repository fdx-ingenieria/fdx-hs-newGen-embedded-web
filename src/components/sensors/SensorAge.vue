<script setup lang="ts">
  import { useNow } from '@/composables/clock';

  // Own component so the 1 s tick re-renders this label only, not the whole sensor list.
  defineProps({
    timestamp: { type: Number, default: 0 },
    suffix: { type: String, default: '' },
  })

  const now = useNow()
</script>

<template>
  <span>{{ timestamp ? `${Math.max(0, now - timestamp)}${suffix}` : '–' }}</span>
</template>
