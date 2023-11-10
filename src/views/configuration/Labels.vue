<script setup lang="ts">
  import { ILabelData, LabelType } from '@/commons';
  import { AlertIcon, EditIcon, ListIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import LabelTable from '@/components/labels/LabelTable.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()

  let sizeWatcher:any = null
  const availableLabels: Ref<ILabelData> = ref({ equipment: [], location: [], position: [] })
  const activeTab = ref('equipment')
  const hasUnsavedChanges = ref(false)
  const isLargeScreen = ref(false)
  const loadingData = ref(true)
  const savingData = ref(false)
  const { getAvailableLabels } = storeToRefs(globalStore)

  watch(getAvailableLabels, () => {
    // force deep copy
    availableLabels.value = JSON.parse(JSON.stringify(globalStore.getAvailableLabels))
  })

  const editLabel = (type: LabelType, index: number, value: string) => {
    availableLabels.value[type][index] = value
    hasUnsavedChanges.value = true

    if (JSON.stringify(globalStore.getAvailableLabels) === JSON.stringify(availableLabels.value)) {
      hasUnsavedChanges.value = false
    }
  }

  const hasDuplicateLabel = (labels: string[]): boolean => {
    const uniqueLabels = new Set(labels);
    return labels.length !== uniqueLabels.size;
  };

  const hasAnyDuplicateLabel = computed((): boolean => {
    const labelTypes = Object.values(LabelType);
    return labelTypes.some(type => hasDuplicateLabel(availableLabels.value[type]));
  });
  


  const saveLabel = () => {
    savingData.value = true
    globalStore.updateLabels(availableLabels.value)
      .then(() => hasUnsavedChanges.value = false)
      .finally(() => savingData.value = false)
  }

  const getTabClass = (type: LabelType) => {
    if (type === activeTab.value) {
      return 'border-fdx-red text-fdx-red active'
    }
    return 'border-transparent hover:text-gray-600 hover:border-gray-300'
  }

  const handleMqlChange = (e: any) => {
    isLargeScreen.value = e.matches
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
    sizeWatcher = window.matchMedia('(min-width: 1024px)')
    isLargeScreen.value = sizeWatcher.matches
    sizeWatcher.addEventListener('change', handleMqlChange)
    window.addEventListener("beforeunload", preventUnsaved)

    await globalStore.loadLabels()
      .then(() => loadingData.value = false)
  })

  onUnmounted(() => {
    sizeWatcher.removeEventListener('change', handleMqlChange)
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <div class="mx-auto mb-12">
      <div v-if="!isLargeScreen" class="bg-white relative shadow-md sm:rounded-lg overflow-hidden">
        <div class="text-sm font-semibold text-center text-gray-500 border-b border-gray-200">
          <ul class="flex flex-wrap -mb-px">
            <li class="mr-2">
              <a href="#equipment"
                class="inline-block p-4 border-b-2 rounded-t-lg "
                :class="getTabClass(LabelType.EQUIPMENT)"
                @click="activeTab = LabelType.EQUIPMENT">Equipment</a>
            </li>
            <li class="mr-2">
              <a href="#"
                class="inline-block p-4 border-b-2 rounded-t-lg "
                :class="getTabClass(LabelType.LOCATION)"
                @click="activeTab = LabelType.LOCATION">Location</a>
            </li>
            <li class="mr-2">
              <a href="#"
              class="inline-block p-4 border-b-2 rounded-t-lg "
                :class="getTabClass(LabelType.POSITION)"
                @click="activeTab = LabelType.POSITION">Position</a>
            </li>
          </ul>
        </div>
        <transition-group name="slide-down-fade" appear tag="div" class="overflow-x-auto">
          <template v-for="labelType in LabelType" :key="labelType">
            <div v-if="activeTab === labelType">
              <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
              <LabelTable v-else :availableLabels="availableLabels[labelType]" :labelType="labelType" @edit="editLabel" />
            </div>
          </template>
        </transition-group>
      </div>
      <div v-else class="grid grid-cols-2 xl:grid-cols-3 gap-6">
        <div v-for="labelType in LabelType" class="bg-white relative shadow-md sm:rounded-lg overflow-hidden">
          <div class="flex items-center bg-fdx-dark text-white py-2 px-4">
            <ListIcon class="w-6 mt-1 mr-2" />
            <h3 class="text-xl font-semibold">{{ labelType.toLocaleUpperCase() }}</h3>
          </div>
          <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
          <LabelTable v-else :availableLabels="availableLabels[labelType]" :labelType="labelType" @edit="editLabel" />
        </div>
      </div>
      <div v-if="hasUnsavedChanges"
        class="fixed bottom-0 w-full p-4 text-blue-800 border-t-4 border-blue-300 bg-blue-50"
        :class="{'text-red-800 border-red-300 bg-red-50': hasAnyDuplicateLabel}">
        <div class="ml-3 text-sm font-medium flex items-center">
          <template v-if="hasAnyDuplicateLabel">
            <AlertIcon class="w-4 mr-1" />
            Oops, duplicate labels! Please fix them before saving.
          </template>
          <template v-else>
            <EditIcon class="w-4 mr-1" />
            Oops, unsaved changes alert! Time to save the day!
          </template>
          <button class="text-white disabled:opacity-50 text-center inline-flex items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-xs px-3 ml-3 py-1.5 focus:outline-none"
            @click="saveLabel()"
            :disabled="savingData || hasAnyDuplicateLabel"
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
    </div>
  </section>
</template>

<style scoped></style>
