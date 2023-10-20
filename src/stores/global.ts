import { SocketStatus, SocketCommands, ILabelData, ISensor, LabelType, ISystem, ISensorData, IRequest } from '@/commons'
import { defineStore } from 'pinia'
import { Ref, computed, ref } from 'vue'

export const useGlobalStore = defineStore('global', () => {
  const maxRetries = 5
  let socketInstace: WebSocket | null = null
  const status: Ref<SocketStatus> = ref(SocketStatus.CLOSED)
  const discoveryModeOn: Ref<boolean> = ref(false)
  const availableLabels: Ref<ILabelData> = ref({} as ILabelData)
  const availableSensors: Ref<ISensor[]> = ref([])
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
  const getSystemData = computed(() => systeamData.value)
  const getSensorsData = computed(() => sensorsData.value)

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
    if (cmd === SocketCommands.NEW_SENSOR_DATA && arg === 'get') {
      console.log('New sensor data received:', data)
      sensorsData.value = data
      return
    }
    if (cmd === SocketCommands.HS_CONFIG && arg === 'get') {
      console.log('New sytem data received:', data)
      systeamData.value = data
      return
    }
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

  async function addToRequestQueue(request: IRequest) {
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

  async function loadLabels() {
    return addToRequestQueue({ cmd: SocketCommands.LABEL, arg: "get", data: '' })
  }

  async function updateLabels(data: ILabelData) {
    // split data and send
    return addToRequestQueue({ cmd: 'label', arg: 'set', data }).then(() => loadLabels())
  }

  function getLabelName(type: LabelType, index: number) {
    return getAvailableLabels.value[type][index] || 'Not found'
  }

  async function loadSensors() {
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "get_all", data: '' })
  }

  async function updateSensors(data: ISensor[]) {
    // split data and send
    return addToRequestQueue({ cmd: SocketCommands.SENSOR_CONFIG, arg: "set", data }).then(() => loadSensors())
  }

  function addNewSensor(newSensor: ISensor): void {
    availableSensors.value = [...availableSensors.value, newSensor]
  }

  function updateSensorData(sensorData: ISensorData): void {
    availableSensors.value = availableSensors.value.map((sensor) => {
      if (sensor.id === sensorData.id) {
        return {
          ...sensor,
          quality: sensorData.quality,
          rssid: sensorData.rssid,
          time_stamp: sensorData.time_stamp,
        }
      }
      return sensor
    })
  }

  async function startDiscoveryMode() {
    discoveryModeOn.value = true
    return addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "start", data: '' })
  }

  async function stopDiscoveryMode() {
    discoveryModeOn.value = false
    return addToRequestQueue({ cmd: SocketCommands.DISCOVERY, arg: "stop", data: '' })
  }

  async function loadSystemData() {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "get", data: '' })
  }

  async function updateSystemData(data: ISystem) {
    return addToRequestQueue({ cmd: SocketCommands.HS_CONFIG, arg: "set", data }).then(() => loadSystemData())
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
    getDiscoveryModeOn,
    startDiscoveryMode,
    stopDiscoveryMode,
    getSystemData,
    loadSystemData,
    updateSystemData,
    getSensorsData,
    addNewSensor,
    updateSensorData,
    connect
  }
})
