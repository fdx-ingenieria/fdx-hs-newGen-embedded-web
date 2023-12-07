import { LabelType, SensorQuality } from "./enums";

// Request
export interface IRequestQueue {
  request: IRequest;
  resolve: (value: unknown) => void;
  reject: (value: unknown) => void;
}

export interface IRequest {
  cmd: string;
  arg: string;
  data: any;
}

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
  id: number;
  EPC: string;
  config: ISensorConfig;
  data?: ISensorData;
  alarmed?: boolean
}

export interface ISensorData {
  id: number;
  EPC: string;
  avg_temp: number;
  temp: number;
  std_dev: number;
  n_readings: number;
  quality: SensorQuality;
  rssi: number;
  elapsed_time: number; // seconds since last reading
  timestamp: number; // seconds since epoch unused
}

// Alarms
export interface IAlarm {
  id: number;
  name: string;
  set_point: number;
  alarm_type: number;
  relay_flag: number;
  fields: IAlarmField[];
  status?: IAlarmData;
}

export interface IAlarmField {
  location: number | undefined;
  equipment: number | undefined;
}

export interface ISensorState {
  id: number; // long int
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
}
// Menu & Sidebars
export interface IMenuItem {
  label: string;
  route?: string;
}
