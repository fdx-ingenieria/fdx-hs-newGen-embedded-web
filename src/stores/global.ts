import { SocketStatus, SocketCommands, ILabelData, ISensor, LabelType, ISystem, ISensorData, IRequest, IAlarm, IAlarmData, IRequestQueue } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

export const useGlobalStore = defineStore('global', () => {
  const maxRetries = parseInt(import.meta.env.VITE_MAX_RETRIES) || 5
  const timeBetweenRequests = parseInt(import.meta.env.VITE_TIME_BETWEEN_REQUESTS) || 500
  let socketInstace: WebSocket | null = null
  const status: Ref<SocketStatus> = ref(SocketStatus.CLOSED)
  const discoveryModeOn: Ref<boolean> = ref(false)
  const normalModeOn: Ref<boolean> = ref(false)
  const availableLabels: Ref<ILabelData> = ref({} as ILabelData)
  const availableSensors: Ref<ISensor[]> = ref([])
  const availableAlarms: Ref<IAlarm[]> = ref([])
  const alarmsData: Ref<IAlarmData[]> = ref([])
  const sensorsData: Ref<ISensorData[]> = ref([])
  const systeamData: Ref<ISystem> = ref({} as ISystem)
  const requestQueue: Array<IRequestQueue> = [];
  let isProcessing: boolean = false;

  const sleep = async(ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Getters
  const getStatus = computed(() => status.value)
  const getAvailableLabels = computed(() => availableLabels.value)
  const getAvailableSensors = computed(() => availableSensors.value)
  const getDiscoveryModeOn = computed(() => discoveryModeOn.value)
  const getNormaModeOn = computed(() => normalModeOn.value)
  const getSystemData = computed(() => systeamData.value)
  const getSensorsData = computed(() => sensorsData.value)
  const getConfiguredSensors = computed(() => availableSensors.value.filter(sensor => !!sensor.config.equipment))
  const getAvailableAlarms = computed(() => availableAlarms.value)
  const getConfiguredAlarms = computed(() => availableAlarms.value.filter(alarm => !!alarm.alarm_type))
  const getAlarmsData = computed(() => alarmsData.value)

  // Actions
  function connect(url: string) {
    const socket = new WebSocket(url)
    status.value = SocketStatus.CONNECTING

    socket.onopen = () => {
      socketInstace = socket
      status.value = SocketStatus.OPEN
    };

    socket.onclose = (e) => {
      console.log('WebSocket disconnected. Reconnection attempt in 2 seconds.', e.reason)
      setTimeout(connect, 2000)
      status.value = SocketStatus.CLOSED
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      status.value = SocketStatus.CLOSED
    };

    // Set up the message event handler to update messageReceived
    socket.onmessage = (event) => messageHandler(event)
  }

  function messageHandler(event: MessageEvent) {
    const { cmd, arg, data } = JSON.parse(event.data)
    console.log(`Message received cmd: ${cmd}, arg: ${arg}`, data)
    if (!cmd || !arg) {
      console.error('Invalid message received:', event.data)
      return
    }
    if (cmd === SocketCommands.LABEL && arg === 'get_all') {
      availableLabels.value = data
      return
    }
    if (cmd === SocketCommands.SENSOR_CONFIG && arg === 'get_all') {
      availableSensors.value = data
      return
    }
    if (cmd === SocketCommands.ALARM_CONFIG && arg === 'get_all') {
      console.log('New alarm data received:', data)
      availableAlarms.value = data
      return
    }
    if (cmd === SocketCommands.NEW_SENSOR_DATA && arg === 'get_all') {
      console.log('New sensor data received:', data)
      updateSensorsData(data)
      return
    }
    if (cmd === SocketCommands.ALARM_DATA && arg === 'get_all') {
      console.log('New alarms data received', data)
      updateAlarmsData(data)
      return
    }
    if (cmd === SocketCommands.HS_CONFIG && arg === 'get') {
      console.log('New sytem data received:', data)
      systeamData.value = data
      return
    }
  }

  function updateAlarmsData(data: IAlarmData[]) {
    availableAlarms.value.forEach(alarm => {
      const status = data.find(item => item.id === alarm.id)
      alarm.status = status || undefined
    })
    alarmsData.value = data
  }

  function updateSensorsData(data: ISensorData[]) {
    const availableSensorsIds = availableSensors.value.map((item: ISensor) => item.id)

    // Check if there are new sensors and update existing ones
    data.forEach((item: ISensorData) => {
      if (!availableSensorsIds.includes(item.id)) {
        addNewSensor({
          id: item.id,
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
    sensorsData.value = data
  }

  function processRequests(): void {
    if (!isProcessing && requestQueue.length) {
      isProcessing = true;
      const nextRequest = requestQueue.shift();
      if (!nextRequest) return

      send(nextRequest.request)
        .then(() => {
          console.log('Request processed:', nextRequest)
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
      await sleep(1000)
        .then(() => connect(import.meta.env.VITE_WS_URL))
        .then(() => sleep(1000))
        .then(() => send(message, attempt + 1))
      return
    }
    console.log('Sending message:', message)
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

  function getLabelName(type: LabelType, index: number) {
    return getAvailableLabels.value[type][index] || 'Not found'
  }

  async function loadSensors(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "get_all", data: '' })
  }

  async function updateSensors(data: ISensor[]): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "set_all", data })
      .then(() => loadSensors())
  }

  function addNewSensor(newSensor: ISensor): void {
    availableSensors.value = [...availableSensors.value, newSensor]
  }

  function updateSensorData(sensorData: ISensorData): void {
    availableSensors.value = availableSensors.value.map((sensor) => {
      if (sensor.id === sensorData.id) {
        return {
          ...sensor,
          data: sensorData,
        }
      }
      return sensor
    })
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
      .then(() => startNormalMode())
  }

  async function loadSystemData(): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "get", data: '' })
  }

  async function updateSystemData(data: ISystem): Promise<void> {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "set", data })
      .then(() => loadSystemData())
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
    getStatus,
    getAvailableLabels,
    updateLabels,
    loadLabels,
    getLabelName,
    getAvailableSensors,
    loadSensors,
    updateSensors,
    clearUnconfiguredSensors,
    getAvailableAlarms,
    getConfiguredAlarms,
    getAlarmsData,
    loadAlarms,
    updateAlarms,
    getDiscoveryModeOn,
    getNormaModeOn,
    startDiscoveryMode,
    stopDiscoveryMode,
    getSystemData,
    loadSystemData,
    updateSystemData,
    startNormalMode,
    stopNormalMode,
    getSensorsData,
    getConfiguredSensors,
    addNewSensor,
    updateSensorData,
    connect
  }
})
