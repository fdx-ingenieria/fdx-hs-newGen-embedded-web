<script setup lang="ts">
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import EditForm from '@/components/alarms/EditForm.vue';
  import { ListIcon, LoadingIcon } from '@/components/icons';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, ref } from 'vue'

  const globalStore = useGlobalStore()
  const { getAvailableAlarms } = storeToRefs(globalStore)
  const showRightSideBar = ref(false)
  const alarmId = ref(-1)
  const loadingData = ref(true)

  // El backend es la fuente de verdad: la tabla bindea al store y cada Save/Reset
  // del EditForm hace re-fetch (loadAlarms), así que no hay copia local ni bulk-save.
  const editingAlarm = computed(() =>
    getAvailableAlarms.value.find(a => a.id === alarmId.value)
  )

  const editAlarm = (id: number) => {
    alarmId.value = id
    showRightSideBar.value = true
  }

  onMounted(async () => {
    await Promise.all([
      globalStore.loadLabels(),
      globalStore.loadAlarms()
    ])
    loadingData.value = false
  })
</script>

<template>
  <section class="antialiased">
    <RightSideBar :show="showRightSideBar">
      <EditForm v-if="editingAlarm" :alarm="editingAlarm" @close="showRightSideBar = false"/>
    </RightSideBar>
    <div class="mx-auto">
      <div class="card overflow-hidden mt-8">
        <div class="panel-head rounded-none">
          <div class="flex items-center">
            <ListIcon class="mr-2 hidden h-6 text-ink-faint md:inline-flex" />
            <h3>Alarms</h3>
          </div>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-brand fill-transparent mx-auto my-4" />
        <AlarmsTable v-else :availableAlarms="getAvailableAlarms" @edit="editAlarm" :max="20" />
      </div>
    </div>
  </section>
</template>

<style scoped></style>
