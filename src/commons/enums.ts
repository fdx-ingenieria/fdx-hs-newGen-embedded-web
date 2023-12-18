export enum SocketStatus {
  CONNECTING = "Connecting",
  OPEN = "Open",
  CLOSING = "Closing",
  CLOSED = "Closed",
}

export enum SocketCommands {
  LABEL = 'label',
  SENSOR_CONFIG = "sensor_config",
  ALARM_CONFIG = 'alarm_config',
  DISCOVERY = 'discovery',
  NORMAL_MODE = 'normal_mode',
  MODBUS_CONFIG = 'modbus_config',
  MODBUS_TABLE = 'modbus_table',
  NEW_SENSOR_DATA = 'new_sensor_data',
  CLEAR_SENSORS_RAM = 'clean_sensors_RAM',
  ALARM_DATA = 'alarm_data',
  HS_CONFIG = 'hs_config',
  READER_TEMP = 'reader_temp'
}

export enum SensorQuality {
  OUT_OF_SERVICE = "Out of service",
  BAD = "Bad",
  REGULAR = "Regular",
  GOOD = "Good",
  EXCELLENT = "Excellent",
}

export enum LabelType {
  EQUIPMENT = 'equipment',
  LOCATION = 'location',
  POSITION = 'position',
}

export const ModbusBitParity = [
  'none',
  'odd',
  'even',
]

export const BaudRate = [
  9600,
  19200,
  38400,
  57600,
  115200,
]

export const AlarmType = [
  'Non set',
  'Absolute',
  'Unbalance',
  'Dispersion',
]

export const ReleFlag = [
  'Non set',
  'Rele 1',
  'Rele 2',
]
