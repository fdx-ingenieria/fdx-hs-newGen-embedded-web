<script setup lang="ts">
  import { IAlarm } from '@/commons';
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import EditForm from '@/components/alarms/EditForm.vue';
  import { EditIcon, ListIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()
  const { getAvailableAlarms } = storeToRefs(globalStore)
  const localAvailableAlarms: Ref<IAlarm[]> = ref([])
  const showRightSideBar = ref(false)
  const alarmId = ref(-1)
  const loadingData = ref(true)
  const savingData = ref(false)

  const editAlarm = (id: number) => {
    showRightSideBar.value = true
    alarmId.value = id
  }

  const hasUnsavedChanges = ref(false)

  watch(getAvailableAlarms, () => {
    // force deep copy
    localAvailableAlarms.value = JSON.parse(JSON.stringify(globalStore.getAvailableAlarms))
  })

  watch(localAvailableAlarms, () => {
    hasUnsavedChanges.value = true
    // deep compare
    if (JSON.stringify(globalStore.getAvailableAlarms) === JSON.stringify(localAvailableAlarms.value)) {
      hasUnsavedChanges.value = false
    }
  }, { deep: true })

  const save = () => {
    savingData.value = true

    globalStore.updateAlarms(localAvailableAlarms.value)
      .then(() => hasUnsavedChanges.value = false)
      .finally(() => savingData.value = false)
  }

  const preventUnsaved = (e: any) => {
    if (!hasUnsavedChanges.value) return
    e.preventDefault()
    e.returnValue = ""
  }

  onBeforeRouteLeave((_to, _from, next) => {
    if (hasUnsavedChanges.value && !window.confirm('Abandon ship without saving? Your changes might get seasick!')) {
      return
    }
    next()
  })

  onMounted(async () => {
    await Promise.all([
      globalStore.loadLabels(),
      globalStore.loadAlarms()
    ]).then(() => {
      loadingData.value = false
    })
    window.addEventListener("beforeunload", preventUnsaved)
  })

  onUnmounted(() => {
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <RightSideBar :show="showRightSideBar">
      <EditForm v-if="alarmId > -1" :alarm="localAvailableAlarms[alarmId]" @close="showRightSideBar = false"/>
    </RightSideBar>
    <div class="mx-auto">
      <div class="bg-white relative shadow-md sm:rounded-lg overflow-hidden mt-8">
        <div class="flex bg-fdx-dark text-white items-center py-2 px-4">
          <ListIcon class="h-6 hidden md:inline-flex mt-1 mr-2" />
          <h3 class="text-xl font-semibold">Alarms</h3>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
        <AlarmsTable v-else :availableAlarms="localAvailableAlarms || []" @edit="editAlarm" :max="20" />
      </div>
    </div>
    <div v-if="hasUnsavedChanges"
        class="fixed bottom-0 w-full p-4 text-blue-800 border-t-4 border-blue-300 bg-blue-50">
        <div class="ml-3 text-sm font-medium flex items-center">
          <EditIcon class="w-4 mr-1" />
          Oops, unsaved changes alert! Time to save the day!
          <button class="text-white disabled:opacity-50 text-center inline-flex items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-xs px-3 ml-3 py-1.5 focus:outline-none"
            @click="save()"
            :disabled="savingData"
            type="button" >
            <template v-if="savingData">
              <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
              Saving...
            </template>
            <template v-else>
              <SendIcon class="w-4 mr-1" />
              Save
            </template>
          </button>
        </div>
      </div>
  </section>
</template>

<style scoped></style>
