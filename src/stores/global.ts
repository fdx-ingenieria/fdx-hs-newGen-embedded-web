import { SocketStatus, SocketCommands, ILabelData, ISensor, ISensorConfig, LabelType, ISystem, ISensorData, IAlarm, IAlarmData, IModbusTableEntry, IReaderConfig, SensorQuality, customLog } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

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
  let socketInstace: WebSocket | null = null
  const status: Ref<SocketStatus> = ref(SocketStatus.CLOSED)
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
  const showSideBar = ref(false);

  // Getters
  const getFirmwareVersion = computed(() => firmwareVersion.value)
  const getStatus = computed(() => status.value)
  const getAvailableLabels = computed(() => availableLabels.value)
  const getAvailableSensors = computed(() => availableSensors.value)
  const getDiscoveryModeOn = computed(() => discoveryModeOn.value)
  const getNormaModeOn = computed(() => normalModeOn.value)
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
      throw new Error(`HTTP ${res.status}: ${path}`)
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
      const sensors: ISensorData[] = raw.map(s => ({
        id: s.epc_id,
        EPC: s.epc_id,
        avg_temp: s.avg_temp,
        temp: s.avg_temp,
        std_dev: s.std_dev,
        rssi: s.avg_rssi,
        n_readings: s.n_readings,
        quality: QUALITY_BY_INDEX[s.quality] ?? SensorQuality.OUT_OF_SERVICE,
        elapsed_time: 0,
        timestamp: s.timestamp,
        config: availableSensors.value.find(x => x.id === s.epc_id)?.config ?? { equipment: 0, location: 0, position: 0 },
      }))
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

  // Actions
  async function connect(url = ''): Promise<void> {
    const socket = new WebSocket(url)
    status.value = SocketStatus.CONNECTING

    socket.onopen = async () => {
      socketInstace = socket
      status.value = SocketStatus.OPEN
      loadFirmwareVersion()
    };

    socket.onclose = (e) => {
      console.warn('WebSocket disconnected. Reconnection attempt in 10 seconds.', e)
      socketInstace = null
      setTimeout(connect, 10000)
      status.value = SocketStatus.CLOSED
    };

    socket.onerror = () => {
      status.value = SocketStatus.CLOSED
    };

    // Set up the message event handler to update messageReceived
    socket.onmessage = (event) => messageHandler(event)

    setTimeout(() => {
      if (socket.readyState !== 1) {
        socket.close(3506, 'Connection attempt timed out')
      }
    }, 5000)
  }

  async function disconnect(): Promise<void> {
    if (socketInstace) {
      customLog('Disconnecting socket')
      socketInstace.close()
    }
  }

  //TODO: refactor as dictionary
  function messageHandler(event: MessageEvent) {
    const { cmd, arg, data } = JSON.parse(event.data)

    if (!cmd || !arg) {
      console.error('Invalid message received:', event.data)
      return
    }
    if (cmd === SocketCommands.LABEL && arg === 'get_all') {
      customLog('New label data received:', data)
      availableLabels.value = data
      return
    }
    if (cmd === SocketCommands.SENSOR_CONFIG && arg === 'get_all') {
      customLog('New sensor config received:', data)
      availableSensors.value = data
      return
    }
    if (cmd === SocketCommands.ALARM_CONFIG && arg === 'get_all') {
      customLog('New alarm config received:', data)
      data.forEach((alarm: IAlarm) => {
        alarm._sensors = []
        alarm.sensors?.forEach(sensorId => {
          const sensor = availableSensors.value.find(sensor => sensor.id === sensorId)
          if (sensor) {
            alarm._sensors.push(sensor)
          }
        })
      })

      availableAlarms.value = data

      return
    }
    if (cmd === SocketCommands.NEW_SENSOR_DATA && arg === 'get_all') {
      customLog('New sensor data received:', data)
      updateSensorsData(data)
      return
    }
    if (cmd === SocketCommands.ALARM_DATA && arg === 'get_all') {
      customLog('New alarms data received', data)
      updateAlarmsData(data)
      return
    }
    if (cmd === SocketCommands.HS_CONFIG && arg === 'get') {
      customLog('New sytem data received:', data)
      systeamData.value = data
      return
    }
    if (cmd === SocketCommands.MODBUS_TABLE && arg === 'get') {
      customLog('New modbus table data received:', data)
      modbusTable.value = data
      return
    }
    if (cmd === SocketCommands.READER_TEMP && arg === 'get') {
      customLog('New board temp data received:', data)
      boardTemp.value = data
      return
    }
    if (cmd === SocketCommands.READER_CONFIG && arg === 'get') {
      customLog('New reader config data received:', data)
      readerConfigData.value = data
      return
    }
    if (cmd === SocketCommands.FIRMWARE_VERSION && arg === 'get') {
      customLog('New firmware version received:', data)
      firmwareVersion.value = data.version
      return
    }

    console.warn(`Unknow message received cmd: ${cmd}, arg: ${arg}`, data)
  }

  function updateAlarmsData(data: IAlarmData[]) {
    getConfiguredAlarms.value.forEach(alarm => {
      const status = data.find(item => item.id === alarm.id)
      alarm.status = status || undefined
      alarm._sensors?.forEach(sensor => {
        const sensorData = status?.sensors.find(item => item.id === sensor.id)
        sensor.alarmed = sensorData?.state || false
      })
    })
  }

  function updateSensorsData(data: ISensorData[]) {
    const availableSensorsIds = availableSensors.value.map((item: ISensor) => item.id)
    const dataIDs = data.map(sensor => sensor.id)

    availableSensors.value = availableSensors.value.filter((item: ISensor) => {
      if (!dataIDs.includes(item.id)) {
        customLog("No existe sensor ", item.id)
        return false
      }
      return true
    })

    const updatedAvailableSensorsIds = availableSensors.value.map((item: ISensor) => item.id)
    console.log("Updated availableSensorsIds:", updatedAvailableSensorsIds)

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
  }

  function getLabelName(type: LabelType, index: number | undefined) {
    if (!getAvailableLabels.value[type]) return 'Not found'
    return index
      ? getAvailableLabels.value[type][index] || 'Not found'
      : 'Not found'
  }

  async function loadSensors(): Promise<void> {
    // Backend devuelve [{ epc_id, config }]; el frontend usa { id, EPC, config }.
    const raw = await apiFetch<Array<{ epc_id: string; config: ISensorConfig }>>('/api/config/sensors')
    availableSensors.value = raw.map(s => ({ id: s.epc_id, EPC: s.epc_id, config: s.config }))
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
  }

  async function updateSensor(data: ISensor): Promise<void> {
    await apiFetch('/api/config/sensors', {
      method: 'POST',
      body: JSON.stringify({ epc_id: data.id, config: data.config }),
    })
    await loadSensors()
  }

  function addNewSensor(newSensor: ISensor): void {
    availableSensors.value.push(newSensor)
  }

  function updateSensorData(sensorData: ISensorData): void {
    const sensor = availableSensors.value.find((sensor) => sensor.id === sensorData.id)
    if (!sensor) return
    sensor.data = sensorData
  }

  async function clearUnconfiguredSensors(): Promise<void> {
    await apiFetch('/api/action/sensors/clear', { method: 'POST' })
    await loadSensors()
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

  async function updateAlarms(data: IAlarm[]): Promise<void> {
    const payload = data.map(a => ({
      slot: a.id,
      config: {
        active: !!a.alarm_type,
        name: a.name,
        set_point: a.set_point,
        type: ALARM_INDEX_TO_TYPE[a.alarm_type] ?? 'unknown',
        relay: RELAY_INDEX_TO_STR[a.relay_flag] ?? 'none',
        field_pairs: a.fields.map(f => ({ location: f.location, equipment: f.equipment })),
      },
    }))
    await apiFetch('/api/config/alarms', { method: 'POST', body: JSON.stringify(payload) })
    await loadAlarms()
  }

  async function loadSystemData(): Promise<void> {
    const [systemRes, modbusRes] = await Promise.all([
      apiFetch<{ serial_num: string; measure_period_ms: number }>('/api/config/system'),
      apiFetch<{ address: number; baud_rate: number; parity: string; stop_bits: number }>('/api/config/modbus'),
    ])
    systeamData.value = {
      serial_num: Number(systemRes.serial_num),
      measure_period_ms: systemRes.measure_period_ms,
      modbus_address: modbusRes.address,
      baud_rate: modbusRes.baud_rate,
      bit_parity: PARITY_CHAR_TO_INDEX[modbusRes.parity] ?? 0,
    }
  }

  async function updateSystemData(data: ISystem): Promise<void> {
    await Promise.all([
      apiFetch('/api/config/system', {
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
          parity: PARITY_INDEX_TO_CHAR[data.bit_parity] ?? 'N',
          stop_bits: data.bit_parity === 0 ? 2 : 1,
        }),
      }),
    ])
    await loadSystemData()
  }

  async function loadReaderConfigData(): Promise<void> {
    readerConfigData.value = await apiFetch<IReaderConfig>('/api/config/reader')
  }

  async function updateReaderConfigData(data: IReaderConfig): Promise<void> {
    await apiFetch('/api/config/reader', { method: 'POST', body: JSON.stringify(data) })
    await loadReaderConfigData()
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
    status,
    disconnect,
    connected,
    boardTemp,
    showSideBar,
    startMonitoring,
    stopMonitoring,
    getStatus,
    getAvailableLabels,
    updateLabels,
    loadLabels,
    getLabelName,
    getAvailableSensors,
    loadSensors,
    updateSensor,
    updateSensors,
    clearUnconfiguredSensors,
    getAvailableAlarms,
    getConfiguredAlarms,
    loadAlarms,
    updateAlarms,
    getDiscoveryModeOn,
    getNormaModeOn,
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
    connect,
    firmwareVersion,
    getFirmwareVersion,
    loadFirmwareVersion
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
