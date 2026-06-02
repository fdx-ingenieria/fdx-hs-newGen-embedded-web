import { LabelType, SensorQuality } from "./enums";

// Labels
export interface ILabelData {
  equipment: string[];
  location: string[];
  position: string[];
}

export interface ILabel {
  index: number;
  name: string;
  type: LabelType;
}

// Sensors
export interface ISensorConfig {
  location: number;
  position: number;
  equipment: number;
}

export interface ISensor {
  id: string;
  EPC: string;
  config: ISensorConfig;
  data?: ISensorData;
  alarmed?: boolean
}

export interface ISensorData {
  id: string;
  EPC: string;
  avg_temp: number;
  temp: number;
  std_dev: number;
  n_readings: number;
  quality: SensorQuality;
  rssi: number;
  elapsed_time: number; // seconds since last reading
  timestamp: number; // seconds since epoch unused
  config: ISensorConfig;
}

// Alarms
export interface IAlarm {
  id: number;
  name: string;
  set_point: number;
  reset_point: number;
  alarm_type: number;
  relay_flag: number;
  fields: IAlarmField[];
  status?: IAlarmData;
  sensors: string[]; // sensors ids
  _sensors: ISensor[]; // sensors
}

export interface IAlarmField {
  location: number | undefined;
  equipment: number | undefined;
}

export interface ISensorState {
  id: string; // long int
  EPC: string;
  state: boolean;
}

export interface IAlarmData {
  id: number; //int
  state: boolean;
  sensors: ISensorState[];
}

// System
export interface ISystem {
  serial_num: number;
  password?: string;
  modbus_address: number;
  baud_rate: number;
  bit_parity: number;
  measure_period_ms?: number;
}

// Menu & Sidebars
export interface IMenuItem {
  label: string;
  route?: string;
}

// Modbus table
export interface IModbusTableEntry {
  name: string;
  columns: Array<string>;
  values: Array<Array<string | number>>;
  autoincrementColumn?: number;
  commonRows?: Array<string | number>;
}

// RFID Config
export interface IReaderConfig {
  region: string;
  read_pwr: number;  // cdBm 0 to 3300
  write_pwr: number; // cdBm 0 to 3300
  ants: string;      // active antennas, comma-separated e.g. "0,1,2,3"
  t_reader_on: number;   // ms 0 to 10_000
  t_reader_off: number;  // ms 0 to 300_000
  q: string;         // Q-value algorithm: "AUTO", "Q0"–"Q15"
  session: string;   // inventory session: "S0"–"S3"
  tag_encoding: string;  // "FM0", "M2", "M4", "M8"
  target: string;    // session target: "A" or "B"
  password?: string;
}
