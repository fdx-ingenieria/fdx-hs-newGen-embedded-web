<script setup lang="ts">
  import { PieIcon, CogIcon, ModbusIcon } from '@/components/icons';
  import LeftSideBarItem from './LeftSideBarItem.vue';
  import { useRoute } from 'vue-router';

  defineProps({
    show: {
      type: Boolean,
      required: true
    },
  })
  const route = useRoute();
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

  const emit = defineEmits<{
    (e: 'toggle-side-bar'): void
  }>()
</script>
<template>
  <aside class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-gray-200 md:translate-x-0 print:hidden"
    :class="{'translate-x-0': show, '-translate-x-full': !show}"
    aria-label="Sidenav">
    <div class="fixed md:hidden top-0 left-0 right-0 z-10 w-full bg-gray-800 opacity-50 h-full"
      v-if="show"
      @click="emit('toggle-side-bar')">
    </div>
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
      <small>Version: 0.0.2</small>
    </div>
  </aside>
</template>

<style scoped></style>
