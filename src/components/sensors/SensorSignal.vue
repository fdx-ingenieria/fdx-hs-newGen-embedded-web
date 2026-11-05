<script setup lang="ts">
  import { ISensorData, SensorQuality } from '@/commons';
  import { PropType, computed } from 'vue';

  const props = defineProps({
    sensorData: {
      type: Object as PropType<ISensorData>,
      required: true
    }
  })

  // Bar count carries the quality, color only reinforces it.
  const LEVELS: Record<SensorQuality, { bars: number, cls: string }> = {
    [SensorQuality.OUT_OF_SERVICE]: { bars: 0, cls: 'text-crit' },
    [SensorQuality.BAD]: { bars: 1, cls: 'text-warn' },
    [SensorQuality.REGULAR]: { bars: 2, cls: 'text-ink-soft' },
    [SensorQuality.GOOD]: { bars: 3, cls: 'text-info' },
    [SensorQuality.EXCELLENT]: { bars: 4, cls: 'text-ok' },
  };

  const level = computed(() =>
    (props.sensorData.quality && LEVELS[props.sensorData.quality]) || { bars: 0, cls: 'text-ink-faint' })
</script>

<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap"
    :title="`${sensorData.quality ?? 'Unknown'}, RSSI ${sensorData.rssi} dBm`">
    <svg viewBox="0 0 15 12" class="h-3 w-[15px] shrink-0" :class="level.cls" aria-hidden="true">
      <rect v-for="i in 4" :key="i" :x="(i - 1) * 4" :y="12 - i * 3" width="3" :height="i * 3" rx="0.5"
        :class="i <= level.bars ? 'fill-current' : 'fill-line'" />
    </svg>
    <span class="text-xs font-semibold" :class="level.cls">{{ sensorData.quality }}</span>
    <span class="font-mono text-xs text-ink-faint">{{ sensorData.rssi }} dBm</span>
  </span>
</template>

<style scoped></style>
