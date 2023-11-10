import { LabelType, ModbusBitParity, SensorQuality } from "./enums";

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
  config: ISensorConfig;
  data?: ISensorData;
}

export interface ISensorData {
  id: number; 
  avg_temp: number;
  temp: number;
  std_dev: number;
  n_readings: number;
  quality: SensorQuality;
  rssid: number;
  time_stamp: number; // seconds since epoch
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
  location: number;
  equipment: number;
}

export interface ISensorState {
  id: number; // long int
  state: boolean;
}
export interface IAlarmData {
  id: number; //int
  state: boolean;
  sensors: ISensorState[];
}

// System
export interface ISystem {
  serial: number;
  dir_modbus: number;
  baudrate: number;
  bit_parity: ModbusBitParity; 
}
// Menu & Sidebars
export interface IMenuItem {
  label: string;
  route?: string;
}
