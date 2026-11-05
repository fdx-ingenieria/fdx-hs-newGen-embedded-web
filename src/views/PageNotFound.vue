<script setup lang="ts"></script>

<template>
  <section class="flex min-h-[60vh] items-center justify-center px-4">
    <div class="card max-w-md p-6 text-center">
      <p class="font-mono text-sm font-semibold text-ink-faint">404</p>
      <h1 class="mt-1 text-xl font-semibold text-ink">Page not found</h1>
      <p class="mt-2 text-sm text-ink-soft">This address does not match any page of the device.</p>
      <router-link :to="{ name: 'Overview' }" class="btn-primary mt-5">Go to overview</router-link>
    </div>
  </section>
</template>

<style scoped></style>
