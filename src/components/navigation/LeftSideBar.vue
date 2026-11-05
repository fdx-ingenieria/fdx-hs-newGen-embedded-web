<script setup lang="ts">
  import { PieIcon, CogIcon, ModbusIcon } from '@/components/icons';
  import LeftSideBarItem from './LeftSideBarItem.vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useGlobalStore } from '@/stores/global';
  import { onMounted, onUnmounted, ref } from 'vue';
  import { version } from '../../../package.json';
  import { vLongPress } from '@/composables/longPress';

  const route = useRoute();
  const router = useRouter();
  const globalStore = useGlobalStore();
  // Touch screens get the overlay drawer at any width, like phones.
  const isOverlayNav = () => window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = ref(isOverlayNav());
  const options = [
  {
      label: 'System',
      route: 'System'
    },
    {
      label: 'Labels',
      route: 'Labels'
    },
    {
      label: 'Sensors',
      route: 'Sensors'
    },
    {
      label: 'Alarms',
      route: 'Alarms'
    },
    {
      label: 'RFID Config',
      route: 'ReaderConfig'
    },
  ]

  const updateScreenSize = () => {
    isSmallScreen.value = isOverlayNav();
  };

  onMounted(() => {
    window.addEventListener('resize', updateScreenSize)
    router.afterEach((_to, _from) => {
      if (isSmallScreen.value) globalStore.showSideBar = false;
    });
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreenSize);
  });
</script>
<template>
  <div class="fixed desktop:lg:hidden top-0 left-0 right-0 z-10 w-full bg-slate-950/60 h-full print:hidden"
    v-if="globalStore.showSideBar"
    @click="globalStore.showSideBar = false">
  </div>
  <aside id="sidebar" class="fixed top-0 left-0 z-40 w-64 h-screen [height:100dvh] pt-16 bg-panel border-r border-line print:hidden"
    :class="{'translate-x-0': globalStore.showSideBar, '-translate-x-full': !globalStore.showSideBar}"
    aria-label="Sidenav">
    <div class="overflow-y-auto py-4 px-3 h-full">
      <ul class="space-y-1">
        <LeftSideBarItem label="Overview" route="Overview" :matched="route.matched">
          <PieIcon class="w-6 text-ink-faint group-hover:text-ink" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Configuration" :items="options" :matched="route.matched">
          <CogIcon class="w-6 text-ink-faint group-hover:text-ink" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Modbus" route="Modbus" :matched="route.matched">
          <ModbusIcon class="w-6 text-ink-faint group-hover:text-ink" />
        </LeftSideBarItem>
      </ul>
    </div>

    <!-- Long press (touch only) opens the hidden logs view, the touch twin of Ctrl+Shift+L. -->
    <div v-long-press="() => router.push('/admin/logs')"
      class="absolute bottom-0 left-0 z-20 w-full select-none border-t border-line bg-panel px-4 py-3 font-mono text-xs text-ink-faint [-webkit-touch-callout:none] lg:block">
      <small class="block">FW: {{ globalStore.getFirmwareVersion || 'N/A' }}</small>
      <small class="block">WA: v{{ version }}</small>
      <small v-if="globalStore.getModbusContract !== null" class="block">MB: v{{ globalStore.getModbusContract }}</small>
    </div>
  </aside>
</template>

<style scoped></style>
