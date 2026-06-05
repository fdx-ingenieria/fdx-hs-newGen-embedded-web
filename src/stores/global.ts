import { ILabelData, ISensor, ISensorConfig, LabelType, ISystem, ISensorData, IAlarm, IAlarmData, IModbusTableEntry, IReaderConfig, SensorQuality } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

export type NotificationType = 'success' | 'error'

export interface Notification {
  id: number
  message: string
  type: NotificationType
}

/* ---------------------------------------------------------------------------
 * Mapeos entre el formato del backend (fdx-hs-newGen, rama feat/webserver) y
 * el modelo interno del frontend.
 *
 *  - Quality: el backend manda un int 0-4; el enum SensorQuality usa strings.
 *  - Alarm type / relay: el backend manda strings ("absolute", "relay_1"); las
 *    vistas usan índices numéricos contra los arrays AlarmType / ReleFlag.
 * ------------------------------------------------------------------------- */
const QUALITY_BY_INDEX: SensorQuality[] = [
  SensorQuality.OUT_OF_SERVICE,
  SensorQuality.BAD,
  SensorQuality.REGULAR,
  SensorQuality.GOOD,
  SensorQuality.EXCELLENT,
]

const ALARM_TYPE_TO_INDEX: Record<string, number> = { absolute: 1, unbalance: 2, dispersion: 3 }
const ALARM_INDEX_TO_TYPE: Record<number, string> = { 1: 'absolute', 2: 'unbalance', 3: 'dispersion' }
const RELAY_TO_INDEX: Record<string, number> = { none: 0, relay_1: 1, relay_2: 2 }
const RELAY_INDEX_TO_STR: Record<number, string> = { 0: 'none', 1: 'relay_1', 2: 'relay_2' }

// Modbus parity: backend usa char ('N'/'O'/'E'); el front usa índice en ModbusBitParity = ['none','odd','even'].
const PARITY_CHAR_TO_INDEX: Record<string, number> = { N: 0, O: 1, E: 2 }
const PARITY_INDEX_TO_CHAR: Record<number, string> = { 0: 'N', 1: 'O', 2: 'E' }

/**
 * This Pinia store manages the global state of the application.
 * Pay close attention to the variables 'availableSensors' and 'availableAlarms',
 * which are updated in response to the 'NEW_SENSOR_DATA' and 'ALARM_DATA' events, respectively.
 * The reactivity of these variables is crucial as they reflect important changes
 * in several views of the application. Any updates to sensor data or alarm information
 * must be immediately reflected to ensure a consistent and accurate user experience
 * throughout the application.
 */
export const useGlobalStore = defineStore('global', () => {
  let eventSource: EventSource | null = null
  const connected = ref(false)
  const discoveryModeOn: Ref<boolean> = ref(false)
  const normalModeOn: Ref<boolean> = ref(false)
  const availableLabels: Ref<ILabelData> = ref({} as ILabelData)
  const availableSensors: Ref<ISensor[]> = ref([])
  const availableAlarms: Ref<IAlarm[]> = ref([])
  const systeamData: Ref<ISystem> = ref({} as ISystem)
  const readerConfigData: Ref<IReaderConfig> = ref({} as IReaderConfig)
  const modbusTable: Ref<Array<IModbusTableEntry>> = ref([])
  const boardTemp: Ref<number | string> = ref('N/A')
  const firmwareVersion: Ref<string> = ref('')
  const showSideBar = ref(false)
  const notifications: Ref<Notification[]> = ref([])
  let _notifId = 0

  function notify(message: string, type: NotificationType = 'error'): void {
    const id = ++_notifId
    notifications.value.push({ id, message, type })
    setTimeout(() => dismissNotification(id), 5000)
  }

  function dismissNotification(id: number): void {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) notifications.value.splice(idx, 1)
  }

  // Getters
  const getFirmwareVersion = computed(() => firmwareVersion.value)
  const getAvailableLabels = computed(() => availableLabels.value)
  const getAvailableSensors = computed(() => availableSensors.value)
  const getDiscoveryModeOn = computed(() => discoveryModeOn.value)
  const getNormalModeOn = computed(() => normalModeOn.value)
  const getSystemData = computed(() => systeamData.value)
  const getReaderConfigData = computed(() => readerConfigData.value)
  const getModbusTable = computed(() => modbusTable.value)
  const getConfiguredSensors = computed(() => availableSensors.value.filter(sensor => !!sensor.config.equipment))
  const getAvailableAlarms = computed(() => availableAlarms.value)
  const getConfiguredAlarms = computed(() => availableAlarms.value.filter(alarm => !!alarm.alarm_type))

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body.error ?? body.message ?? ''
      } catch { /* body not JSON */ }
      const message = detail
        ? `[${res.status}] ${detail} — ${path}`
        : `[${res.status}] Error at ${path}`
      notify(message)
      throw new Error(message)
    }
    return res.json()
  }

  function startMonitoring(): void {
    if (eventSource) return
    loadFirmwareVersion().catch(() => {})
    eventSource = new EventSource('/api/events')
    eventSource.onopen = () => { connected.value = true }
    eventSource.onerror = () => { connected.value = false }
    eventSource.addEventListener('sensor_data', (event) => {
      const raw: Array<{ epc_id: string; avg_temp: number; std_dev: number; avg_rssi: number; n_readings: number; quality: number; timestamp: number }> = JSON.parse(event.data)
      const sensors: ISensorData[] = raw.map(s => {
        const quality = QUALITY_BY_INDEX[s.quality] ?? SensorQuality.OUT_OF_SERVICE
        const prevData = availableSensors.value.find(x => x.id === s.epc_id)?.data
        const n_readings = quality === SensorQuality.OUT_OF_SERVICE
          ? (prevData?.n_readings ?? s.n_readings)
          : s.n_readings
        return {
          id: s.epc_id,
          EPC: s.epc_id,
          avg_temp: s.avg_temp,
          temp: s.avg_temp,
          std_dev: s.std_dev,
          rssi: s.avg_rssi,
          n_readings,
          quality,
          timestamp: s.timestamp > 0 ? s.timestamp : (prevData?.timestamp ?? 0),
          elapsed_time: 0,
          config: availableSensors.value.find(x => x.id === s.epc_id)?.config ?? { equipment: 0, location: 0, position: 0 },
        }
      })
      updateSensorsData(sensors)
      connected.value = true
    })
    eventSource.addEventListener('alarm_data', (event) => {
      const raw: Array<{ slot: number; is_alarmed: boolean }> = JSON.parse(event.data)
      const alarms: IAlarmData[] = raw.map(a => ({ id: a.slot, state: a.is_alarmed, sensors: [] }))
      updateAlarmsData(alarms)
      connected.value = true
    })
    eventSource.addEventListener('reader_temp', (event) => {
      const data = JSON.parse(event.data)
      boardTemp.value = data.temperature_c
      connected.value = true
    })
  }

  function stopMonitoring(): void {
    eventSource?.close()
    eventSource = null
    connected.value = false
  }

  function updateAlarmsData(data: IAlarmData[]) {
    // El backend solo reporta is_alarmed por slot (no estado por-sensor): un sensor
    // se considera alarmado si pertenece a alguna alarma activa. Reseteamos primero
    // y luego hacemos OR sobre las alarmas (un sensor puede estar en varias).
    availableSensors.value.forEach(sensor => { sensor.alarmed = false })
    getConfiguredAlarms.value.forEach(alarm => {
      const status = data.find(item => item.id === alarm.id)
      alarm.status = status || undefined
      if (status?.state) {
        alarm._sensors?.forEach(sensor => { sensor.alarmed = true })
      }
    })
  }

  function updateSensorsData(data: ISensorData[]) {
    const availableSensorsIds = availableSensors.value.map((item: ISensor) => item.id)

    data.forEach((item: ISensorData) => {
      item.avg_temp = parseFloat(item.avg_temp.toFixed(1))
      item.std_dev = parseFloat(item.std_dev.toFixed(1))
      item.rssi = Math.round(item.rssi)

      if (!availableSensorsIds.includes(item.id)) {
        addNewSensor({
          id: item.id,
          EPC: item.EPC,
          config: item.config,
          data: item,
        })
      } else {
        updateSensorData(item)
      }
    })
  }

  async function loadLabels(): Promise<void> {
    availableLabels.value = await apiFetch<ILabelData>('/api/config/labels')
  }

  async function updateLabels(data: ILabelData): Promise<void> {
    await apiFetch('/api/config/labels', { method: 'POST', body: JSON.stringify(data) })
    availableLabels.value = data
    notify('Labels saved', 'success')
  }

  function getLabelName(type: LabelType, index: number | undefined) {
    if (!getAvailableLabels.value[type]) return 'Not found'
    return index
      ? getAvailableLabels.value[type][index] || 'Not found'
      : 'Not found'
  }

  async function loadSensors(): Promise<void> {
    // Backend devuelve solo sensores configurados; los descubiertos vía SSE no existen en el backend.
    // Hacer merge para no perder los sensores sin configurar que viven solo en memoria.
    const raw = await apiFetch<Array<{ epc_id: string; config: ISensorConfig }>>('/api/config/sensors')
    const fromBackend = raw.map(s => ({ id: s.epc_id, EPC: s.epc_id, config: s.config }))
    const backendIds = new Set(fromBackend.map(s => s.id))
    const unconfigured = availableSensors.value.filter(s => !backendIds.has(s.id) && !s.config.equipment)
    availableSensors.value = [
      ...fromBackend.map(bs => {
        const existing = availableSensors.value.find(s => s.id === bs.id)
        return existing ? { ...existing, config: bs.config } : bs
      }),
      ...unconfigured,
    ]
  }

  async function updateSensors(data: ISensor[]): Promise<void> {
    // El backend no tiene POST masivo: se envía un sensor por request.
    for (const sensor of data) {
      await apiFetch('/api/config/sensors', {
        method: 'POST',
        body: JSON.stringify({ epc_id: sensor.id, config: sensor.config }),
      })
    }
    await loadSensors()
    notify('Sensors saved', 'success')
  }

  async function updateSensor(data: ISensor): Promise<void> {
    await apiFetch('/api/config/sensors', {
      method: 'POST',
      body: JSON.stringify({ epc_id: data.id, config: data.config }),
    })
    await loadSensors()
    notify('Sensor saved', 'success')
  }

  async function deleteSensor(id: string): Promise<void> {
    await apiFetch(`/api/config/sensors/${id}`, { method: 'DELETE' })
    await loadSensors()
    notify('Sensor deleted', 'success')
  }

  function addNewSensor(newSensor: ISensor): void {
    availableSensors.value.push(newSensor)
  }

  function updateSensorData(sensorData: ISensorData): void {
    const idx = availableSensors.value.findIndex((sensor) => sensor.id === sensorData.id)
    if (idx === -1) return
    // Mutar in-place (no reemplazar el objeto): así las referencias compartidas
    // —p.ej. alarm._sensors, que apunta a los mismos sensores— ven el nuevo data.
    // Si se reemplaza el objeto, las tarjetas min/max temp de Overview.vue quedan stale.
    availableSensors.value[idx].data = sensorData
  }

  async function clearUnconfiguredSensors(): Promise<void> {
    await apiFetch('/api/action/sensors/clear', { method: 'POST' })
    availableSensors.value = availableSensors.value.filter(s => !!s.config.equipment)
    await loadSensors()
    notify('Unconfigured sensors cleared', 'success')
  }

  async function loadAlarms(): Promise<void> {
    // Backend: [{ slot, config: { active, name, set_point, type(str), relay(str), field_pairs } }]
    const raw = await apiFetch<Array<{
      slot: number
      config: {
        active: boolean
        name: string
        set_point: number
        type: string
        relay: string
        field_pairs: Array<{ location: number; equipment: number }>
      }
    }>>('/api/config/alarms')

    availableAlarms.value = raw.map(a => {
      const fields = a.config.field_pairs.map(fp => ({ location: fp.location, equipment: fp.equipment }))
      // El backend no expone la lista de sensores por alarma: se reconstruye
      // asociando los sensores cuyo equipment+location coincide con un field_pair.
      const _sensors = availableSensors.value.filter(sensor =>
        fields.some(f => f.equipment === sensor.config.equipment && f.location === sensor.config.location)
      )
      return {
        id: a.slot,
        name: a.config.name,
        set_point: a.config.set_point,
        reset_point: 0,
        alarm_type: ALARM_TYPE_TO_INDEX[a.config.type] ?? 0,
        relay_flag: RELAY_TO_INDEX[a.config.relay] ?? 0,
        fields,
        sensors: _sensors.map(s => s.id),
        _sensors,
      } as IAlarm
    })
  }

  async function updateAlarm(slot: number, data: IAlarm): Promise<void> {
    await apiFetch(`/api/config/alarms/${slot}`, {
      method: 'PUT',
      body: JSON.stringify({
        active: !!data.alarm_type,
        name: data.name,
        set_point: data.set_point,
        type: ALARM_INDEX_TO_TYPE[data.alarm_type] ?? 'unknown',
        relay: RELAY_INDEX_TO_STR[data.relay_flag] ?? 'none',
        field_pairs: data.fields.map(f => ({ location: f.location, equipment: f.equipment })),
      }),
    })
    // backend = fuente de verdad: re-leemos para reflejar lo realmente persistido
    await loadAlarms()
    notify('Alarm saved', 'success')
  }

  async function resetAlarm(slot: number): Promise<void> {
    await apiFetch(`/api/config/alarms/${slot}`, { method: 'DELETE' })
    await loadAlarms()
    notify('Alarm deleted', 'success')
  }

  async function loadSystemData(): Promise<void> {
    const [systemRes, modbusRes] = await Promise.all([
      apiFetch<{ serial_num: string; measure_period_ms: number }>('/api/config/system'),
      apiFetch<{ address: number; baud_rate: number; parity: number; stop_bits: number }>('/api/config/modbus'),
    ])
    systeamData.value = {
      serial_num: Number(systemRes.serial_num),
      measure_period_ms: systemRes.measure_period_ms,
      modbus_address: modbusRes.address,
      baud_rate: modbusRes.baud_rate,
      bit_parity: PARITY_CHAR_TO_INDEX[String.fromCharCode(modbusRes.parity)] ?? 0,
    }
  }

  async function updateSystemData(data: ISystem): Promise<{ serial_updated: boolean }> {
    const [systemRes] = await Promise.all([
      apiFetch<{ status: string; serial_updated: boolean }>('/api/config/system', {
        method: 'POST',
        body: JSON.stringify({
          serial_num: String(data.serial_num),
          measure_period_ms: data.measure_period_ms,
          ...(data.password ? { password: data.password } : {}),
        }),
      }),
      apiFetch('/api/config/modbus', {
        method: 'POST',
        body: JSON.stringify({
          address: data.modbus_address,
          baud_rate: data.baud_rate,
          parity: (PARITY_INDEX_TO_CHAR[data.bit_parity] ?? 'N').charCodeAt(0),
          stop_bits: data.bit_parity === 0 ? 2 : 1,
        }),
      }),
    ])
    await loadSystemData()
    // Success is notified by the view: in admin mode the save can be partial
    // (serial_updated=false on wrong password, even though the rest is saved).
    return { serial_updated: systemRes.serial_updated }
  }

  async function loadReaderConfigData(): Promise<void> {
    readerConfigData.value = await apiFetch<IReaderConfig>('/api/config/reader')
  }

  async function updateReaderConfigData(data: IReaderConfig): Promise<{ advanced_updated: boolean }> {
    const result = await apiFetch<{ status: string; advanced_updated: boolean }>('/api/config/reader', { method: 'POST', body: JSON.stringify(data) })
    await loadReaderConfigData()
    // Success is notified by the view: in admin mode the save can fail
    // (advanced_updated=false on wrong password).
    return result
  }

  async function loadModbusTable(): Promise<void> {
    modbusTable.value = await apiFetch<Array<IModbusTableEntry>>('/api/data/modbus_table')
  }

  async function startDiscoveryMode(): Promise<void> {
    await apiFetch('/api/action/discovery/start', { method: 'POST' })
    discoveryModeOn.value = true
  }

  async function stopDiscoveryMode(): Promise<void> {
    await apiFetch('/api/action/discovery/stop', { method: 'POST' })
    discoveryModeOn.value = false
  }

  async function startNormalMode(): Promise<void> {
    await apiFetch('/api/action/normal_mode/start', { method: 'POST' })
    normalModeOn.value = true
  }

  async function stopNormalMode(): Promise<void> {
    // El backend no expone /api/action/normal_mode/stop: MANUAL es el modo de
    // reposo y no se "apaga". Solo se actualiza el estado local.
    normalModeOn.value = false
  }

  async function loadFirmwareVersion(): Promise<void> {
    const data = await apiFetch<{ version: string }>('/api/system/version')
    firmwareVersion.value = data.version
  }

  return {
    connected,
    boardTemp,
    showSideBar,
    notifications,
    notify,
    dismissNotification,
    startMonitoring,
    stopMonitoring,
    getAvailableLabels,
    updateLabels,
    loadLabels,
    getLabelName,
    getAvailableSensors,
    loadSensors,
    updateSensor,
    updateSensors,
    deleteSensor,
    clearUnconfiguredSensors,
    getAvailableAlarms,
    getConfiguredAlarms,
    loadAlarms,
    updateAlarm,
    resetAlarm,
    getDiscoveryModeOn,
    getNormalModeOn: getNormalModeOn,
    startDiscoveryMode,
    stopDiscoveryMode,
    getSystemData,
    loadSystemData,
    updateSystemData,
    getReaderConfigData,
    loadReaderConfigData,
    updateReaderConfigData,
    loadModbusTable,
    getModbusTable,
    startNormalMode,
    stopNormalMode,
    getConfiguredSensors,
    addNewSensor,
    updateSensorData,
    firmwareVersion,
    getFirmwareVersion,
    loadFirmwareVersion,
  }
},
{
  persist: {
    key: 'global',
    paths: ['showSideBar'],
    beforeRestore: (_ctx) => {},
    afterRestore: (_ctx) => {},
  }
})
