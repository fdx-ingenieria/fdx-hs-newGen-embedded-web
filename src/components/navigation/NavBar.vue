<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { MenuCloseIcon, MenuOpenIcon, ThermometerIcon } from '../icons';
  import SocketStatus from './SocketStatus.vue';

  const globalStore = useGlobalStore();
</script>

<template>
  <nav class="bg-white border-b border-gray-200 px-4 py-2.5 fixed left-0 right-0 top-0 z-50 print:absolute">
    <div class="flex flex-wrap justify-between items-center">
      <button aria-expanded="true" aria-controls="sidebar"
        @click="globalStore.showSideBar = !globalStore.showSideBar"
        class="p-1 mr-3 text-gray-600 rounded cursor-pointer hover:text-gray-900 hover:bg-gray-100 print:hidden">
        <MenuOpenIcon v-if="!globalStore.showSideBar" class="w-8" />
        <template v-else>
          <MenuCloseIcon class="w-8" />
        </template>
      </button>
      <a class="flex">
        <img src="@/assets/fdx_no_bg_lg.png" class="h-12 hidden xs:inline-flex" alt="FDX Logo" />
        <img src="@/assets/fdx_no_bg_sm.png" class="h-12 inline-flex xs:hidden" alt="FDX Logo" />
      </a>
      <div class="flex print:hidden">
        <div class="flex items-center inline-flex">
          <ThermometerIcon class="w-5 h-5 text-gray-600" />
          {{  globalStore.boardTemp }}
          <small class="ml-1">°C</small>
        </div>
        <SocketStatus class="ml-4" />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
