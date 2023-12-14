<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useGlobalStore } from '@/stores/global';
  import { storeToRefs } from 'pinia';
  import { LoadingIcon } from '@/components/icons';
  import SimpleTable from '@/components/modbus/SimpleTable.vue';

  const globalStore = useGlobalStore()
  const { getModbusTable } = storeToRefs(globalStore)
  const loading = ref(false)

  onMounted(async () => {
    loading.value = true
    await globalStore.loadModbusTable()
      .finally(() => loading.value = false)
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <LoadingIcon v-if="loading" class="w-10 h-10 text-fdx-red mx-auto my-12 animate-spin fill-transparent" />
    <div v-if="!loading">
      <template v-for="table in getModbusTable">
        <SimpleTable :data="table" />
      </template>
    </div>
  </section>
</template>

<style scoped></style>
