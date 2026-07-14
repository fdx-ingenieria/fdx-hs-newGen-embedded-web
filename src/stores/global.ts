import { IAntennaGroup, ILabelData, ISensor, ISensorConfig, LabelType, ISystem, ITimers, ISensorData, IAlarm, IAlarmData, IModbusTableEntry, IReaderConfig, SensorQuality } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning'

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

const ALARM_TYPE_TO_INDEX: Record<string, number> = { absolute: 1, unbalance: 2, dispersion: 3, hysteresis: 4 }
const ALARM_INDEX_TO_TYPE: Record<number, string> = { 1: 'absolute', 2: 'unbalance', 3: 'dispersion', 4: 'hysteresis' }
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
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let monitoring = false      // intención: queremos mantener el SSE abierto
  let everConnected = false   // ya hubo al menos una conexión exitosa (para avisar al reconectar)
  const RECONNECT_DELAY_MS = 2000
  // Último timestamp (epoch del device) visto por sensor. Sirve solo para detectar
  // cuándo llega una lectura NUEVA: el reloj del device puede estar desfasado del
  // browser (sin NTP/RTC), así que no se usa su valor absoluto para medir antigüedad.
  const lastDeviceTimestamp = new Map<string, number>()
  const connected = ref(false)
  const discoveryModeOn: Ref<boolean> = ref(false)
  const normalModeOn: Ref<boolean> = ref(false)
  // Installation-type flag, orthogonal to discovery/normal: whether this unit
  // auto-registers/tracks sensor groups per antenna (switchgear cabinets).
  const appModeIsSwitchgear: Ref<boolean> = ref(false)
  const availableLabels: Ref<ILabelData> = ref({} as ILabelData)
  const availableSensors: Ref<ISensor[]> = ref([])
  const availableAlarms: Ref<IAlarm[]> = ref([])
  const systeamData: Ref<ISystem> = ref({} as ISystem)
  const timersData: Ref<ITimers> = ref({} as ITimers)
  const readerConfigData: Ref<IReaderConfig> = ref({} as IReaderConfig)
  const modbusTable: Ref<Array<IModbusTableEntry>> = ref([])
  // Switchgear (Auto) only: EPC group currently locked per antenna, plus the
  // live vote tally of the voting window in progress (sorted by count desc).
  const antennaGroups: Ref<Array<IAntennaGroup>> = ref([])
  // Switchgear (Auto) only: temporary fast-detection window (commissioning aid).
  // Server-driven: both values come from the SSE stream every ~1s, so the
  // countdown needs no local timer and can never drift from the backend.
  const fastDetectionActive: Ref<boolean> = ref(false)
  const fastDetectionRemainingS: Ref<number> = ref(0)
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
  const getAppModeIsSwitchgear = computed(() => appModeIsSwitchgear.value)
  const getSystemData = computed(() => systeamData.value)
  const getTimersData = computed(() => timersData.value)
  const getReaderConfigData = computed(() => readerConfigData.value)
  const getModbusTable = computed(() => modbusTable.value)
  const getAntennaGroups = computed(() => antennaGroups.value)
  const getFastDetectionActive = computed(() => fastDetectionActive.value)
  const getFastDetectionRemainingS = computed(() => fastDetectionRemainingS.value)
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
    if (monitoring) return
    monitoring = true
    openEventSource()
  }

  function openEventSource(): void {
    if (eventSource) return
    loadFirmwareVersion().catch(() => {})
    loadMode().catch(() => {})
    eventSource = new EventSource('/api/events')
    eventSource.onopen = () => {
      connected.value = true
      // Avisamos solo en una RE-conexión (tras un corte), no en la primera apertura:
      // así el usuario sabe que el servicio volvió tras reiniciarlo.
      if (everConnected) notify('Connection restored', 'success')
      everConnected = true
    }
    eventSource.onerror = () => {
      const wasConnected = connected.value
      connected.value = false
      // EventSource reports transient network interruptions through onerror while
      // remaining in CONNECTING and handling reconnection internally. Forcing a
      // reconnect in that state creates unnecessary reconnect cycles and may leave
      // configuration views disconnected. Only trigger a manual reconnect when the
      // connection has transitioned to CLOSED.
      if (eventSource?.readyState === EventSource.CLOSED) {
        // Avisamos el corte UNA sola vez (en la transición conectado→caído). Los
        // reinicios deliberados cierran el stream nosotros mismos (sin onerror), así
        // que este warning solo salta ante caídas inesperadas. "Connection restored"
        // (success) es su contraparte al reconectar.
        if (wasConnected) notify('Connection lost, trying to reconnect...', 'warning')
        scheduleReconnect()
      }
    }
    eventSource.addEventListener('sensor_data', (event) => {
      const raw: Array<{ epc_id: string; name?: string; avg_temp: number; std_dev: number; avg_rssi: number; n_readings: number; quality: number; timestamp: number }> = JSON.parse(event.data)
      const sensors: ISensorData[] = raw.map(s => {
        const quality = QUALITY_BY_INDEX[s.quality] ?? SensorQuality.OUT_OF_SERVICE
        const prevData = availableSensors.value.find(x => x.id === s.epc_id)?.data
        const n_readings = quality === SensorQuality.OUT_OF_SERVICE
          ? (prevData?.n_readings ?? s.n_readings)
          : s.n_readings
        // El SSE reemite el mismo snapshot cada 1s; el timestamp del device solo cambia
        // cuando hay una lectura nueva (cada measure_period). Cuando cambia, anclamos al
        // reloj del CLIENTE para que `now - timestamp` mida bien la antigüedad sin
        // depender de que el reloj del device esté sincronizado.
        const isNewReading = s.timestamp > 0 && s.timestamp !== lastDeviceTimestamp.get(s.epc_id)
        if (isNewReading) lastDeviceTimestamp.set(s.epc_id, s.timestamp)
        const clientNow = Math.floor(Date.now() / 1000)
        const timestamp = isNewReading ? clientNow : (prevData?.timestamp ?? clientNow)
        return {
          id: s.epc_id,
          EPC: s.name ?? s.epc_id,  // decoded 4-char name from backend; hex fallback
          avg_temp: s.avg_temp,
          temp: s.avg_temp,
          std_dev: s.std_dev,
          rssi: s.avg_rssi,
          n_readings,
          quality,
          timestamp,
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
    eventSource.addEventListener('antenna_groups', (event) => {
      // Switchgear (Auto) only: grupo EPC activo por antena. Pushed en cada
      // tick del SSE (~1s), así se ve solo apenas se fija el grupo, sin
      // depender de un refresh manual de la página.
      antennaGroups.value = JSON.parse(event.data)
    })
    eventSource.addEventListener('fast_detection', (event) => {
      const data: { active: boolean; remaining_s: number } = JSON.parse(event.data)
      fastDetectionActive.value = data.active
      fastDetectionRemainingS.value = data.remaining_s
    })
    eventSource.addEventListener('reader_temp', (event) => {
      const data = JSON.parse(event.data)
      boardTemp.value = data.temperature_c
      connected.value = true
    })
  }

  function scheduleReconnect(): void {
    if (!monitoring || reconnectTimer) return
    eventSource?.close()
    eventSource = null
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (monitoring) openEventSource()
    }, RECONNECT_DELAY_MS)
  }

  // Reconexión ACTIVA tras reiniciar el servicio. No esperamos a que el EventSource
  // detecte la recuperación (su retry/onerror es poco fiable detrás del proxy y a veces
  // queda colgado sin volver): cerramos el stream y sondeamos /api/ping hasta que el
  // backend responda, recién ahí reabrimos el SSE. `initialDelayMs` deja pasar la ventana
  // de reinicio (el backend responde OK ~2s ANTES de caerse, ver routes_actions.cpp) para
  // no reconectar contra la instancia que está por morir.
  async function reconnectAfterRestart(initialDelayMs = 3000): Promise<void> {
    monitoring = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    eventSource?.close()
    eventSource = null
    connected.value = false

    await new Promise(r => setTimeout(r, initialDelayMs))
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' })
        if (res.ok) {
          // Backend de nuevo en pie: refrescamos estado y reabrimos el stream.
          await Promise.all([loadMode().catch(() => {}), loadSensors().catch(() => {})])
          openEventSource()  // onopen disparará el aviso "Connection restored"
          return
        }
      } catch { /* backend todavía caído: seguimos sondeando */ }
      await new Promise(r => setTimeout(r, 1500))
    }
    notify('Could not reconnect after restart, please reload the page (F5)', 'error')
  }

  function stopMonitoring(): void {
    monitoring = false
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
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
    const raw = await apiFetch<Array<{ epc_id: string; name?: string; config: ISensorConfig }>>('/api/config/sensors')
    const fromBackend = raw.map(s => ({ id: s.epc_id, EPC: s.name ?? s.epc_id, config: s.config }))
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
        reset_point: number
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
        reset_point: a.config.reset_point,
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
        reset_point: data.reset_point,
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
      apiFetch<{ serial_num: string }>('/api/config/system'),
      apiFetch<{ address: number; baud_rate: number; parity: number; stop_bits: number }>('/api/config/modbus'),
    ])
    systeamData.value = {
      serial_num: Number(systemRes.serial_num),
      modbus_address: modbusRes.address,
      baud_rate: modbusRes.baud_rate,
      bit_parity: PARITY_CHAR_TO_INDEX[String.fromCharCode(modbusRes.parity)] ?? 0,
    }
  }

  // Settings de admin (solo serial / password). Devuelve serial_updated porque el
  // guardado es admin-gated: con password incorrecto el serial no se actualiza.
  // Los timers ya no viven acá (ver updateTimersData).
  async function updateSystemData(data: ISystem): Promise<{ serial_updated: boolean }> {
    const systemRes = await apiFetch<{ status: string; serial_updated: boolean }>('/api/config/system', {
      method: 'POST',
      body: JSON.stringify({
        serial_num: String(data.serial_num),
        ...(data.password ? { password: data.password } : {}),
      }),
    })
    await loadSystemData()
    return { serial_updated: systemRes.serial_updated }
  }

  // Timers de orquestación del inventario (t_reader_on/off, measure_period_ms).
  // Recurso propio /api/config/timers: los tres son admin-gated. El backend valida
  // measure_period_ms >= t_reader_on + t_reader_off (400 si se viola, capturado por
  // apiFetch). Devuelve `updated` (false con password incorrecto: nada se persiste).
  async function loadTimersData(): Promise<void> {
    const res = await apiFetch<{ t_reader_on: number; t_reader_off: number; measure_period_ms: number }>('/api/config/timers')
    timersData.value = {
      t_reader_on: res.t_reader_on,
      t_reader_off: res.t_reader_off,
      measure_period_ms: res.measure_period_ms,
    }
  }

  async function updateTimersData(data: ITimers): Promise<{ updated: boolean }> {
    const res = await apiFetch<{ status: string; updated: boolean }>('/api/config/timers', {
      method: 'POST',
      body: JSON.stringify({
        t_reader_on: data.t_reader_on,
        t_reader_off: data.t_reader_off,
        measure_period_ms: data.measure_period_ms,
        ...(data.password ? { password: data.password } : {}),
      }),
    })
    await loadTimersData()
    return { updated: res.updated }
  }

  // Settings de Modbus (address / baud rate / parity). No requiere modo admin.
  async function updateModbusData(data: ISystem): Promise<void> {
    await apiFetch('/api/config/modbus', {
      method: 'POST',
      body: JSON.stringify({
        address: data.modbus_address,
        baud_rate: data.baud_rate,
        parity: (PARITY_INDEX_TO_CHAR[data.bit_parity] ?? 'N').charCodeAt(0),
        stop_bits: data.bit_parity === 0 ? 2 : 1,
      }),
    })
    await loadSystemData()
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

  // Restores the reader configuration to factory defaults. Admin-gated: a wrong or
  // missing password returns 403, which apiFetch surfaces as a thrown error (the
  // view catches it and nothing is reloaded). On success the reset config is reloaded.
  async function resetReaderConfigToFactory(password: string): Promise<void> {
    await apiFetch('/api/action/reader/factory_reset', { method: 'POST', body: JSON.stringify({ password }) })
    await loadReaderConfigData()
  }

  async function loadModbusTable(): Promise<void> {
    modbusTable.value = await apiFetch<Array<IModbusTableEntry>>('/api/data/modbus_table')
  }

  async function loadAntennaGroups(): Promise<void> {
    antennaGroups.value = await apiFetch<Array<IAntennaGroup>>('/api/data/antenna_groups')
  }

  // DISCOVERY and MANUAL ("Normal") are the two mutually exclusive backend modes,
  // so each toggle keeps both mirror flags in sync. This avoids chaining a second
  // backend call (discovery/stop == normal_mode/start on the backend), which would
  // otherwise publish the config-updated event twice.
  async function startDiscoveryMode(): Promise<void> {
    await apiFetch('/api/action/discovery/start', { method: 'POST' })
    discoveryModeOn.value = true
    normalModeOn.value = false
  }

  async function stopDiscoveryMode(): Promise<void> {
    await apiFetch('/api/action/discovery/stop', { method: 'POST' })
    discoveryModeOn.value = false
    normalModeOn.value = true
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

  async function startFastDetection(): Promise<void> {
    // Switchgear (Auto) only: aggressive inventory timing for 3 minutes so the
    // group voting converges in seconds. Self-expiring on the backend (never
    // persisted), so it cannot be left enabled by accident. The countdown state
    // arrives via the 'fast_detection' SSE event; we optimistically flip the
    // flag so the button reacts before the next tick.
    await apiFetch('/api/action/fast_detection/start', { method: 'POST' })
    fastDetectionActive.value = true
  }

  async function stopFastDetection(): Promise<void> {
    await apiFetch('/api/action/fast_detection/stop', { method: 'POST' })
    fastDetectionActive.value = false
    fastDetectionRemainingS.value = 0
  }

  async function lockAntennaGroup(antenna: number, group: string): Promise<void> {
    // Manually lock a group as the antenna's active group right now, instead of
    // waiting for the voting window to close. Plain shortcut: the next voting
    // window can still override it. The updated group arrives via the
    // 'antenna_groups' SSE event on the next tick.
    await apiFetch('/api/action/antenna_group/lock', {
      method: 'POST',
      body: JSON.stringify({ antenna, group }),
    })
  }

  async function loadMode(): Promise<void> {
    // Poll inicial del modo operativo para no depender del primer tick SSE (hasta 5s).
    // El backend solo tiene dos modos alcanzables: DISCOVERY y MANUAL. Lo que el front
    // llama "Normal" ES el MANUAL del backend (normal_mode/start == discovery/stop).
    // `app_mode` es un eje ortogonal (instalación normal vs. switchgear), no un tercer
    // modo: convive con DISCOVERY o MANUAL en vez de reemplazarlos.
    const data = await apiFetch<{ mode: 'DISCOVERY' | 'MANUAL'; app_mode: 'normal' | 'switchgear' }>('/api/data/mode')
    const isDiscovery = data.mode === 'DISCOVERY'
    discoveryModeOn.value = isDiscovery
    normalModeOn.value = !isDiscovery
    appModeIsSwitchgear.value = data.app_mode === 'switchgear'
  }

  async function setAppMode(switchgear: boolean, password: string): Promise<void> {
    // Backend: POST /api/action/app_mode {mode, password}. Persiste inmediatamente
    // (no hay distinción modo-en-vivo/modo-de-arranque como en discovery/normal),
    // así que no requiere un botón de guardado aparte. Admin-gated como
    // service_restart: fetch propio (no apiFetch) para distinguir el 403 de
    // password incorrecto y dar un mensaje a medida.
    const res = await fetch('/api/action/app_mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: switchgear ? 'switchgear' : 'normal', password }),
    })
    if (res.status === 403) {
      notify('Wrong password: installation mode was not changed', 'error')
      throw new Error('unauthorized')
    }
    if (!res.ok) {
      notify(`[${res.status}] Could not change installation mode`, 'error')
      throw new Error('set app mode failed')
    }
    appModeIsSwitchgear.value = switchgear
  }

  async function restartService(password: string): Promise<void> {
    // Endpoint propio (no usa apiFetch) para distinguir el 403 de password
    // incorrecto y dar mensajes a medida. Backend: POST con body { password },
    // responde 200 {status:"ok"} y reinicia el servicio ~1s después vía systemd.
    const res = await fetch('/api/action/system/service_restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.status === 403) {
      notify('Wrong password: service was not restarted', 'error')
      throw new Error('unauthorized')
    }
    if (!res.ok) {
      notify(`[${res.status}] Could not restart service`, 'error')
      throw new Error('restart failed')
    }
    // El backend responde OK y reinicia el servicio ~2s después: la conexión SSE muere.
    // Disparamos la reconexión ACTIVA (fire-and-forget) para recuperar los datos sin que
    // el usuario tenga que apretar F5. Al volver, openEventSource() dispara "Connection
    // restored". No await: la vista no debe quedar bloqueada esperando la reconexión.
    notify('Service is restarting, reconnecting automatically...', 'warning')
    void reconnectAfterRestart()
  }

  async function detectAntennas(): Promise<{ ant_count: number; ant_ports: number[] }> {
    // Dispara una detección de antenas en el reader y devuelve los puertos vivos.
    // Backend: POST /api/action/reader/detect_antennas → { ant_count, ant_ports:int[] }.
    // No requiere password (a diferencia de service_restart). Si el reader no responde,
    // el backend devuelve 503 y apiFetch ya notifica el error.
    return apiFetch<{ ant_count: number; ant_ports: number[] }>(
      '/api/action/reader/detect_antennas',
      { method: 'POST' },
    )
  }

  async function loadFirmwareVersion(): Promise<void> {
    const data = await apiFetch<{ version: string }>('/api/system/version')
    firmwareVersion.value = data.version
  }

  // Admin log download. Backend: POST /api/admin/logs { service, severity, password }
  // → text/plain (the filtered log). Own fetch (not apiFetch) because the response is
  // plain text, not JSON, and we want to tell the 403 (wrong password) apart from a
  // 400 (unknown service / bad severity / file not readable). Returns the raw text so
  // the caller can either save it directly or merge several services before saving.
  async function fetchLogText(service: string, severity: string, password: string): Promise<string> {
    const res = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, severity, password }),
    })
    if (res.status === 403) {
      notify('Wrong password: logs were not downloaded', 'error')
      throw new Error('unauthorized')
    }
    if (!res.ok) {
      notify(`[${res.status}] Could not download logs for "${service}"`, 'error')
      throw new Error('log download failed')
    }
    return res.text()
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
    getAppModeIsSwitchgear,
    setAppMode,
    getSystemData,
    loadSystemData,
    updateSystemData,
    getTimersData,
    loadTimersData,
    updateTimersData,
    updateModbusData,
    getReaderConfigData,
    loadReaderConfigData,
    updateReaderConfigData,
    resetReaderConfigToFactory,
    loadModbusTable,
    getModbusTable,
    loadAntennaGroups,
    getAntennaGroups,
    getFastDetectionActive,
    getFastDetectionRemainingS,
    startFastDetection,
    stopFastDetection,
    lockAntennaGroup,
    startNormalMode,
    stopNormalMode,
    restartService,
    detectAntennas,
    getConfiguredSensors,
    addNewSensor,
    updateSensorData,
    firmwareVersion,
    getFirmwareVersion,
    loadFirmwareVersion,
    fetchLogText,
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
