<script setup lang="ts">
  defineProps({
    show: Boolean,
  })
</script>

<template>
  <section
    class="w-full md:w-[50%] shadow-2xl pt-16 shadow-gray-200 fixed top-0 right-0 transition translate-x-full bg-white h-full z-10"
    :class="{'transform-none': show}">
    <div class="content px-8 py-6">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped></style>