<script setup lang="ts">
  import { PropType, onBeforeUnmount, watch, Ref, ref } from 'vue';
  import { LabelType, ISensor, SensorQuality } from '@/commons';
  import { EditIcon, RefreshIcon, LoadingIcon, ClockIcon, FlagIcon, ThermometerIcon, BellCurveIcon, SearchIcon } from '@/components/icons';
  import { useGlobalStore } from '@/stores/global'



  const props = defineProps({
  
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
    showfooter: {
      type: Boolean,
      default: true
    },
    showdata: {
      type: Boolean,
      default: true,
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
  const elapsed_times: Ref<Record<string, number>> = ref({})
  const searchText = ref('')
  const localAvailableSensors = ref(props.availableSensors)


  watch(() => props.availableSensors, () => {

    props.availableSensors.forEach(item => {
      elapsed_times.value[item.id] = item.data?.elapsed_time || 0;
    });

    filter()

  })

  watch( 
  //searchText, () => filter())
  // const filter = () => {
  //   const str = searchText.value.toUpperCase()

  //   localAvailableSensors.value = props.availableSensors.filter(
  //     sensor => {
  //       return sensor.EPC.toUpperCase().includes(str)
  //     }
  //   ).sort((a, b) =>
  //     a.EPC.toUpperCase().localeCompare(b.EPC.toUpperCase(), 'en', { sensitivity: 'base' })
  //   )
  // }

  searchText, () => filter())
  const filter = () => {

    localAvailableSensors.value = props.availableSensors.filter(
      sensor => {
        return sensor.id
      }
    ).sort((a, b) =>
      a.id-b.id 
    )
  }

  const emit = defineEmits<{
    edit: [id: number],
    reset: [id: number]
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

  const searcHighlight = (text: string): string => {
    if (!searchText.value) return text

    const regex = new RegExp(`(${searchText.value})`, "gi");
    return text.replace(regex, '<span class="text-red-500 font-bold">$1</span>');
  }

  // Update the elapsed_time field every second
  const intervalId = setInterval(() => {
    Object.keys(elapsed_times.value).forEach(key => {
      elapsed_times.value[key] = elapsed_times.value[key] + 1;
    });
  }, 1000);

  



  // Remove the interval before unmounting the component
  onBeforeUnmount(() => {
    clearInterval(intervalId);
  });

</script>

<template>
  <div class="overflow-x-auto">
    <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
      <div class="w-full md:w-1/2">
        <div class="flex items-center">
          <label for="simple-search" class="sr-only">Search</label>
          <div class="relative w-full">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon class="w-5 h-5 text-gray-500" />
            </div>
            <input v-model="searchText" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2" placeholder="Search">
          </div>

          
          
        </div>
      </div>
    </div>
    <table class="w-full text-sm text-left text-gray-500 whitespace-nowrap">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th scope="col" class="px-4 py-3">ID_HEX ( EPC )</th>
          <th scope="col" class="px-4 py-3">ID_ASCII ( EPC )</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.EQUIPMENT }}</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.LOCATION }}</th>
          <th v-if="showlabels" scope="col" class="px-4 py-3">{{ LabelType.POSITION }}</th>

          <th v-if="showdata" scope="col" class="px-4 py-3">Temp</th>
          <th v-if="showdata" scope="col" class="px-4 py-3 text-center">Signal</th>
          <th v-if="showdata" scope="col" class="px-4 py-3">Updated</th>
          <th v-show="!readonly" scope="col" class="px-4 py-3 hidden md:table-cell"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <transition-group name="list" tag="tbody">
        <tr @click="emit('edit', item.id)" v-for="item in localAvailableSensors"
          class="border-b hover:bg-gray-100" :key="`${item.id}`"
          :class="{'cursor-pointer': !readonly, 'bg-red-200 hover:bg-red-300': item?.alarmed}">
          <th scope="row" class="px-4 py-3 font-medium text-gray-900" v-html="searcHighlight(item.EPC_HEX)"></th>
          <th scope="row" class="px-4 py-3 font-medium text-gray-900" v-html="searcHighlight(item.EPC_ASCII)"></th>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.EQUIPMENT, item.config.equipment) }}</td>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.LOCATION, item.config.location) }}</td>
          <td v-if="showlabels" class="px-4 py-3">{{ globalStore.getLabelName(LabelType.POSITION, item.config.position) }}</td>

          <td v-if="showdata" class="px-4 py-3">
            <small title="Average temperature" class="text-xs flex items-center"><ThermometerIcon class="w- h-4 mr-1" />{{ item.data?.avg_temp }}</small>
            <small title='Standard deviation' class="flex items-center"><BellCurveIcon class="w-3 h-3 mx-1" />{{ item.data?.std_dev }}</small>
          </td>
          <td  class="px-4 py-3 text-center">
            <span v-if="item.data?.rssi" class="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full relative"
              :class="getQualityClass(item.data?.quality)">
              {{ item.data?.quality }}
              <small class="absolute -top-3 -right-2 rounded-full px-1 py-0.5"
                :class="getQualityClass(item.data?.quality)" title="RSSI">
                {{ item.data?.rssi }}
              </small>
            </span>
            <span v-if="!item.data?.rssi">
               <small><LoadingIcon class="animate-spin fill-transparent text-green-600 w-4 opacity-80 mr-2" /></small>            
            </span>
            
          </td>
          <td scope="col" class="px-4 py-3">
            <div v-if="item.data?.rssi" >
              <small title="Number of readings" class="text-xs flex items-center"><FlagIcon class="w-4 h-4 mr-1" />{{ item.data?.n_readings }}</small>
              <small title='Last update' class="flex items-center"><ClockIcon class="w-3 h-3 mr-1" />
                {{ elapsed_times[item.id] }}s
              </small>
            </div>
           <span v-if="!item.data?.rssi  ">
               <small><LoadingIcon class="animate-spin fill-transparent text-green-600 w-4 opacity-80 mr-2" /></small>            
           </span>
          </td>
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
      <LoadingIcon class="animate-spin fill-transparent text-green-600 w-8 opacity-80 mr-2" />
      <span class="font-bold text-gray-600">Discovering .... stay tuned!</span>
    </div>
    <nav v-if="showfooter" class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4">
      <span class="text-sm font-normal text-gray-500">
        Showing
        <span class="font-semibold text-gray-900">{{ localAvailableSensors.length }}</span>
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
