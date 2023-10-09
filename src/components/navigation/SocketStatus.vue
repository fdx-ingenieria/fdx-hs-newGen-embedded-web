<script setup lang="ts">
  import { SocketStatus } from '@/commons/enums';
  import { useGlobalStore } from '@/stores/global';
  import { computed } from 'vue';
import { NetworkConnectedIcon, NetworkConnectingIcon, NetworkDisconnectedIcon } from '../icons';

  const globalStore = useGlobalStore();

  const statusClass = computed(() => {
    switch (globalStore.status) {
      case SocketStatus.CONNECTING:
        return 'bg-blue-200 text-blue-700 ring-blue-600/20';
      case SocketStatus.OPEN:
        return 'bg-green-200 text-green-700 ring-green-600/20';
      case SocketStatus.CLOSING:
        return 'bg-yellow-200 text-yellow-700 ring-yellow-600/20';
      case SocketStatus.CLOSED:
        return 'bg-red-100 text-red-700 ring-red-600/20';
      default:
        return 'bg-gray-200';
    }
  });
</script>

<template>
  <div
    class="inline-flex rounded-md px-2 py-1 ring-1 ring-inset"
    :class="statusClass"
    :title="globalStore.status">
    <NetworkConnectedIcon v-if="globalStore.status === SocketStatus.OPEN" class="h-6" />
    <NetworkConnectingIcon v-else-if="globalStore.status === SocketStatus.CONNECTING" class="h-6" />
    <NetworkDisconnectedIcon v-else class="h-6" />
  </div>
</template>

<style scoped></style>
