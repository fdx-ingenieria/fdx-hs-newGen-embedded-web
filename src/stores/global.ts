import { SocketStatus, SocketCommands, ILabelData, ISensor, LabelType, ISystem, ISensorData, IRequest, IAlarm, IAlarmState } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

export const useGlobalStore = defineStore('global', () => {
  const maxRetries = 5
  let socketInstace: WebSocket | null = null
  const status: Ref<SocketStatus> = ref(SocketStatus.CLOSED)
  const discoveryModeOn: Ref<boolean> = ref(false)
  const normalModeOn: Ref<boolean> = ref(false)
  const availableLabels: Ref<ILabelData> = ref({} as ILabelData)
  const availableSensors: Ref<ISensor[]> = ref([])
  const availableAlarms: Ref<IAlarm[]> = ref([])
  const alarmStates: Ref<IAlarmState[]> = ref([])
  const sensorsData: Ref<ISensorData[]> = ref([])
  const systeamData: Ref<ISystem> = ref({} as ISystem)
  const requestQueue: Array<IRequest> = [];
  let isProcessing: boolean = false;

  const wait = async(ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  const getAlarmStates = computed(() => alarmStates.value)

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
    if (cmd === SocketCommands.LABEL && arg === 'get') {
      availableLabels.value = data
      return
    }
    if (cmd === SocketCommands.SENSOR_CONFIG && arg === 'get_all') {
      availableSensors.value = data
      return
    }
    if (cmd === SocketCommands.ALARM_CONFIG && arg === 'get') {
      console.log('New alarm data received:', data)
      availableAlarms.value = data
      return
    }
    if (cmd === SocketCommands.NEW_SENSOR_DATA && arg === 'get') {
      console.log('New sensor data received:', data)
      updateSensorsData(data)
      return
    }
    if (cmd === SocketCommands.ALARM_STATES && arg === 'get') {
      console.log('New alarm states data received', data)
      updateAlarmsStates(data)
      return
    }
    if (cmd === SocketCommands.HS_CONFIG && arg === 'get') {
      console.log('New sytem data received:', data)
      systeamData.value = data
      return
    }
  }

  function updateAlarmsStates(data: IAlarmState[]) {
    availableAlarms.value.forEach(alarm => {
      const status = data.find(item => item.id === alarm.id)
      alarm.active = status?.alarm || false
    })
    alarmStates.value = data
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

  function processRequests() {
    if (!isProcessing && requestQueue.length) {
      isProcessing = true;
      const nextRequest = requestQueue.shift();
      if (!nextRequest) return

      return send(nextRequest)
        .then(() => console.log('Request processed:', nextRequest))
        .catch(() => console.error('Unable to process the request:', nextRequest))
        .finally(async () => {
          await wait(500);
          isProcessing = false;
          processRequests();
        });
    }
  }

  function addToRequestQueue(request: IRequest): void {
    requestQueue.push(request);
    if (!isProcessing) {
      processRequests();
    }
  }

  async function send(message: IRequest, attempt = 1) {
    if (status.value !== SocketStatus.OPEN) {
      if (attempt === maxRetries) {
        throw new Error("Socket is not connected");
      }
      console.error(`Socket is not connected. Cmd: ${message.cmd} Attempt ${attempt} of ${maxRetries}.`)
      await wait(2000).then(() => send(message, attempt + 1))
      return
    }
    console.log('Sending message:', message)
    socketInstace?.send(JSON.stringify(message))
  }

  async function loadLabels(): Promise<void> {
    addToRequestQueue({ cmd: SocketCommands.LABEL, arg: "get", data: '' })
  }

  async function updateLabels(data: ILabelData): Promise<void> {
    // split data and send
    addToRequestQueue({ cmd: SocketCommands.LABEL, arg: 'set', data })
    loadLabels()
  }

  function getLabelName(type: LabelType, index: number) {
    return getAvailableLabels.value[type][index] || 'Not found'
  }

  async function loadSensors(): Promise<void> {
    addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "get_all", data: '' })
  }

  async function updateSensors(data: ISensor[]): Promise<void> {
    // split data and send
    addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "set", data })
    loadSensors()
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

  async function loadAlarms(): Promise<void> {
    addToRequestQueue({ cmd: SocketCommands.ALARM_CONFIG, arg: "get", data: '' })
  }

  async function updateAlarms(data: IAlarm[]): Promise<void> {
    // split data and send
    addToRequestQueue({ cmd: SocketCommands.ALARM_CONFIG, arg: 'set', data })
    loadAlarms()
  }

  async function startDiscoveryMode(): Promise<void> {
    discoveryModeOn.value = true
    addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "start", data: '' })
  }

  async function stopDiscoveryMode(): Promise<void> {
    discoveryModeOn.value = false
    addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "stop", data: '' })
    startNormalMode()
  }

  async function loadSystemData(): Promise<void> {
    addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "get", data: '' })
  }

  async function updateSystemData(data: ISystem): Promise<void> {
    addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "set", data })
    loadSystemData()
  }

  async function startNormalMode(): Promise<void> {
    normalModeOn.value = true
    addToRequestQueue({ cmd: SocketCommands.NORMAL_MODE, arg: "start", data: '' })
  }

  async function stopNormalMode(): Promise<void> {
    normalModeOn.value = false
    addToRequestQueue({ cmd: SocketCommands.NORMAL_MODE, arg: "stop", data: '' })
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
    getAvailableAlarms,
    getConfiguredAlarms,
    getAlarmStates,
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
