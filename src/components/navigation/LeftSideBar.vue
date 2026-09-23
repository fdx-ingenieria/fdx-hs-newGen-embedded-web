<script setup lang="ts">
  import { PieIcon, CogIcon, ModbusIcon } from '@/components/icons';
  import LeftSideBarItem from './LeftSideBarItem.vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useGlobalStore } from '@/stores/global';
  import { onMounted, onUnmounted, ref } from 'vue';
  import { version } from '../../../package.json';

  const route = useRoute();
  const router = useRouter();
  const globalStore = useGlobalStore();
  const isSmallScreen = ref(window.innerWidth < 1024);
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
    isSmallScreen.value = window.innerWidth < 1024;
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
  <div class="fixed lg:hidden top-0 left-0 right-0 z-10 w-full bg-slate-950/60 h-full print:hidden"
    v-if="globalStore.showSideBar"
    @click="globalStore.showSideBar = false">
  </div>
  <aside class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 bg-panel border-r border-line print:hidden"
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

    <div class="absolute bottom-0 left-0 z-20 w-full border-t border-line bg-panel px-4 py-3 font-mono text-xs text-ink-faint lg:block">
      <small class="block">FW: {{ globalStore.getFirmwareVersion || 'N/A' }}</small>
      <small class="block">WA: v{{ version }}</small>
    </div>
  </aside>
</template>

<style scoped></style>
