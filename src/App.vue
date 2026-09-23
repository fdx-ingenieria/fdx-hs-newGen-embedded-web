<script setup lang="ts">
  import Breadcrumb from './components/navigation/Breadcrumb.vue';
  import NavBar from './components/navigation/NavBar.vue';
  import LeftSideBar from './components/navigation/LeftSideBar.vue';
  import ToastNotifications from './components/ToastNotifications.vue';
  import { AlertIcon } from './components/icons';
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
      <!-- Antenna fault: shown on every view, not just System, because it stops the
           unit measuring altogether — a toast on one screen would be missed. -->
      <div v-if="globalStore.readerFault"
        class="flex items-center p-4 mb-4 text-crit rounded-lg bg-crit-soft" role="alert">
        <AlertIcon class="flex-none w-5 mr-3" />
        <div class="ml-3 text-sm font-medium">
          {{ globalStore.readerFaultMessage }}
          Detection retries automatically.
        </div>
      </div>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<style scoped></style>
