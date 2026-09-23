<script setup lang="ts">
  import { ISensorData, SensorQuality } from '@/commons';
  import { PropType } from 'vue';

 defineProps({
    sensorData: {
      type: Object as PropType<ISensorData>,
      required: true
    }
  })

  const getQualityClass = (quality: SensorQuality | undefined): string => {
    const classMap: Record<SensorQuality, string> = {
      [SensorQuality.OUT_OF_SERVICE]: 'bg-crit-soft text-crit',
      [SensorQuality.BAD]: 'bg-warn-soft text-warn',
      [SensorQuality.REGULAR]: 'bg-idle-soft text-ink-soft',
      [SensorQuality.GOOD]: 'bg-info-soft text-info',
      [SensorQuality.EXCELLENT]: 'bg-ok-soft text-ok'
    };

    return quality
      ? classMap[quality]
      : '';
  };
</script>

<template>
  <span class="relative mr-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="getQualityClass(sensorData.quality)">
    {{ sensorData.quality }}
    <small class="absolute -top-3 -right-2 rounded-full px-1 py-0.5 font-mono ring-1 ring-panel"
      :class="getQualityClass(sensorData.quality)" title="RSSI">
      {{ sensorData.rssi }}
    </small>
  </span>
</template>

<style scoped></style>
