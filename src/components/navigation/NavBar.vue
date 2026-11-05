<script setup lang="ts">
  import { useGlobalStore } from '@/stores/global';
  import { MenuCloseIcon, MenuOpenIcon, ThermometerIcon } from '../icons';
  import ModeIndicator from './ModeIndicator.vue';
  import ThemeToggle from './ThemeToggle.vue';

  const globalStore = useGlobalStore();

  // Always a full page load of the webapp entry point, even when already on Overview.
  const HOME = import.meta.env.BASE_URL
  const goHome = () => window.location.assign(HOME)
</script>

<template>
  <nav class="fixed left-0 right-0 top-0 z-50 border-b border-line bg-panel px-4 py-2 print:absolute">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center">
        <button :aria-expanded="globalStore.showSideBar" aria-controls="sidebar" aria-label="Toggle navigation menu"
          @click="globalStore.showSideBar = !globalStore.showSideBar"
          class="mr-2 rounded-lg p-1.5 text-ink-soft hover:bg-panel-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent print:hidden">
          <MenuOpenIcon v-if="!globalStore.showSideBar" class="w-7" />
          <MenuCloseIcon v-else class="w-7" />
        </button>
        <a :href="HOME" @click.prevent="goHome" class="flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="FDX, reload the overview">
          <img src="@/assets/fdx_no_bg_logo_negro.png" class="h-11 dark:hidden" alt="" />
          <img src="@/assets/fdx_no_bg_logo_blanco.png" class="hidden h-11 dark:block" alt="" />
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
        <ThemeToggle />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
