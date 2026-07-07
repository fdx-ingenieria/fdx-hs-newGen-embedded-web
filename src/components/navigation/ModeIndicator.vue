<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { BookmarkIcon, CabinetIcon, NetworkConnectedIcon, NetworkDisconnectedIcon, SearchIcon } from '@/components/icons';
  import { computed } from 'vue';

  const globalStore = useGlobalStore();

  // Un solo estado efectivo, no una combinación: coincide 1 a 1 con la rama que
  // toma el backend en el loop de medición (main_sm.cpp) — Discovery manda
  // siempre que está activo, Auto (switchgear) solo aplica si no hay Discovery.
  // Colores suavizados (opacidad reducida sobre los tokens semánticos) para que
  // el ícono siga siendo identificable sin gritar.
  const mode = computed(() => {
    if (globalStore.getDiscoveryModeOn) {
      return { icon: SearchIcon, colorClass: 'text-warn/70', title: 'Discovery mode: all detected tags are processed' };
    }
    if (globalStore.getAppModeIsSwitchgear) {
      return { icon: CabinetIcon, colorClass: 'text-accent/70', title: 'Auto mode: sensor groups are auto-registered and tracked per antenna (switchgear)' };
    }
    return { icon: BookmarkIcon, colorClass: 'text-ok/70', title: 'Manual mode: only registered sensors are processed' };
  });
</script>

<template>
  <div class="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel-soft px-2.5">
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
