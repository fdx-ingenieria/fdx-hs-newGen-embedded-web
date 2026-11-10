<script setup lang="ts">
  import { computed } from 'vue';
  import { SensorQuality } from '@/commons';

  // Signal meter from the reader RSSI: the same four bars in discovery and in installation mode.
  // A tag being read is at worst Bad, never out of service.
  const props = defineProps({
    rssi: { type: Number, required: true },
    showLabel: { type: Boolean, default: true },
    showDbm: { type: Boolean, default: true },
  })

  const level = computed(() => {
    const r = props.rssi
    if (r > -50) return { label: SensorQuality.EXCELLENT, bars: 4, cls: 'text-ok' }
    if (r > -60) return { label: SensorQuality.GOOD, bars: 3, cls: 'text-info' }
    if (r > -70) return { label: SensorQuality.REGULAR, bars: 2, cls: 'text-ink-soft' }
    return { label: SensorQuality.BAD, bars: 1, cls: 'text-warn' }
  })

  defineExpose({ level })
</script>

<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap" :title="`Signal ${level.label}, RSSI ${rssi} dBm`">
    <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="level.cls">
      <svg viewBox="0 0 15 12" class="h-3 w-[15px] shrink-0" aria-hidden="true">
        <rect v-for="i in 4" :key="i" :x="(i - 1) * 4" :y="12 - i * 3" width="3" :height="i * 3" rx="0.5"
          :class="i <= level.bars ? 'fill-current' : 'fill-line'" />
      </svg>
      <template v-if="showLabel">{{ level.label }}</template>
    </span>
    <span v-if="showDbm" class="font-mono text-xs text-ink-faint">{{ rssi }} dBm</span>
  </span>
</template>

<style scoped></style>
