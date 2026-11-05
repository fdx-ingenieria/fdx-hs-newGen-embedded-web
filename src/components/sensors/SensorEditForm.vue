<script setup lang="ts">
  import { PropType, computed, ref } from 'vue';
  import { ISensor } from '@/commons';
  import { AlertIcon, LoadingIcon, RemoveIcon, SendIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global';

  // Isolated from the live SSE stream on purpose: re-rendering an open <select> every second
  // makes the native picker reopen on touch browsers (Firefox Android).
  const props = defineProps({
    sensor: {
      type: Object as PropType<ISensor>,
      required: true
    },
    isNew: {
      type: Boolean,
      default: false
    },
    limitReached: {
      type: Boolean,
      default: false
    },
    max: {
      type: Number,
      default: 0
    },
    saving: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits<{
    save: [sensor: ISensor],
    delete: [id: string],
    cancel: []
  }>()

  const globalStore = useGlobalStore()
  const local = ref<ISensor>(JSON.parse(JSON.stringify(props.sensor)))

  // Native pickers ignore display:none on <option>, so empty slots are filtered out instead.
  const optionsFor = (type: 'equipment' | 'location' | 'position') => computed(() =>
    (globalStore.getAvailableLabels[type] ?? [])
      .map((label: string, index: number) => ({ label, index }))
      .filter(o => !!o.label)
  )
  const fields = [
    { key: 'equipment' as const, label: 'Equipment', options: optionsFor('equipment') },
    { key: 'location' as const, label: 'Location', options: optionsFor('location') },
    { key: 'position' as const, label: 'Position', options: optionsFor('position') },
  ]

  const isComplete = computed(() => {
    const { equipment, position, location } = local.value.config
    if (props.isNew && props.limitReached) return false
    return !!equipment && !!position && !!location
  })

  // Boolean computed: SSE data updates don't change it, so they don't re-render the form.
  const isDuplicate = computed(() => {
    if (!isComplete.value) return false
    const { equipment, position, location } = local.value.config
    return globalStore.getAvailableSensors.some(s =>
      s.id !== local.value.id
        && s.config.equipment === equipment
        && s.config.position === position
        && s.config.location === location
    )
  })

  const save = () => {
    if (isComplete.value) emit('save', local.value)
  }
</script>

<template>
  <div>
    <h3 class="mb-6 border-b border-line pb-2 text-lg font-semibold text-ink">
      Edit sensor
    </h3>
    <div class="grid gap-4 mb-4">
      <div>
        <label class="field-label">id</label>
        <input type="text" :value="local.id" class="input" disabled>
      </div>
      <div>
        <label class="field-label">epc</label>
        <input type="text" :value="local.EPC" class="input" disabled>
      </div>
      <div v-for="field in fields" :key="field.key">
        <label class="field-label" :for="`sensor-${field.key}`">{{ field.label }}</label>
        <select :id="`sensor-${field.key}`" v-model="local.config[field.key]" class="input">
          <option v-for="o in field.options.value" :key="o.index" :value="o.index">{{ o.label }}</option>
        </select>
        <p v-show="!local.config[field.key]" class="mt-2 text-sm text-crit">Pick one to save the sensor.</p>
      </div>
    </div>
    <div v-if="limitReached && isNew" class="flex items-center p-4 mb-4 text-warn rounded-lg bg-warn-soft mt-2" role="alert">
      <AlertIcon class="flex-none w-5 mr-3" />
      <div class="ml-3 text-sm font-medium">
        The limit of {{ max }} configured sensors is reached. Delete one before adding another.
      </div>
    </div>
    <div v-if="isDuplicate" class="flex items-center p-4 mb-4 text-warn rounded-lg bg-warn-soft mt-2" role="alert">
      <AlertIcon class="flex-none w-5 mr-3" />
      <div class="ml-3 text-sm font-medium">
        You are about to save a configuration that is already stored for another sensor. Continuing will overwrite the existing configuration. Are you sure?
      </div>
    </div>
    <div class="flex items-center space-x-4 mobile:sticky mobile:bottom-0 mobile:-mx-4 mobile:-mb-6 mobile:border-t mobile:border-line mobile:bg-panel mobile:px-4 mobile:pb-4 mobile:pt-3">
      <button class="btn-primary mb-2"
        @click="save()"
        :disabled="!isComplete || saving"
        type="button" >
        <template v-if="saving">
          <LoadingIcon class="w-4 h-4 animate-spin fill-transparent mx-auto mr-1" />
          Saving...
        </template>
        <template v-else>
          <SendIcon class="w-4 mr-1" />
          Save
        </template>
      </button>
      <button class="btn-danger mb-2"
        v-if="!isNew"
        @click="emit('delete', local.id)"
        :disabled="saving"
        type="button" >
        <RemoveIcon class="w-5 mr-1" />
        Delete
      </button>
      <button class="btn-ghost mb-2"
        @click="emit('cancel')"
        :disabled="saving"
        type="button" >Cancel</button>
    </div>
  </div>
</template>

<style scoped></style>
