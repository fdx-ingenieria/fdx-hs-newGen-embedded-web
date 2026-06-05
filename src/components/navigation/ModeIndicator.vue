<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { computed } from 'vue';

  const globalStore = useGlobalStore();

  // Solo hay dos modos reales: DISCOVERY y MANUAL (lo que el front llama "Normal").
  const mode = computed(() => {
    if (globalStore.getDiscoveryModeOn) {
      return {
        label: 'Discovery',
        title: 'Modo Discovery: se procesan todas las tags detectadas',
        dotClass: 'bg-warn',
        pillClass: 'bg-warn-soft text-warn ring-warn/30',
      };
    }
    return {
      label: 'Normal',
      title: 'Modo Normal: solo se procesan los sensores registrados',
      dotClass: 'bg-ok',
      pillClass: 'bg-ok-soft text-ok ring-ok/30',
    };
  });
</script>

<template>
  <div
    class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium ring-1 ring-inset"
    :class="mode.pillClass"
    :title="mode.title">
    <span class="h-2 w-2 rounded-full" :class="mode.dotClass"></span>
    {{ mode.label }}
  </div>
</template>

<style scoped></style>
