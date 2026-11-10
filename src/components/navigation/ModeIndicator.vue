<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { NetworkConnectedIcon, NetworkDisconnectedIcon } from '@/components/icons';
  import { useDeviceMode } from '@/composables/deviceMode';

  const globalStore = useGlobalStore();
  // Muted semantic colors so the icon stays recognizable without shouting.
  const mode = useDeviceMode();
</script>

<template>
  <div class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-soft px-2 xs:gap-2 xs:px-2.5">
    <!-- El title va en un <span> envolvente, no en el ícono: el atributo title
         no dispara el tooltip nativo de forma confiable sobre un <svg> inline. -->
    <span :title="globalStore.connected ? 'Connected' : 'Disconnected — reconnecting...'" class="inline-flex">
      <component :is="globalStore.connected ? NetworkConnectedIcon : NetworkDisconnectedIcon"
        class="h-4 w-4 shrink-0"
        :class="globalStore.connected ? 'text-ok' : 'text-crit'" />
    </span>

    <span class="h-4 w-px bg-line"></span>

    <span :title="mode.title" class="inline-flex">
      <component :is="mode.icon" class="h-4 w-4 shrink-0" :class="mode.colorClass" />
    </span>
  </div>
</template>

<style scoped></style>
