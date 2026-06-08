<script setup lang="ts">
import { useGlobalStore, type NotificationType } from '@/stores/global'
import { CloseIcon } from '@/components/icons'

const store = useGlobalStore()

// Estilo por severidad. 'warning' = ámbar, para estados transitorios o
// resultados no exitosos que no son errores (ej: cero antenas detectadas).
const toastClass: Record<NotificationType, string> = {
  success: 'border-ok/30 bg-ok-soft text-ok',
  warning: 'border-warn/30 bg-warn-soft text-warn',
  error: 'border-crit/30 bg-crit-soft text-crit',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="n in store.notifications"
          :key="n.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg"
          :class="toastClass[n.type]"
        >
          <span class="flex-1 text-sm font-medium break-words leading-snug">{{ n.message }}</span>
          <button
            @click="store.dismissNotification(n.id)"
            class="shrink-0 opacity-70 hover:opacity-100 mt-0.5"
          >
            <CloseIcon class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
