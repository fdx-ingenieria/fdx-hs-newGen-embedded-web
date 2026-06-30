<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { MenuCloseIcon, MenuOpenIcon, ThermometerIcon } from '../icons';
  import ConnectionStatus from './ConnectionStatus.vue';
  import ModeIndicator from './ModeIndicator.vue';
  import ThemeToggle from './ThemeToggle.vue';

  const globalStore = useGlobalStore();
</script>

<template>
  <nav class="fixed left-0 right-0 top-0 z-50 border-b border-line bg-panel px-4 py-2 print:absolute">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center">
        <button aria-expanded="true" aria-controls="sidebar"
          @click="globalStore.showSideBar = !globalStore.showSideBar"
          class="mr-2 rounded-lg p-1.5 text-ink-soft hover:bg-panel-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent print:hidden">
          <MenuOpenIcon v-if="!globalStore.showSideBar" class="w-7" />
          <MenuCloseIcon v-else class="w-7" />
        </button>
        <a class="flex items-center">
          <img src="@/assets/fdx_no_bg_logo_negro.png" class="h-11 dark:hidden" alt="FDX Logo" />
          <img src="@/assets/fdx_no_bg_logo_blanco.png" class="hidden h-11 dark:block" alt="FDX Logo" />
        </a>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 print:hidden">
        <div class="hidden items-center gap-1.5 rounded-lg border border-line bg-panel-soft px-2.5 py-1 xs:inline-flex"
          title="Board temperature">
          <ThermometerIcon class="h-5 w-5 text-ink-faint" />
          <span class="font-mono text-sm font-semibold text-ink">{{ globalStore.boardTemp }}</span>
          <small class="text-ink-faint">°C</small>
        </div>
        <ModeIndicator />
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
