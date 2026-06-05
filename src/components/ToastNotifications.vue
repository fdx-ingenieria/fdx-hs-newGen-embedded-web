<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
import { CloseIcon } from '@/components/icons'

const store = useGlobalStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="n in store.notifications"
          :key="n.id"
          class="text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 pointer-events-auto"
          :class="n.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
        >
          <span class="flex-1 text-sm break-words leading-snug">{{ n.message }}</span>
          <button
            @click="store.dismissNotification(n.id)"
            class="shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
          >
            <CloseIcon class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
