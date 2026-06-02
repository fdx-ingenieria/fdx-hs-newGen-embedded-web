<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { computed } from 'vue';
  import { NetworkConnectedIcon, NetworkConnectingIcon, NetworkDisconnectedIcon } from '../icons';

  const globalStore = useGlobalStore();

  const statusClass = computed(() => {
    if (!globalStore.connected) {
      return 'bg-red-100 text-red-700 ring-red-600/20';
    }
    if (globalStore.getNormalModeOn) {
      return 'bg-green-200 text-green-700 ring-green-600/20';
    }
    if (globalStore.getDiscoveryModeOn) {
      return 'bg-green-200 text-red-500 ring-green-600/20';
    }
    return 'bg-green-200 text-gray-400 ring-green-600/20';
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
    class="inline-flex rounded-md px-2 py-1 ring-1 ring-inset"
    :class="statusClass"
    :title="`Connection: ${globalStore.connected ? 'Connected' : 'Disconnected'} Mode: ${socketMode}`">
    <NetworkConnectedIcon v-if="globalStore.connected && globalStore.getNormalModeOn" class="h-6" />
    <NetworkConnectingIcon v-else-if="globalStore.connected" class="h-6" />
    <NetworkDisconnectedIcon v-else class="h-6" />
  </div>
</template>

<style scoped></style>
