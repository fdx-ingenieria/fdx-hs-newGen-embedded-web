<script setup lang="ts">
  import { useRouter } from 'vue-router';
  import { ChevronRightIcon, HomeIcon } from '@/components/icons';

  const router = useRouter()

  const getPath = () => {
    const path = router.currentRoute.value.path
      .split('/')
      .slice(1)
      .map((item: string) => item.charAt(0).toUpperCase() + item.slice(1))
      .filter((item: string) => item !== '')

    return path.length ? path : [router.currentRoute.value.name]
  }
</script>

<template>
  <nav class="flex mb-4 print:hidden" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
      <li class="inline-flex items-center">
        <a class="inline-flex items-center text-sm text-fdx-red">
          <HomeIcon class="w-5 fill-fdx-red"/>
        </a>
      </li>
      <li v-for="item in getPath()">
        <div class="flex items-center">
          <ChevronRightIcon class="w-5" />
          <span class="ml-1 text-sm font-semibold text-gray-700 md:ml-2">{{ item }}</span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<style scoped></style>
