<script setup lang="ts">
  import { isDark, toggleTheme } from '@/composables/theme';
</script>

<template>
  <button
    type="button"
    @click="toggleTheme()"
    role="switch"
    :aria-checked="isDark"
    :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    aria-label="Toggle color theme"
    class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel-soft text-ink-soft hover:bg-panel-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent print:hidden">
    <!-- Sun (shown in dark mode → click to go light) -->
      <svg v-if="isDark" key="sun" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <!-- Moon (shown in light mode → click to go dark) -->
      <svg v-else key="moon" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
  </button>
</template>

<style scoped></style>
