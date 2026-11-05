<script setup lang="ts">
  import { ILabelData, LabelType } from '@/commons';
  import { CloseIcon, LoadingIcon, SendIcon } from '@/components/icons';
  import { PRESETS, PresetKey, applyLabelPreset } from '@/commons/installPresets';
  import { vLongPress } from '@/composables/longPress';
  import LabelTable from '@/components/labels/LabelTable.vue';
  import { useGlobalStore } from '@/stores/global'
  import { storeToRefs } from 'pinia';
  import { Ref, computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router';

  const globalStore = useGlobalStore()

  let sizeWatcher:any = null
  const availableLabels: Ref<ILabelData> = ref({ equipment: [], location: [], position: [] })
  const activeTab = ref<string>(LabelType.EQUIPMENT)
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

  const addLabel = (type: LabelType) => {
    availableLabels.value[type].push('')
    hasUnsavedChanges.value = true
  }

  // Only the trailing slot can be removed (LabelTable only shows the button on
  // the last row) — indices are referenced by sensors/config, so shrinking
  // from the middle would silently reassign what every other index means.
  const removeLastLabel = (type: LabelType) => {
    if (availableLabels.value[type].length <= 1) return
    availableLabels.value[type].pop()
    hasUnsavedChanges.value = true
  }

  const hasDuplicateLabel = (labels: string[]): boolean => {
    const noEmpty = labels.filter(label => label !== '');
    const uniqueLabels = new Set(noEmpty);

    return noEmpty.length !== uniqueLabels.size;
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

  const showPresets = ref(false)
  const loadPreset = (key: PresetKey) => {
    availableLabels.value = applyLabelPreset(availableLabels.value, key)
    hasUnsavedChanges.value = true
    showPresets.value = false
    globalStore.notify('Preset loaded: review the names and save', 'success')
  }

  const discardChanges = () => {
    availableLabels.value = JSON.parse(JSON.stringify(globalStore.getAvailableLabels))
    hasUnsavedChanges.value = false
  }

  const getTabClass = (type: LabelType) => {
    if (type === activeTab.value) {
      return 'border-brand text-brand active'
    }
    return 'border-transparent text-ink-faint hover:text-ink hover:border-line'
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
    if (hasUnsavedChanges.value && !window.confirm('Leave without saving your label changes?')) {
      return
    }
    next()
  })

  onMounted(async () => {
    sizeWatcher = window.matchMedia('(min-width: 1024px)')
    isLargeScreen.value = sizeWatcher.matches
    sizeWatcher.addEventListener('change', handleMqlChange)
    window.addEventListener("beforeunload", preventUnsaved)

    try {
      await globalStore.loadLabels()
    } catch {
      // apiFetch already showed the error.
    } finally {
      loadingData.value = false
    }
  })

  onUnmounted(() => {
    sizeWatcher.removeEventListener('change', handleMqlChange)
    window.removeEventListener("beforeunload", preventUnsaved);
  })
</script>

<template>
  <section class="antialiased">
    <div class="mx-auto mb-6">
      <!-- Ctrl+Shift+double click (or long press) opens the hidden installation presets. -->
      <p class="mb-4 select-none text-sm text-ink-soft [-webkit-touch-callout:none]"
        v-on:dblclick.shift.ctrl="showPresets = !showPresets"
        v-long-press="() => showPresets = !showPresets">
        Names shown for each slot. Sensors and alarms store the slot number, so renaming a slot renames it everywhere.
      </p>

      <div v-if="showPresets" class="card mb-4 p-4">
        <div class="mb-1 flex items-center justify-between gap-2">
          <h3 class="text-base font-semibold text-ink">Installation presets</h3>
          <button type="button" class="rounded-md p-1 text-ink-faint hover:text-ink" aria-label="Close presets"
            @click="showPresets = false"><CloseIcon class="h-5 w-5" /></button>
        </div>
        <p class="mb-3 text-sm text-ink-faint">Fills the three lists with the names used in the field. Nothing is saved until you press Save labels.</p>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button v-for="p in PRESETS" :key="p.key" type="button" @click="loadPreset(p.key)"
            class="rounded-lg border border-line bg-panel-soft p-3 text-left hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span class="block font-semibold text-ink">{{ p.title }}</span>
            <span class="mt-1 block text-sm text-ink-soft">{{ p.labels.equipment.join(', ') }}</span>
            <span class="block text-sm text-ink-soft">{{ p.labels.location.join(', ') }}</span>
            <span class="block text-sm text-ink-soft">{{ p.labels.position.join(', ') }}</span>
          </button>
        </div>
      </div>

      <div v-if="!isLargeScreen" class="card overflow-hidden">
        <div class="flex border-b border-line px-2 text-sm font-semibold" role="tablist">
          <button v-for="labelType in LabelType" :key="labelType" type="button" role="tab"
            :aria-selected="activeTab === labelType"
            class="flex-1 border-b-2 px-3 py-3 capitalize"
            :class="getTabClass(labelType)"
            @click="activeTab = labelType">
            {{ labelType }}
            <span v-if="hasDuplicateLabel(availableLabels[labelType])" class="ml-1 text-crit" aria-label="has duplicates">!</span>
          </button>
        </div>
        <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
        <LabelTable v-else :availableLabels="availableLabels[activeTab as LabelType]" :labelType="activeTab as LabelType"
          @edit="editLabel" @add="addLabel" @removeLast="removeLastLabel" />
      </div>
      <div v-else class="grid grid-cols-3 gap-4">
        <div v-for="labelType in LabelType" :key="labelType" class="card overflow-hidden">
          <div class="panel-head">
            <h3 class="capitalize">{{ labelType }}</h3>
            <span class="font-mono text-xs text-ink-faint">{{ Math.max(0, availableLabels[labelType].length - 1) }} slots</span>
          </div>
          <LoadingIcon v-if="loadingData" class="w-8 h-8 animate-spin text-fdx-red fill-transparent mx-auto my-4" />
          <LabelTable v-else :availableLabels="availableLabels[labelType]" :labelType="labelType"
            @edit="editLabel" @add="addLabel" @removeLast="removeLastLabel" />
        </div>
      </div>

      <!-- Sticks to the bottom of the view while there is something to save. -->
      <div v-if="hasUnsavedChanges"
        class="card sticky bottom-4 mt-4 flex flex-wrap items-center gap-3 border-l-4 p-3"
        :class="hasAnyDuplicateLabel ? 'border-l-crit' : 'border-l-accent'" role="status">
        <p class="flex-1 text-sm font-medium" :class="hasAnyDuplicateLabel ? 'text-crit' : 'text-ink'">
          {{ hasAnyDuplicateLabel ? 'Fix the duplicate names before saving.' : 'You have unsaved label changes.' }}
        </p>
        <button type="button" class="btn-ghost" :disabled="savingData" @click="discardChanges()">Discard</button>
        <button type="button" class="btn-primary" :disabled="savingData || hasAnyDuplicateLabel" @click="saveLabel()">
          <LoadingIcon v-if="savingData" class="h-4 w-4 animate-spin fill-transparent" />
          <SendIcon v-else class="w-4" />
          Save labels
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped></style>
