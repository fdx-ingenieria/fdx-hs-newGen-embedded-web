<script setup lang="ts">
  import Breadcrumb from './components/navigation/Breadcrumb.vue';
  import NavBar from './components/navigation/NavBar.vue';
  import LeftSideBar from './components/navigation/LeftSideBar.vue';
  import { onBeforeUnmount, onMounted } from 'vue';
  import { useGlobalStore } from './stores/global';

  const globalStore = useGlobalStore()

  const closeSocket = async() => {
    await globalStore.disconnect()
  }

  onMounted(async() => {
    await globalStore.connect()
    // To handle browser refresh
    window.addEventListener('beforeunload', closeSocket);
  })

  onBeforeUnmount(() => {
    closeSocket()
    window.removeEventListener('beforeunload', closeSocket);
  }
  )
</script>

<template>
  <div class="antialiased bg-gray-50 h-screen min-w-[320px]">
    <NavBar />
    <LeftSideBar />
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
