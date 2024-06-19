import { SocketStatus, SocketCommands, ILabelData, ISensor, LabelType, ISystem, ISensorData, IRequest, IAlarm, IAlarmData, IRequestQueue, IModbusTableEntry, IReaderConfig, customLog } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

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
  const maxRetries = parseInt(import.meta.env.VITE_MAX_RETRIES) || 150
  const timeBetweenRequests = parseInt(import.meta.env.VITE_TIME_BETWEEN_REQUESTS) || 800
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
  const requestQueue: Array<IRequestQueue> = [];
  const boardTemp: Ref<number | string> = ref('N/A')
  const showSideBar = ref(false);
  let isProcessing: boolean = false;

  const sleep = async(ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Getters
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

  // Actions
  async function connect(url = import.meta.env.VITE_WS_URL as string): Promise<void> {
    const socket = new WebSocket(url)
    status.value = SocketStatus.CONNECTING

    socket.onopen = async () => {
      socketInstace = socket
      status.value = SocketStatus.OPEN
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

    // Check if there are new sensors and update existing ones
    data.forEach((item: ISensorData) => {
      // Round decimals
      item.avg_temp = parseFloat(item.avg_temp.toFixed(1))
      item.std_dev = parseFloat(item.std_dev.toFixed(1))
      item.rssi = Math.round(item.rssi)

      if (!availableSensorsIds.includes(item.id)) {
        addNewSensor({
          id: item.id,
          EPC: item.EPC,
          config: {
            equipment: 0,
            position: 0,
            location: 0
          },
          data: item,
        })
      } else {
        updateSensorData(item)
      }
    })
  }

  function processRequests(): void {
    if (!isProcessing && requestQueue.length) {
      isProcessing = true;
      const nextRequest = requestQueue.shift();
      if (!nextRequest) return

      send(nextRequest.request)
        .then(() => {
          nextRequest.resolve(true)
        })
        .catch(() => {
          console.error('Unable to process the request:', nextRequest)
          nextRequest.reject(false)
        })
        .finally(async () => {
          await sleep(timeBetweenRequests);
          isProcessing = false;
          processRequests();
        });
    }
  }

  async function addToRequestQueue(request: IRequest): Promise<any> {
    const process = new Promise((resolve, reject) => {
      requestQueue.push({ request, resolve, reject }); // Agrega resolve y reject al pedido
    });
    if (!isProcessing) {
      processRequests();
    }

    return process;
  }

  async function send(message: IRequest, attempt = 1): Promise<void> {
    if (status.value !== SocketStatus.OPEN) {
      if (attempt === maxRetries) {
        throw new Error("Socket is not connected");
      }
      console.error(`Socket is not connected. Cmd: ${message.cmd} Attempt ${attempt} of ${maxRetries}.`)
      await sleep(5000)
        .then(() => send(message, attempt + 1))
      return
    }
    customLog('Sending message:', message)
    socketInstace?.send(JSON.stringify(message))
  }

  async function loadLabels(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.LABEL, arg: "get_all", data: '' })
  }

  async function updateLabels(data: ILabelData): Promise<void> {
    // split data and send
    return addToRequestQueue({ cmd: SocketCommands.LABEL, arg: 'set_all', data })
      .then(() => loadLabels())

  }

  function getLabelName(type: LabelType, index: number | undefined) {
    if (!getAvailableLabels.value[type]) return 'Not found'

    return index
      ? getAvailableLabels.value[type][index] || 'Not found'
      : 'Not found'
  }

  async function loadSensors(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "get_all", data: '' })
  }

  async function updateSensors(data: ISensor[]): Promise<void> {
    // split data and send
    data = data.map(({data, ...sensor}) => sensor)
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "set_all", data })
      .then(() => loadSensors())
  }

  async function updateSensor(data: ISensor): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "set", data })
      .then(() => loadSensors())
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
    return addToRequestQueue({ cmd: SocketCommands.CLEAR_SENSORS_RAM, arg: "all", data: '' })
      .then(() => loadSensors())
  }

  async function loadAlarms(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.ALARM_CONFIG, arg: "get_all", data: '' })
  }

  async function updateAlarms(data: IAlarm[]): Promise<void> {
    // split data and send
    return addToRequestQueue({ cmd: SocketCommands.ALARM_CONFIG, arg: 'set_all', data })
      .then(() => loadAlarms())
  }

  async function startDiscoveryMode(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "start", data: '' })
      .then(() => { discoveryModeOn.value = true })
  }

  async function stopDiscoveryMode(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "stop", data: '' })
      .then(() => { discoveryModeOn.value = false })
  }

  async function loadSystemData(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "get", data: '' })
  }

  async function loadReaderConfigData(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.READER_CONFIG, arg: "get", data: '' })
  }

  async function updateSystemData(data: ISystem): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "set", data })
      .then(() => loadSystemData())
  }

  async function updateReaderConfigData(data: IReaderConfig): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.READER_CONFIG, arg: "set", data })
      .then(() => loadReaderConfigData())
  }

  async function loadModbusTable(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.MODBUS_TABLE, arg: "get", data: '' })
  }

  async function startNormalMode(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.NORMAL_MODE, arg: "start", data: '' })
      .then(() => { normalModeOn.value = true })
  }

  async function stopNormalMode(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.NORMAL_MODE, arg: "stop", data: '' })
      .then(() => { normalModeOn.value = false })
  }

  return {
    status,
    disconnect,
    boardTemp,
    showSideBar,
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
    connect
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
