<script setup lang="ts">
  defineProps({
    show: Boolean,
  })
</script>

<template>
  <section
    class="fixed top-0 right-0 z-10 h-full w-full translate-x-full overflow-y-auto border-l border-line bg-panel pt-16 shadow-2xl md:w-[50%]"
    :class="{'transform-none': show}">
    <div class="content px-8 py-6">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped></style>