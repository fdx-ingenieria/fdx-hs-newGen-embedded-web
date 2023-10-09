<script setup lang="ts">
  import { ILabelData, LabelType, ILabel } from '@/commons';
  import { ListIcon, SendIcon } from '@/components/icons';
  import LabelTable from '@/components/labels/LabelTable.vue';
  import RightSideBar from '@/components/navigation/RightSideBar.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, onMounted, onUnmounted, ref, watch } from 'vue'

  const globalStore = useGlobalStore()

  let sizeWatcher:any = null
  const availableLabels: Ref<ILabelData> = ref({ equipment: [], location: [], position: [] })
  const editableLabel: Ref<ILabel> = ref({ index: 0, name: '', type: LabelType.EQUIPMENT })
  const activeTab = ref('equipment')
  const showRightSideBar = ref(false)
  const isLargeScreen = ref(false)
  const { getAvailableLabels } = storeToRefs(globalStore)

  watch([getAvailableLabels], () => {
    availableLabels.value = globalStore.getAvailableLabels
  })

  const editLabel = (type: LabelType, index: number) => {
    editableLabel.value = { index, type, name: availableLabels.value[type][index] }
    showRightSideBar.value = true
  }

  const isComplete = () => {
    return editableLabel.value.name !== ''
  }

  const saveLabel = () => {
    const { type, index, name } = editableLabel.value
    if (!name) return
    availableLabels.value[type][index] = name
    globalStore.updateLabels(availableLabels.value)
    
    showRightSideBar.value = false
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

  onMounted(async () => {
    sizeWatcher = window.matchMedia('(min-width: 1024px)')
    isLargeScreen.value = sizeWatcher.matches
    sizeWatcher.addEventListener('change', handleMqlChange)
    await globalStore.loadLabels()
  })

  onUnmounted(() => {
    sizeWatcher.removeEventListener('change', handleMqlChange)
  })
</script>

<template>
  <section class="antialiased bg-gray-50">
    <RightSideBar :show="showRightSideBar">
      <h3 class="text-lg font-semibold text-gray-900 mb-8 border-b">
        Edit label
      </h3>
      <div class="grid gap-4 mb-4">
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Index</label>
          <input type="text" :value="editableLabel.index" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" disabled>
        </div>
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Type</label>
          <input type="text" :value="editableLabel.type" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" disabled>
        </div>
        <div>
          <label class="block mb-2 text-sm font-semibold text-gray-900">Name</label>
          <input v-on:keyup.enter="saveLabel()" type="text" v-model="editableLabel.name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5" placeholder="Your label name">
          <p v-show="!editableLabel.name" class="mt-2 text-sm text-red-600 dark:text-red-500"><span class="font-medium">Oops!</span> This is required!</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button @click="saveLabel()" :disabled="!isComplete()" type="button" class="text-white disabled:opacity-50 flex bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-semibold rounded-lg text-sm px-5 py-1.5 mr-2 mb-2 focus:outline-none">
          <SendIcon class="w-4 mr-1" />
          Save
        </button>
        <button @click="showRightSideBar = false" type="button" class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-semibold rounded-lg text-sm px-5 py-1.5 mr-2 mb-2">Cancel</button>
      </div>
    </RightSideBar>

    <div class="mx-auto">
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
              <LabelTable :availableLabels="availableLabels[labelType]" :labelType="labelType" @edit="editLabel" />
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
          <LabelTable :availableLabels="availableLabels[labelType]" :labelType="labelType" @edit="editLabel" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
