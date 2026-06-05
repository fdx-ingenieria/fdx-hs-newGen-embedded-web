<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { computed } from 'vue';
  import { NetworkConnectedIcon, NetworkConnectingIcon, NetworkDisconnectedIcon } from '../icons';

  const globalStore = useGlobalStore();

  const statusClass = computed(() => {
    if (!globalStore.connected) {
      return 'bg-crit-soft text-crit ring-crit/30';
    }
    if (globalStore.getNormalModeOn) {
      return 'bg-ok-soft text-ok ring-ok/30';
    }
    if (globalStore.getDiscoveryModeOn) {
      return 'bg-warn-soft text-warn ring-warn/30';
    }
    return 'bg-idle-soft text-ink-faint ring-line';
  });

  const socketMode = computed(() => {
    if (globalStore.getNormalModeOn) {
      return 'Normal mode ON';
    } else if (globalStore.getDiscoveryModeOn) {
      return 'Discovery mode ON';
    }
    return 'Normal mode OFF';
  });
</script>

<template>
  <div
    class="inline-flex h-9 items-center rounded-lg px-2.5 ring-1 ring-inset"
    :class="statusClass"
    :title="`Connection: ${globalStore.connected ? 'Connected' : 'Disconnected'} Mode: ${socketMode}`">
    <NetworkConnectedIcon v-if="globalStore.connected && globalStore.getNormalModeOn" class="h-6" />
    <NetworkConnectingIcon v-else-if="globalStore.connected" class="h-6" />
    <NetworkDisconnectedIcon v-else class="h-6" />
  </div>
</template>

<style scoped></style>
