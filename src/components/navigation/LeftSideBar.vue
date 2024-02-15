<script setup lang="ts">
  import { PieIcon, CogIcon, NetworkConnectedIcon, NetworkConnectingIcon, SearchIcon, RefreshIcon, EditIcon } from '@/components/icons';
  import LeftSideBarItem from './LeftSideBarItem.vue';
import BaseIcon from '../icons/BaseIcon.vue';

  defineProps({
    show: {
      type: Boolean,
      required: true
    },
  })

  const options = [
  {
      label: 'Wireless',
      route: 'Wireless'
    },
    {
      label: 'Wired',
      route: 'Wired'
    }
    
  ]
</script>
<template>
  <aside class="fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-gray-200 md:translate-x-0 print:hidden"
    :class="{'translate-x-0': show, '-translate-x-full': !show}"
    aria-label="Sidenav">
    <div class="overflow-y-auto py-3 px-3 h-full bg-white">
      <ul class="space-y-2">
        <LeftSideBarItem label="Home" route="Home">
          <RefreshIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
        
        <LeftSideBarItem label="Reader" route="Reader">
          <PieIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>

        <LeftSideBarItem label="Network" :items="options">
          <NetworkConnectingIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>

        <LeftSideBarItem label="Command" route="Command">          
        <EditIcon class="w-7 text-gray-500 transition duration-75 group-hover:text-gray-900" />
        </LeftSideBarItem>
       
      
      </ul>
    </div>

    <div class="absolute bottom-0 left-0 justify-left p-4 space-x-4 w-full lg:flex bg-white z-20">
      <small>Version: 0.0.1</small>
    </div>
  </aside>
</template>

<style scoped></style>
