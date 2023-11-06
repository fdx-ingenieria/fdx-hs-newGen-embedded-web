<script setup lang="ts">
  import { PieIcon, CogIcon, AlarmIcon } from '@/components/icons';
  import ThermometerIcon from '../icons/ThermometerIcon.vue';
  import LeftSideBarItem from './LeftSideBarItem.vue';

  defineProps({
    show: {
      type: Boolean,
      required: true
    },
  })

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
      label: 'Modbus'
    }
  ]
</script>
<template>
  <aside class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-gray-200 md:translate-x-0"
    :class="{'translate-x-0': show, '-translate-x-full': !show}"
    aria-label="Sidenav">
    <div class="overflow-y-auto py-3 px-3 h-full bg-white">
      <ul class="space-y-2">
        <LeftSideBarItem label="Overview" route="Overview">
          <PieIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Temperatures" route="Temperatures">
          <ThermometerIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Alarms">
          <AlarmIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        <LeftSideBarItem label="Configuration" :items="options">
          <CogIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
      </ul>
    </div>
    <div class="absolute bottom-0 left-0 justify-left p-4 space-x-4 w-full lg:flex bg-white z-20">
      <small>Version: 0.0.1</small>
    </div>
  </aside>
</template>

<style scoped></style>
