<script setup lang="ts">
  import { ISensorData } from '@/commons';
  import AlarmsTable from '@/components/alarms/AlarmsTable.vue';
  import {
    AlarmIcon,
    LoadingIcon,
    PlayIcon,
    SensorIcon,
    StopIcon,
    ThermometerHighIcon,
    ThermometerLowIcon,
    BellRingIcon
  } from '@/components/icons';
  import SensorTable from '@/components/sensors/SensorTable.vue';
  import { useGlobalStore } from '@/stores/global';
  import { storeToRefs } from 'pinia';
  import { computed, onMounted, onUnmounted, ref } from 'vue'

  const globalStore = useGlobalStore()
  const {
    getConfiguredAlarms,
    getConfiguredSensors,
    getAppModeIsSwitchgear,
    getFastDetectionActive,
    getFastDetectionRemainingS,
  } = storeToRefs(globalStore)
  const loading = ref(true)
  const activeTab = ref('sensors')
  const togglingFastDetection = ref(false)

  const startFastDetection = () => {
    togglingFastDetection.value = true
    globalStore.startFastDetection()
      .catch(() => {})
      .finally(() => togglingFastDetection.value = false)
  }

  const stopFastDetection = () => {
    togglingFastDetection.value = true
    globalStore.stopFastDetection()
      .catch(() => {})
      .finally(() => togglingFastDetection.value = false)
  }

  // mm:ss from the SSE-driven remaining seconds (server-driven countdown).
  const fastDetectionCountdown = computed(() => {
    const s = getFastDetectionRemainingS.value
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  })


  const getTabClass = (type: string): string => {
    if (type === activeTab.value) {
      return 'border-brand text-brand active'
    }
    return 'border-transparent text-ink-faint hover:text-ink hover:border-line'
  }

  const temperatures = computed(() => {
    // Min/max sobre TODOS los sensores configurados (mismo set que la tabla), no
    // solo los que pertenecen a una alarma. Fail-safe: un sensor fuera de servicio
    // que tuvo lectura real SIGUE contando (si se calienta hasta perder señal no
    // debe desaparecer de "Highest"). Solo se excluyen los que nunca leyeron.
    const readings: ISensorData[] = []
    getConfiguredSensors.value.forEach(sensor => {
      const data = sensor.data
      if (!data) return
      if (!data.n_readings) return
      if (typeof data.temp !== 'number' || Number.isNaN(data.temp)) return
      readings.push(data)
    });

    if (readings.length === 0) return { min: undefined, max: undefined }

    let min = readings[0]
    let max = readings[0]
    for (const r of readings) {
      if (r.temp < min.temp) min = r
      if (r.temp > max.temp) max = r
    }
    return { min, max }
  })

  const alarmed = computed(() => {
    let alarms = new Map()
    let sensors =  new Map()

    getConfiguredAlarms.value.forEach(alarm => {
      if (alarm.status?.state) {
        alarms.set(alarm.id, {...alarm})
        alarm._sensors.forEach(sensor => {
          if (sensor.alarmed) {
            sensors.set(sensor.id, {...sensor})
          }
        });
      }
    });
    return { alarms, sensors }
  })

  onMounted(async () => {
    loading.value = true
    // Important, we need to load the labels before sensors
    await globalStore.startNormalMode()
    await globalStore.loadLabels()
    await globalStore.loadSensors()
    await globalStore.loadAlarms()
    loading.value = false
  })

  onUnmounted(() => {
    if (globalStore.getNormalModeOn) globalStore.stopNormalMode()
  })
</script>
<template>
  <div>
    <div class="grid grid-cols-1 gap-4 my-4 mt-8 sm:grid-cols-2 xl:grid-cols-4">
      <!-- Active alarms -->
      <div class="card flex items-center gap-4 p-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-crit-soft text-crit">
          <AlarmIcon class="h-8 w-8" />
        </div>
        <LoadingIcon v-if="loading" class="mx-auto h-7 w-7 animate-spin fill-transparent text-brand" />
        <div v-else class="min-w-0 flex-1">
          <h3 class="field-label mb-0">Active alarms</h3>
          <p class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold leading-none text-ink">{{ alarmed.alarms.size }}</span>
            <span class="text-xs text-ink-faint">/ {{ getConfiguredAlarms.length }} total</span>
          </p>
        </div>
        <BellRingIcon v-if="!loading && alarmed.alarms.size" class="h-6 w-6 shrink-0 text-crit" />
      </div>

      <!-- Sensors in alarm -->
      <div class="card flex items-center gap-4 p-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
          <SensorIcon class="h-8 w-8" />
        </div>
        <LoadingIcon v-if="loading" class="mx-auto h-7 w-7 animate-spin fill-transparent text-brand" />
        <div v-else class="min-w-0 flex-1">
          <h3 class="field-label mb-0">Sensors in alarm</h3>
          <p class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold leading-none text-ink">{{ alarmed.sensors.size }}</span>
            <span class="text-xs text-ink-faint">/ {{ getConfiguredSensors.length }} total</span>
          </p>
        </div>
      </div>

      <!-- Lowest temp -->
      <div class="card flex items-center gap-4 p-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
          <ThermometerLowIcon class="h-8 w-8" />
        </div>
        <LoadingIcon v-if="!temperatures.min" class="mx-auto h-7 w-7 animate-spin fill-transparent text-brand" />
        <div v-else class="min-w-0 flex-1" title="Lowest">
          <h3 class="field-label mb-0">Lowest temp</h3>
          <p class="flex items-baseline gap-1">
            <span class="font-mono text-3xl font-bold leading-none text-info">{{ temperatures.min?.temp.toFixed(1) }}</span>
            <span class="text-sm font-semibold text-ink-faint">°C</span>
          </p>
          <small class="block truncate font-mono text-xs text-ink-faint" :title="`EPC: ${temperatures.min?.id}`">{{ temperatures.min?.EPC }}</small>
        </div>
      </div>

      <!-- Highest temp -->
      <div class="card flex items-center gap-4 p-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-crit-soft text-crit">
          <ThermometerHighIcon class="h-8 w-8" />
        </div>
        <LoadingIcon v-if="!temperatures.max" class="mx-auto h-7 w-7 animate-spin fill-transparent text-brand" />
        <div v-else class="min-w-0 flex-1" title="Highest">
          <h3 class="field-label mb-0">Highest temp</h3>
          <p class="flex items-baseline gap-1">
            <span class="font-mono text-3xl font-bold leading-none text-crit">{{ temperatures.max?.temp.toFixed(1) }}</span>
            <span class="text-sm font-semibold text-ink-faint">°C</span>
          </p>
          <small class="block truncate font-mono text-xs text-ink-faint" :title="`EPC: ${temperatures.max?.id}`">{{ temperatures.max?.EPC }}</small>
        </div>
      </div>
    </div>

    <div class="card mb-4 overflow-hidden">
      <div class="border-b border-line text-sm font-semibold text-ink-faint">
        <ul class="flex flex-wrap px-2 -mb-px">
          <li class="mr-2">
            <a class="inline-block cursor-pointer rounded-t-lg border-b-2 px-4 py-3"
              :class="getTabClass('sensors')"
              @click="activeTab = 'sensors'">Sensors</a>
          </li>
          <li class="mr-2">
            <a class="inline-block cursor-pointer rounded-t-lg border-b-2 px-4 py-3"
              :class="getTabClass('alarms')"
              @click="activeTab = 'alarms'">Alarms</a>
          </li>
        </ul>
      </div>
      <AlarmsTable v-show="activeTab === 'alarms'" :availableAlarms="getConfiguredAlarms" :readonly="true" :max="20" />
      <SensorTable v-show="activeTab === 'sensors'" :availableSensors="getConfiguredSensors" :readonly="true" :showlabels="true" :max="50" />
    </div>
  </div>
</template>

<style scoped></style>
