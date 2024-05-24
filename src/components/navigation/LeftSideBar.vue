<script setup lang="ts">
  import { PieIcon, CogIcon, ModbusIcon } from '@/components/icons';
  import LeftSideBarItem from './LeftSideBarItem.vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useGlobalStore } from '@/stores/global';
  import { onMounted, onUnmounted, ref } from 'vue';

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
  <div class="fixed lg:hidden top-0 left-0 right-0 z-10 w-full bg-gray-800 opacity-50 h-full print:hidden"
    v-if="globalStore.showSideBar"
    @click="globalStore.showSideBar = false">
  </div>
  <aside class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-gray-200 print:hidden"
    :class="{'translate-x-0': globalStore.showSideBar, '-translate-x-full': !globalStore.showSideBar}"
    aria-label="Sidenav">
    <div class="overflow-y-auto py-3 px-3 h-full bg-white">
      <ul class="space-y-2">
        <LeftSideBarItem label="Overview" route="Overview" :matched="route.matched">
          <PieIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Configuration" :items="options" :matched="route.matched">
          <CogIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Modbus" route="Modbus" :matched="route.matched">
          <ModbusIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
      </ul>
    </div>

    <div class="absolute bottom-0 left-0 justify-left p-4 space-x-4 w-full lg:flex bg-white z-20">
      <small>Version: 0.0.3</small>
    </div>
  </aside>
</template>

<style scoped></style>
