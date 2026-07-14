<script setup lang="ts">
  import Breadcrumb from './components/navigation/Breadcrumb.vue';
  import NavBar from './components/navigation/NavBar.vue';
  import LeftSideBar from './components/navigation/LeftSideBar.vue';
  import ToastNotifications from './components/ToastNotifications.vue';
  import { onMounted, onBeforeUnmount } from 'vue';
  import { useRouter } from 'vue-router';
  import { useGlobalStore } from './stores/global';

  const globalStore = useGlobalStore()
  const router = useRouter()

  // Hidden admin logs view: reachable only via Ctrl+Shift+L (no sidebar entry).
  function onKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      e.preventDefault()
      router.push('/admin/logs')
    }
  }

  onMounted(() => {
    globalStore.startMonitoring()
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    globalStore.stopMonitoring()
    window.removeEventListener('keydown', onKeydown)
  })
</script>

<template>
  <div class="app-grid antialiased bg-app text-ink min-h-screen min-w-[320px]">
    <NavBar />
    <LeftSideBar />
    <ToastNotifications />
    <main class="p-4 h-auto pt-20"
      :class="{'lg:ml-64': globalStore.showSideBar}">
      <Breadcrumb />
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<style scoped></style>
