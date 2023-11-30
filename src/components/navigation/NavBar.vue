<script setup lang="ts">
  import { ThermometerIcon } from '../icons';
  import SocketStatus from './SocketStatus.vue';

  defineProps({
    show: {
      type: Boolean,
      required: true
    },
  })

  const emit = defineEmits<{
    (e: 'toggle-side-bar'): void
  }>()
</script>

<template>
  <nav class="bg-white border-b border-gray-200 px-4 py-2.5 fixed left-0 right-0 top-0 z-50">
    <div class="flex flex-wrap justify-between items-center">
      <button aria-expanded="true" aria-controls="sidebar"
        @click="emit('toggle-side-bar')"
        class="md:hidden p-2 mr-3 text-gray-600 rounded cursor-pointer hover:text-gray-900 hover:bg-gray-100">
        <svg v-if="!show"  class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 12">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h14M1 6h14M1 11h7" />
        </svg>
        <svg v-else class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </button>
      <a class="flex mr-4 cursor-pointer">
        <img src="@/assets/fdx_no_bg_lg.png" class="mr-3 h-12" alt="FDX Logo" />
      </a>
      <div class="flex">
        <div class="flex items-center hidden sm:inline-flex">
          <ThermometerIcon class="w-5 h-5 text-gray-600" />
          43.10
          <small class="ml-1">°C</small>
        </div>
        <SocketStatus class="ml-4" />
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
