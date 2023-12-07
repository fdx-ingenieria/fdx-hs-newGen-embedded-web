<script setup lang="ts">
  import Breadcrumb from './components/navigation/Breadcrumb.vue';
  import NavBar from './components/navigation/NavBar.vue';
  import LeftSideBar from './components/navigation/LeftSideBar.vue';
  import { onMounted, ref } from 'vue';
  import { useGlobalStore } from './stores/global';

  const showSideBar = ref(false);

  const globalStore = useGlobalStore()
  onMounted(async() => {
    await globalStore.connect()
  })
</script>

<template>
  <div class="antialiased bg-gray-50 h-screen">
    <NavBar :show="showSideBar" @toggleSideBar="showSideBar = !showSideBar" />
    <LeftSideBar :show="showSideBar" />
    <main class="p-4 md:ml-64 h-auto pt-20">
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
