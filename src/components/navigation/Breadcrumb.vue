<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { ChevronRightIcon, HomeIcon } from '@/components/icons';

  // Same names as the sidebar, so the trail reads like the menu.
  const TRAILS: Record<string, string[]> = {
    Overview: ['Overview'],
    System: ['Configuration', 'System'],
    Labels: ['Configuration', 'Labels'],
    Sensors: ['Configuration', 'Sensors'],
    Alarms: ['Configuration', 'Alarms'],
    ReaderConfig: ['Configuration', 'RFID Config'],
    Installation: ['Configuration', 'Sensors', 'Installation'],
    Modbus: ['Modbus'],
    LogsAdmin: ['Logs'],
  }

  const route = useRoute()
  const trail = computed(() => TRAILS[String(route.name)] ?? ['Page not found'])
</script>

<template>
  <nav class="flex mb-4 print:hidden" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li class="inline-flex items-center">
        <router-link :to="{ name: 'Overview' }" class="inline-flex items-center rounded text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Overview">
          <HomeIcon class="w-5 fill-brand" />
        </router-link>
      </li>
      <li v-for="(item, i) in trail" :key="item">
        <div class="flex items-center">
          <ChevronRightIcon class="w-5 text-ink-faint" />
          <span class="ml-1 text-sm font-semibold md:ml-2"
            :class="i === trail.length - 1 ? 'text-ink' : 'text-ink-soft'"
            :aria-current="i === trail.length - 1 ? 'page' : undefined">{{ item }}</span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<style scoped></style>
