<script setup lang="ts">
  import { ISensorData, SensorQuality } from '@/commons';
  import { PropType, computed } from 'vue';
  import { useGlobalStore } from '@/stores/global';
  import SignalBars from './SignalBars.vue';

  const props = defineProps({
    sensorData: {
      type: Object as PropType<ISensorData>,
      required: true
    },
    stacked: { type: Boolean, default: false },
  })

  // Discovery windows hold about one round, so quality says nothing there: show the signal meter instead.
  // Outside discovery quality is just its colored word; bars would read as signal strength.
  const QUALITY_CLASS: Record<SensorQuality, string> = {
    [SensorQuality.OUT_OF_SERVICE]: 'text-crit',
    [SensorQuality.BAD]: 'text-warn',
    [SensorQuality.REGULAR]: 'text-ink-soft',
    [SensorQuality.GOOD]: 'text-info',
    [SensorQuality.EXCELLENT]: 'text-ok',
  };

  const globalStore = useGlobalStore()
  const bySignal = computed(() => globalStore.getDiscoveryModeOn)
  const qualityClass = computed(() => (props.sensorData.quality && QUALITY_CLASS[props.sensorData.quality]) || 'text-ink-faint')
  // Out of service means no reading this window: its RSSI is a 0 placeholder, not a signal.
  const notRead = computed(() => props.sensorData.quality === SensorQuality.OUT_OF_SERVICE)
</script>

<template>
  <!-- stacked: two left-aligned lines like the other table columns; inline: one line for cards. -->
  <span class="whitespace-nowrap" :class="stacked ? 'flex flex-col items-start gap-0.5' : 'inline-flex items-baseline gap-1.5'">
    <span v-if="bySignal && notRead" class="text-xs font-semibold text-ink-faint" title="Not read in the last discovery window">Not read</span>
    <SignalBars v-else-if="bySignal" :rssi="sensorData.rssi" :show-dbm="false" />
    <span v-else class="text-xs font-semibold" :class="qualityClass"
      :title="`Read quality: ${sensorData.quality ?? 'Unknown'}, RSSI ${sensorData.rssi} dBm`">{{ sensorData.quality }}</span>
    <span v-if="!notRead" class="font-mono text-xs text-ink-faint">{{ sensorData.rssi }} dBm</span>
  </span>
</template>

<style scoped></style>
