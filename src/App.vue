<script setup lang="ts">
  import Breadcrumb from './components/navigation/Breadcrumb.vue';
  import NavBar from './components/navigation/NavBar.vue';
  import LeftSideBar from './components/navigation/LeftSideBar.vue';
  import ToastNotifications from './components/ToastNotifications.vue';
  import { onMounted, onBeforeUnmount } from 'vue';
  import { useGlobalStore } from './stores/global';

  const globalStore = useGlobalStore()

  onMounted(() => {
    globalStore.startMonitoring()
  })

  onBeforeUnmount(() => {
    globalStore.stopMonitoring()
  })
</script>

<template>
  <div class="antialiased bg-gray-50 h-screen min-w-[320px]">
    <NavBar />
    <LeftSideBar />
    <ToastNotifications />
    <main class="p-4 h-auto pt-20"
      :class="{'lg:ml-64': globalStore.showSideBar}">
      <Breadcrumb />
      <router-view v-slot="{ Component }">
        <Transition :name="'fade'" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped></style>
