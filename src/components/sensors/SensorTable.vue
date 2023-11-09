<script setup lang="ts">
  import { PropType } from 'vue';
  import { LabelType, ISensor, SensorQuality } from '@/commons';
  import { EditIcon, RefreshIcon, LoadingIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'
  import { format } from 'date-fns';

  defineProps({
    availableSensors: {
      type: Array as PropType<ISensor[]>,
      required: true
    },
    discovery: {
      type: Boolean,
      default: false
    },
    showlabels: {
      type: Boolean,
      default: false
    },
    showreset: {
      type: Boolean,
      default: false
    },
    showdata: {
      type: Boolean,
      default: false,
    },
    max: {
      type: Number,
      default: 0
    },
    readonly: {
      type: Boolean,
      default: false
    }
  })

  const globalStore = useGlobalStore()

  const emit = defineEmits<{
    edit: [index: number],
    reset: [index: number]
  }>()

  const getQualityClass = (quality: SensorQuality | undefined): string => {
    const classMap: Record<SensorQuality, string> = {
      [SensorQuality.OUT_OF_SERVICE]: 'bg-red-100 text-red-800',
      [SensorQuality.BAD]: 'bg-yellow-100 text-yellow-800',
      [SensorQuality.REGULAR]: 'bg-indigo-100 text-indigo-800',
      [SensorQuality.GOOD]: 'bg-blue-100 text-blue-800',
      [SensorQuality.EXCELLENT]: 'bg-green-100 text-green-800'
    };

    return quality
      ? classMap[quality]
      : '';
  };

  const preatyDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Unknown'

    const date = new Date(timestamp * 1000);
    return format(date, 'HH:mm:ss');
  }

</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left text-gray-500 whitespace-nowrap">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th scope="col" class="px-4 py-3">Id</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.EQUIPMENT }}</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.POSITION }}</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.LOCATION }}</th>
          <th v-if="showdata" scope="col" class="px-4 py-3">Temp</th>
          <th v-if="showdata" scope="col" class="px-4 py-3">Std desviation</th>
          <th scope="col" class="px-4 py-3 text-center">Signal</th>
          <th scope="col" class="px-4 py-3 hidden md:inline-block">Updated</th>
          <th v-show="!readonly" scope="col" class="px-4 py-3 hidden md:table-cell"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <transition-group name="list" tag="tbody">
        <tr @click="emit('edit', item.id)" v-for="item in availableSensors"
          class="border-b hover:bg-gray-100" :key="`${item.id}`"
          :class="{'cursor-pointer': !readonly}">
          <th scope="row" class="px-4 py-3 font-medium text-gray-900 ">{{ item.id.toString(16).toLocaleUpperCase() }}</th>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.EQUIPMENT, item.config.equipment) }}</td>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.POSITION, item.config.position) }}</td>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.LOCATION, item.config.location) }}</td>
          <td class="px-4 py-3 text-center">
            <span class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full relative"
              :class="getQualityClass(item.data?.quality)">
              {{ item.data?.quality }}
              <small class="absolute -top-3 -right-2 rounded-full px-1 py-0.5"
                :class="getQualityClass(item.data?.quality)" title="RSSID">
                {{ item.data?.rssid }}
              </small>
            </span>
          </td>
          <!-- <td class="px-4 py-3 text-center">{{ item.data?.rssid }}</td> -->
          <td scope="col" class="px-4 py-3 hidden md:inline-block">{{ preatyDate(item.data?.time_stamp) }}</td>
          <td v-show="!readonly" class="px-4 py-3 text-center hidden md:table-cell">
              <button type="button"
                @click="emit('edit', item.id)"
                @click.stop
                class="text-white border border-blue-500 bg-blue-500 font-medium rounded-lg text-sm p-0.5 text-center inline items-center mr-2">
                <EditIcon class="w-4" />
                <span class="sr-only">Edit</span>
              </button>
              <button type="button"
                v-if="showreset"
                @click="emit('reset', item.id)"
                @click.stop
                class="text-white border border-red-500 bg-red-500 font-medium rounded-lg text-sm p-0.5 text-center inline-flex items-center mr-2">
                <RefreshIcon class="w-4" />
                <span class="sr-only">Reset</span>
              </button>
          </td>
        </tr>
      </transition-group>
    </table>
    <div v-if="!availableSensors.length"
      class="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 mx-auto text-center" role="alert">
      <span class="font-medium">Nothing found.</span> It seems the data is on a coffee break.
    </div>
    <div v-if="discovery" class="w-full flex justify-center items-center mt-6 animate-pulse">
      <LoadingIcon class="animate-spin fill-white text-green-600 w-8 opacity-80 mr-2" />
      <span class="font-bold text-gray-600">Discovering .... stay tuned!</span>
    </div>
    <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
      <span class="text-sm font-normal text-gray-500">
        Showing
        <span class="font-semibold text-gray-900">{{ availableSensors.length }}</span>
        of
        <span class="font-semibold text-gray-900">{{ availableSensors.length }}</span>
        <template v-if="max" class="self-end">
          | max
          <span class="font-semibold text-gray-900">{{ max }}</span>
        </template>
      </span>
    </nav>
  </div>
</template>

<style scoped></style>
