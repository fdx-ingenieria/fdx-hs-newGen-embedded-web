<script setup lang="ts">
  import { onBeforeUnmount, onMounted, watch } from 'vue';
  import { CloseIcon } from '@/components/icons';

  const props = defineProps({
    show: Boolean,
  })

  const emit = defineEmits<{ close: [] }>()

  const onKeydown = (e: KeyboardEvent) => {
    if (props.show && e.key === 'Escape') emit('close')
  }

  // Phones and touch screens only: the page behind must not scroll under the panel.
  const touchOrNarrow = window.matchMedia('(max-width: 767px), (pointer: coarse)')
  const lockScroll = (lock: boolean) =>
    document.documentElement.classList.toggle('overflow-hidden', lock && touchOrNarrow.matches)

  watch(() => props.show, lockScroll)
  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    lockScroll(false)
  })
</script>

<template>
  <!-- Touch only: keeps stray taps from reaching the table rows behind the panel. -->
  <div v-if="show" aria-hidden="true"
    class="fixed inset-0 z-[9] hidden bg-slate-950/40 [@media(pointer:coarse)]:block"></div>
  <section
    class="fixed top-0 right-0 z-10 h-full w-full translate-x-full overflow-y-auto overscroll-contain border-l border-line bg-panel pt-16 shadow-2xl desktop:w-[50%]"
    :class="{'transform-none': show}"
    :aria-hidden="!show">
    <div class="sticky top-0 z-10 -mb-14 hidden h-14 justify-end p-2 mobile:flex">
      <button type="button" @click="emit('close')" aria-label="Close panel"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-panel text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <CloseIcon class="h-5 w-5" />
      </button>
    </div>
    <div class="content px-8 py-6 mobile:px-4">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped></style>
