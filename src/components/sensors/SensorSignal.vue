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
      [SensorQuality.OUT_OF_SERVICE]: 'bg-red-100 text-red-800',
      [SensorQuality.BAD]: 'bg-yellow-100 text-yellow-800',
      [SensorQuality.REGULAR]: 'bg-indigo-100 text-indigo-800',
      [SensorQuality.GOOD]: 'bg-blue-100 text-blue-800',
      [SensorQuality.EXCELLENT]: 'bg-green-100 text-green-800'
    };

    return quality
      ? classMap[quality]
      : '';
  };
</script>

<template>
  <span class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full relative"
    :class="getQualityClass(sensorData.quality)">
    {{ sensorData.quality }}
    <small class="absolute -top-3 -right-2 rounded-full px-1 py-0.5"
      :class="getQualityClass(sensorData.quality)" title="RSSI">
      {{ sensorData.rssi }}
    </small>
  </span>
</template>

<style scoped></style>
