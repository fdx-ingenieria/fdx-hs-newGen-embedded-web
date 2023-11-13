<script setup lang="ts">
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import EditForm from '@/components/alarms/EditForm.vue';
  import { ListIcon, LoadingIcon } from '@/components/icons';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { onMounted, ref } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableAlarms } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const alarmId = ref(-1)
  const loadingData = ref(true)

  const editAlarm = (id: number) => {
    showRightSideBar.value = true
    alarmId.value = id
  }

  onMounted(async () => {
    await Promise.all([
      globalStore.loadLabels(),
      globalStore.loadAlarms()
    ]).then(() => {
      loadingData.value = false
    })
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <RightSideBar :show="showRightSideBar">
      <EditForm :alarmId="alarmId" @close="showRightSideBar = false"/>
    </RightSideBar>
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex bg-fdx-dark text-white items-center py-2 px-4">
          <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
          <h3 class="text-xl font-semibold">Alarms</h3>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
        <AlarmsTable v-else :availableAlarms="getAvailableAlarms" @edit="editAlarm" :max="20" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
